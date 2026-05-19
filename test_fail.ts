import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('settings').insert({
    name: 'test_insert_no_id',
    settings: {},
    created_at: new Date().toISOString()
  }).select();
  console.log('Error:', error);
}
run();
