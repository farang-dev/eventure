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

async function getEvent(id: string): Promise<MusicEvent | null> {
  // 1. First, check MOCK_EVENTS (covers e1, e2, etc.)
  const mockEvent = MOCK_EVENTS.find((e: MusicEvent) => e.id === id);
  if (mockEvent) return mockEvent;

  // 2. If not in mock, and it's a valid UUID, check Supabase
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  if (isUuid && supabase) {
    try {
      const { data, error } = await supabase.from('music_events').select('*').eq('id', id).single();
      if (!error && data) return data as MusicEvent;
    } catch (err) {
      console.error("Supabase fetch error:", err);
    }
  }

  return null;
}

export async function generateMetadata(props: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const event = await getEvent(id);
  
  if (!event) return { 
    title: "Event Not Found | Eventure",
    description: "The requested event could not be found."
  };

  const title = `${event.title || "Special Event"} at ${event.venue_name || "Secret Venue"} | Eventure`;
  const eventDate = event.starts_at ? new Date(event.starts_at) : null;
  const dateStr = eventDate && !isNaN(eventDate.getTime()) ? eventDate.toLocaleDateString() : "TBA";
  
  const description = event.description 
    ? event.description.slice(0, 160) + "..."
    : `Join ${event.title || "this event"} at ${event.venue_name || "the venue"} on ${dateStr}. Get tickets and info on Eventure.`;

  return {
    title,
    description,
    keywords: [
      event.genre || "music", 
      event.venue_name || "", 
      event.city || "", 
      "club event", 
      "Eventure", 
      ...(event.artists || [])
    ].filter(Boolean),
    openGraph: {
      title,
      description,
      type: "website",
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
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { id } = await props.params;
  const event = await getEvent(id);
  if (!event) return notFound();

  return (
    <div className="app-shell" style={{ maxWidth: 600, margin: "0 auto", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)" }}>
      {/* We reuse the MusicEventDetail, but override onBack to act as a Link to home */}
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)", display: "flex", flexDirection: "column", position: "relative" }}>
        
        {/* Real link back to home for SSR / SEO routing context */}
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

        <MusicEventDetail 
          event={event} 
          onBack={() => {}} // Disabled as we use the Link above
        />
      </div>
    </div>
  );
}
