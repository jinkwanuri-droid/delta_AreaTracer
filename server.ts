import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import puppeteer from "puppeteer";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const getSupabase = () => {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || "";
  if (!url || !key) {
    if (process.env.NODE_ENV === "production") {
      console.warn("SUPABASE CONFIG MISSING: Please set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in Vercel.");
    }
    return null;
  }
  return createClient(url, key);
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // Global Settings Persistence API (using Supabase)
  app.get("/api/global-settings", async (req, res) => {
    try {
      console.log("Fetching global settings from Supabase tables: app_config, dept_notes, room_notes");
      
      const supabase = getSupabase();
      if (!supabase) {
        console.warn("Supabase configuration missing in environment variables.");
        return res.status(503).json({ 
          error: "Supabase configuration missing", 
          details: "VITE_SUPABASE_URL or keys are not set in environment variables." 
        });
      }

      // Fetch core config
      const { data: configData, error: configError } = await supabase
        .from("app_config")
        .select("*");
      
      if (configError) {
        console.error("Supabase app_config fetch error:", configError);
        throw configError;
      }

      const config: any = {};
      configData?.forEach(item => {
        let val = item.value;
        if (typeof val === 'string' && (val.startsWith('{') || val.startsWith('['))) {
          try {
            val = JSON.parse(val);
          } catch (e) {
            // Keep as string if not valid JSON
          }
        }
        config[item.key] = val;
      });

      // Fetch dept notes
      const { data: deptNotesData, error: deptError } = await supabase
        .from("dept_notes")
        .select("*");
      
      if (deptError) {
        console.error("Supabase dept_notes fetch error:", deptError);
      }

      const deptNotes: Record<string, string> = {};
      deptNotesData?.forEach((item: any) => {
        const key = item.dept_no || item.dept_id || item.id;
        if (key) deptNotes[key] = item.content;
      });

      // Fetch room notes
      const { data: roomNotesData, error: roomError } = await supabase
        .from("room_notes")
        .select("*");
      
      if (roomError) {
        console.error("Supabase room_notes fetch error:", roomError);
      }

      const roomNotes: Record<string, string> = {};
      roomNotesData?.forEach((item: any) => {
        const key = item.room_no || item.room_id || item.id;
        if (key) roomNotes[key] = item.content;
      });

      const result = {
        ...config,
        departmentNotes: deptNotes,
        roomNotes: roomNotes
      };

      console.log(`Successfully fetched settings. Config keys: ${Object.keys(config).length}, Dept Notes: ${Object.keys(deptNotes).length}, Room Notes: ${Object.keys(roomNotes).length}`);
      res.json(result);
    } catch (error: any) {
      console.error("Critical error in /api/global-settings GET:", error.message || error);
      res.status(500).json({ 
        error: "Failed to read settings from Supabase", 
        details: error.message || "Unknown error" 
      });
    }
  });

  app.post("/api/global-settings", async (req, res) => {
    try {
      const settings = req.body;
      console.log("Saving global settings to Supabase...");

      const supabase = getSupabase();
      if (!supabase) {
        throw new Error("Supabase URL or Key is missing in environment variables.");
      }
      
      // 1. Save core config
      const { departmentNotes, roomNotes, ...coreConfig } = settings;
      
      const configEntries = Object.entries(coreConfig).map(([key, value]) => ({
        key,
        value
      }));

      if (configEntries.length > 0) {
        const { error: configErr } = await supabase.from("app_config").upsert(configEntries);
        if (configErr) throw configErr;
      }

      // 2. Save dept notes
      if (departmentNotes) {
        const deptEntries = Object.entries(departmentNotes).map(([dept_no, content]) => ({
          dept_no,
          content: content as string
        }));
        if (deptEntries.length > 0) {
          const { error: deptErr } = await supabase.from("dept_notes").upsert(deptEntries);
          if (deptErr) throw deptErr;
        }
      }

      // 3. Save room notes
      if (roomNotes) {
        const roomEntries = Object.entries(roomNotes).map(([room_no, content]) => ({
          room_no,
          content: content as string
        }));
        if (roomEntries.length > 0) {
          const { error: roomErr } = await supabase.from("room_notes").upsert(roomEntries);
          if (roomErr) throw roomErr;
        }
      }

      console.log("Successfully saved global settings to Supabase.");
      res.json({ success: true });
    } catch (error: any) {
      console.error("Critical error in /api/global-settings POST:", error.message || error);
      res.status(500).json({ 
        error: "Failed to save settings to Supabase",
        details: error.message || "Unknown error"
      });
    }
  });

  app.post("/api/export-pdf", async (req, res) => {
    try {
      const { html, width, height } = req.body;
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      const page = await browser.newPage();
      
      // We will emulate media type print
      await page.emulateMediaType('print');
      await page.setContent(html, { waitUntil: 'load' });
      
      // Wait for network requests to be idle (useful for loading external CDN webfonts)
      await page.waitForNetworkIdle().catch(() => {});
      
      // Ensure web fonts are download and loaded by wait for documents fonts ready state
      await page.evaluateHandle(() => document.fonts.ready);
      
      // Convert to PDF
      const pdfBuffer = await page.pdf({
        printBackground: true,
        width: width || 'A3',
        height: height || 'A3',
        margin: { top: '0', bottom: '0', left: '0', right: '0' }
      });
      
      await browser.close();
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=export.pdf');
      res.send(Buffer.from(pdfBuffer));
    } catch (error) {
      console.error("PDF generation error:", error);
      res.status(500).send('Error generating PDF');
    }
  });

  app.get("/api/keep-awake", async (req, res) => {
    try {
      const supabase = getSupabase();
      if (!supabase) {
        throw new Error("Supabase URL or Key is missing in environment variables.");
      }
      
      const { error } = await supabase
        .from('app_config')
        .select('*')
        .limit(1);

      res.json({
        ok: !error,
        timestamp: Date.now()
      });

    } catch (err) {
      res.status(500).json({
        ok: false,
        error: String(err)
      });
    }
  });

  // Mock Data
  const mockProject = { id: "p1", name: "경상남도 서부의료원" };
  const mockStages = [
    { id: "s1", name: "지침면적", order: 1 },
    { id: "s2", name: "계획설계", order: 2 },
    { id: "s3", name: "중간설계", order: 3 },
    { id: "s4", name: "실시설계", order: 4 }
  ];
  const mockFloors = [
    { id: "f1", name: "3F", order: 3 },
    { id: "f2", name: "2F", order: 2 },
    { id: "f3", name: "1F", order: 1 },
    { id: "f4", name: "B1", order: -1 },
    { id: "f5", name: "B2", order: -2 }
  ];

  const mockDivisions = [
    { id: "1", name: "병동부", order: 1 },
    { id: "2", name: "외래진료부", order: 2 },
    { id: "3", name: "중앙진료부", order: 3 },
    { id: "4", name: "공급/지원부", order: 4 }
  ];

  const mockDepts = [
    { id: "101", divisionId: "1", name: "일반병동", order: 1 },
    { id: "102", divisionId: "1", name: "중환자실", order: 2 },
    { id: "201", divisionId: "2", name: "내과외래", order: 1 },
    { id: "202", divisionId: "2", name: "안과외래", order: 2 },
    { id: "301", divisionId: "3", name: "수술실", order: 1 },
    { id: "302", divisionId: "3", name: "응급의료센터", order: 2 },
    { id: "401", divisionId: "4", name: "중앙공급실", order: 1 },
    { id: "402", divisionId: "4", name: "기계/전기실", order: 2 }
  ];

  const mockFloorAreas: Record<string, number> = {
    "f1": 3000,
    "f2": 3000,
    "f3": 3500,
    "f4": 4000,
    "f5": 4000
  };

  const mockRooms: any[] = [];
  const mockValues: any[] = [];

  mockFloors.forEach((f, fIdx) => {
    for (let i = 1; i <= 50; i++) {
      const dept = mockDepts[Math.floor(Math.random() * mockDepts.length)];
      const roomId = `r-${f.name}-${i}`;
      const roomNo = `${dept.id}-${String(i).padStart(2, '0')}`;
      
      mockRooms.push({
        id: roomId,
        floorId: f.id,
        departmentId: dept.id,
        no: roomNo,
        name: `${dept.name} 실 ${i}`,
        note: i % 10 === 0 ? "면적 검토 필요" : "특이사항 없음"
      });

      mockStages.forEach((s, sIdx) => {
        const baseArea = 20 + Math.random() * 40;
        const varArea = sIdx * 5;
        mockValues.push({
          roomId: roomId,
          stageId: s.id,
          unitArea: parseFloat((baseArea + varArea).toFixed(2)),
          quantity: Math.floor(Math.random() * 5) + 1
        });
      });
    }
  });

  // API Routes
  app.get("/api/projects/:id", async (req, res) => {
    res.json({ ...mockProject, stages: mockStages });
  });

  app.get("/api/projects/:id/data", async (req, res) => {
    res.json({ 
      floors: mockFloors, 
      divisions: mockDivisions,
      departments: mockDepts, 
      rooms: mockRooms, 
      values: mockValues,
      floorAreas: mockFloorAreas
    });
  });


  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
