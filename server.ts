import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import * as cheerio from "cheerio";
import Parser from "rss-parser";
import { GoogleGenAI } from "@google/genai";
import fs from "fs";

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Strict Validation: The Imperial Guard checks the archives.
 */
const validateEnv = () => {
  // Common placeholders to treat as "missing"
  const placeholders = [
    "your_key_here", "your_secret_here", "your_url_here", "undefined", "null", 
    "placeholder", "todo", "missing", "none", "empty",
    "supabase_url", "supabase_service_role_key"
  ];
  const isPlaceholder = (val?: string) => {
    if (!val) return true;
    const v = val.trim().replace(/^["']|["']$/g, '').toLowerCase();
    // Also treat environment variable references as placeholders
    if (v.startsWith('process.env.') || v.startsWith('$') || v === 'my_app_url') return true;
    return placeholders.includes(v) || v.includes("your_") || v.includes("<") || v.includes("[") || v.length < 5;
  };

  const getFirstValid = (...candidates: (string | undefined)[]) => {
    for (const c of candidates) {
      if (c && !isPlaceholder(c)) return c.trim().replace(/^["']|["']$/g, '');
    }
    const fallback = candidates[0]?.trim().replace(/^["']|["']$/g, '');
    return fallback;
  };

  const supabaseUrl = getFirstValid(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.VITE_SUPABASE_URL);
  const supabaseServiceKey = getFirstValid(process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_ANON_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, process.env.VITE_SUPABASE_ANON_KEY);
  const instamojoApiKey = getFirstValid(process.env.INSTAMOJO_API_KEY);

  if (!isPlaceholder(supabaseUrl) && (!supabaseUrl?.startsWith('https://') || !supabaseUrl?.includes('.supabase.co'))) {
    return { valid: false, field: "SUPABASE_URL", reason: "The Supabase URL format is invalid. It must start with 'https://' and include '.supabase.co'." };
  }

  if (supabaseUrl?.includes('firebase') || supabaseUrl?.includes('AIzaSy')) {
    return { valid: false, field: "MIXUP_DETECTED", reason: "A Firebase API key was detected in a Supabase field. Please ensure you haven't swapped your keys." };
  }

  if (isPlaceholder(instamojoApiKey)) {
    console.error("Missing Instamojo API Key");
  }

  return { 
    valid: true, 
    keys: { 
      supabaseUrl: isPlaceholder(supabaseUrl) ? undefined : supabaseUrl,
      supabaseServiceKey: isPlaceholder(supabaseServiceKey) ? undefined : supabaseServiceKey,
      instamojoApiKey: isPlaceholder(instamojoApiKey) ? undefined : instamojoApiKey
    } 
  };
};

// Safety Shield: Root-level variable validation
const envCheck = validateEnv();
if (!envCheck.valid) {
  console.error(`CRITICAL CONFIG ERROR: ${envCheck.reason} in ${envCheck.field}`);
}

const parser = new Parser();
import { createClient } from "@supabase/supabase-js";

// Initialize Supabase Admin for backend operations
let supabaseClient: any = null;
const getSupabase = () => {
  if (!supabaseClient) {
    const envStatus = validateEnv();
    if (!envStatus.valid || !envStatus.keys.supabaseUrl || !envStatus.keys.supabaseServiceKey) {
      console.warn("[Supabase] Backend client not initialized: Missing or invalid credentials.");
      return null;
    }
    supabaseClient = createClient(envStatus.keys.supabaseUrl, envStatus.keys.supabaseServiceKey);
  }
  return supabaseClient;
};

const genAI = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.VINTAGE_ORACLE_KEY || "" 
});

// Rate Limiting Middleware
const rateLimits = new Map<string, { count: number, lastReset: number }>();
const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutes
const MAX_REQUESTS = 10;

const rateLimiter = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const userLimit = rateLimits.get(ip as string) || { count: 0, lastReset: now };

  if (now - userLimit.lastReset > RATE_LIMIT_WINDOW) {
    userLimit.count = 0;
    userLimit.lastReset = now;
  }

  userLimit.count++;
  rateLimits.set(ip as string, userLimit);

  if (userLimit.count > MAX_REQUESTS) {
    console.warn(`Rate limit exceeded for IP: ${ip}`);
    return res.status(429).json({ error: "Too many requests. The Imperial Guard is watching." });
  }

  next();
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

/* 
   SUPABASE SCHEMA REFERENCE:
   Table: daily_news
   Columns: id (int8), title (text), source (text), summary (text), upsc_category (text), url (text), relevance_score (numeric), date_published (date)
   
   Table: study_logs
   Columns: id (int8), user_id (uuid), subject (text), duration_minutes (int4), notes (text), date (timestamp)
*/

const syncNews = async () => {
  try {
    console.log("Starting Imperial News Engine reconnaissance...");
    const sources = [
      { name: "Insights on India", url: "https://www.insightsonindia.com/feed/" },
      { name: "PMF IAS", url: "https://www.pmfias.com/feed/" },
      { name: "PIB", url: "https://pib.gov.in/RssMain.aspx?ModId=6" },
      { name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
      { name: "Indian Express", url: "https://indianexpress.com/section/explained/feed/" }
    ];

    let processedCount = 0;

    for (const source of sources) {
      try {
        const client = getSupabase();
        if (!client) {
          console.warn(`[News Engine] Source ${source.name} skipped: Supabase not configured.`);
          continue;
        }
        console.log(`Fetching feed from ${source.name}...`);
        const response = await axios.get(source.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          timeout: 10000
        });
        
        const feed = await parser.parseString(response.data);
        // Process top 5 items per source
        const items = feed.items.slice(0, 5);

        for (const item of items) {
          try {
            // Scoring with Gemini
            const prompt = `
              As a Senior UPSC Mentor and Strategic Intelligence Officer, analyze this news intel for high-fidelity relevance to the UPSC CSE Syllabus.
              Identify if it links to GS Paper I (History/Geo), GS Paper II (Polity/IR), GS Paper III (Economy/Enviro/Security), or GS Paper IV (Ethics).
              
              Intel:
              Title: ${item.title}
              Summary: ${item.contentSnippet || item.content || item.title}
              
              Rules:
              - Target relevance score of 1-10.
              - Only score > 7 if the topic strongly involves key UPSC dimensions like: Constitutional, GS1, GS2, GS3, GS4, Prelims, Mains, or PIB.
              - Discard articles that do not relate to these pillars.
              - Provide a sophisticated, UPSC-ready summary.
              
              Format JSON:
              {
                "score": number,
                "gs_paper": "GS I" | "GS II" | "GS III" | "GS IV",
                "summary": "Scholarly summary focusing on core UPSC dimensions",
                "is_worth_archiving": boolean
              }
            `;

            const aiResult = await genAI.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: [{ role: "user", parts: [{ text: prompt }] }],
              config: { responseMimeType: "application/json" }
            });
            
            const aiData = JSON.parse(aiResult.text || "{}");

            if (aiData.score > 7) {
              console.log(`[News Engine] High value intel discovered: ${item.title} (Score: ${aiData.score})`);
              
              // Store in Supabase daily_news
              const client = getSupabase();
              if (client) {
                const { error: insertError } = await client
                  .from('daily_news')
                  .upsert({
                    title: item.title,
                    source: source.name,
                    summary: aiData.summary,
                    upsc_category: aiData.gs_paper,
                    url: item.link,
                    relevance_score: aiData.score,
                    date_published: new Date().toISOString().split('T')[0]
                  }, { onConflict: 'title' });

                if (insertError) throw insertError;
                processedCount++;
              }
            }
          } catch (itemErr) {
            console.error(`Error processing item: ${item.title}`, itemErr);
          }
        }
      } catch (err: any) {
        console.error(`Failed source ${source.name}:`, err.message);
      }
    }

    return processedCount;
  } catch (globalErr) {
    console.error("Global News Sync Error:", globalErr);
    return 0;
  }
};

// Nightly Archive Migration
const migrateToArchives = async () => {
  console.log("Initiating nightly archival migration...");
  const client = getSupabase();
  if (!client) {
    console.warn("[Archival] Migration skipped: Supabase not configured.");
    return;
  }
  
  try {
    const { data: dailyNews, error: fetchError } = await client
      .from('daily_news')
      .select('*');

    if (fetchError) throw fetchError;

    if (dailyNews && dailyNews.length > 0) {
      const archives = dailyNews.map(news => ({
        title: news.title,
        source: news.source,
        summary: news.summary,
        upsc_category: news.upsc_category,
        url: news.url,
        relevance_score: news.relevance_score,
        date_published: news.date_published,
        date_created: new Date().toISOString()
      }));

      const { error: archiveError } = await client
        .from('news_archives')
        .insert(archives);

      if (archiveError) throw archiveError;

      // Clear daily news
      const { error: clearError } = await client
        .from('daily_news')
        .delete()
        .neq('id', 0); // Delete everything

      if (clearError) throw clearError;
      console.log(`Successfully archived ${dailyNews.length} articles.`);
    }
  } catch (error) {
    console.error("Archival Migration Failed:", error);
  }
};

// API: ElevenLabs TTS (Professional Voice Intelligence)
app.post("/api/tts/elevenlabs", async (req, res) => {
  const { text, voiceId = "cgSgspJ2msm6clMCkdW9" } = req.body; // Default: 'Jessica' or similar professional model
  if (!text) return res.status(400).send("Text is required");

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    console.warn("ElevenLabs API Key missing. High-memory voice intelligence deactivated.");
    return res.status(503).send("ElevenLabs service unavailable");
  }

  try {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
      {
        text: text,
        model_id: "eleven_monolingual_v1",
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      },
      {
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(response.data));
  } catch (error: any) {
    console.error("ElevenLabs Error:", error.response?.data?.toString() || error.message);
    res.status(500).send("Voice intelligence synthesis failed");
  }
});

// API: OpenAI TTS
app.post("/api/tts", async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).send("Text is required");

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OpenAI API Key missing. TTS feature deactivated.");
    return res.status(503).send("TTS service unavailable");
  }

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/audio/speech",
      {
        model: "tts-1",
        input: text,
        voice: "alloy",
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    res.setHeader("Content-Type", "audio/mpeg");
    res.send(Buffer.from(response.data));
  } catch (error) {
    console.error("TTS Error:", error);
    res.status(500).send("Voice synthesis failed");
  }
});

// API Routes: News Sync (Automated UPSC News Engine)
app.post("/api/news/sync", async (req, res) => {
    try {
      const processedCount = await syncNews();
      res.json({ 
        status: "success", 
        message: `Imperial News Engine completed reconnaissance. ${processedCount} new articles summarized and archived.` 
      });
    } catch (error: any) {
      console.error("News sync error:", error);
      res.status(500).json({ 
        error: "Failed to sync news",
        details: error.message 
      });
    }
  });

app.get("/api/news", async (req, res) => {
    try {
      const news = [
        {
          title: "Cabinet approves PM-Vidyalaxmi scheme to support meritorious students",
          source: "PIB",
          relevance: "GS Paper II: Education, Government Policies",
          summary: "A new central sector scheme to provide financial support to meritorious students for higher education."
        },
        {
          title: "India and ASEAN strengthen maritime cooperation",
          source: "The Hindu",
          relevance: "GS Paper II: International Relations",
          summary: "Focus on maritime security, blue economy, and freedom of navigation in the Indo-Pacific."
        },
        {
          title: "New findings on Indus Valley Civilization site in Haryana",
          source: "Archaeological Survey of India",
          relevance: "GS Paper I: History & Culture",
          summary: "Recent excavations reveal advanced urban planning and trade links with Mesopotamia."
        }
      ];
      res.json(news);
    } catch (error: any) {
      res.status(500).json({ error: "Failed to fetch news", details: error.message });
    }
  });

// API: Archiving News Intel to Personal Vault
app.post("/api/news/archive", async (req, res) => {
  try {
    const { url, title, userId, content } = req.body;
    if (!url || !userId) {
      return res.status(400).json({ error: "Intelligence source and user identity required." });
    }

    let summary = content;
    let analysis = null;
    
    // If no content provided, or to ensure high-quality analysis, scrape it
    console.log(`[Archival] Fetching content for analysis: ${url}`);
    try {
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      });
      const $ = cheerio.load(response.data);
      const bodyText = $('p').map((_, el) => $(el).text()).get().join(' ').slice(0, 5000);
      
      const prompt = `
        As a Senior Scholar at the Imperial Academy, analyze this news archive.
        Provide a structured UPSC-aligned analysis. 
        
        Identification Rules:
        - Identify GS Paper relevance (GS I, II, III, or IV).
        - Extract 3-5 Prelims Facts (short, factual).
        - Extract 3-5 Mains Dimensions (analytical).
        - Provide a scholarly summary.

        Title: ${title}
        Article Text: ${bodyText}

        Format JSON:
        {
          "summary": "Scholarly summary focused on core UPSC dimensions",
          "gs_paper": "GS I" | "GS II" | "GS III" | "GS IV",
          "prelims_facts": ["fact 1", "fact 2"],
          "mains_dimensions": ["dimension 1", "dimension 2"]
        }
      `;
      
      const aiResult = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        config: { responseMimeType: "application/json" }
      });
      
      analysis = JSON.parse(aiResult.text || "{}");
      if (analysis.summary) summary = analysis.summary;
    } catch (scrapeError) {
      console.warn("Analysis failed during archival, continuing with basic summary:", scrapeError);
    }

    const client = getSupabase();
    if (!client) throw new Error("Imperial Archives offline.");

    const { data: docData, error: archivalError } = await client.from("vault_items").insert({
      title: title || "Archived Chronicle",
      type: 'link',
      url: url,
      content: summary,
      analysis: analysis,
      user_id: userId,
      folder_id: null,
      source: "Imperial News Desk",
      created_at: new Date().toISOString()
    }).select().single();

    if (archivalError) throw archivalError;

    res.json({ id: docData.id, analysis });
  } catch (error: any) {
    console.error("Archival Error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to consign archive.",
      code: "ARCHIVE_FAILURE"
    });
  }
});

// App Entry: News Analysis Endpoint
app.post("/api/news/analyze", rateLimiter, async (req, res) => {
  try {
    const { url, title, summary: existingSummary } = req.body;
    if (!url) return res.status(400).json({ error: "Source URL required." });

    console.log(`[Oracle] Analyzing news intel: ${url}`);
    
    let bodyText = existingSummary || "";
    if (url.startsWith('http')) {
      try {
        const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 5000 });
        const $ = cheerio.load(response.data);
        bodyText = $('p').map((_, el) => $(el).text()).get().join(' ').slice(0, 5000);
      } catch (e) {
        console.warn("Scrape failed for analysis, using fallback summary.");
      }
    }

    const prompt = `
      As a Senior UPSC Mentor, analyze this news intel for a serious aspirant.
      Provide a deep analysis suitable for UPSC GS preparation.
      
      Article Title: ${title}
      Context: ${bodyText}

      Requirements:
      1. Scholarly Summary (max 200 words).
      2. GS Paper Relevance (GS I-IV).
      3. Prelims Focus Facts (Key data points for MCQ).
      4. Mains Critical Dimensions (Analytical points for descriptive answers).

      Format JSON MUST:
      {
        "summary": "...",
        "gs_paper": "...",
        "prelims_facts": ["...", "..."],
        "mains_dimensions": ["...", "..."]
      }
    `;

    const aiResult = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    res.json(JSON.parse(aiResult.text || "{}"));
  } catch (error: any) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: "The Oracle is currently silent. Connectivity issue or API exhaustion." });
  }
});

// System Update Webhook
app.post("/api/system/update", (req, res) => {
  try {
    console.log("System update triggered by Vizier.");
    // In a real app, you'd trigger a GitHub Action or Vercel Webhook here
    // axios.post(process.env.VERCEL_DEPLOY_HOOK_URL);
    res.json({ 
      status: "success", 
      message: "Imperial Build Sequence initiated. Deploying v1.0.5 to the production archives." 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "System update sequence failed." });
  }
});

// Storage Provisioning
app.post("/api/system/provision-storage", (req, res) => {
  try {
    console.log("Storage expansion requested.");
    // In a real app, you'd call Supabase/GCP API to increase quota
    res.json({ 
      status: "success", 
      message: "Extra 50GB provisioned in the Imperial Cloud Vault." 
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: "Storage provisioning failed." });
  }
});

// Community Trending Summary
app.post("/api/community/summarize", rateLimiter, async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "No messages to summarize." });
    }

    const textToSummarize = messages.map(m => m.text || "").join("\n");
    if (!textToSummarize) return res.status(400).json({ error: "No text to summarize." });

    const prompt = `
      As a Senior Academic Coordinator at the Imperial UPSC Academy, analyze these recent community discussions and provide:
      1. A high-level summary of the trending topics (3 bullet points).
      2. Strategic advice for students based on these discussions.
      3. A list of key terms (max 5) mentioned that are UPSC relevant.
      
      Discussions:
      ${textToSummarize}
    `;

    const aiResult = await genAI.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    res.json({ summary: aiResult.text });
  } catch (error: any) {
    console.error("Community Summary Error:", error);
    res.status(500).json({ error: "Failed to generate community summary." });
  }
});

// Vite middleware for development
if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const distPath = path.join(process.cwd(), "dist");
  // Only serve static files if the directory exists (prevents errors on Vercel serverless functions)
  app.use(express.static(distPath));
  app.get("*", (req, res) => {
    const indexPath = path.join(distPath, "index.html");
    res.sendFile(indexPath, (err) => {
      if (err) {
        // Fallback for Vercel where static files are served by the platform
        res.status(404).send("Static file not found. Vercel should handle this via rewrites.");
      }
    });
  });
}

if (!process.env.VERCEL) {
  // Automated News Sync (Every 6 hours)
const SYNC_INTERVAL = 6 * 60 * 60 * 1000;
setInterval(async () => {
  console.log("Automated News Engine reconnaissance initiated...");
  try {
    await syncNews();
    console.log("Automated news sync completed successfully.");
  } catch (err) {
    console.error("Automated news sync failed:", err);
  }
}, SYNC_INTERVAL);

app.listen(PORT, "0.0.0.0", async () => {
    console.log(`[Imperial Server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[Imperial Server] Environment: ${process.env.NODE_ENV}`);
    
    // Auto-Pilot Mode: Trigger Sync at 08:00 AM IST and 08:00 PM IST
    setInterval(() => {
        const now = new Date();
        const istOffset = 5.5 * 60 * 60 * 1000;
        const istTime = new Date(now.getTime() + istOffset);
        const hours = istTime.getUTCHours();
        const minutes = istTime.getUTCMinutes();

        // 08:00 and 20:00 IST
        if ((hours === 8 || hours === 20) && minutes === 0) {
            console.log(`[Auto-Pilot] Triggering scheduled News Sync at ${hours}:00 IST`);
            syncNews().catch(err => console.error("Auto-Pilot sync failed:", err));
        }
    }, 60000); // Check every minute
    
    const client = getSupabase();
    if (client) {
      try {
        console.log("[Imperial Server] Auditing News Archives...");
        
        const { data } = await client.from('daily_news').select('id').limit(1);
        const supabaseEmpty = !data || data.length === 0;
        
        if (supabaseEmpty) {
          console.log("[Imperial Server] News archives empty or incomplete. Initiating background reconnaissance...");
          syncNews().catch(err => console.error("Initial background sync failed:", err));
        } else {
          console.log("[Imperial Server] News archives found. Ready for duty.");
        }
      } catch (err) {
        // High level warning instead of hard crash
        console.warn("[Imperial Server] Initial news reconnaissance check bypassed.");
      }
    } else {
      console.warn("[Imperial Server] Database not initialized. Some features may be offline.");
    }
  });
}

export default app;
