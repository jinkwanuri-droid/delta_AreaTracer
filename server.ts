import express from "express";
import path from "path";
import fs from "fs";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

// Helper to get Supabase client
const getSupabase = () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) {
    return null;
  }
  try {
    return createClient(url, key);
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
    return null;
  }
};

// --- API ROUTES ---

app.get("/api/global-settings", async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) {
      return res.status(503).json({ error: "Supabase configuration missing" });
    }

    const { data: configData, error: configError } = await supabase.from("app_config").select("*");
    if (configError) throw configError;

    const config: any = {};
    configData?.forEach(item => {
      let val = item.value;
      if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
        try { val = JSON.parse(val); } catch (e) {}
      }
      config[item.key] = val;
    });

    const { data: deptNotesData, error: deptError } = await supabase.from("dept_notes").select("*");
    const deptNotes: Record<string, string> = {};
    deptNotesData?.forEach((item: any) => {
      const key = item.dept_no || item.dept_id || item.id;
      if (key) deptNotes[key] = item.content;
    });

    const { data: roomNotesData, error: roomError } = await supabase.from("room_notes").select("*");
    const roomNotes: Record<string, string> = {};
    roomNotesData?.forEach((item: any) => {
      const key = item.room_no || item.room_id || item.id;
      if (key) roomNotes[key] = item.content;
    });

    res.json({ ...config, departmentNotes: deptNotes, roomNotes: roomNotes });
  } catch (error: any) {
    console.error("Error in /api/global-settings GET:", error);
    res.status(500).json({ error: error.message || "Unknown error" });
  }
});

app.post("/api/global-settings", async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase missing");
    
    const { departmentNotes, roomNotes, ...coreConfig } = req.body;
    
    const configEntries = Object.entries(coreConfig).map(([key, value]) => ({ key, value }));
    if (configEntries.length > 0) {
      const { error } = await supabase.from("app_config").upsert(configEntries);
      if (error) throw error;
    }

    if (departmentNotes) {
      const deptEntries = Object.entries(departmentNotes).map(([dept_no, content]) => ({ dept_no, content: content as string }));
      if (deptEntries.length > 0) await supabase.from("dept_notes").upsert(deptEntries);
    }

    if (roomNotes) {
      const roomEntries = Object.entries(roomNotes).map(([room_no, content]) => ({ room_no, content: content as string }));
      if (roomEntries.length > 0) await supabase.from("room_notes").upsert(roomEntries);
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error("Error in /api/global-settings POST:", error);
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/sheets/metadata/:spreadsheetId", async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY || 
                   process.env.VITE_GOOGLE_SHEETS_API_KEY || 
                   process.env.VITE_GOOGLE_SHEETS_API || 
                   process.env.GOOGLE_SHEETS_API;
    
    if (!apiKey) return res.status(500).json({ error: { message: "API Key missing" } });

    const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

app.get("/api/sheets/values/:spreadsheetId", async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const { ranges } = req.query;
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY || 
                   process.env.VITE_GOOGLE_SHEETS_API_KEY || 
                   process.env.VITE_GOOGLE_SHEETS_API || 
                   process.env.GOOGLE_SHEETS_API;

    if (!apiKey) return res.status(500).json({ error: { message: "API Key missing" } });

    let url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&key=${apiKey}`;
    if (Array.isArray(ranges)) ranges.forEach(r => { url += `&ranges=${encodeURIComponent(String(r))}`; });
    else if (ranges) url += `&ranges=${encodeURIComponent(String(ranges))}`;

    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) return res.status(response.status).json(data);
    res.json(data);
  } catch (error: any) {
    res.status(500).json({ error: { message: error.message } });
  }
});

// --- CLIENT SERVING ---

const PORT = 3000;

if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
  // Local development with Vite
  import("vite").then(({ createServer }) => {
    createServer({ server: { middlewareMode: true }, appType: "spa" }).then(vite => {
      app.use(vite.middlewares);
      app.listen(PORT, "0.0.0.0", () => console.log(`Dev server on http://localhost:${PORT}`));
    });
  });
} else if (!process.env.VERCEL) {
  // Standard production serving (not Vercel)
  const distPath = path.join(process.cwd(), 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }
  app.listen(PORT, "0.0.0.0", () => console.log(`Prod server on port ${PORT}`));
}

export default app;

