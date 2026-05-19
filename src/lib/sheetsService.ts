import { getAccessToken } from './auth';

export interface SheetRow {
  level: string;
  room_no: string;
  name: string;
  area: number;
}

const COLUMN_MAPPINGS: Record<string, string> = {
  '층': 'level',
  'floor': 'level',
  'level': 'level',
  '실번호': 'room_no',
  'no': 'room_no',
  'room_no': 'room_no',
  '실명': 'name',
  'name': 'name',
  '면적': 'area',
  'area': 'area',
};

async function fetchSheetDataBatch(spreadsheetId: string, sheetNames: string[]): Promise<Record<string, any[]>> {
  const apiKey = (import.meta as any).env.VITE_GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error('Google Sheets API Key not configured');

  if (sheetNames.length === 0) return {};

  const rangesQuery = sheetNames.map(name => `ranges=${encodeURIComponent(name)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&key=${apiKey}&${rangesQuery}`;
  
  const response = await fetch(url);

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to fetch sheet data');
  }

  const data = await response.json();
  const results: Record<string, any[]> = {};

  if (data.valueRanges) {
    data.valueRanges.forEach((rangeData: any, idx: number) => {
      const sheetName = sheetNames[idx];
      if (!rangeData.values || rangeData.values.length < 2) {
        results[sheetName] = [];
        return;
      }

      const headers = rangeData.values[0].map((h: any) => h?.toString().toLowerCase().trim());
      const rows = rangeData.values.slice(1);

      results[sheetName] = rows.map((row: any[]) => {
        const obj: any = {};
        headers.forEach((h: string, i: number) => {
          const mappedKey = COLUMN_MAPPINGS[h] || h;
          obj[mappedKey] = row[i];
        });
        return obj;
      }).filter((r: any) => r.room_no && r.room_no.toString().trim() !== "");
    });
  }

  return results;
}

export const fetchAllStagesFromSheets = async (spreadsheetId: string, stages: { name: string, id: string }[]) => {
  const results: Record<string, any[]> = {};
  
  try {
    const sheetNames = stages.map(s => s.name);
    const batchData = await fetchSheetDataBatch(spreadsheetId, sheetNames);
    
    stages.forEach(stage => {
      results[stage.id] = batchData[stage.name] || [];
    });
  } catch (e) {
    console.warn("Could not fetch sheets in batch:", e);
    stages.forEach(stage => {
      results[stage.id] = [];
    });
  }

  return results;
};
