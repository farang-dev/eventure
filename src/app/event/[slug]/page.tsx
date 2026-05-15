import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Ticket, ExternalLink, Music, Star, Share2 } from "lucide-react";
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
  const mock = MOCK_EVENTS.find(e => e.id === slug || createSlug(e.title, e.city) === cleanSlug);
  if (mock) return mock;
  if (!supabase) return null;
  try {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug.replace(/[^\w-]/g, ''));
    if (isUuid) {
      const { data } = await supabase.from('music_events').select('*').eq('id', slug).single();
      if (data) return data as MusicEvent;
    }
    const { data: recent } = await supabase.from('music_events').select('*').order('created_at', { ascending: false }).limit(100);
    if (recent) {
      const found = recent.find((e: MusicEvent) => createSlug(e.title, e.city) === cleanSlug || e.id === slug);
      if (found) return found as MusicEvent;
    }
  } catch (err) {}
  return null;
}

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);
  if (!event) return { title: "Event Detail | Eventure" };
  return { title: `${event.title} | Eventure` };
}

export default async function EventPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  if (!event) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#0D1117', color: 'white', minHeight: '100vh' }}>
        <h2>Event Not Found</h2>
        <Link href="/" style={{ color: '#E63946' }}>Back to Map</Link>
      </div>
    );
  }

  // Pure string-based date formatting to avoid Intl/timezone crashes
  const dateObj = new Date(event.starts_at);
  const dateStr = dateObj.toDateString(); 
  const timeStr = dateObj.toTimeString().slice(0, 5);

  return (
    <div className="app-shell" style={{ maxWidth: 600, margin: "0 auto", borderLeft: "1px solid #30363D", borderRight: "1px solid #30363D", background: '#0D1117', color: 'white', minHeight: '100vh' }}>
      <div style={{ position: "relative", width: "100%" }}>
        {/* Hero Image */}
        <div style={{ width: "100%", height: 350, background: "#161B22", position: "relative", overflow: "hidden" }}>
          {event.image_url ? (
            <img src={event.image_url} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Music size={60} color="#30363D" />
            </div>
          )}
          <Link href="/" style={{ position: "absolute", top: 14, left: 14, width: 36, height: 36, borderRadius: "50%", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", textDecoration: "none" }}>
            <ArrowLeft size={18} />
          </Link>
        </div>

        {/* Content */}
        <div style={{ padding: "24px 20px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#E63946", fontSize: 12, fontWeight: 700, textTransform: "uppercase", marginBottom: 12 }}>
            <Clock size={14} />
            {dateStr} @ {timeStr}
          </div>
          
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 16, lineHeight: 1.1 }}>{event.title}</h1>
          
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: 16, background: "#161B22", borderRadius: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 8, background: "#30363D", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MapPin size={20} color="#848D97" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{event.venue_name}</div>
              <div style={{ fontSize: 13, color: "#848D97" }}>{event.city}</div>
            </div>
          </div>

          {(event.artists || []).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "#848D97", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>Lineup</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(event.artists || []).map((a: string) => (
                  <span key={a} style={{ padding: "6px 12px", background: "#161B22", border: "1px solid #30363D", borderRadius: 8, fontSize: 14 }}>{a}</span>
                ))}
              </div>
            </div>
          )}

          {event.description && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: "#848D97", fontWeight: 700, textTransform: "uppercase", marginBottom: 10 }}>About</div>
              <p style={{ color: "#C9D1D9", fontSize: 15, lineHeight: 1.6 }}>{event.description}</p>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 30 }}>
            {event.ticket_url && (
              <a href={event.ticket_url} target="_blank" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, background: "#E63946", color: "white", borderRadius: 12, fontWeight: 700, textDecoration: "none" }}>
                <Ticket size={18} /> Get Tickets <ExternalLink size={14} />
              </a>
            )}
            <button style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: 16, background: "#161B22", border: "1px solid #30363D", color: "white", borderRadius: 12, fontWeight: 700, cursor: "pointer" }}>
              <Share2 size={18} /> Share Event
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
