import express from "express";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json({ limit: '50mb' }));

// Helper to get Supabase client
const getSupabase = () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) return null;
  try {
    return createClient(url, key);
  } catch (e) {
    console.error("Supabase init error:", e);
    return null;
  }
};

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Express is running on Vercel" });
});

// Settings API
app.get("/api/global-settings", async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) return res.status(503).json({ error: "Supabase missing" });

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

    const { data: deptNotesData } = await supabase.from("dept_notes").select("*");
    const deptNotes: Record<string, string> = {};
    deptNotesData?.forEach((item: any) => {
      const key = item.dept_no || item.dept_id || item.id;
      if (key) deptNotes[key] = item.content;
    });

    const { data: roomNotesData } = await supabase.from("room_notes").select("*");
    const roomNotes: Record<string, string> = {};
    roomNotesData?.forEach((item: any) => {
      const key = item.room_no || item.room_id || item.id;
      if (key) roomNotes[key] = item.content;
    });

    res.json({ ...config, departmentNotes: deptNotes, roomNotes: roomNotes });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/global-settings", async (req, res) => {
  try {
    const supabase = getSupabase();
    if (!supabase) throw new Error("Supabase missing");
    const { departmentNotes, roomNotes, ...coreConfig } = req.body;
    
    const configEntries = Object.entries(coreConfig).map(([key, value]) => ({ key, value }));
    if (configEntries.length > 0) await supabase.from("app_config").upsert(configEntries);

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
    res.status(500).json({ error: error.message });
  }
});

// Google Sheets API Proxy
app.get("/api/sheets/metadata/:spreadsheetId", async (req, res) => {
  try {
    const { spreadsheetId } = req.params;
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.VITE_GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_SHEETS_API;
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
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY || process.env.VITE_GOOGLE_SHEETS_API_KEY || process.env.GOOGLE_SHEETS_API;
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

export default app;
