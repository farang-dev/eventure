require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkEvents() {
  const { data, error } = await supabase
    .from('music_events')
    .select('id, title, is_approved, starts_at, ends_at, lat, lng')
    .order('created_at', { ascending: false })
    .limit(5);

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Recent 5 events:', JSON.stringify(data, null, 2));
  }
}

checkEvents();
