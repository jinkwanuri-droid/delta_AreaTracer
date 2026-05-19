import * as dotenv from 'dotenv';
dotenv.config();

// Create a completely fake store state using logic from useAppStore directly
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const t1 = await supabase.from('permit_design').select('level').eq('level', '5F');
  const t2 = await supabase.from('area_cd90').select('level').eq('level', '5F');
  console.log('permit_design 5F count:', t1.data?.length);
  console.log('area_cd90 5F count:', t2.data?.length);
  
  const allCd90 = await supabase.from('area_cd90').select('level, room_no, area');
  console.log('area_cd90 top levels:', Array.from(new Set(allCd90.data?.map(d => d.level))));
  
  const room101_01 = allCd90.data?.filter(d => d.room_no === '101-01' || d.room_no === '101 - 01');
  console.log('101-01 in area_cd90:', room101_01);
}

test();

