import { Metadata } from "next";
import { notFound } from "next/navigation";
import MusicEventDetail from "@/components/MusicEventDetail";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { MusicEvent } from "@/lib/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function getEvent(id: string): Promise<MusicEvent | null> {
  const { data } = await supabase.from('music_events').select('*').eq('id', id).single();
  return data as MusicEvent | null;
}

export async function generateMetadata(props: { 
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const { id } = await props.params;
  const event = await getEvent(id);
  if (!event) return { title: "Event Not Found" };

  const title = `${event.title} at ${event.venue_name} | Eventure`;
  const description = event.description 
    ? event.description.slice(0, 150) + "..."
    : `Join ${event.title} at ${event.venue_name} on ${new Date(event.starts_at).toLocaleDateString()}. Get tickets and info.`;

  return {
    title,
    description,
    keywords: [event.genre, event.venue_name, event.city, "club event", "Eventure", ...(event.artists || [])],
    openGraph: {
      title,
      description,
      images: event.image_url ? [event.image_url] : [],
    },
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
