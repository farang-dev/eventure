"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase";
import { CITIES } from "@/lib/constants";
import { Search, X, MapPin } from "lucide-react";

interface ArtistResult {
  name: string;
  city: string;
}

export default function ArtistSearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArtistResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const cityNameMap = new Map(CITIES.map(c => [c.id, c.name]));

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const supabase = createClient();
    const q = query.trim();

    const fetchArtists = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("music_events")
          .select("artists, city")
          .not("artists", "is", null)
          .limit(500);

        if (error) throw error;

        const seen = new Set<string>();
        const matched: ArtistResult[] = [];

        for (const row of data || []) {
          const list: string[] = row.artists || [];
          for (const raw of list) {
            if (!raw) continue;
            raw.split(/[,;&]|\s+vs\.?\s+|\s+and\s+/i).forEach((name: string) => {
              const clean = name.replace(/[{}""'\[\]]/g, "").trim();
              if (!clean || clean.toLowerCase() === "tba") return;
              if (!clean.toLowerCase().includes(q.toLowerCase())) return;
              const key = `${clean.toLowerCase()}|${row.city}`;
              if (seen.has(key)) return;
              seen.add(key);
              matched.push({ name: clean, city: row.city });
            });
          }
        }

        setResults(matched.slice(0, 30));
        setIsOpen(matched.length > 0);
      } catch (e) {
        console.error("Artist search error:", e);
      } finally {
        setIsLoading(false);
      }
    };

    const timer = setTimeout(fetchArtists, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", maxWidth: 600, margin: "0 auto" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 8,
        background: "var(--bg-elevated)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "10px 16px",
      }}>
        <Search size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search DJs across all cities..."
          style={{
            flex: 1, border: "none", outline: "none", fontSize: 14,
            background: "transparent", color: "var(--text-primary)",
          }}
        />
        {query && (
          <button onClick={() => { setQuery(""); setResults([]); setIsOpen(false); inputRef.current?.focus(); }}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div style={{
          position: "absolute", top: "calc(100% + 8px)", left: 0, right: 0,
          background: "var(--bg-elevated)", border: "1px solid var(--border)",
          borderRadius: 12, overflow: "hidden", zIndex: 100,
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        }}>
          {isLoading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              Searching...
            </div>
          ) : (
            results.map((r, i) => (
              <Link key={i} href={`/artists/${r.city}/${encodeURIComponent(r.name.toLowerCase().replace(/\s+/g, "-"))}`}
                onClick={() => setIsOpen(false)}
                style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "10px 16px",
                  textDecoration: "none", color: "var(--text-primary)", fontSize: 14,
                  borderBottom: i < results.length - 1 ? "1px solid var(--border)" : "none",
                }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                <span style={{ flex: 1 }}>{r.name}</span>
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 12, color: "var(--text-muted)" }}>
                  <MapPin size={12} />
                  {cityNameMap.get(r.city) || r.city}
                </span>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
}
