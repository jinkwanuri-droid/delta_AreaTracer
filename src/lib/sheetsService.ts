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

async function fetchSheetData(spreadsheetId: string, sheetName: string): Promise<any[]> {
  const apiKey = (import.meta as any).env.VITE_GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error('Google Sheets API Key not configured');

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(sheetName)}?valueRenderOption=UNFORMATTED_VALUE&key=${apiKey}`;
  
  const response = await fetch(url);

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to fetch sheet data');
  }

  const data = await response.json();
  if (!data.values || data.values.length < 2) return [];

  const headers = data.values[0].map((h: any) => h?.toString().toLowerCase().trim());
  const rows = data.values.slice(1);

  return rows.map((row: any[]) => {
    const obj: any = {};
    headers.forEach((h: string, i: number) => {
      const mappedKey = COLUMN_MAPPINGS[h] || h;
      obj[mappedKey] = row[i];
    });
    return obj;
  }).filter((r: any) => r.room_no && r.room_no.toString().trim() !== "");
}


export const fetchAllStagesFromSheets = async (spreadsheetId: string, stages: { name: string, id: string }[]) => {
  const results: Record<string, any[]> = {};
  
  // Use user's specific sheet names if they don't match stage names exactly
  // Or just try to match by name
  await Promise.all(stages.map(async (stage) => {
    try {
      const data = await fetchSheetData(spreadsheetId, stage.name);
      results[stage.id] = data;
    } catch (e) {
      console.warn(`Could not fetch sheet for stage ${stage.name}:`, e);
      results[stage.id] = [];
    }
  }));

  return results;
};
