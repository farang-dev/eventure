"use client";
import type { MusicEvent } from "@/lib/types";
import { GENRE_META, formatEventTime, getDaysUntil } from "@/lib/mock-data";
import { MapPin } from "lucide-react";
import GenreIcon from "@/components/GenreIcon";

interface Props {
  event: MusicEvent;
  onClick: () => void;
  compact?: boolean;
}

export default function MusicEventCard({ event, onClick, compact }: Props) {
  const meta = GENRE_META[event.genre] ?? GENRE_META.other;
  const timeLabel = formatEventTime(event.starts_at, event.city);
  const isLive = event.status === "happening_now";
  const isToday = event.status === "today";
  const daysUntil = getDaysUntil(event.starts_at);

  const urgencyColor = isLive
    ? "var(--primary)"
    : isToday
    ? "var(--today-color)"
    : daysUntil <= 7
    ? "var(--text-secondary)"
    : "var(--text-muted)";

  if (compact) {
    return (
      <div
        id={`event-card-compact-${event.id}`}
        onClick={onClick}
        className="card-hover-effect"
        style={{
          flexShrink: 0,
          width: 210,
          background: "var(--bg-elevated)",
          borderRadius: 12,
          border: `1px solid ${isLive ? "rgba(230,57,70,0.25)" : "var(--border)"}`,
          padding: "12px",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top accent */}
        <div
          style={{
            position: "absolute", top: 0, left: 0, right: 0, height: 2,
            background: isLive
              ? "var(--primary)"
              : isToday
              ? "var(--today-color)"
              : meta.color,
            opacity: isLive || isToday ? 1 : 0.5,
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 7 }}>
          <span
            style={{
              fontSize: 10, fontWeight: 700,
              color: urgencyColor,
              textTransform: "uppercase", letterSpacing: "0.05em",
              display: "flex", alignItems: "center", gap: 4,
            }}
          >
            {isLive && <span className="live-dot" style={{ width: 5, height: 5 }} />}
            {timeLabel}
          </span>
          <GenreIcon name={meta.icon} size={15} color={meta.color} />
        </div>

        <p
          style={{
            fontFamily: "'Poppins', sans-serif", fontWeight: 700,
            fontSize: 12, marginBottom: 4, lineHeight: 1.2,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical",
            overflow: "hidden", 
            color: "var(--text-primary)",
            minHeight: "2.4em",
          }}
        >
          {event.title}
        </p>
        <p
          style={{
            fontSize: 11, color: "var(--text-secondary)",
            marginBottom: 9,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}
        >
          {event.venue_name}
        </p>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span
            style={{
              fontSize: 10, color: meta.color, fontWeight: 700,
              background: meta.bg, padding: "2px 7px", borderRadius: 999,
              border: `1px solid ${meta.color}22`,
            }}
          >
            {meta.label}
          </span>
          {event.price && (
            <span style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600 }}>
              {event.price}
            </span>
          )}
        </div>
      </div>
    );
  }

  // Full card — text-only compact list row
  const isTomorrow = (() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return new Date(event.starts_at).toDateString() === tomorrow.toDateString();
  })();

  return (
    <div
      id={`event-card-${event.id}`}
      onClick={onClick}
      className="card-hover-effect"
      style={{
        background: "var(--card-bg)",
        borderRadius: 10,
        border: `1px solid ${isLive ? "rgba(230,57,70,0.3)" : isToday ? "rgba(249,115,22,0.2)" : "var(--border)"}`,
        padding: "10px 14px",
        cursor: "pointer",
        position: "relative",
        display: "flex",
        alignItems: "center",
        gap: 12,
        overflow: "hidden",
      }}
    >
      {/* Left urgency bar */}
      <div style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 3,
        background: isLive ? "#E63946" : isToday ? "#F97316" : isTomorrow ? "#F59E0B" : meta.color,
        opacity: isLive || isToday ? 1 : 0.5,
      }} />

      {/* Genre icon */}
      <div style={{
        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
        background: meta.bg, border: `1px solid ${meta.color}22`,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <GenreIcon name={meta.icon} size={15} color={meta.color} />
      </div>

      {/* Main info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
          {isLive && <span className="badge badge-live" style={{ padding: "1px 6px", fontSize: 9 }}><span className="live-dot" style={{ width: 4, height: 4 }} />LIVE</span>}
          <span style={{ fontSize: 11, fontWeight: 700, color: urgencyColor, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {timeLabel}
          </span>
        </div>
        <p style={{
          fontFamily: "'Poppins', sans-serif", fontWeight: 700,
          fontSize: 13, color: "var(--text-primary)", lineHeight: 1.25,
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          marginBottom: 2,
        }}>
          {event.title}
        </p>
        <p style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {event.venue_name}{event.artists.length > 0 ? ` · ${event.artists.slice(0, 2).join(", ")}` : ""}
        </p>
      </div>

      {/* Right: price + genre */}
      <div style={{ flexShrink: 0, textAlign: "right" }}>
        <span style={{
          fontSize: 10, fontWeight: 700, color: meta.color,
          background: meta.bg, padding: "2px 7px", borderRadius: 999,
          border: `1px solid ${meta.color}22`, display: "block", marginBottom: 4,
          whiteSpace: "nowrap",
        }}>
          {meta.label}
        </span>
        {event.price && (
          <span style={{ fontSize: 10, color: event.price === "Free" ? "var(--green)" : "var(--text-muted)", fontWeight: 600 }}>
            {event.price}
          </span>
        )}
      </div>
    </div>
  );
}
