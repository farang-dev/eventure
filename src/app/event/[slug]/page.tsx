import { Metadata } from "next";
import { notFound } from "next/navigation";
import MusicEventDetail from "@/components/MusicEventDetail";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { MusicEvent } from "@/lib/types";
import { MOCK_EVENTS } from "@/lib/mock-data";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

// Helper to generate a slug for comparison - now with extreme safety
function createSlug(title: string | null | undefined, city: string | null | undefined): string {
  const t = title || "event";
  const c = city || "various";
  return `${c}-${t}`
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') 
    .replace(/[\s_]+/g, '-')  
    .replace(/^-+|-+$/g, ''); 
}

async function getEventBySlugOrId(slug: string): Promise<MusicEvent | null> {
  if (!slug) return null;

  // 1. Check if slug is a valid UUID
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
  
  // 2. Fetch from Supabase by ID first if UUID
  if (isUuid && supabase) {
    try {
      const { data } = await supabase.from('music_events').select('*').eq('id', slug).single();
      if (data) return data as MusicEvent;
    } catch (err) {
      console.error("ID search error:", err);
    }
  }

  // 3. Check MOCK_EVENTS (covers e1, e2 and slug forms)
  const foundMock = MOCK_EVENTS.find(e => e.id === slug || createSlug(e.title, e.city) === slug);
  if (foundMock) return foundMock;

  // 4. Try Slug match in Supabase (Limit to a reasonable count to avoid crash)
  if (supabase) {
    try {
      const { data: recentEvents } = await supabase.from('music_events').select('*').limit(100);
      if (recentEvents) {
        const found = recentEvents.find(e => createSlug(e.title, e.city) === slug);
        if (found) return found as MusicEvent;
      }
    } catch (err) {
      console.error("Slug search error:", err);
    }
  }

  return null;
}

export async function generateMetadata(props: { 
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);
  
  if (!event) return { title: "Event Not Found | Eventure" };

  const title = `${event.title || "Special Event"} at ${event.venue_name || "Secret Venue"} | Eventure`;
  const description = event.description?.slice(0, 160) || `Join this event at ${event.venue_name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: event.image_url ? [event.image_url] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: event.image_url ? [event.image_url] : [],
    }
  };
}

export default async function EventPage(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  
  let event: MusicEvent | null = null;
  try {
    event = await getEventBySlugOrId(slug);
  } catch (e) {
    console.error("Critical SSR Error:", e);
    // Return a safe error UI instead of crashing the whole server function
  }

  if (!event) return notFound();

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
