import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Home } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { MusicEvent } from "@/lib/types";
import { MOCK_EVENTS } from "@/lib/mock-data";
import { createSlug } from "@/lib/utils";

// Initialize Supabase safely
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
let supabase: any = null;
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {}

async function getEventBySlugOrId(slug: string): Promise<MusicEvent | null> {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase();

  // 1. Mock Check
  const mock = MOCK_EVENTS.find(e => e.id === slug || createSlug(e.title, e.city) === cleanSlug);
  if (mock) return mock;

  // 2. Supabase Check
  if (!supabase) return null;
  try {
    // Exact ID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug.replace(/[^\w-]/g, ''));
    if (isUuid) {
      const { data } = await supabase.from('music_events').select('*').eq('id', slug).single();
      if (data) return data as MusicEvent;
    }

    // Recent events fallback
    const { data: recent } = await supabase.from('music_events').select('*').order('created_at', { ascending: false }).limit(100);
    if (recent) {
      const found = recent.find((e: any) => createSlug(e.title, e.city) === cleanSlug);
      if (found) return found as MusicEvent;
    }
  } catch (err) {}
  return null;
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return { title: "Event Detail | Eventure" };
}

export default async function EventPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  if (!event) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#0D1117', color: 'white', minHeight: '100vh' }}>
        <h2>Event Not Found</h2>
        <p>ID: {slug}</p>
        <Link href="/" style={{ color: '#E63946' }}>Back to home</Link>
      </div>
    );
  }

  // DIAGNOSTIC VIEW: If this renders, then MusicEventDetail was the cause of the crash.
  return (
    <div style={{ background: '#0D1117', color: 'white', minHeight: '100vh', padding: 20 }}>
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#848D97', textDecoration: 'none', marginBottom: 20 }}>
          <ArrowLeft size={20} /> Back
        </Link>
        
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 10 }}>{event.title}</h1>
        <div style={{ padding: 20, background: '#161B22', borderRadius: 12, border: '1px solid #30363D' }}>
          <p><strong>City:</strong> {event.city}</p>
          <p><strong>Venue:</strong> {event.venue_name}</p>
          <p><strong>Date:</strong> {String(event.starts_at)}</p>
          <p><strong>Genre:</strong> {event.genre}</p>
          <hr style={{ border: 'none', borderTop: '1px solid #30363D', margin: '15px 0' }} />
          <p style={{ color: '#848D97', fontSize: 14 }}>{event.description}</p>
        </div>

        <div style={{ marginTop: 20, fontSize: 11, color: '#484F58' }}>
          Diagnostic Mode: Basic Render Active
        </div>
      </div>
    </div>
  );
}
