import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL || '', process.env.VITE_SUPABASE_ANON_KEY || '');
async function test() {
  const tables = ['area_guideline', 'area_sd', 'area_dd', 'permit_design', 'area_cd90'];
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    console.log(table, count, error);
  }
}
test();
