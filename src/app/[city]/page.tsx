import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { CITIES, CITY_META } from "@/lib/constants";
import { GENRE_META } from "@/lib/mock-data";
import type { MusicEvent } from "@/lib/types";
import { createSlug } from "@/lib/utils";
import { MapPin, Calendar, Music, ArrowRight, ExternalLink, Building2, Map as MapIcon } from "lucide-react";

export const revalidate = 60;

export async function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.id }));
}

export async function generateMetadata(props: { params: Promise<{ city: string }> }) {
  const { city } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  if (!info) return { title: "Eventure" };
  const meta = CITY_META[city] || {};
  return {
    title: `${info.name} Club Events & Nightlife | Eventure`,
    description: meta.description || `Discover club events in ${info.name}.`,
    keywords: meta.keywords || [`${info.name} events`],
    openGraph: {
      title: `${info.name} Club Events | Eventure`,
      description: meta.description || `Find the best parties in ${info.name}.`,
      url: `https://www.eventurer.online/${city}`,
    },
    alternates: {
      canonical: `https://www.eventurer.online/${city}`,
    },
  };
}

const CITY_GRADIENTS: Record<string, string> = {
  tokyo: "linear-gradient(135deg, #E63946 0%, #8B5CF6 100%)",
  berlin: "linear-gradient(135deg, #10B981 0%, #06B6D4 100%)",
  london: "linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)",
  barcelona: "linear-gradient(135deg, #F59E0B 0%, #EF4444 100%)",
  "new-york": "linear-gradient(135deg, #6366F1 0%, #EC4899 100%)",
  amsterdam: "linear-gradient(135deg, #F97316 0%, #F59E0B 100%)",
  paris: "linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)",
  osaka: "linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%)",
  vilnius: "linear-gradient(135deg, #0EA5E9 0%, #10B981 100%)",
  belgrade: "linear-gradient(135deg, #64748B 0%, #475569 100%)",
  tbilisi: "linear-gradient(135deg, #DC2626 0%, #0EA5E9 100%)",
  sydney: "linear-gradient(135deg, #06B6D4 0%, #6366F1 100%)",
  melbourne: "linear-gradient(135deg, #F43F5E 0%, #A855F7 100%)",
  perth: "linear-gradient(135deg, #EAB308 0%, #14B8A6 100%)",
  "los-angeles": "linear-gradient(135deg, #FB923C 0%, #A855F7 100%)",
  chicago: "linear-gradient(135deg, #3B82F6 0%, #EF4444 100%)",
  miami: "linear-gradient(135deg, #06B6D4 0%, #F43F5E 100%)",
};

function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  } catch { return dateStr; }
}

function formatTime(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  } catch { return ""; }
}

function EventCard({ event }: { event: MusicEvent }) {
  const meta = GENRE_META[event.genre] ?? GENRE_META.other;
  const slug = createSlug(event.title, event.city);
  const genreColor = meta.color;
  const genreBg = meta.bg;

  return (
    <Link
      href={`/event/${slug}`}
      className="card-hover-effect"
      style={{
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        gap: 16,
        padding: "16px 20px",
        background: "var(--bg-elevated)",
        borderRadius: 14,
        border: "1px solid var(--border)",
        cursor: "pointer",
        transition: "border-color 0.15s, transform 0.15s",
      }}
    >
      {event.image_url && (
        <div style={{ width: 100, height: 100, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--bg)" }}>
          <img src={event.image_url} alt={event.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ background: genreBg, border: `1px solid ${genreColor}44`, color: genreColor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {meta.label}
          </span>
          {event.source_url && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 3 }}>
              <ExternalLink size={10} /> RA
            </span>
          )}
        </div>
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.3 }}>
          {event.title}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-secondary)", fontSize: 12, marginBottom: 6 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={11} /> {formatDate(event.starts_at)} · {formatTime(event.starts_at)}
          </span>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <MapPin size={11} /> {event.venue_name}
          </span>
        </div>
        {(event.artists || []).length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {event.artists.slice(0, 3).map((a, i) => (
              <span key={i} style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg)", padding: "2px 7px", borderRadius: 6 }}>
                {a}
              </span>
            ))}
            {event.artists.length > 3 && (
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>+{event.artists.length - 3}</span>
            )}
          </div>
        )}
        {event.price && (
          <div style={{ marginTop: 6, fontSize: 12, fontWeight: 700, color: event.price === "Free" ? "var(--green)" : "var(--text-primary)" }}>
            {event.price}
          </div>
        )}
      </div>
    </Link>
  );
}

export default async function CityPage(props: { params: Promise<{ city: string }> }) {
  const { city } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  if (!info) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  let initialEvents: MusicEvent[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("music_events")
        .select("*")
        .eq("city", city)
        .gte("ends_at", now)
        .or("is_approved.eq.true,is_approved.is.null")
        .order("starts_at", { ascending: true })
        .limit(500);
      if (data) {
        initialEvents = data as MusicEvent[];
      }
    } catch (e) {
      console.error(`Failed to fetch events for ${city}:`, e);
    }
  }

  const eventCount = initialEvents.length;
  const cityUrl = `https://www.eventurer.online/${city}`;
  const gradient = CITY_GRADIENTS[city] || "linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))";

  // Group events by genre for the filter links
  const genreCounts: Record<string, number> = {};
  for (const e of initialEvents) {
    genreCounts[e.genre || "other"] = (genreCounts[e.genre || "other"] || 0) + 1;
  }

  const cityLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Eventure", item: "https://www.eventurer.online" },
        { "@type": "ListItem", position: 2, name: info.name, item: cityUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${info.name} Club Events`,
      description: `Upcoming electronic music events in ${info.name}, ${info.country}.`,
      url: cityUrl,
      numberOfItems: eventCount,
      itemListElement: initialEvents.slice(0, 20).map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "MusicEvent",
          name: e.title,
          url: `https://www.eventurer.online/event/${createSlug(e.title, e.city)}`,
          startDate: e.starts_at,
          location: { "@type": "Place", name: e.venue_name },
        },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cityLd) }} />
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}>
        {/* Nav Header */}
        <header style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-secondary)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg, var(--primary), var(--purple))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Poppins', sans-serif" }}>
                Eventure
              </span>
            </Link>
            <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5 }}>
                <MapIcon size={16} /> Map
              </Link>
            </nav>
          </div>
        </header>

        <main style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "40px 20px" }}>
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", marginBottom: 24 }}>
            <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
            <span>/</span>
            <Link href="/cities" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Cities</Link>
            <span>/</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{info.name}</span>
          </nav>

          {/* Hero */}
          <section style={{ marginBottom: 40, textAlign: "center", padding: "48px 20px", borderRadius: 20, background: gradient, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "rgba(255,255,255,0.7)", marginBottom: 8, display: "block" }}>
                {info.country}
              </span>
              <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontFamily: "'Poppins', sans-serif", fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.02em" }}>
                {info.name} Events
              </h1>
              <p style={{ fontSize: 16, color: "rgba(255,255,255,0.85)", maxWidth: 600, margin: "0 auto 24px", lineHeight: 1.6 }}>
                {eventCount > 0
                  ? `Discover ${eventCount} upcoming club night${eventCount !== 1 ? "s" : ""}, party${eventCount !== 1 ? "ies" : "y"} and electronic music events in ${info.name}.`
                  : `Explore the electronic music scene in ${info.name}.`}
              </p>
              <div style={{ display: "flex", justifyContent: "center", gap: 12, flexWrap: "wrap" }}>
                <Link
                  href="/"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "var(--primary)", color: "#fff", borderRadius: 10, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
                >
                  <MapIcon size={15} /> Open Live Map
                </Link>
              </div>
            </div>
          </section>

          {/* Genre filter links */}
          {Object.keys(genreCounts).length > 0 && (
            <section style={{ marginBottom: 32 }}>
              <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>
                Browse by Genre
              </h2>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {Object.entries(genreCounts)
                  .sort(([, a], [, b]) => b - a)
                  .map(([g, count]) => {
                    const m = GENRE_META[g] ?? GENRE_META.other;
                    return (
                      <Link
                        key={g}
                        href={`/${city}/${g}`}
                        style={{ background: m.bg, border: `1px solid ${m.color}33`, color: m.color, padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 700, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}
                      >
                        <Music size={12} />
                        {m.label} ({count})
                      </Link>
                    );
                  })}
              </div>
            </section>
          )}

          {/* Event list */}
          <section>
            <h2 style={{ fontSize: 18, fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
              Upcoming Events
              {eventCount > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 15 }}> · {eventCount} total</span>}
            </h2>
            {initialEvents.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {initialEvents.map((event) => (
                  <EventCard key={event.id || `${event.title}-${event.starts_at}`} event={event} />
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)", background: "var(--bg-elevated)", borderRadius: 14, border: "1px solid var(--border)" }}>
                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8, color: "var(--text-primary)" }}>
                  No upcoming events in {info.name}
                </h3>
                <p style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                  Events are updated daily. Check back soon or browse the live map for nearby parties.
                </p>
                <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "var(--primary)", color: "#fff", borderRadius: 10, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                  <MapIcon size={15} /> Browse Live Map
                </Link>
              </div>
            )}
          </section>
        </main>

        {/* Footer */}
        <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 48 }}>
          <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}>Eventure</Link>
          {" "}· Live interactive map of club events worldwide
        </footer>
      </div>
    </>
  );
}
