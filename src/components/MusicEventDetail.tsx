"use client";
import { useState, useCallback } from "react";
import { createEventUrl } from "@/lib/utils";
import type { MusicEvent } from "@/lib/types";
import { GENRE_META, formatEventTime, getDaysUntil, CITY_TZS } from "@/lib/mock-data";
import { ArrowLeft, MapPin, Clock, Ticket, ExternalLink, Music, Star, Share2, Check, Headphones } from "lucide-react";
import GenreIcon from "@/components/GenreIcon";

interface Props {
  event: MusicEvent;
  onBack?: () => void;
  onArtistClick?: (artistName: string) => void;
}

export default function MusicEventDetail({ event, onBack, onArtistClick }: Props) {
  const meta = (event?.genre && GENRE_META[event.genre]) || GENRE_META.other || {
    label: "Other", icon: "Music", color: "#6B7280", bg: "rgba(107,114,128,0.12)"
  };

  const timeLabel = formatEventTime(event?.starts_at || "", event?.city);
  const isLive = event?.status === "happening_now";
  const isToday = event?.status === "today";
  const daysUntil = getDaysUntil(event?.starts_at || "");
  const [copied, setCopied] = useState(false);
  const [imgFit, setImgFit] = useState<"contain" | "cover">("contain");
  const [activeListenArtist, setActiveListenArtist] = useState<string | null>(null);
  const [videoIds, setVideoIds] = useState<Record<string, string>>({});
  const [loadingArtists, setLoadingArtists] = useState<Record<string, boolean>>({});

  const handleListenClick = async (artistName: string) => {
    if (activeListenArtist === artistName) {
      setActiveListenArtist(null);
      return;
    }

    if (videoIds[artistName]) {
      setActiveListenArtist(artistName);
      return;
    }

    setLoadingArtists(prev => ({ ...prev, [artistName]: true }));
    try {
      const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(artistName)}`);
      const data = await res.json();
      if (data.videoId) {
        setVideoIds(prev => ({ ...prev, [artistName]: data.videoId }));
        setActiveListenArtist(artistName);
      } else {
        alert(`Could not find a DJ set for ${artistName} on YouTube.`);
      }
    } catch (e) {
      console.error("Failed to find DJ set:", e);
    } finally {
      setLoadingArtists(prev => ({ ...prev, [artistName]: false }));
    }
  };

  const eventUrl = createEventUrl(event?.title, event?.city || "event");
  const shareUrl = typeof window !== "undefined"
    ? `${window.location.origin}${eventUrl}`
    : eventUrl;

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  const handleImgLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const w = img.naturalWidth;
    const h = img.naturalHeight;
    const ratio = w / h;
    if (ratio >= 1) {
      setImgFit("cover");
    } else {
      setImgFit("contain");
    }
  }, []);

  const urgencyColor = isLive
    ? "var(--primary)"
    : isToday
    ? "var(--today-color)"
    : "var(--text-secondary)";

  const startDate = new Date(event?.starts_at || "");
  const endDate = new Date(event?.ends_at || "");
  const isValidDate = !isNaN(startDate.getTime());

  let startTime = "TBA";
  let endTime = "TBA";
  let dateStr = "Date TBA";

  if (isValidDate) {
    try {
      const safeTz = (event?.city && CITY_TZS[event.city.toLowerCase()]) || "UTC";
      startTime = startDate.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: safeTz });
      if (!isNaN(endDate.getTime())) {
        endTime = endDate.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: safeTz });
      }
      dateStr = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric", timeZone: safeTz }).format(startDate);
    } catch (e) {
      startTime = startDate.toLocaleTimeString("en", { hour: "2-digit", minute: "2-digit", hour12: false });
      dateStr = startDate.toLocaleDateString("en", { weekday: "long", month: "long", day: "numeric" });
    }
  }

  const getNormalizedPrice = () => {
    if (!event?.price) return "Check Flyer or Ask Organizer";
    const p = String(event.price).toLowerCase();
    const hasNumber = /\d/.test(p);
    if (hasNumber) return event.price;
    if (p.includes("ra") || p === "tbd" || p === "unknown" || p === "tickets") return "Check Flyer or Ask Organizer";
    return event.price;
  };
  const displayPrice = getNormalizedPrice();

  if (!event) return null;

  return (
    <div
      id={`event-detail-${event.id}`}
      style={{ flex: 1, overflowY: "auto", background: "var(--bg)", display: "flex", flexDirection: "column" }}
    >
      <div className="detail-layout">
        <div className="detail-hero">
          {event.image_url ? (
            <img
              src={event.image_url}
              alt={event.title}
              onLoad={handleImgLoad}
              style={{
                width: "100%",
                height: "100%",
                objectFit: imgFit,
                background: imgFit === "cover" ? "transparent" : "#0a0a0a",
              }}
            />
          ) : (
            <div style={{ width: "100%", height: "100%", background: `linear-gradient(135deg, ${meta.bg}, var(--bg-secondary))`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <GenreIcon name={meta.icon} size={48} color={meta.color} />
            </div>
          )}

          {onBack && (
            <button
              onClick={onBack}
              className="detail-back-btn"
              style={{ position: "absolute", top: 14, left: 14, width: 36, height: 36, borderRadius: "50%", background: "var(--btn-overlay-bg)", backdropFilter: "blur(6px)", border: "1px solid var(--border)", color: "var(--text-primary)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 10 }}
            >
              <ArrowLeft size={17} />
            </button>
          )}

          <div style={{ position: "absolute", top: 14, right: 14, display: "flex", gap: 6, zIndex: 10 }}>
            {isLive && <span className="badge badge-live"><span className="live-dot" style={{ width: 5, height: 5 }} />LIVE NOW</span>}
            {event.is_featured && <span className="badge badge-featured"><Star size={9} />Featured</span>}
          </div>
        </div>

        <div className="detail-content">
          <div>
            <span style={{ background: meta.bg, border: `1px solid ${meta.color}44`, color: meta.color, fontSize: 11, fontWeight: 700, padding: "4px 12px", borderRadius: 999, textTransform: "uppercase", letterSpacing: "0.07em", display: "inline-flex", alignItems: "center" }}>
              <GenreIcon name={meta.icon} size={11} style={{ marginRight: 5 }} />
              {meta.label}
            </span>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: urgencyColor, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 7, display: "flex", alignItems: "center", gap: 5 }}>
              {isLive && <span className="live-dot" style={{ width: 5, height: 5 }} />}
              <Clock size={11} />
              {timeLabel}
            </div>
            <h1 style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 800, fontSize: 32, color: "var(--text-primary)", lineHeight: 1.15, marginBottom: 8 }}>{event.title}</h1>
            <p style={{ fontSize: 16, color: "var(--text-secondary)", fontWeight: 500 }}>{dateStr} · {startTime}–{endTime}</p>
          </div>

          {(event.artists || []).length > 0 && (
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                <Music size={13} color="var(--text-muted)" />
                <span className="label">Lineup</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {(event.artists || []).flatMap(artist => {
                  if (!artist) return [];
                  // Split nested names just in case they are comma-separated
                  return artist.split(/[,;&]|\s+vs\.?\s+|\s+and\s+/i);
                })
                .map(a => (a || "").replace(/[{}""'\[\]]/g, "").trim())
                .filter(a => a && a.toLowerCase() !== "tba")
                .map((artistName, i) => {
                  const isPlaying = activeListenArtist === artistName;
                  const isLoading = loadingArtists[artistName] || false;
                  const videoId = videoIds[artistName];
                  return (
                    <div key={`${artistName}-${i}`} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                      <div 
                        style={{ 
                          display: "flex", 
                          alignItems: "center", 
                          justifyContent: "space-between",
                          padding: "8px 14px", 
                          background: "var(--bg-elevated)", 
                          border: `1px solid ${isPlaying ? "var(--primary)" : "var(--border)"}`, 
                          borderRadius: 10,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span 
                          onClick={() => onArtistClick && onArtistClick(artistName)}
                          style={{ 
                            fontSize: 13, 
                            fontWeight: 700, 
                            color: "var(--text-primary)", 
                            cursor: onArtistClick ? "pointer" : "default" 
                          }}
                        >
                          {artistName}
                        </span>
                        
                        <div 
                          style={{ display: "flex", alignItems: "center", gap: 12 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Listen Button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              handleListenClick(artistName);
                            }}
                            disabled={isLoading}
                            style={{ 
                              display: "inline-flex", 
                              alignItems: "center", 
                              gap: 6, 
                              background: isPlaying ? "var(--primary)" : "rgba(255,255,255,0.04)", 
                              color: isPlaying ? "#fff" : "var(--text-primary)", 
                              border: `1px solid ${isPlaying ? "var(--primary)" : "var(--border)"}`, 
                              borderRadius: "20px", 
                              padding: "4px 10px", 
                              fontSize: 11, 
                              fontWeight: 700, 
                              cursor: isLoading ? "not-allowed" : "pointer",
                              transition: "all 0.15s ease",
                              opacity: isLoading ? 0.7 : 1
                            }}
                          >
                            <Headphones size={11} className={isLoading ? "animate-pulse" : ""} />
                            {isLoading ? "Searching..." : isPlaying ? "Close" : "Listen Live"}
                          </button>

                          {/* SoundCloud Link */}
                          <a 
                            href={`https://soundcloud.com/search?q=${encodeURIComponent(artistName)}`}
                            target="_blank" 
                            rel="noopener noreferrer"
                            title={`Search ${artistName} on SoundCloud`}
                            style={{ display: "flex", alignItems: "center", color: "#FF5500", transition: "transform 0.1s ease", cursor: "pointer" }}
                            onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.15)"}
                            onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
                          >
                            <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor">
                              <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
                            </svg>
                          </a>
                        </div>
                      </div>

                      {/* Expandable Player Widget */}
                      {isPlaying && videoId && (
                        <div 
                          style={{ 
                            width: "100%", 
                            height: 160, 
                            marginTop: 8, 
                            borderRadius: 10, 
                            overflow: "hidden", 
                            border: "1px solid var(--primary)", 
                            boxShadow: "0 4px 12px rgba(124, 58, 237, 0.15)", 
                            background: "#000" 
                          }}
                        >
                          <iframe
                            width="100%"
                            height="100%"
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1`}
                            title={`${artistName} DJ Set`}
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.venue_address && event.venue_address !== event.venue_name ? `${event.venue_name}, ${event.venue_address}` : `${event.venue_name}, ${event.city}`)}`}
            target="_blank" rel="noopener noreferrer"
            className="detail-venue-card"
            style={{ padding: "12px 14px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12, display: "flex", alignItems: "flex-start", gap: 10, textDecoration: "none", cursor: "pointer" }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <MapPin size={14} color="var(--text-muted)" />
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 13, color: "var(--text-primary)", marginBottom: 2 }}>{event.venue_name}</p>
              <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{event.venue_address || "View on Google Maps"}</p>
            </div>
            <ExternalLink size={12} color="var(--text-muted)" style={{ alignSelf: "center", flexShrink: 0 }} />
          </a>

          {event.description && (
            <div>
              <label className="label">About</label>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.7 }}>{event.description}</p>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "11px 15px", background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 12 }}>
            <span className="label" style={{ marginBottom: 0 }}>Entrance Fee</span>
            <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: displayPrice.length > 20 ? 12 : 16, color: event.price === "Free" ? "var(--green)" : "var(--text-primary)" }}>{displayPrice}</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {event.ticket_url && (
              <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "13px 20px", background: "var(--primary)", color: "#fff", borderRadius: 12, fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, textDecoration: "none" }}>
                <Ticket size={15} />Get Tickets<ExternalLink size={12} />
              </a>
            )}
            {event.source_url && (
              <a href={event.source_url} target="_blank" rel="noopener noreferrer" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px", background: "transparent", color: "var(--text-muted)", borderRadius: 10, border: "1px solid var(--border)", fontSize: 12, fontWeight: 600, textDecoration: "none" }}>
                <ExternalLink size={11} />View Source
              </a>
            )}
          </div>

          <button
            onClick={handleShare}
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "14px 20px", background: copied ? "var(--green)" : "var(--primary)", border: "none", borderRadius: 12, cursor: "pointer", color: "#fff", fontSize: 14, fontWeight: 800, width: "100%", fontFamily: "'Poppins', sans-serif", textTransform: "uppercase" }}
          >
            {copied ? <Check size={16} strokeWidth={3} /> : <Share2 size={16} strokeWidth={3} />}
            {copied ? "Link Copied!" : "Share Event Link"}
          </button>
        </div>
      </div>
    </div>
  );
}
