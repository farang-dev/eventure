import { Metadata } from "next";
import MusicEventDetail from "@/components/MusicEventDetail";
import Link from "next/link";
import { ArrowLeft, Home, Search as SearchIcon } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { MusicEvent } from "@/lib/types";
import { MOCK_EVENTS } from "@/lib/mock-data";

import { createSlug } from "@/lib/utils";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
let supabase: any = null;

try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey);
  }
} catch (e) {
  console.error("Supabase init error:", e);
}

async function getEventBySlugOrId(slug: string): Promise<MusicEvent | null> {
  if (!slug) return null;
  const cleanSlug = slug.toLowerCase();

  // 1. ID Match (Mock or UUID)
  const mockById = MOCK_EVENTS.find(e => e.id === slug);
  if (mockById) return mockById;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug.replace(/[^\w-]/g, ''));
  if (isUuid && supabase) {
    try {
      const { data } = await supabase.from('music_events').select('*').eq('id', slug).single();
      if (data) return data as MusicEvent;
    } catch (err) {}
  }

  // 2. Mock Slug Match
  const mockBySlug = MOCK_EVENTS.find(e => createSlug(e.title, e.city) === cleanSlug);
  if (mockBySlug) return mockBySlug;

  // 3. Supabase Search
  if (supabase) {
    try {
      // Try exact slug check on recent events first
      const { data: recent } = await supabase.from('music_events').select('*').order('created_at', { ascending: false }).limit(200);
      if (recent) {
        const found = recent.find((e: MusicEvent) => createSlug(e.title, e.city) === cleanSlug || e.id === slug);
        if (found) return found as MusicEvent;
      }

      // Try title parts if still not found
      const titlePart = slug.split('-').slice(1).join(' ');
      if (titlePart.length > 3) {
        const { data: titleMatches } = await supabase.from('music_events').select('*').ilike('title', `%${titlePart}%`).limit(10);
        if (titleMatches && titleMatches.length > 0) return titleMatches[0] as MusicEvent;
      }
    } catch (err) {}
  }

  return null;
}

export async function generateMetadata(props: { 
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);
  if (!event) return { title: "Event Details | Eventure" };

  return {
    title: `${event.title} | Eventure`,
    description: event.description?.slice(0, 160),
    openGraph: { images: event.image_url ? [event.image_url] : [] }
  };
}

export default async function EventPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  // If SSR fails to find it, we provide a fallback UI that can try again on the client
  // or show a clean "Not Found" message.
  if (!event) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)' }}>
        <div style={{ textAlign: 'center', padding: '40px 20px', maxWidth: 400 }}>
          <div style={{ fontSize: 50, marginBottom: 20 }}>🔍</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Event Not Found</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.6, marginBottom: 30 }}>
            We couldn't find the event with the identifier: <code style={{ background: 'rgba(255,255,255,0.05)', padding: '2px 4px', borderRadius: 4 }}>{slug}</code>. It may have expired or been removed.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Link href="/" className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <Home size={16} /> Explore Other Events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ maxWidth: 600, margin: "0 auto", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)", display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ position: "absolute", top: 14, left: 14, zIndex: 50 }}>
          <Link 
            href="/"
            style={{
              width: 36, height: 36, borderRadius: "50%",
              background: "rgba(13,17,23,0.75)", backdropFilter: "blur(6px)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              textDecoration: "none",
            }}
          >
            <ArrowLeft size={17} />
          </Link>
        </div>
        <MusicEventDetail event={event} onBack={() => {}} />
      </div>
    </div>
  );
}
