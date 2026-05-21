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
  '비고': 'note',
  '노트': 'note',
  '메모': 'note',
  'note': 'note',
  'notes': 'note',
  'memo': 'note',
};

async function fetchSheetDataBatch(spreadsheetId: string, sheetNames: string[]): Promise<Record<string, any[]>> {
  const apiKey = (import.meta as any).env.VITE_GOOGLE_SHEETS_API_KEY;
  if (!apiKey) throw new Error('Google Sheets API Key not configured');

  if (sheetNames.length === 0) return {};

  let existingTabs: string[] = [];
  try {
    const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?key=${apiKey}`;
    const metaResponse = await fetch(metaUrl);
    if (!metaResponse.ok) {
      const err = await metaResponse.json();
      const message = err.error?.message || '';
      if (message.includes("not found") || message.includes("entity was not found") || message.includes("permission") || metaResponse.status === 404 || metaResponse.status === 403 || metaResponse.status === 400) {
        throw new Error("구글 스프레드시트 ID가 올바르지 않거나 공유 권한설정이 되어있지 않습니다. 구글 스프레드시트 우측 상단 '공유' 버튼을 클릭한 후 일반 액세스를 '링크가 있는 모든 사용자' 및 '뷰어' 상태로 설정했는지 확인해주세요.");
      }
      throw new Error(message || 'Failed to fetch spreadsheet metadata');
    }
    const metaData = await metaResponse.json();
    if (metaData.sheets) {
      existingTabs = metaData.sheets.map((s: any) => s.properties?.title).filter(Boolean);
    }
  } catch (e: any) {
    console.warn("Could not fetch spreadsheet metadata:", e);
    throw e;
  }

  // Filter sheetNames to only those that actually exist in the Google Spreadsheet
  const validSheetNames = sheetNames.filter(name => existingTabs.includes(name));
  
  const results: Record<string, any[]> = {};
  
  // Set empty default arrays for all requested sheets (so caller gets clean empty data if tab is missing)
  sheetNames.forEach(name => {
    results[name] = [];
  });

  if (validSheetNames.length === 0) {
    console.warn("No matching tabs found in the sheets for design stages name:", sheetNames);
    return results;
  }

  const rangesQuery = validSheetNames.map(name => `ranges=${encodeURIComponent(name)}`).join('&');
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchGet?valueRenderOption=UNFORMATTED_VALUE&key=${apiKey}&${rangesQuery}`;
  
  const response = await fetch(url);

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Failed to fetch sheet data from batchGet');
  }

  const data = await response.json();

  if (data.valueRanges) {
    data.valueRanges.forEach((rangeData: any, idx: number) => {
      const sheetName = validSheetNames[idx];
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
    throw e;
  }

  return results;
};
