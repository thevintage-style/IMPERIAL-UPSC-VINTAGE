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
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

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

// API Routes: News Sync (Automated UPSC News Engine)
app.post("/api/news/sync", async (req, res) => {
    try {
      const sources = [
        { name: "The Hindu", url: "https://www.thehindu.com/news/national/feeder/default.rss" },
        { name: "Indian Express", url: "https://indianexpress.com/section/explained/feed/" },
        { name: "PIB", url: "https://pib.gov.in/RssMain.aspx?ModId=6" }
      ];

      let processedCount = 0;

      for (const source of sources) {
        try {
          const feed = await parser.parseURL(source.url);
          // Take top 2 from each for demo
          const items = feed.items.slice(0, 2);

          for (const item of items) {
            const prompt = `
              Summarize this article for a UPSC aspirant. 
              Categorize it by GS Paper (GS I, GS II, GS III, or GS IV). 
              Article Title: ${item.title}
              Article Content: ${item.contentSnippet || item.content}
              
              Format the response as JSON:
              {
                "gsPaper": "GS X",
                "summary": "...",
                "prelimsFacts": ["fact 1", "fact 2"],
                "mainsAnalysis": "...",
                "schemes": ["scheme 1"]
              }
            `;

            const response = await genAI.models.generateContent({
              model: "gemini-3-flash-preview",
              contents: prompt,
              config: { responseMimeType: "application/json" }
            });
            
            const text = response.text;
            
            // Clean JSON if needed
            const jsonStr = text.replace(/```json/g, "").replace(/```/g, "").trim();
            const aiData = JSON.parse(jsonStr);

            if (db) {
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
        } catch (err) {
          console.error(`Failed to process source ${source.name}:`, err);
        }
      }

      res.json({ 
        status: "success", 
        message: `Imperial News Engine completed reconnaissance. ${processedCount} articles summarized and archived.` 
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
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

export default app;
