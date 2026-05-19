import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import puppeteer from "puppeteer";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

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
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      // Convert to PDF
      const pdfBuffer = await page.pdf({
        printBackground: true,
        width: width || 'A4',
        height: height || 'A4',
        margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' }
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
