"use client";
import { useState } from "react";
import type { MusicEvent } from "@/lib/types";
import { GENRE_META, formatEventTime, getDaysUntil, CITY_TZS } from "@/lib/mock-data";
import { ArrowLeft, MapPin, Clock, Ticket, ExternalLink, Music, Star, Share2, Check } from "lucide-react";
import GenreIcon from "@/components/GenreIcon";

interface Props {
  event: MusicEvent;
  onBack?: () => void;
}

export default function MusicEventDetail({ event, onBack }: Props) {
  const meta = GENRE_META[event.genre] ?? GENRE_META.other;
  const timeLabel = formatEventTime(event.starts_at, event.city);
  const isLive = event.status === "happening_now";
  const isToday = event.status === "today";
  const daysUntil = getDaysUntil(event.starts_at);
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}/event/${event.id}`
    : `/event/${event.id}`;

  const handleShare = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const urgencyColor = isLive
    ? "var(--primary)"
    : isToday
    ? "var(--today-color)"
    : "var(--text-secondary)";

  const tz = (event.city && CITY_TZS[event.city.toLowerCase()]) || "UTC";

  const startTime = new Date(event.starts_at).toLocaleTimeString("en", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz
  });
  const endTime = new Date(event.ends_at).toLocaleTimeString("en", {
    hour: "2-digit", minute: "2-digit", hour12: false, timeZone: tz
  });
  const dateStr = new Intl.DateTimeFormat("en", {
    weekday: "long", month: "long", day: "numeric", timeZone: tz
  }).format(new Date(event.starts_at));

  // Helper to normalize price text
  const getNormalizedPrice = () => {
    if (!event.price) return "Check Flyer or Ask Organizer";
    const p = event.price.toLowerCase();
    if (p.includes("ra") || p === "tbd" || p === "unknown") return "Check Flyer or Ask Organizer";
    return event.price;
  };
  const displayPrice = getNormalizedPrice();

  // Generate JSON-LD for Search Engines
  const cityToCountry: Record<string, string> = {
    london: "GB", tokyo: "JP", osaka: "JP", vilnius: "LT", belgrade: "RS", tbilisi: "GE"
  };
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "MusicEvent",
    "name": event.title,
    "startDate": event.starts_at,
    "endDate": event.ends_at,
    "eventAttendanceMode": "https://schema.org/OfflineEventAttendanceMode",
    "eventStatus": "https://schema.org/EventScheduled",
    "location": {
      "@type": "Place",
      "name": event.venue_name,
      "address": {
        "@type": "PostalAddress",
        "streetAddress": event.venue_address,
        "addressLocality": event.city || "Various",
        "addressCountry": (event.city && cityToCountry[event.city.toLowerCase()]) || "JP"
      },
      "geo": {
        "@type": "GeoCoordinates",
        "latitude": event.lat,
        "longitude": event.lng
      }
    },
    "image": [event.image_url].filter(Boolean),
    "description": `Club event in ${event.city || "Japan"}: ${event.title} at ${event.venue_name}. Featured artists: ${event.artists.join(", ")}.`,
    "performer": event.artists.map(name => ({
      "@type": "Person",
      "name": name
    })),
    "offers": {
      "@type": "Offer",
      "url": event.ticket_url || event.source_url,
      "availability": "https://schema.org/InStock"
    }
  };

  return (
    <div
      id={`event-detail-${event.id}`}
      style={{ flex: 1, overflowY: "auto", background: "var(--bg)", display: "flex", flexDirection: "column" }}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="detail-layout">
        {/* Left/Top Column: Flyer */}
        <div className="detail-hero">
          {event.image_url ? (
            <img 
              src={event.image_url} 
              alt={event.title} 
              style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }} 
            />
          ) : (
            <div
              style={{
                width: "100%", height: "100%",
                background: `linear-gradient(135deg, ${meta.bg}, var(--bg-secondary))`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <GenreIcon name={meta.icon} size={48} color={meta.color} />
            </div>
          )}
          
          {/* Back button */}
          {onBack && (
            <button
              id="event-detail-back"
              onClick={onBack}
              style={{
                position: "absolute", top: 14, left: 14,
                width: 36, height: 36, borderRadius: "50%",
                background: "rgba(13,17,23,0.85)", backdropFilter: "blur(6px)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", zIndex: 10
              }}
            >
              <ArrowLeft size={17} />
            </button>
          )}

          {/* Badges */}
          <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 6, zIndex: 10 }}>
            {isLive && (
              <span className="badge badge-live">
                <span className="live-dot" style={{ width: 5, height: 5 }} />
                LIVE NOW
              </span>
            )}
            {event.is_featured && (
              <span className="badge badge-featured">
                <Star size={9} />Featured
              </span>
            )}
          </div>
        </div>

        {/* Right/Bottom Column: Content */}
        <div className="detail-content">
          {/* Genre tag */}
          <div style={{ marginBottom: 16 }}>
            <span
              style={{
                background: meta.bg, border: `1px solid ${meta.color}44`,
                color: meta.color, fontSize: 11, fontWeight: 700,
                padding: "4px 12px", borderRadius: 999,
                textTransform: "uppercase", letterSpacing: "0.07em",
                display: "inline-flex", alignItems: "center"
              }}
            >
              <GenreIcon name={meta.icon} size={11} style={{ marginRight: 5 }} />
              {meta.label}
            </span>
          </div>

          {/* Date/time + title */}
          <div>
            <div
              style={{
                fontSize: 11, fontWeight: 700, color: urgencyColor,
                textTransform: "uppercase", letterSpacing: "0.06em",
                marginBottom: 7, display: "flex", alignItems: "center", gap: 5,
              }}
            >
              {isLive && <span className="live-dot" style={{ width: 5, height: 5 }} />}
              <Clock size={11} />
              {timeLabel}
            </div>
            <h1
              style={{
                fontFamily: "'Poppins', sans-serif", fontWeight: 800,
                fontSize: 32, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: 8,
              }}
            >
              {event.title}
            </h1>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", fontWeight: 500 }}>
              {dateStr} · {startTime}–{endTime}
            </p>
          </div>

          {/* Artist lineup */}
          {event.artists.length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Music size={13} color="var(--text-muted)" />
                <span className="label">Lineup</span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {event.artists.map((artist, i) => (
                  <div
                    key={artist}
                    style={{
                      display: "flex", alignItems: "center", gap: 8,
                      padding: "6px 12px",
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{artist}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Venue card with Google Maps link */}
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venue_name}, ${event.venue_address && event.venue_address !== event.venue_name ? event.venue_address : event.city}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "13px 15px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              display: "flex", alignItems: "flex-start", gap: 10,
              textDecoration: "none",
              transition: "transform 0.15s ease, background 0.15s ease",
              cursor: "pointer",
            }}
            className="venue-card-link"
          >
            <div
              style={{
                width: 34, height: 34, borderRadius: 9,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <MapPin size={15} color="var(--text-muted)" />
            </div>
            <div>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 2 }}>
                {event.venue_name}
              </p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{event.venue_address || "View on Google Maps"}</p>
            </div>
            <ExternalLink size={12} color="var(--text-muted)" style={{ marginLeft: "auto", alignSelf: "center" }} />
          </a>

          {/* Description */}
          {event.description && (
            <div>
              <label className="label">About</label>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {event.description}
              </p>
            </div>
          )}

          {/* Price — always show, fallback if empty */}
          <div
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "11px 15px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              borderRadius: 12,
            }}
          >
            <span className="label" style={{ marginBottom: 0 }}>Entrance Fee</span>
            <span
              style={{
                fontFamily: "'Poppins', sans-serif",
                fontWeight: 700, fontSize: displayPrice === "Check Flyer or Ask Organizer" ? 12 : 16,
                color: event.price === "Free" ? "var(--green)" : (displayPrice === "Check Flyer or Ask Organizer" ? "var(--text-muted)" : "var(--text-primary)"),
              }}
            >
              {displayPrice}
            </span>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {event.ticket_url && (
              <a
                id="event-ticket-btn"
                href={event.ticket_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  padding: "13px 20px", background: "var(--primary)", color: "#fff",
                  borderRadius: 12, fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700, fontSize: 14, textDecoration: "none",
                  transition: "all 0.18s",
                }}
              >
                <Ticket size={15} />
                Get Tickets
                <ExternalLink size={12} />
              </a>
            )}
            {event.source_url && (
              <a
                href={event.source_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  padding: "10px 16px", background: "transparent",
                  color: "var(--text-muted)", borderRadius: 10,
                  border: "1px solid var(--border)", fontSize: 12, fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                <ExternalLink size={11} />
                View on Resident Advisor
              </a>
            )}
          </div>
          {/* Share Event Button */}
          <button
            id="event-share-btn"
            onClick={handleShare}
            style={{
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              padding: "14px 20px",
              background: copied ? "var(--green)" : "var(--primary)",
              border: `1px solid ${copied ? "var(--green)" : "var(--primary)"}`,
              borderRadius: 12, cursor: "pointer",
              color: "#fff",
              fontSize: 14, fontWeight: 800, transition: "all 0.2s",
              width: "100%",
              marginTop: 14,
              fontFamily: "'Poppins', sans-serif",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              boxShadow: copied ? "none" : "0 4px 12px rgba(230,57,70,0.15)",
            }}
          >
            {copied ? <Check size={16} strokeWidth={3} /> : <Share2 size={16} strokeWidth={3} />}
            {copied ? "Link Copied!" : "Share Event Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
