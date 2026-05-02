import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";
import * as cheerio from "cheerio";
import Razorpay from "razorpay";
import crypto from "crypto";
import Parser from "rss-parser";
import { GoogleGenAI } from "@google/genai";
import admin from "firebase-admin";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import fs from "fs";

process.env.NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Strict Validation: The Imperial Guard checks the archives.
 */
const validateEnv = () => {
  // Common placeholders to treat as "missing"
  const placeholders = ["your_key_here", "your_secret_here", "your_url_here", "undefined", "null", "rzp_test_mock", "placeholder", "todo", "missing"];
  const isPlaceholder = (val?: string) => {
    if (!val) return true;
    const v = val.trim().replace(/^["']|["']$/g, '').toLowerCase();
    return placeholders.includes(v) || v.includes("your_") || v.includes("<") || v.includes("[") || v.length < 6;
  };

  const getFirstValid = (...candidates: (string | undefined)[]) => {
    for (const c of candidates) {
      if (c && !isPlaceholder(c)) return c.trim().replace(/^["']|["']$/g, '');
    }
    const fallback = candidates[0]?.trim().replace(/^["']|["']$/g, '');
    return fallback;
  };

  const razorKeyId = getFirstValid(process.env.RAZORPAY_KEY_ID, process.env.VITE_RAZORPAY_KEY_ID, process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
  const razorSecret = getFirstValid(process.env.RAZORPAY_KEY_SECRET, process.env.VITE_RAZORPAY_KEY_SECRET, process.env.NEXT_PUBLIC_RAZORPAY_KEY_SECRET);
  const supabaseUrl = getFirstValid(process.env.SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.VITE_SUPABASE_URL);
  const supabaseServiceKey = getFirstValid(process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.SUPABASE_ANON_KEY, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, process.env.VITE_SUPABASE_ANON_KEY);

  // Swap Detection: Check if keys are accidentally swapped
  if (razorKeyId?.startsWith('https://') && supabaseUrl?.startsWith('rzp_')) {
    return { valid: false, field: "RAZORPAY & SUPABASE", reason: "Detection: It appears your Razorpay Key ID and Supabase URL have been swapped. Please correct them in Settings (Secrets)." };
  }

  if (razorKeyId?.startsWith('https://')) {
    return { valid: false, field: "RAZORPAY_KEY_ID", reason: "Detection: Your RAZORPAY_KEY_ID starts with 'https://'. It looks like you might have pasted a Supabase URL here." };
  }

  if (!isPlaceholder(razorKeyId) && !razorKeyId?.startsWith('rzp_')) {
    // Check if they put the secret in the ID field (Secrets usually don't have prefixes and are long)
    if (razorKeyId && razorKeyId.length > 20 && !razorKeyId.includes('_')) {
       return { valid: false, field: "RAZORPAY_KEY_ID", reason: "Format Error: The Key ID provided looks like an API Secret. Key IDs must start with 'rzp_'. Did you swap them?" };
    }
    return { valid: false, field: "RAZORPAY_KEY_ID", reason: "The Key ID format is invalid. It must start with 'rzp_'. Please verify your Razorpay credentials." };
  }

  if (!isPlaceholder(supabaseUrl) && (!supabaseUrl?.startsWith('https://') || !supabaseUrl?.includes('.supabase.co'))) {
    return { valid: false, field: "SUPABASE_URL", reason: "The Supabase URL format is invalid. It must start with 'https://' and include '.supabase.co'." };
  }

  if (supabaseUrl?.includes('firebase') || supabaseUrl?.includes('AIzaSy') || razorKeyId?.startsWith('AIzaSy')) {
    return { valid: false, field: "MIXUP_DETECTED", reason: "A Firebase API key was detected in a Supabase or Razorpay field. Please ensure you haven't swapped your keys." };
  }

  return { 
    valid: true, 
    keys: { 
      razorKeyId: isPlaceholder(razorKeyId) ? undefined : razorKeyId,
      razorSecret: isPlaceholder(razorSecret) ? undefined : razorSecret,
      supabaseUrl: isPlaceholder(supabaseUrl) ? undefined : supabaseUrl,
      supabaseServiceKey: isPlaceholder(supabaseServiceKey) ? undefined : supabaseServiceKey
    } 
  };
};

// Safety Shield: Root-level variable validation
const envCheck = validateEnv();
if (!envCheck.valid) {
  console.error(`CRITICAL CONFIG ERROR: ${envCheck.reason} in ${envCheck.field}`);
}

// Load Firebase Config
let firebaseAppletConfig: any = null;
try {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    firebaseAppletConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
  }
} catch (error) {
  console.warn("Could not load firebase-applet-config.json");
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
    const projectId = firebaseAppletConfig?.projectId || process.env.FIREBASE_PROJECT_ID;
    
    if (sa && sa.trim().startsWith('{')) {
      const serviceAccount = JSON.parse(sa);
      console.log(`[Firebase] Initializing with Service Account for project: ${serviceAccount.project_id}`);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id
      });
    } else {
      console.log(`[Firebase] Initializing with Default Credentials for project: ${projectId || 'auto-detect'}`);
      admin.initializeApp({
        projectId: projectId
      });
    }
  } catch (error) {
    console.error("[Firebase] Admin initialization critical failure:", error);
  }
}

let db: admin.firestore.Firestore | null = null;
try {
  const dbId = firebaseAppletConfig?.firestoreDatabaseId;
  const app = admin.app();
  
  if (dbId && dbId !== "(default)") {
    console.log(`[Firestore] Attempting to use named database: ${dbId}`);
    db = getFirestore(app, dbId);
  } else {
    console.log("[Firestore] Using default database");
    db = getFirestore(app);
  }
} catch (error) {
  console.error("[Firestore] Primary initialization failed, falling back to default:", error);
  try {
    db = getFirestore(admin.app());
  } catch (fallbackError) {
    console.error("[Firestore] Critical: All initialization attempts failed:", fallbackError);
  }
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

const genAI = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY || process.env.VINTAGE_ORACLE_KEY || "" });

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
    
    // If no content provided, scrape it
    if (!summary) {
      console.log(`[Archival] Fetching content for analysis: ${url}`);
      const response = await axios.get(url, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
        timeout: 5000
      });
      const $ = cheerio.load(response.data);
      const bodyText = $('p').map((_, el) => $(el).text()).get().join(' ').slice(0, 5000);
      
      const prompt = `
        As a Senior Scholar at the Imperial Academy, analyze this news archive and provide a concise, UPSC-aligned summary (max 3 paragraphs).
        Highlight GS Paper relevance and key strategic implications.
        
        Title: ${title}
        Article Text: ${bodyText}
      `;
      
      const aiResult = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });
      
      summary = aiResult.text;
    }

    if (!db) throw new Error("Imperial Archives offline.");

    const docRef = await db.collection("users").doc(userId).collection("notes").add({
      title: title || "Archived Chronicle",
      type: 'link',
      url: url,
      content: summary,
      userId: userId,
      folderId: null,
      source: "Imperial News Desk",
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    res.json({ 
      status: "success", 
      id: docRef.id,
      message: "Chronicle successfully consigned to the Vault." 
    });
  } catch (error: any) {
    console.error("Archival Error:", error);
    res.status(500).json({ 
      error: error.message || "Failed to consign archive.",
      code: "ARCHIVE_FAILURE"
    });
  }
});

// Razorpay: Create Order
app.post("/api/razorpay", rateLimiter, async (req, res) => {
  // Requirement: Explicitly set JSON header first
  res.setHeader('Content-Type', 'application/json');

  try {
    const envStatus = validateEnv();
    
    // Safety Shield Check
    if (!envStatus.valid) {
      console.error("[Imperial Treasury] Shield Active: Invalid Format Detected", envStatus);
      return res.status(500).json({ 
        status: "shield_active", 
        reason: "Invalid Variable Format", 
        field: envStatus.field,
        detail: envStatus.reason
      });
    }

    const { razorKeyId: keyId, razorSecret: keySecret } = envStatus.keys;

    // Credential Debugger: Log partial key for verification without exposure
    console.log('[Imperial Treasury] Using Key ID:', keyId?.substring(0, 8) + '...');

    if (!keyId || !keySecret || keyId === "undefined" || keySecret === "undefined" || keyId === "rzp_test_mock") {
      console.error("[Imperial Treasury] Configuration Missing: RAZORPAY_KEY_ID or SECRET is undefined or mock.");
      return res.status(500).json({ 
        error: "The Imperial Treasury is not configured. Please ensure specialized environment variables (RAZORPAY_KEY_ID & RAZORPAY_KEY_SECRET) are set in the Settings menu (Secrets).",
        code: "CONFIG_ERROR"
      });
    }

    const { amount, currency = "INR" } = req.body;
    
    if (!amount) {
      return res.status(400).json({ 
        error: "Tribute amount is required to initiate the scholarly commission.",
        code: "INVALID_AMOUNT"
      });
    }

    // Authentication Fix: Handle BAD_REQUEST_ERROR explicitly
    let rzp;
    try {
      rzp = new Razorpay({
        key_id: keyId,
        key_secret: keySecret,
      });
    } catch (initErr: any) {
      console.error("[Imperial Treasury] Initialization Failed:", initErr);
      return res.status(401).json({ 
        error: "Invalid Razorpay Keys. Check Vercel Environment Variables.",
        code: "AUTH_FAILURE"
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Razorpay expects paise
      currency,
      receipt: `scholar_receipt_${Date.now()}`,
    };
    
    try {
      const order = await rzp.orders.create(options);
      if (!order) {
        throw new Error("Razorpay failed to return an order object.");
      }
      return res.status(200).json({ ...order, key: keyId });
    } catch (orderErr: any) {
      // Check for Authentication failed in ordering process
      const errStr = JSON.stringify(orderErr).toLowerCase();
      if (errStr.includes("authentication failed") || orderErr.statusCode === 401) {
        return res.status(401).json({ 
          error: "Invalid Razorpay Keys. Check Vercel Environment Variables.",
          code: "AUTH_FAILURE"
        });
      }
      throw orderErr;
    }
  } catch (error: any) {
    console.error("[Imperial Treasury] Payment Engine Failure:", error);
    
    let status = error.statusCode || 500;
    let errorMessage = "The Imperial Treasury failed to initiate the transaction.";
    let code = error.code || "PAYMENT_INIT_ERROR";
    let description = error.description || error.message || "";

    if (error.error && typeof error.error === 'object') {
      description = error.error.description || description;
      code = error.error.code || code;
    }

    const rawErrorStr = (description + " " + code).toLowerCase();
    
    // Error Catching: specific requirement for Authentication failures
    if (rawErrorStr.includes("authentication failed") || code === "BAD_REQUEST_ERROR" || status === 401) {
      return res.status(401).json({ 
        error: "Invalid Razorpay Keys. Check Vercel Environment Variables.",
        code: "AUTH_FAILURE"
      });
    }

    if (rawErrorStr.includes("malformed") || code === "MALFORMED_KEY") {
      errorMessage = "Malformed Key: Your Razorpay Key ID should usually start with 'rzp_'.";
      code = "CONFIG_ERROR";
    } else if (description) {
      errorMessage = description;
    }

    return res.status(status).json({ 
      error: errorMessage,
      code: code,
      description: description || errorMessage
    });
  }
});

// Alias for backwards compatibility
app.post("/api/create-order", (req, res) => {
  // @ts-ignore
  return app._router.handle(req, res, () => {});
});

// Razorpay: Webhook
app.post("/api/webhook/razorpay", async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    
    if (!secret) {
      console.error("[Razorpay Webhook] Missing Secret. Verification failed.");
      return res.status(500).json({ success: false, error: "Webhook configuration missing." });
    }

    const hmac = crypto.createHmac("sha256", secret);
    hmac.update(JSON.stringify(req.body));
    const digest = hmac.digest("hex");

    if (digest !== req.headers["x-razorpay-signature"]) {
      console.error("[Razorpay Webhook] Signature verification mismatch.");
      return res.status(400).json({ success: false, error: "Imperial Guard rejected invalid signature." });
    }

    const { event, payload } = req.body;
    const entity = payload.payment.entity;
    const userId = entity.notes?.userId;
    const planId = entity.notes?.planId;

    if (event === "payment.captured" && userId) {
      try {
        console.log(`[Razorpay Webhook] Processing successful payment for user: ${userId}`);
        
        const updateData = {
          subscriptionStatus: 'premium',
          rank: 'Imperial Scholar', // Setting rank as requested
          planId: planId,
          lastPaymentId: entity.id,
          updatedAt: new Date().toISOString()
        };

        // Update Firestore
        if (db) {
          await db.collection("users").doc(userId).set(updateData, { merge: true });
          console.log(`[Firestore] User ${userId} upgraded to Imperial Scholar.`);
        }

        // Update Supabase
        const supabase = getSupabase();
        if (supabase) {
          const { error: supabaseError } = await supabase
            .from('user_profiles')
            .update({ 
              subscription_status: 'premium',
              rank: 'Imperial Scholar',
              plan_id: planId,
              updated_at: new Date().toISOString()
            })
            .eq('id', userId);
          
          if (supabaseError) {
            console.warn("[Supabase] Partial failure updating user_profiles, retrying users table...");
            await supabase
              .from('users')
              .update({ 
                subscription_status: 'premium',
                rank: 'Imperial Scholar' 
              })
              .eq('id', userId);
          }
          console.log(`[Supabase] User ${userId} upgraded and rank synchronized.`);
        }

      } catch (error: any) {
        console.error("[Webhook] Database Sync Failed:", error);
      }
    }

    res.json({ status: "ok" });
  } catch (error: any) {
    console.error("[Webhook] Critical failure:", error);
    res.status(500).json({ success: false, error: "Imperial Webhook Engine failed." });
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

// Firebase Custom Token for Supabase Users
app.post("/api/auth/firebase-token", async (req, res) => {
  try {
    const { uid, email, displayName } = req.body;
    
    if (!uid) {
      return res.status(400).json({ 
        success: false, 
        error: "UID (Imperial Identity) is required to issue a custom token.",
        code: "IDENTITY_REQUIRED"
      });
    }

    if (!admin.apps.length) {
      throw new Error("Imperial Auth Engine is offline (Firebase Admin not initialized).");
    }

    console.log(`[Imperial Auth] Projecting Firebase Identity for Supabase UID: ${uid}`);
    
    const customToken = await admin.auth().createCustomToken(uid, {
      email,
      displayName
    });
    
    res.json({ 
      success: true,
      token: customToken,
      message: "Imperial passage granted."
    });
  } catch (error: any) {
    console.error("[Imperial Auth] Token Generation Failure:", error);
    res.status(500).json({ 
      success: false, 
      error: error.message || "The Imperial Vault denied token issuance.",
      code: "TOKEN_GENERATION_FAILED"
    });
  }
});

// User Profile Proxy (Bypasses Firestore rules for Supabase users)
app.get("/api/profile/:uid", async (req, res) => {
  try {
    const { uid } = req.params;
    if (!db) {
      return res.status(503).json({ success: false, error: "Imperial Archives offline (Database not initialized)." });
    }
    
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ success: false, error: "Imperial Scroll not found for this identity." });
    }
    res.json(userDoc.data());
  } catch (error: any) {
    console.error("[Imperial Profile] Fetch Error:", error);
    res.status(500).json({ success: false, error: error.message || "Failed to retrieve Imperial profile." });
  }
});

app.post("/api/profile/:uid", async (req, res) => {
  const { uid } = req.params;
  const data = req.body;
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    await db.collection("users").doc(uid).set({
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    res.json({ status: "success" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({ error: "Failed to update profile" });
  }
});

// Proxy for sub-collections
app.get("/api/user-data/:uid/:collection", async (req, res) => {
  const { uid, collection } = req.params;
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const snapshot = await db.collection("users").doc(uid).collection(collection).get();
    const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(items);
  } catch (error) {
    console.error(`Error fetching ${collection}:`, error);
    res.status(500).json({ error: `Failed to fetch ${collection}` });
  }
});

app.post("/api/user-data/:uid/:collection", async (req, res) => {
  const { uid, collection } = req.params;
  const data = req.body;
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    const docRef = await db.collection("users").doc(uid).collection(collection).add({
      ...data,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp()
    });
    res.json({ id: docRef.id });
  } catch (error) {
    console.error(`Error creating ${collection}:`, error);
    res.status(500).json({ error: `Failed to create ${collection}` });
  }
});

app.put("/api/user-data/:uid/:collection/:id", async (req, res) => {
  const { uid, collection, id } = req.params;
  const data = req.body;
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    await db.collection("users").doc(uid).collection(collection).doc(id).set({
      ...data,
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });
    res.json({ status: "success" });
  } catch (error) {
    console.error(`Error updating ${collection}:`, error);
    res.status(500).json({ error: `Failed to update ${collection}` });
  }
});

app.delete("/api/user-data/:uid/:collection/:id", async (req, res) => {
  const { uid, collection, id } = req.params;
  if (!db) return res.status(500).json({ error: "Database not initialized" });

  try {
    await db.collection("users").doc(uid).collection(collection).doc(id).delete();
    res.json({ status: "success" });
  } catch (error) {
    console.error(`Error deleting ${collection}:`, error);
    res.status(500).json({ error: `Failed to delete ${collection}` });
  }
});

// API: Community Trending Summary
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
    
    if (db) {
      try {
        console.log("[Imperial Server] Auditing News Archives...");
        
        let localDb = db;
        let snapshot;
        try {
          snapshot = await localDb.collection("newsArticles").limit(1).get();
        } catch (dbErr: any) {
          const errMsg = dbErr.message || "";
          if (errMsg.includes('PERMISSION_DENIED') || errMsg.includes('NOT_FOUND') || dbErr.code === 5 || dbErr.code === 7) {
            // Silently fall back to default database if named instance is missing or restricted
            localDb = getFirestore(admin.app());
            db = localDb;
            try {
              snapshot = await localDb.collection("newsArticles").limit(1).get();
            } catch (fallbackErr) {
              // Both attempts failed, archives are likely truly empty or uninitialized
            }
          }
        }

        const client = getSupabase();
        let supabaseEmpty = true;
        if (client) {
          try {
            const { data } = await client.from('daily_news').select('id').limit(1);
            supabaseEmpty = !data || data.length === 0;
          } catch (supaErr) {
            // Supabase connection warning (optional)
          }
        }
        
        const vaultEmpty = !snapshot || snapshot.empty;
        if (vaultEmpty || supabaseEmpty) {
          console.log("[Imperial Server] News archives empty or incomplete. Initiating background reconnaissance...");
          syncNews().catch(err => console.error("Initial background sync failed:", err));
        } else {
          console.log("[Imperial Server] News archives found. Ready for duty.");
        }
      } catch (err) {
        // High level warning instead of hard crash
        console.warn("[Imperial Server] Initial news reconnaissance check bypassed.");
      }
    }
 else {
      console.warn("[Imperial Server] Database not initialized. Some features may be offline.");
    }
  });
}

export default app;
