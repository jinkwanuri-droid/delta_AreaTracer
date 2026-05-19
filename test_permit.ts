import * as dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const tables = ['area_permit', 'permit_design', 'permit_area', 'area_pm'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('level').limit(1);
    if (!error) {
      console.log(`Table ${t} exists. Data:`, data);
    } else {
      console.log(`Table ${t} missing. Error: ${error.message}`);
    }
  }
}

test();
