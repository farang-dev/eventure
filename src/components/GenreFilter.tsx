"use client";
import { Music } from "lucide-react";
import GenreIcon from "@/components/GenreIcon";
import { GENRE_META } from "@/lib/mock-data";

const GENRES = [
  { id: "all", label: "All" },
  { id: "techno", label: "Techno" },
  { id: "house", label: "House" },
  { id: "tech-house", label: "Tech House" },
  { id: "trance", label: "Trance" },
  { id: "drum-and-bass", label: "D&B" },
  { id: "dubstep", label: "Dubstep" },
  { id: "disco", label: "Disco" },
  { id: "funk", label: "Funk" },
  { id: "hiphop", label: "Hip-Hop" },
];

interface Props {
  selected: string;
  onChange: (genre: string) => void;
}

export default function GenreFilter({ selected, onChange }: Props) {
  return (
    <div style={{ display: "flex", gap: 6, overflowX: "auto", padding: "8px 14px", scrollbarWidth: "none" }}>
      {GENRES.map((g) => {
        const meta = GENRE_META[g.id];
        const isActive = selected === g.id;
        return (
          <button
            key={g.id}
            id={`genre-filter-${g.id}`}
            onClick={() => onChange(g.id)}
            style={{
              flexShrink: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 13px",
              borderRadius: 999,
              border: `1px solid ${isActive ? (meta?.color ?? "var(--primary)") : "var(--border)"}`,
              background: isActive ? (meta?.bg ?? "var(--primary-dim)") : "transparent",
              color: isActive ? (meta?.color ?? "var(--primary)") : "var(--text-secondary)",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.18s",
              fontFamily: "'Inter', sans-serif",
              whiteSpace: "nowrap",
              letterSpacing: "-0.01em",
            }}
          >
            {meta ? (
              <GenreIcon name={meta.icon} size={13} />
            ) : (
              <Music size={13} />
            )}
            {g.label}
          </button>
        );
      })}
    </div>
  );
}
