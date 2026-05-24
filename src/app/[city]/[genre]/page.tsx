import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { CITIES } from "@/lib/constants";
import { GENRE_META, CITY_TZS } from "@/lib/mock-data";
import type { MusicEvent } from "@/lib/types";
import { createEventUrl, createSlug } from "@/lib/utils";
import { MapPin, Calendar, Music, ArrowRight, ExternalLink, Map as MapIcon } from "lucide-react";
import Header from "@/components/Header";

export const revalidate = 60;

const GENRE_KEYS = Object.keys(GENRE_META);

export async function generateStaticParams() {
  const params: { city: string; genre: string }[] = [];
  for (const city of CITIES) {
    for (const genre of GENRE_KEYS) {
      params.push({ city: city.id, genre });
    }
  }
  return params;
}

export async function generateMetadata(props: { params: Promise<{ city: string; genre: string }> }) {
  const { city, genre } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  const meta = GENRE_META[genre];
  if (!info || !meta) return { title: "Eventure" };
  return {
    title: `${meta.label} Events in ${info.name} | Eventure`,
    description: `Find the best ${meta.label.toLowerCase()} nights, parties & club events in ${info.name}, ${info.country}. Live map with real-time schedules and ticket links.`,
    alternates: {
      canonical: `https://www.eventurer.online/${city}/${genre}`,
    },
    openGraph: {
      title: `${meta.label} Events in ${info.name} | Eventure`,
      description: `Find ${meta.label.toLowerCase()} parties in ${info.name} on a live map.`,
    },
  };
}

function getOptimizedImageUrl(url: string | null | undefined): string {
  if (!url) return "";
  try {
    const u = new URL(url);
    if (u.hostname.includes("supabase.co") && u.pathname.includes("/storage/v1/object/public/")) {
      u.pathname = u.pathname.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/");
      u.searchParams.set("width", "200");
      u.searchParams.set("height", "200");
      u.searchParams.set("resize", "cover");
      return u.toString();
    }
    return url;
  } catch {
    return url;
  }
}

function getLocalDateStr(isoStr: string, city?: string): string {
  try {
    const d = new Date(isoStr);
    const tz = city ? CITY_TZS[city] : "UTC";
    return d.toLocaleDateString("en-CA", { timeZone: tz });
  } catch { return isoStr.split("T")[0]; }
}

function formatDate(dateStr: string, city?: string) {
  try {
    const d = new Date(dateStr);
    const tz = city ? CITY_TZS[city] : undefined;
    return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: tz });
  } catch { return dateStr; }
}

function formatTime(dateStr: string, city?: string) {
  try {
    const d = new Date(dateStr);
    const tz = city ? CITY_TZS[city] : undefined;
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });
  } catch { return ""; }
}

function getDateGroupLabel(dateStr: string, city?: string): string {
  try {
    const now = new Date();
    const tz = city ? CITY_TZS[city] : "UTC";
    const todayLocal = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(now);
    const [ty, tm, td] = todayLocal.split("-").map(Number);
    const [dy, dm, dd] = dateStr.split("-").map(Number);
    const todayDate = new Date(ty, tm - 1, td);
    const targetDate = new Date(dy, dm - 1, dd);
    const diff = Math.round((targetDate.getTime() - todayDate.getTime()) / 86400000);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    if (diff > 1 && diff <= 6) return targetDate.toLocaleDateString("en-US", { weekday: "long" });
    return targetDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
  } catch {
    return dateStr;
  }
}

function groupByDate(events: MusicEvent[], city?: string): Map<string, MusicEvent[]> {
  const groups = new Map<string, MusicEvent[]>();
  for (const e of events) {
    const key = e.starts_at ? getLocalDateStr(e.starts_at, city) : "unknown";
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(e);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function EventCard({ event, city }: { event: MusicEvent; city?: string }) {
  const meta = GENRE_META[event.genre] ?? GENRE_META.other;
  const eventUrl = createEventUrl(event.title, event.city);
  const genreColor = meta.color;
  const genreBg = meta.bg;

  return (
    <Link
      href={eventUrl}
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
          <img src={getOptimizedImageUrl(event.image_url)} alt={event.title} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
          <span style={{ background: genreBg, border: `1px solid ${genreColor}44`, color: genreColor, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {meta.label}
          </span>
        </div>
        <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.3 }}>
          {event.title}
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-secondary)", fontSize: 12, marginBottom: 6 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <Calendar size={11} /> {formatDate(event.starts_at, city)} · {formatTime(event.starts_at, city)}
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
      </div>
    </Link>
  );
}

export default async function CityGenrePage(props: { params: Promise<{ city: string; genre: string }> }) {
  const { city, genre } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  const genreMeta = GENRE_META[genre];
  if (!info || !genreMeta) notFound();

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
        .eq("genre", genre)
        .gte("ends_at", now)
        .or("is_approved.eq.true,is_approved.is.null")
        .order("starts_at", { ascending: true })
        .limit(500);
      if (data) {
        initialEvents = data as MusicEvent[];
      }
    } catch (e) {
      console.error(`Failed to fetch events for ${city}/${genre}:`, e);
    }
  }

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Eventure", item: "https://www.eventurer.online" },
      { "@type": "ListItem", position: 2, name: info.name, item: `https://www.eventurer.online/events/${city}` },
      { "@type": "ListItem", position: 3, name: `${genreMeta.label} Events`, item: `https://www.eventurer.online/${city}/${genre}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }} />
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}>
        <Header activePage="map" />

        <main style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "40px 20px" }}>
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", marginBottom: 24 }}>
            <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
            <span>/</span>
            <Link href="/cities" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Cities</Link>
            <span>/</span>
            <Link href={`/events/${city}`} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>{info.name}</Link>
            <span>/</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{genreMeta.label}</span>
          </nav>

          {/* Hero */}
          <section style={{ marginBottom: 40, textAlign: "center", padding: "48px 20px", borderRadius: 20, background: `linear-gradient(135deg, ${genreMeta.color}33, rgba(0,0,0,0.6))`, position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 1 }} />
            <div style={{ position: "relative", zIndex: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: genreMeta.color, marginBottom: 8, display: "block" }}>
                {info.name} · {info.country}
              </span>
              <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontFamily: "'Poppins', sans-serif", fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.02em" }}>
                {genreMeta.label} Events
              </h1>
              <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", maxWidth: 600, margin: "0 auto 24px", lineHeight: 1.6 }}>
                {initialEvents.length > 0
                  ? `Discover ${initialEvents.length} upcoming ${genreMeta.label.toLowerCase()} event${initialEvents.length !== 1 ? "s" : ""} in ${info.name}.`
                  : `Explore ${genreMeta.label.toLowerCase()} events in ${info.name}.`}
              </p>
              <Link
                href={`/events/${city}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)", color: "#fff", borderRadius: 10, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
              >
                All Events in {info.name} <ArrowRight size={14} />
              </Link>
            </div>
          </section>

          {/* Event list */}
          <section>
            <h2 style={{ fontSize: 18, fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: "var(--text-primary)", marginBottom: 20 }}>
              Upcoming {genreMeta.label} Events
              {initialEvents.length > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 15 }}> · {initialEvents.length} total</span>}
            </h2>
            {initialEvents.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[...groupByDate(initialEvents, city).entries()].map(([dateKey, events]) => (
                  <div key={dateKey}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10, paddingLeft: 4 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--primary)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {getDateGroupLabel(dateKey, city)}
                      </span>
                      <div style={{ flex: 1, height: 1, background: "var(--border)" }} />
                      <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500 }}>
                        {events.length} event{events.length > 1 ? "s" : ""}
                      </span>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {events.map((event) => (
                        <EventCard key={event.id || `${event.title}-${event.starts_at}`} event={event} city={city} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)", background: "var(--bg-elevated)", borderRadius: 14, border: "1px solid var(--border)" }}>
                <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 18, marginBottom: 8, color: "var(--text-primary)" }}>
                  No {genreMeta.label.toLowerCase()} events in {info.name}
                </h3>
                <p style={{ fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>
                  Events are updated daily. Check back soon or browse all events in {info.name}.
                </p>
                <Link href={`/events/${city}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "var(--primary)", color: "#fff", borderRadius: 10, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}>
                  Browse All {info.name} Events <ArrowRight size={14} />
                </Link>
              </div>
            )}
          </section>
        </main>

        <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 48 }}>
          <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}>Eventure</Link>
          {" "}· Live interactive map of club events worldwide
        </footer>
      </div>
    </>
  );
}
