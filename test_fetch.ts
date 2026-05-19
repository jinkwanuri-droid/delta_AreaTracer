import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('settings').select('*');
  console.log('Error:', error);
  console.log('Data count:', data?.length);
  const visible = data?.filter(d => !d.name.startsWith('_DELETED_'));
  console.log('Visible configs:', visible?.map(d => ({id: d.id, name: d.name})));
}

run();
