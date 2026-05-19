import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');

async function run() {
  const stageTables = [
    { id: 's1', table: 'area_guideline', name: '공모지침' },
    { id: 's2', table: 'area_sd', name: '계획설계' },
    { id: 's3', table: 'area_dd', name: '중간설계' },
    { id: 's4', table: 'permit_design', name: '인허가' },
    { id: 's5', table: 'area_cd90', name: '실시설계90' },
  ];

  type RawRow = { level: string; room_no: string; name: string; area: number | string };

  const rawDataByStage: Record<string, RawRow[]> = {};
  for (const st of stageTables) {
    const { data, error } = await supabase.from(st.table).select('level, room_no, name, area');
    if (error) console.error(error);
    rawDataByStage[st.id] = data || [];
  }

  const roomMap: Record<string, { no: string; name: string; level: string, maxStageIdx: number }> = {};
  const valuesMap: Record<string, Record<string, { totalArea: number; qty: number }>> = {};

  const floorSet = new Set<string>();
  const deptSet = new Set<string>();

  stageTables.forEach((st, idx) => {
    const data = rawDataByStage[st.id];
    data.forEach(row => {
      let { level, room_no, name, area } = row;
      if (!room_no) return;
      room_no = room_no.toString().trim();
      
      const numArea = typeof area === 'string' ? parseFloat(area) : area;
      if (isNaN(numArea)) return;
      
      if (level) floorSet.add(level.trim().toUpperCase());

      // Try to parse dept from room_no e.g. "101-01" -> "101"
      const deptMatch = room_no.match(/^([A-Za-z0-9]+)/);
      if (deptMatch) {
         deptSet.add(deptMatch[1]);
      }

      if (!roomMap[room_no]) {
        roomMap[room_no] = { no: room_no, name: name || '', level: level || '', maxStageIdx: idx };
      } else {
        if (idx > roomMap[room_no].maxStageIdx) {
          if (name) roomMap[room_no].name = name;
          if (level) roomMap[room_no].level = level;
          roomMap[room_no].maxStageIdx = idx;
        }
      }

      if (!valuesMap[room_no]) valuesMap[room_no] = {};
      if (!valuesMap[room_no][st.id]) valuesMap[room_no][st.id] = { totalArea: 0, qty: 0 };
      
      valuesMap[room_no][st.id].totalArea += numArea;
      valuesMap[room_no][st.id].qty += 1;
    });
  });
  
  console.log('unique floors', floorSet);
  console.log('unique depts', deptSet);
}
run();
