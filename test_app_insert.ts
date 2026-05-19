import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const dataToSave = {
    stages: [], floors: [], divisions: [], departments: [], rooms: [], values: [], floorAreas: {}
  };
  const now = new Date().toISOString();
  console.log("Attempting to insert...");
  const res = await supabase.from('settings').insert({
    id: `snap-${Date.now()}`,
    name: '서부_v1', 
    settings: dataToSave, 
    created_at: now
  }).select();
  
  if(res.error) {
     console.error("Insertion error:", res.error);
  } else {
     console.log("Success:", res.data);
  }
}

run();
