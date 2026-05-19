import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('settings').select('*').limit(2);
  const snap1 = data?.[0];
  console.log("Snapshot settings keys:", snap1 ? Object.keys(snap1.settings) : "no snap");
}
run();
