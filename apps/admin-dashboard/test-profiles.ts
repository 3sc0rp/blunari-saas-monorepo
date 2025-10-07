import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = 'https://kbfbbkcaxhzlnbqxwgoz.supabase.co';
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Checking profiles table structure...');

const { data, error } = await supabase
  .from('profiles')
  .select('*')
  .limit(1);

if (error) {
  console.error('Error:', error);
} else {
  console.log('Sample profile:', data);
  if (data && data[0]) {
    console.log('Columns:', Object.keys(data[0]));
  }
}
