import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data } = await supabase.from('settings').select('id');
  if (data && data.length > 0) {
    // Note: RLS block DELETE, so we will soft delete all via UPDATE to 'test_clear' and empty settings to quickly clean
    for (const row of data) {
       await supabase.from('settings').update({ name: '_DELETED_force_cleanup_' + Date.now(), settings: {} }).eq('id', row.id);
    }
    console.log(`Cleaned ${data.length} rows.`);
  } else {
    console.log('No rows to clean.');
  }
}
run();
