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

// Helper to generate a slug for comparison
function createSlug(title: string, city: string): string {
  return `${city}-${title}`
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove non-word chars
    .replace(/[\s_]+/g, '-')  // Replace spaces with hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens
}

async function getEventBySlugOrId(slug: string): Promise<MusicEvent | null> {
  // 1. Check MOCK_EVENTS by ID
  const mockById = MOCK_EVENTS.find(e => e.id === slug);
  if (mockById) return mockById;

  // 2. Check MOCK_EVENTS by generated slug
  const mockBySlug = MOCK_EVENTS.find(e => createSlug(e.title, e.city) === slug);
  if (mockBySlug) return mockBySlug;

  // 3. Check Supabase
  if (!supabase) return null;

  try {
    // A. Check by ID (if UUID)
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);
    if (isUuid) {
      const { data } = await supabase.from('music_events').select('*').eq('id', slug).single();
      if (data) return data as MusicEvent;
    }

    // B. Check by Title/City match (slow but works as slug fallback)
    // In a real app, we'd have a 'slug' column in DB.
    // For now, we'll try to find an event where we can recreate this slug.
    const { data: allEvents } = await supabase.from('music_events').select('*');
    if (allEvents) {
      const found = allEvents.find(e => createSlug(e.title, e.city) === slug);
      if (found) return found as MusicEvent;
    }
  } catch (err) {
    console.error("Fetch error:", err);
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
