import { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, MapPin, Clock, Ticket, ExternalLink, Music, Star, Share2, Check } from "lucide-react";
import { createClient } from "@supabase/supabase-js";
import { MusicEvent } from "@/lib/types";
import { MOCK_EVENTS, GENRE_META, CITY_TZS } from "@/lib/mock-data";
import { createSlug } from "@/lib/utils";
import GenreIcon from "@/components/GenreIcon";
import ShareButton from "@/components/ShareButton";

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
    
    // Extract city prefix to optimize Supabase query and fetch all matching city events
    const cities = ["tokyo", "osaka", "london", "vilnius", "belgrade", "tbilisi", "berlin", "new-york", "amsterdam", "paris", "barcelona", "sydney", "melbourne", "perth"];
    let matchedCity = "";
    for (const city of cities) {
      if (cleanSlug.startsWith(city.toLowerCase() + "-")) {
        matchedCity = city;
        break;
      }
    }

    if (matchedCity) {
      const { data: cityEvents } = await supabase
        .from('music_events')
        .select('*')
        .eq('city', matchedCity);
      if (cityEvents) {
        const found = cityEvents.find((e: MusicEvent) => createSlug(e.title, e.city) === cleanSlug);
        if (found) return found as MusicEvent;
      }
    }

    // Fallback: search across recent events in the database
    const { data: recent } = await supabase.from('music_events').select('*').order('created_at', { ascending: false }).limit(1000);
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
  const canonicalSlug = createSlug(event.title, event.city);
  const desc = event.description?.slice(0, 160) || `${event.title} at ${event.venue_name} in ${event.city}. ${event.artists?.length ? `Featuring ${event.artists.slice(0, 3).join(", ")}.` : ""} Get tickets and event info on Eventure.`;
  return { 
    title: `${event.title} | Eventure`,
    description: desc,
    openGraph: { 
      images: event.image_url ? [event.image_url] : [],
      url: `https://www.eventurer.online/event/${canonicalSlug}`,
    },
    alternates: {
      canonical: `https://www.eventurer.online/event/${canonicalSlug}`,
    },
  };
}

// Helper for safe time display
function getSafeTimeLabel(startsAt: string, city?: string) {
  try {
    const d = new Date(startsAt);
    const tz = city ? CITY_TZS[city.toLowerCase()] : "UTC";
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz });
    const date = d.toLocaleDateString("en-GB", { weekday: "long", month: "long", day: "numeric" });
    return { time, date };
  } catch (e) {
    const d = new Date(startsAt);
    return { time: d.toTimeString().slice(0, 5), date: d.toDateString() };
  }
}

export default async function EventPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  if (!event) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#0D1117', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔍</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Event Not Found</h2>
        <p style={{ color: '#848D97', marginBottom: 24 }}>Identifier: {slug}</p>
        <Link href="/" style={{ padding: '12px 24px', background: '#E63946', color: 'white', borderRadius: 12, textDecoration: 'none', fontWeight: 700 }}>Back to Map</Link>
      </div>
    );
  }

  const meta = GENRE_META[event.genre] || GENRE_META.other;
  const { time, date } = getSafeTimeLabel(event.starts_at, event.city);
  const isFeatured = event.is_featured;
  
  const displayPrice = (() => {
    if (!event.price) return "Check Flyer or Ask Organizer";
    const p = String(event.price).toLowerCase();
    // If it has numbers, it's likely a valid price even if it mentions RA
    const hasNumber = /\d/.test(p);
    if (hasNumber) return event.price;
    
    if (p.includes("ra") || p === "tbd" || p === "unknown" || p === "tickets") return "Check Flyer or Ask Organizer";
    return event.price;
  })();

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Eventure", item: "https://www.eventurer.online" },
      ...(event.city ? [{ "@type": "ListItem", position: 2, name: event.city, item: `https://www.eventurer.online/${event.city.toLowerCase().replace(/\s+/g, "-")}` }] : []),
      { "@type": "ListItem", position: event.city ? 3 : 2, name: event.title, item: `https://www.eventurer.online/event/${createSlug(event.title, event.city)}` },
    ],
  };

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.title,
    description: event.description?.slice(0, 200),
    startDate: event.starts_at,
    endDate: event.ends_at,
    ...(event.image_url ? { image: event.image_url } : {}),
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: event.venue_name,
      address: {
        "@type": "PostalAddress",
        addressLocality: event.city,
      },
    },
    ...((event.artists || []).length > 0 ? {
      performer: event.artists.map((a: string) => ({
        "@type": "MusicGroup",
        name: a,
      })),
    } : {}),
    ...(event.ticket_url ? {
      offers: {
        "@type": "Offer",
        url: event.ticket_url,
      },
    } : {}),
  };

  return (
    <div className="app-shell" style={{ maxWidth: 600, margin: "0 auto", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", background: 'var(--bg)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbLd, eventLd]) }}
      />
      <div style={{ flex: 1, overflowY: "auto", background: "var(--bg)", display: "flex", flexDirection: "column", position: "relative" }}>
        
        {/* HERO AREA */}
        <div style={{ width: "100%", height: 400, background: "#000", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {event.image_url ? (
            <img src={event.image_url} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${meta.bg}, #161B22)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GenreIcon name={meta.icon} size={64} color={meta.color} />
            </div>
          )}
          
          {/* Back Button */}
          <Link 
            href="/"
            style={{ position: "absolute", top: 14, left: 14, width: 36, height: 36, borderRadius: "50%", background: "rgba(13,17,23,0.75)", backdropFilter: "blur(6px)", border: "1px solid var(--border)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", zIndex: 10 }}
          >
            <ArrowLeft size={17} />
          </Link>

          {/* Featured/Live Badges */}
          <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 6, zIndex: 10 }}>
            {isFeatured && (
              <span className="badge badge-featured">
                <Star size={9} /> Featured
              </span>
            )}
          </div>
        </div>

        {/* CONTENT AREA */}
        <div style={{ padding: "24px 20px" }}>
          {/* Genre Tag */}
          <div style={{ marginBottom: 16 }}>
            <span style={{ background: meta.bg, border: `1px solid ${meta.color}44`, color: meta.color, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.07em", display: "inline-flex", alignItems: "center" }}>
              <GenreIcon name={meta.icon} size={11} style={{ marginRight: 5 }} />
              {meta.label}
            </span>
          </div>

          {/* Time + Title */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
              <Clock size={11} />
              {time}
            </div>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 32, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: 8 }}>
              {event.title}
            </h1>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", fontWeight: 500 }}>
              {date} · {time}
            </p>
          </div>

          {/* Lineup */}
          {(event.artists || []).length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Music size={13} color="var(--text-muted)" />
                <span className="label">Lineup</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {(event.artists || []).map((artist: string, i: number) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{artist}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Venue Card */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_address && event.venue_address !== event.venue_name ? `${event.venue_name}, ${event.venue_address}` : `${event.venue_name}, ${event.city}`)}`}
            target="_blank" rel="noopener noreferrer"
            style={{ padding: "13px 15px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 10, textDecoration: "none", cursor: "pointer", marginBottom: 24 }}
          >
            <div style={{ width: 34, height: 34, borderRadius: 9, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={15} color="var(--text-muted)" />
            </div>
            <div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>{event.venue_name}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{event.venue_address || "View on Google Maps"}</p>
            </div>
            <ExternalLink size={12} color="var(--text-muted)" style={{ marginLeft: "auto", alignSelf: "center" }} />
          </a>

          {/* Description */}
          {event.description && (
            <div style={{ marginBottom: 24 }}>
              <label className="label">About</label>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{event.description}</p>
            </div>
          )}

          {/* Price */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 15px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, marginBottom: 24 }}>
            <span className="label" style={{ marginBottom: 0 }}>Entrance Fee</span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: displayPrice.length > 20 ? 12 : 16, color: event.price === "Free" ? "var(--green)" : "var(--text-primary)" }}>{displayPrice}</span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {event.ticket_url && (
              <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "14px 20px", background: "var(--primary)", color: "#fff", borderRadius: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                <Ticket size={16} /> Get Tickets <ExternalLink size={12} />
              </a>
            )}
            {event.source_url && (
              <a href={event.source_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", background: "transparent", color: "var(--text-muted)", borderRadius: 10, border: "1px solid var(--border)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                <ExternalLink size={11} /> View Source
              </a>
            )}
          </div>

          <ShareButton url={`https://www.eventurer.online/event/${createSlug(event.title, event.city)}`} title={event.title} />
        </div>
      </div>
    </div>
  );
}
