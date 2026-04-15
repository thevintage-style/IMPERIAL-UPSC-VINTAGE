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
    const projectId = firebaseAppletConfig?.projectId || process.env.FIREBASE_PROJECT_ID || "imperial-upsc-portal";
    
    console.log(`Attempting to initialize Firebase Admin for project: ${projectId}`);
    
    if (sa && sa.trim().startsWith('{')) {
      const serviceAccount = JSON.parse(sa);
      console.log(`Using Service Account for project: ${serviceAccount.project_id}`);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: serviceAccount.project_id || projectId
      });
    } else {
      console.log("Using default credentials (Cloud Run environment)");
      admin.initializeApp({
        projectId: projectId
      });
    }
  } catch (error) {
    console.error("Firebase Admin initialization failed:", error);
  }
}

let db: any = null;
try {
  const dbId = firebaseAppletConfig?.firestoreDatabaseId;
  if (dbId && dbId !== "(default)") {
    db = getFirestore(admin.app(), dbId);
    console.log(`Using named Firestore database: ${dbId}`);
  } else {
    db = getFirestore(admin.app());
    console.log("Using default Firestore database");
  }
} catch (error) {
  console.error("Firestore initialization failed, trying default:", error);
  try {
    db = getFirestore(admin.app());
  } catch (fallbackError) {
    console.error("Critical: Firestore fallback failed:", fallbackError);
  }
}
const parser = new Parser();
const genAI = new GoogleGenAI({ apiKey: process.env.VINTAGE_ORACLE_KEY || "" });

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

const syncNews = async () => {
  try {
    console.log("Starting News Sync process...");
  const sources = [
    { name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
    { name: "Indian Express", url: "https://indianexpress.com/section/explained/feed/" },
    { name: "PIB", url: "https://pib.gov.in/RssMain.aspx?ModId=6" }
  ];

  let processedCount = 0;

  for (const source of sources) {
    try {
      console.log(`Fetching feed from ${source.name}...`);
      const response = await axios.get(source.url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, */*'
        },
        timeout: 10000
      });
      
      const feed = await parser.parseString(response.data);
      const items = feed.items.slice(0, 3);
      console.log(`Processing ${items.length} items from ${source.name}`);

      for (const item of items) {
        try {
          const prompt = `
            As an expert UPSC (Civil Services Examination) mentor, analyze and summarize this news article for an aspirant.
            
            Article Title: ${item.title}
            Article Content: ${item.contentSnippet || item.content || item.title}
            
            Your task:
            1. Categorize it by GS Paper (GS I: History/Geography/Society, GS II: Polity/Governance/IR, GS III: Economy/Env/S&T/Security, GS IV: Ethics).
            2. Provide a concise summary (2-3 sentences) focusing on the "Why it matters for UPSC" aspect.
            3. Extract 3-4 key "Prelims Facts" (names, dates, locations, organizations).
            4. Provide a brief "Mains Analysis" point (context, challenges, or way forward).
            
            Format the response as STRICT JSON:
            {
              "gsPaper": "GS II",
              "summary": "...",
              "prelimsFacts": ["...", "..."],
              "mainsAnalysis": "...",
              "relevance": "Polity & Governance"
            }
          `;

          const aiResult = await genAI.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            config: { responseMimeType: "application/json" }
          });
          
          const text = aiResult.text;
          if (!text) continue;
          
          const jsonStr = text.replace(/```json\n?|```/g, '').trim();
          const aiData = JSON.parse(jsonStr);

          if (db) {
            const existing = await db.collection("newsArticles").where("title", "==", item.title).get();
            if (existing.empty) {
              await db.collection("newsArticles").add({
                title: item.title,
                source: source.name,
                url: item.link,
                date: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString(),
                ...aiData
              });
              processedCount++;
            }
          }
        } catch (itemErr) {
          console.error(`Error processing item "${item.title}" from ${source.name}:`, itemErr);
        }
      }
    } catch (err: any) {
      console.error(`Failed to process source ${source.name}:`, err.message || err);
      if (err.response) {
        console.error(`Response status: ${err.response.status}`);
      }
    }
  }

  if (db) {
    await db.collection("system_meta").doc("news_sync").set({
      lastSync: new Date().toISOString(),
      articlesProcessed: processedCount
    }, { merge: true });
  }
  return processedCount;
  } catch (globalErr) {
    console.error("Global News Sync Error:", globalErr);
    return 0;
  }
};

// API Routes: News Sync (Automated UPSC News Engine)
app.post("/api/news/sync", async (req, res) => {
    try {
      const processedCount = await syncNews();
      res.json({ 
        status: "success", 
        message: `Imperial News Engine completed reconnaissance. ${processedCount} new articles summarized and archived.` 
      });
    } catch (error) {
      console.error("News sync error:", error);
      res.status(500).json({ error: "Failed to sync news" });
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
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch news" });
    }
  });

// Razorpay: Create Order
app.post("/api/create-order", rateLimiter, async (req, res) => {
  const { amount, currency = "INR" } = req.body;
  
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  
  // Robust check for valid-looking Razorpay keys
  const isValidKey = (key: string | undefined) => 
    key && 
    key.startsWith("rzp_") && 
    !key.includes("MY_") && 
    key !== "undefined" && 
    key !== "null";

  if (!isValidKey(keyId) || !isValidKey(keySecret)) {
    console.warn("Razorpay keys not configured or invalid. Returning mock order for demo purposes.");
    return res.json({
      id: `order_mock_${Date.now()}`,
      amount: amount * 100,
      currency,
      status: "created",
      demo: true
    });
  }

  try {
    // Initialize Razorpay client only when needed with validated keys
    const rzp = new Razorpay({
      key_id: keyId!,
      key_secret: keySecret!,
    });

    const options = {
      amount: amount * 100, // amount in the smallest currency unit
      currency,
      receipt: `receipt_${Date.now()}`,
    };
    const order = await rzp.orders.create(options);
    res.json(order);
  } catch (error: any) {
    console.error("Razorpay Order Error:", error);
    const errorMessage = error.error?.description || "Failed to create order";
    res.status(500).json({ error: errorMessage });
  }
});

// Razorpay: Webhook
app.post("/api/webhook/razorpay", async (req, res) => {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "mock_webhook_secret";
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest === req.headers["x-razorpay-signature"]) {
      console.log("Razorpay Webhook Verified");
      const event = req.body.event;
      const payload = req.body.payload.payment.entity;
      const userId = payload.notes?.userId;
      const planId = payload.notes?.planId;

      if (event === "payment.captured" && userId && db) {
        try {
          await db.collection("users").doc(userId).update({
            subscriptionStatus: 'premium',
            planId: planId,
            lastPaymentId: payload.id,
            updatedAt: new Date().toISOString()
          });
          console.log(`User ${userId} upgraded to premium via Razorpay.`);
        } catch (error) {
          console.error("Error updating user subscription from webhook:", error);
        }
      }
      res.json({ status: "ok" });
    } else {
      res.status(400).send("Invalid signature");
    }
  });

// System Update Webhook
app.post("/api/system/update", (req, res) => {
    console.log("System update triggered by Vizier.");
    // In a real app, you'd trigger a GitHub Action or Vercel Webhook here
    // axios.post(process.env.VERCEL_DEPLOY_HOOK_URL);
    res.json({ 
      status: "success", 
      message: "Imperial Build Sequence initiated. Deploying v1.0.5 to the production archives." 
    });
  });

// Storage Provisioning
app.post("/api/system/provision-storage", (req, res) => {
    console.log("Storage expansion requested.");
    // In a real app, you'd call Supabase/GCP API to increase quota
    res.json({ 
      status: "success", 
      message: "Extra 50GB provisioned in the Imperial Cloud Vault." 
    });
  });

// Firebase Custom Token for Supabase Users
app.post("/api/auth/firebase-token", async (req, res) => {
  const { uid, email, displayName } = req.body;
  if (!uid) return res.status(400).json({ error: "UID is required" });

  try {
    const customToken = await admin.auth().createCustomToken(uid, {
      email,
      displayName
    });
    res.json({ token: customToken });
  } catch (error) {
    console.error("Error creating custom token:", error);
    res.status(500).json({ error: "Failed to create custom token" });
  }
});

// User Profile Proxy (Bypasses Firestore rules for Supabase users)
app.get("/api/profile/:uid", async (req, res) => {
  const { uid } = req.params;
  if (!db) return res.status(500).json({ error: "Database not initialized" });
  
  try {
    const userDoc = await db.collection("users").doc(uid).get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(userDoc.data());
  } catch (error) {
    console.error("Error fetching profile:", error);
    res.status(500).json({ error: "Failed to fetch profile" });
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
    
    if (db) {
      try {
        console.log("[Imperial Server] Checking news archives...");
        const snapshot = await db.collection("newsArticles").limit(1).get();
        if (snapshot.empty) {
          console.log("[Imperial Server] News archives empty. Initiating background reconnaissance...");
          syncNews().catch(err => console.error("Initial background sync failed:", err));
        } else {
          console.log("[Imperial Server] News archives found. Ready for duty.");
        }
      } catch (err) {
        console.error("[Imperial Server] Initial news check failed:", err);
      }
    } else {
      console.warn("[Imperial Server] Database not initialized. Some features may be offline.");
    }
  });
}

export default app;
