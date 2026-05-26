import { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { ArrowLeft, MapPin, Clock, Ticket, ExternalLink, Music, Star, ArrowRight } from "lucide-react";
import { MusicEvent } from "@/lib/types";
import { GENRE_META, MOCK_EVENTS } from "@/lib/mock-data";
import { createSlug, createEventUrl } from "@/lib/utils";
import { getEventBySlugOrId, getRelatedEvents, formatEventDate, getSafeTimeLabel } from "@/lib/event-utils";
import GenreIcon from "@/components/GenreIcon";
import ShareButton from "@/components/ShareButton";
import LineupList from "@/components/LineupList";

const fallbackImage = "https://www.eventurer.online/apple-touch-icon.svg";

export async function generateMetadata(props: { params: Promise<{ city: string; slug: string }> }): Promise<Metadata> {
  const { city, slug } = await props.params;
  const fullSlug = `${city}-${slug}`;
  const event = await getEventBySlugOrId(fullSlug);

  if (!event) {
    const cityName = city.charAt(0).toUpperCase() + city.slice(1);
    return {
      title: `Club Events & DJ Gigs in ${cityName} | Eventure`,
      description: `Find club events, techno parties and DJ gigs in ${cityName}. Browse lineups, venues, dates and get tickets on Eventure.`,
      openGraph: {
        title: `Club Events & DJ Gigs in ${cityName} | Eventure`,
        description: `Find club events, techno parties and DJ gigs in ${cityName}. Browse lineups, venues, dates and get tickets on Eventure.`,
        images: [{ url: fallbackImage, width: 180, height: 180 }],
      },
      twitter: {
        card: "summary_large_image",
        title: `Club Events & DJ Gigs in ${cityName} | Eventure`,
        description: `Find club events, techno parties and DJ gigs in ${cityName}. Browse lineups, venues, dates and get tickets on Eventure.`,
        images: [fallbackImage],
      },
    };
  }

  const canonicalUrl = createEventUrl(event.title, event.city);
  const venuePart = event.venue_name ? ` at ${event.venue_name}` : "";
  const artistsPart = event.artists?.length ? ` — ${event.artists.slice(0, 4).join(", ")}` : "";
  const dateStr = formatEventDate(event.starts_at);
  const datePart = dateStr ? ` on ${dateStr}` : "";
  const ogImage = event.image_url || fallbackImage;

  const pageTitle = `${event.title}${venuePart} in ${event.city}${artistsPart} | Eventure`;
  const ogTitle = `${event.title}${venuePart} in ${event.city} | Eventure`;

  const topArtists = event.artists?.slice(0, 3) ?? [];
  const artistLead = topArtists.length > 0
    ? `See ${topArtists.join(", ")}${event.artists.length > 3 ? " and more" : ""} at `
    : "";
  const pageDesc = `${artistLead}${event.title}${datePart}${venuePart} in ${event.city}. Grab tickets on Eventure.`.slice(0, 160);

  return {
    title: pageTitle.slice(0, 70),
    description: pageDesc,
    keywords: [event.title, event.venue_name, event.city, ...(event.artists || [])].filter(Boolean) as string[],
    robots: { index: true, follow: true },
    openGraph: {
      title: ogTitle.slice(0, 70),
      description: `${topArtists.length > 0 ? `${topArtists.join(", ")}${event.artists.length > 3 ? " and more" : ""} — ` : ""}${event.title} at ${event.venue_name || event.city}${datePart}. Secure your spot on Eventure.`.slice(0, 160),
      images: [{ url: ogImage, width: 180, height: 180 }],
      url: `https://www.eventurer.online${canonicalUrl}`,
      type: "website",
      siteName: "Eventure",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle.slice(0, 70),
      description: `${topArtists.length > 0 ? `${topArtists.join(", ")}${event.artists.length > 3 ? " and more" : ""} — ` : ""}${event.title} at ${event.venue_name || event.city}${datePart}. Secure your spot on Eventure.`.slice(0, 160),
      images: [ogImage],
    },
    alternates: {
      canonical: `https://www.eventurer.online${canonicalUrl}`,
    },
  };
}

function getDisplayPrice(event: MusicEvent): string {
  if (!event.price) return "Check Flyer or Ask Organizer";
  const p = String(event.price).toLowerCase();
  const hasNumber = /\d/.test(p);
  if (hasNumber) return event.price;
  if (p.includes("ra") || p === "tbd" || p === "unknown" || p === "tickets") return "Check Flyer or Ask Organizer";
  return event.price;
}

export default async function EventPage(props: { params: Promise<{ city: string; slug: string }> }) {
  const { city, slug } = await props.params;
  const fullSlug = `${city}-${slug}`;
  const event = await getEventBySlugOrId(fullSlug);

  const relatedEvents = event ? await getRelatedEvents(event) : [];

  if (!event) {
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#0D1117', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔍</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Event Not Found</h2>
        <p style={{ color: '#848D97', marginBottom: 24 }}>Identifier: {fullSlug}</p>
        <Link href="/" style={{ padding: '12px 24px', background: '#E63946', color: 'white', borderRadius: 12, textDecoration: 'none', fontWeight: 700 }}>Back to Map</Link>
      </div>
    );
  }

  const meta = GENRE_META[event.genre] || GENRE_META.other;
  const { time, date } = getSafeTimeLabel(event.starts_at, event.city);
  const isFeatured = event.is_featured;
  const displayPrice = getDisplayPrice(event);

  const eventUrl = createEventUrl(event.title, event.city);

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Eventure", item: "https://www.eventurer.online" },
      ...(event.city ? [{ "@type": "ListItem", position: 2, name: event.city, item: `https://www.eventurer.online/events/${event.city.toLowerCase().replace(/\s+/g, "-")}` }] : []),
      { "@type": "ListItem", position: event.city ? 3 : 2, name: event.title, item: `https://www.eventurer.online${eventUrl}` },
    ],
  };

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    name: event.title,
    description: event.description || `${event.title} at ${event.venue_name} in ${event.city}. Featuring ${(event.artists || []).length > 0 ? event.artists.slice(0, 5).join(", ") : "various artists"}.`,
    startDate: event.starts_at,
    endDate: event.ends_at,
    image: event.image_url || "https://www.eventurer.online/favicon.svg",
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
    performer: (event.artists || []).length > 0 
      ? event.artists.map((a: string) => ({ "@type": "MusicGroup", name: a }))
      : [{ "@type": "MusicGroup", name: "Various Artists" }],
    organizer: {
      "@type": "Organization",
      name: event.venue_name || "Event Organizer",
      url: "https://www.eventurer.online"
    },
    ...(event.ticket_url ? {
      offers: {
        "@type": "Offer",
        url: event.ticket_url,
        price: (event.price && /\d/.test(event.price)) ? event.price.replace(/[^\d.]/g, '') || "0" : "0",
        priceCurrency: "USD",
        availability: "https://schema.org/InStock",
        validFrom: new Date().toISOString().split('T')[0],
      },
    } : {}),
  };

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `When is ${event.title} in ${event.city}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${event.title} starts at ${time} on ${date} at ${event.venue_name} in ${event.city}.`,
        },
      },
      {
        "@type": "Question",
        name: `Where is ${event.title} taking place?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `${event.title} is at ${event.venue_name}${event.venue_address ? ` (${event.venue_address})` : ""} in ${event.city}.`,
        },
      },
      ...((event.artists || []).length > 0 ? [{
        "@type": "Question",
        name: `Who is performing at ${event.title}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `The lineup includes ${(event.artists || []).slice(0, 10).join(", ")}.`,
        },
      }] : []),
      ...(event.ticket_url ? [{
        "@type": "Question",
        name: `How to get tickets for ${event.title}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Tickets for ${event.title} are available at ${event.ticket_url}.`,
        },
      }] : []),
    ],
  };

  return (
    <div className="app-shell" style={{ maxWidth: 600, margin: "0 auto", borderLeft: "1px solid var(--border)", borderRight: "1px solid var(--border)", background: 'var(--bg)', color: 'var(--text-primary)', minHeight: '100vh' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify([breadcrumbLd, eventLd, faqLd]) }}
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
            href={event.city ? `/events/${event.city.toLowerCase()}` : "/"}
            style={{ position: "absolute", top: 14, left: 14, width: 36, height: 36, borderRadius: "50%", background: "var(--btn-overlay-bg)", backdropFilter: "blur(6px)", border: "1px solid var(--border)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none", zIndex: 10 }}
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
          {/* Past Event Banner */}
          {event.ends_at && new Date(event.ends_at) < new Date() && (
            <div style={{ 
              background: "rgba(230, 57, 70, 0.08)", 
              border: "1px solid rgba(230, 57, 70, 0.2)", 
              borderRadius: 12, 
              padding: "12px 16px", 
              marginBottom: 20, 
              display: "flex", 
              alignItems: "center", 
              justifyContent: "space-between",
              gap: 12
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>📅</span>
                <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>
                  This event took place in the past.
                </span>
              </div>
              <Link 
                href={`/events/${event.city.toLowerCase()}`}
                style={{ 
                  fontSize: 12, 
                  fontWeight: 700, 
                  color: "#E63946", 
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  padding: "6px 12px",
                  background: "rgba(230, 57, 70, 0.12)",
                  borderRadius: 8
                }}
              >
                Find upcoming events
              </Link>
            </div>
          )}

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
          <LineupList artists={event.artists || []} city={event.city} />

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
          <div style={{ marginBottom: 24 }}>
            <label className="label">About This Event</label>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
              {event.description || `${event.title} is an upcoming ${meta.label.toLowerCase()} event at ${event.venue_name} in ${event.city}.${(event.artists || []).length > 0 ? ` Featuring performances by ${event.artists.slice(0, 10).join(", ")}.` : ""} Check the event page for the full lineup, ticket details, and venue information on Eventure.`}
            </p>
          </div>

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
            <div style={{ display: "flex", gap: 10 }}>
              {event.source_url && (
                <a href={event.source_url} target="_blank" rel="noopener noreferrer" style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", background: "transparent", color: "var(--text-muted)", borderRadius: 10, border: "1px solid var(--border)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                  <ExternalLink size={11} /> Source
                </a>
              )}
              <ShareButton url={`https://www.eventurer.online${eventUrl}`} title={event.title} />
            </div>
          </div>

          {/* Related Events */}
          {relatedEvents.length > 0 && (
            <div style={{ marginTop: 32, paddingTop: 24, borderTop: "1px solid var(--border)" }}>
              <h2 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 16, color: "var(--text-primary)", marginBottom: 16 }}>
                More Events in {event.city}
              </h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {relatedEvents.map((re) => {
                  const reUrl = createEventUrl(re.title, re.city);
                  const reMeta = GENRE_META[re.genre] ?? GENRE_META.other;
                  return (
                    <Link
                      key={re.id || reUrl}
                      href={reUrl}
                      style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12 }}
                      className="card-hover-effect"
                    >
                      {re.image_url ? (
                        <img src={re.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 48, height: 48, borderRadius: 8, background: reMeta.bg, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Music size={18} color={reMeta.color} />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{re.title}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{re.venue_name} · {new Date(re.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                      </div>
                      <ArrowRight size={14} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    </Link>
                  );
                })}
              </div>
              <Link
                href={`/events/${event.city}`}
                style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, fontSize: 13, fontWeight: 700, color: "var(--primary)", textDecoration: "none" }}
              >
                View All Events in {event.city} <ArrowRight size={13} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
