import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import { CITIES } from "@/lib/constants";
import { GENRE_META } from "@/lib/mock-data";
import { ArrowLeft, MapPin, Calendar, Music, ArrowRight } from "lucide-react";
import Header from "@/components/Header";
import { createVenueSlug } from "../page";
import type { MusicEvent } from "@/lib/types";

export const revalidate = 60;

// Since it's dynamic, we can generate dynamic paths if needed, but Next.js will dynamically compile it as ISR if static params aren't fully generated. Let's omit generateStaticParams for the venue slugs because they depend on transient database rows, allowing Next.js to compile them purely on demand (on-demand ISR/SSR), which is perfect for dynamic database-driven pages!

export async function generateMetadata(props: { params: Promise<{ city: string; venueSlug: string }> }) {
  const { city, venueSlug } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  if (!info) return { title: "Venue | Eventure" };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  let venueName = venueSlug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data } = await supabase
        .from("music_events")
        .select("venue_name")
        .eq("city", city)
        .limit(500);
      
      if (data) {
        const matched = data.find(r => createVenueSlug(rowName(r)) === venueSlug);
        if (matched && matched.venue_name) {
          venueName = matched.venue_name;
        }
      }
    } catch {}
  }

  return {
    title: `${venueName} Events Schedule & Club Info in ${info.name} | Eventure`,
    description: `Complete line-ups, ticket links, map, and address for ${venueName} in ${info.name}. Discover upcoming and past electronic music events.`,
    alternates: {
      canonical: `https://www.eventurer.online/venues/${city}/${venueSlug}`,
    },
    openGraph: {
      title: `${venueName} | Electronic Club Info & Schedule in ${info.name}`,
      description: `View complete schedules, lineups, ticket links and address for ${venueName} in ${info.name}.`,
      url: `https://www.eventurer.online/venues/${city}/${venueSlug}`,
    },
  };
}

function rowName(row: any): string {
  return row.venue_name || "";
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

export default async function VenueDetailPage(props: { params: Promise<{ city: string; venueSlug: string }> }) {
  const { city, venueSlug } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  if (!info) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  let venueName = "";
  let venueAddress = "";
  let latitude: number | null = null;
  let longitude: number | null = null;
  
  let upcomingEvents: MusicEvent[] = [];
  let pastEvents: MusicEvent[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      const { data } = await supabase
        .from("music_events")
        .select("*")
        .eq("city", city)
        .or("is_approved.eq.true,is_approved.is.null")
        .order("starts_at", { ascending: true });
      
      if (data) {
        const matchedEvents = (data as MusicEvent[]).filter(
          (e) => createVenueSlug(e.venue_name || "") === venueSlug
        );

        if (matchedEvents.length === 0) {
          notFound();
        }

        // Get venue info from the first matched event
        const first = matchedEvents[0];
        venueName = first.venue_name || "";
        venueAddress = first.venue_address || "Address unavailable";
        latitude = first.lat || null;
        longitude = first.lng || null;

        const now = new Date();
        matchedEvents.forEach((e) => {
          const isUpcoming = e.ends_at && new Date(e.ends_at) >= now;
          if (isUpcoming) {
            upcomingEvents.push(e);
          } else {
            pastEvents.push(e);
          }
        });

        // Sort past events descending (most recent first)
        pastEvents.sort((a, b) => {
          const aTime = a.starts_at ? new Date(a.starts_at).getTime() : 0;
          const bTime = b.starts_at ? new Date(b.starts_at).getTime() : 0;
          return bTime - aTime;
        });
      }
    } catch (e) {
      console.error(`Failed to load venue detail:`, e);
      notFound();
    }
  }

  // Schema Markup
  const schema = {
    "@context": "https://schema.org",
    "@type": "MusicVenue",
    "name": venueName,
    "address": {
      "@type": "PostalAddress",
      "streetAddress": venueAddress,
      "addressLocality": info.name,
      "addressCountry": info.country
    },
    "geo": latitude && longitude ? {
      "@type": "GeoCoordinates",
      "latitude": latitude,
      "longitude": longitude
    } : undefined,
    "url": `https://www.eventurer.online/venues/${city}/${venueSlug}`
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      
      <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif" }}>
        <Header activePage="venues" />

        <main style={{ maxWidth: 1200, width: "100%", margin: "0 auto", padding: "40px 20px" }}>
          
          {/* Breadcrumbs */}
          <nav aria-label="Breadcrumb" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", marginBottom: 24 }}>
            <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
            <span>/</span>
            <Link href="/venues" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Venues</Link>
            <span>/</span>
            <Link href={`/venues/${city}`} style={{ color: "var(--text-secondary)", textDecoration: "none" }}>{info.name}</Link>
            <span>/</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{venueName}</span>
          </nav>

          {/* Back Button */}
          <Link
            href={`/venues/${city}`}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-secondary)", textDecoration: "none", marginBottom: 24, fontWeight: 600 }}
          >
            <ArrowLeft size={14} /> Back to {info.name} venues
          </Link>

          {/* Hero Section */}
          <section style={{ marginBottom: 40, padding: "48px 30px", borderRadius: 20, background: "linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(0,0,0,0.5) 100%)", border: "1px solid var(--border)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "relative", zIndex: 2 }}>
              <span style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--primary)", marginBottom: 8, display: "block" }}>
                Club & Venue · {info.name}
              </span>
              <h1 style={{ fontSize: "clamp(30px, 4vw, 44px)", fontFamily: "'Poppins', sans-serif", fontWeight: 800, color: "#fff", marginBottom: 12, letterSpacing: "-0.02em" }}>
                {venueName}
              </h1>
              
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, color: "var(--text-secondary)", fontSize: 14 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <MapPin size={16} color="var(--primary)" /> {venueAddress}
                </span>
              </div>

              {/* Map Button (links directly to the main map page with venue filter) */}
              {latitude && longitude && (
                <div style={{ marginTop: 24 }}>
                  <Link
                    href={`/?city=${city}&lat=${latitude}&lng=${longitude}&zoom=16`}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 18px", background: "var(--primary)", color: "#fff", borderRadius: 10, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
                  >
                    View on Live Interactive Map <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>
          </section>

          {/* Grid Layout for Listings */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 40 }}>
            
            {/* Upcoming Events */}
            <section>
              <h2 style={{ fontSize: 20, fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <Calendar size={18} color="var(--primary)" /> Upcoming Events at {venueName}
                {upcomingEvents.length > 0 && <span style={{ color: "var(--text-muted)", fontWeight: 400, fontSize: 15 }}> · {upcomingEvents.length} total</span>}
              </h2>
              
              {upcomingEvents.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {upcomingEvents.map((event) => {
                    const meta = GENRE_META[event.genre || "other"] || GENRE_META.other;
                    // Format relative link to the event
                    const parts = (event.city || "").toLowerCase().replace(/\s+/g, "-");
                    const slugPart = createVenueSlug(event.title);
                    const eventUrl = `/events/${parts}/${slugPart}`;

                    return (
                      <Link
                        key={event.id || event.title}
                        href={eventUrl}
                        className="card-hover-effect"
                        style={{ textDecoration: "none", color: "inherit", display: "flex", gap: 16, padding: "16px 20px", background: "var(--bg-elevated)", borderRadius: 14, border: "1px solid var(--border)" }}
                      >
                        {event.image_url && (
                          <div style={{ width: 80, height: 80, borderRadius: 10, overflow: "hidden", flexShrink: 0, background: "var(--bg)" }}>
                            <img src={getOptimizedImageUrl(event.image_url)} alt={event.title} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          </div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ background: meta.bg, border: `1px solid ${meta.color}44`, color: meta.color, fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "inline-block" }}>
                            {meta.label}
                          </span>
                          <h3 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.3 }}>
                            {event.title}
                          </h3>
                          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-secondary)", fontSize: 12 }}>
                            <span>{formatDate(event.starts_at)} · {formatTime(event.starts_at)}</span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--text-secondary)", background: "var(--bg-elevated)", borderRadius: 14, border: "1px solid var(--border)" }}>
                  <p style={{ fontSize: 14, margin: 0 }}>No upcoming events scheduled at this venue. Check back soon!</p>
                </div>
              )}
            </section>

            {/* Past Event History (SEO GOLD) */}
            {pastEvents.length > 0 && (
              <section style={{ borderTop: "1px solid var(--border)", paddingTop: 40, marginTop: 10 }}>
                <h2 style={{ fontSize: 20, fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: "var(--text-primary)", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <Music size={18} color="var(--text-muted)" /> Past Event Archive (Last 30 Days)
                </h2>
                
                <div style={{ display: "flex", flexDirection: "column", gap: 12, opacity: 0.7 }}>
                  {pastEvents.map((event) => {
                    const meta = GENRE_META[event.genre || "other"] || GENRE_META.other;
                    const parts = (event.city || "").toLowerCase().replace(/\s+/g, "-");
                    const slugPart = createVenueSlug(event.title);
                    const eventUrl = `/events/${parts}/${slugPart}`;

                    return (
                      <Link
                        key={event.id || event.title}
                        href={eventUrl}
                        style={{ textDecoration: "none", color: "inherit", display: "flex", gap: 14, padding: "12px 18px", background: "var(--bg-secondary)", borderRadius: 12, border: "1px solid var(--border)" }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, background: "rgba(255,255,255,0.04)", padding: "2px 6px", borderRadius: 4, marginRight: 8 }}>Past</span>
                          <span style={{ color: meta.color, fontSize: 11, fontWeight: 700, marginRight: 8 }}>{meta.label}</span>
                          <h3 style={{ display: "inline-block", fontFamily: "'Poppins', sans-serif", fontWeight: 600, fontSize: 14, color: "var(--text-primary)", margin: 0, marginRight: 10 }}>
                            {event.title}
                          </h3>
                          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>on {formatDate(event.starts_at)}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </section>
            )}

          </div>
        </main>

        <footer style={{ borderTop: "1px solid var(--border)", padding: "24px 20px", textAlign: "center", color: "var(--text-muted)", fontSize: 12, marginTop: 48 }}>
          <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}>Eventure</Link>
          {" "}· Historical line-ups and upcoming rosters for {venueName} in {info.name}
        </footer>
      </div>
    </>
  );
}
