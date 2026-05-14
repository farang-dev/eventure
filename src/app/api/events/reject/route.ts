import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const secret = searchParams.get('secret');

  const EXPECTED_SECRET = process.env.ADMIN_SECRET || 'eventure_admin_2026';

  if (secret !== EXPECTED_SECRET) {
    return new NextResponse('<h1>Unauthorized</h1><p>Invalid secret token.</p>', { status: 401, headers: { 'Content-Type': 'text/html' } });
  }

  if (!id) {
    return new NextResponse('<h1>Error</h1><p>No Event ID provided.</p>', { status: 400, headers: { 'Content-Type': 'text/html' } });
  }

  try {
    const { error } = await supabase
      .from('music_events')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return new NextResponse(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 50px;">
        <h1 style="color: #EF4444;">🚫 Event Rejected</h1>
        <p>The submission has been deleted from the database.</p>
        <script>setTimeout(() => window.close(), 3000);</script>
      </div>
    `, { status: 200, headers: { 'Content-Type': 'text/html' } });

  } catch (error: any) {
    console.error('Reject error:', error);
    return new NextResponse(`<h1>Database Error</h1><p>${error.message}</p>`, { status: 500, headers: { 'Content-Type': 'text/html' } });
  }
}
