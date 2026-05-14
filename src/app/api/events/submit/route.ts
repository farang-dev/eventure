import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Format the date/time strings into proper timestamps
    const startsAtStr = `${body.starts_date}T${body.starts_time}:00`;
    let endsDate = body.starts_date;
    
    // If it ends the next day, add 1 day to the date
    if (body.ends_next_day) {
      const d = new Date(body.starts_date);
      d.setDate(d.getDate() + 1);
      endsDate = d.toISOString().split('T')[0];
    }
    const endsAtStr = `${endsDate}T${body.ends_time}:00`;

    const newEvent = {
      title: body.title,
      venue_name: body.venue_name,
      venue_address: body.venue_address,
      description: `${body.description}\n\nSubmitted by: ${body.submitter_name} (${body.contact_email})`,
      genre: body.genre,
      lat: body.lat,
      lng: body.lng,
      starts_at: startsAtStr,
      ends_at: endsAtStr,
      artists: body.artists.filter((a: string) => a.trim() !== ''),
      ticket_url: body.ticket_url,
      source_url: body.ticket_url, // fallback
      price: body.price ? `${body.currency} ${body.price}` : 'TBD',
      city: 'submitted', // generic placeholder for user submitted
      is_approved: false, // Needs manual approval
    };

    // Insert into Supabase
    const { data, error } = await supabase
      .from('music_events')
      .insert([newEvent])
      .select();

    if (error) {
      console.error('Supabase Insert Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Generate Magic Links for 1-click Approval/Rejection
    const eventId = data[0].id;
    // Using a simple secret key from env or fallback for MVP
    const secret = process.env.ADMIN_SECRET || 'eventure_admin_2026';
    const baseUrl = 'https://www.eventurer.online';
    
    const approveUrl = `${baseUrl}/api/events/approve?id=${eventId}&secret=${secret}`;
    const rejectUrl = `${baseUrl}/api/events/reject?id=${eventId}&secret=${secret}`;

    // Send WhatsApp notification via CallMeBot
    const phone = "818041185473";
    const apiKey = "2645005";
    const message = `🚨 *New Event Submitted!*\n\n*Title:* ${body.title}\n*Venue:* ${body.venue_name}\n*Genre:* ${body.genre}\n*Date:* ${body.starts_date}\n\n✅ *APPROVE:*\n${approveUrl}\n\n🚫 *REJECT:*\n${rejectUrl}`;
    
    const whatsappUrl = `https://api.callmebot.com/whatsapp.php?phone=${phone}&text=${encodeURIComponent(message)}&apikey=${apiKey}`;
    
    // We don't await this so it doesn't block the response, or we can await it just to be sure
    await fetch(whatsappUrl).catch(console.error);

    return NextResponse.json({ success: true, event: data[0] });
    
  } catch (error) {
    console.error('Submit API Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
