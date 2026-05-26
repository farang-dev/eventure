"use client";

import { useState } from "react";
import Link from "next/link";
import { Music, Headphones } from "lucide-react";

interface LineupListProps {
  artists: string[];
  city: string;
}

export default function LineupList({ artists, city }: LineupListProps) {
  const [activeListenArtist, setActiveListenArtist] = useState<string | null>(null);
  const [videoIds, setVideoIds] = useState<Record<string, string>>({});
  const [loadingArtists, setLoadingArtists] = useState<Record<string, boolean>>({});

  if (!artists || artists.length === 0) return null;

  const splitArtists = artists.flatMap((artist: string) => {
    if (!artist) return [];
    return artist.split(/[,;&]|\s+vs\.?\s+|\s+and\s+/i);
  })
  .map((a: string) => (a || "").replace(/[{}""'\[\]]/g, "").trim())
  .filter((a: string) => a && a.toLowerCase() !== "tba");

  if (splitArtists.length === 0) return null;

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

  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
        <Music size={13} color="var(--text-muted)" />
        <span className="label" style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.05em", fontWeight: 700, color: "var(--text-muted)" }}>Lineup</span>
      </div>
      
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {splitArtists.map((artistName: string, i: number) => {
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
                <Link 
                  href={`/?city=${(city || "vilnius").toLowerCase()}&view=artists&artist=${encodeURIComponent(artistName)}`}
                  style={{ 
                    textDecoration: "none",
                    color: "inherit",
                    fontWeight: 700,
                    fontSize: 13,
                  }}
                >
                  {artistName}
                </Link>
                
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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
  );
}
