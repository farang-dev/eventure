"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { CITIES } from "@/lib/constants";
import { ArrowLeft, Calendar, ChevronRight } from "lucide-react";
import type { MusicEvent } from "@/lib/types";
import { EXPLORE_PLAY_DURATION, EXPLORE_FADE_DURATION, fetchVideoForArtist } from "@/lib/youtube";

interface Props {
  initialCity: string | null;
}

export default function ExploreClient({ initialCity }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [cityId] = useState(initialCity || "");
  const cityMeta = CITIES.find(c => c.id === cityId.toLowerCase());

  const [cityEvents, setCityEvents] = useState<MusicEvent[]>([]);
  const [allArtists, setAllArtists] = useState<string[]>([]);
  const [flaggedArtists, setFlaggedArtists] = useState<string[]>([]);
  const [isMobile, setIsMobile] = useState(false);

  const [isStarted, setIsStarted] = useState(false);
  const [isLoadingStart, setIsLoadingStart] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [exploreCurrentDJ, setExploreCurrentDJ] = useState<string | null>(null);
  const [exploreSecondsPlayed, setExploreSecondsPlayed] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [upNext, setUpNext] = useState<string[]>([]);

  const explorePlayerRef = useRef<any>(null);
  const exploreIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const exploreQueueRef = useRef<string[]>([]);
  const exploreIndexRef = useRef(0);
  const advanceExploreRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!cityId) return;
    const load = async () => {
      const { data, error } = await supabase.from("music_events").select("*").eq("city", cityId.toLowerCase());
      if (data && !error) {
        setCityEvents(data as MusicEvent[]);
        const unique = new Set<string>();
        data.forEach((e: any) => {
          (e.artists || []).forEach((a: string) => {
            if (!a) return;
            a.split(/[,;&]|\s+vs\.?\s+|\s+and\s+/i).forEach((name: string) => {
              const clean = name.replace(/[{}""'\[\]]/g, "").trim();
              if (clean && clean.toLowerCase() !== "tba") unique.add(clean);
            });
          });
        });
        setAllArtists(Array.from(unique).sort());
      }
    };
    load();
  }, [cityId, supabase]);

  useEffect(() => {
    const loadFlagged = async () => {
      try {
        const { data } = await supabase.from("artist_flags").select("artist_name").gte("flag_count", 3);
        if (data) setFlaggedArtists(data.map((d: any) => d.artist_name.toLowerCase()));
      } catch (e) {}
    };
    loadFlagged();
  }, [supabase]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    const win = window as any;
    if (!win.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const fmt = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const updateUpNext = (queue: string[], idx: number) =>
    setUpNext([1, 2, 3].map(o => queue[(idx + o) % queue.length]).filter(Boolean));

  const stopExplore = () => {
    if (exploreIntervalRef.current) clearInterval(exploreIntervalRef.current);
    try { explorePlayerRef.current?.stopVideo(); explorePlayerRef.current?.destroy(); } catch (e) {}
    explorePlayerRef.current = null;
    setIsStarted(false);
    setExploreCurrentDJ(null);
    setExploreSecondsPlayed(0);
    setIsFadingOut(false);
    setIsSkipping(false);
    setUpNext([]);
  };

  const startTimer = () => {
    if (exploreIntervalRef.current) clearInterval(exploreIntervalRef.current);
    let secs = 0;
    const interval = setInterval(() => {
      secs++;
      setExploreSecondsPlayed(secs);
      if (secs >= EXPLORE_PLAY_DURATION - EXPLORE_FADE_DURATION) {
        setIsFadingOut(true);
        const elapsed = secs - (EXPLORE_PLAY_DURATION - EXPLORE_FADE_DURATION);
        const vol = Math.max(0, Math.floor(100 * (1 - elapsed / EXPLORE_FADE_DURATION)));
        try { explorePlayerRef.current?.setVolume?.(vol); } catch (e) {}
      }
      if (secs >= EXPLORE_PLAY_DURATION) { clearInterval(interval); advanceExploreRef.current(); }
    }, 1000);
    exploreIntervalRef.current = interval;
  };

  const beginTrack = (videoId: string, artist: string) => {
    setExploreCurrentDJ(artist);
    setExploreSecondsPlayed(0);
    setIsFadingOut(false);
    const randomStart = Math.floor(Math.random() * 2400) + 300;
    const doLoad = () => {
      if (explorePlayerRef.current?.loadVideoById) {
        explorePlayerRef.current.loadVideoById({ videoId, startSeconds: randomStart });
        explorePlayerRef.current.setVolume(100);
        startTimer();
      } else { setTimeout(doLoad, 300); }
    };
    doLoad();
  };

  const advanceExplore = async () => {
    if (exploreIntervalRef.current) clearInterval(exploreIntervalRef.current);
    setIsFadingOut(false);
    setExploreSecondsPlayed(0);
    setIsSkipping(true);
    const queue = exploreQueueRef.current;
    const startIdx = (exploreIndexRef.current + 1) % Math.max(queue.length, 1);
    for (let attempt = 0; attempt < queue.length; attempt++) {
      const i = (startIdx + attempt) % queue.length;
      const result = await fetchVideoForArtist(queue[i]);
      if (result?.reliable) {
        exploreIndexRef.current = i;
        updateUpNext(queue, i);
        setIsSkipping(false);
        beginTrack(result.videoId, queue[i]);
        return;
      }
    }
    stopExplore();
  };
  advanceExploreRef.current = advanceExplore;

  const initExplorePlayer = (videoId: string) => {
    const win = window as any;
    const randomStart = Math.floor(Math.random() * 2400) + 300;
    const doInit = () => {
      const el = document.getElementById("explore-page-player");
      if (el && win.YT?.Player) {
        try { explorePlayerRef.current?.destroy(); } catch (e) {}
        explorePlayerRef.current = new win.YT.Player("explore-page-player", {
          videoId,
          playerVars: { autoplay: 1, start: randomStart, enablejsapi: 1 },
          events: {
            onReady: (event: any) => { event.target.setVolume(100); startTimer(); },
            onError: () => { advanceExploreRef.current(); },
          },
        });
      } else { setTimeout(doInit, 400); }
    };
    doInit();
  };

  const startExplore = async () => {
    if (!allArtists.length) return;
    setIsLoadingStart(true);
    const shuffled = [...allArtists.filter(a => !flaggedArtists.includes(a.toLowerCase()))].sort(() => Math.random() - 0.5);
    exploreQueueRef.current = shuffled;
    for (let i = 0; i < shuffled.length; i++) {
      const result = await fetchVideoForArtist(shuffled[i]);
      if (result?.reliable) {
        exploreIndexRef.current = i;
        updateUpNext(shuffled, i);
        setExploreCurrentDJ(shuffled[i]);
        setIsStarted(true);
        setIsLoadingStart(false);
        setTimeout(() => initExplorePlayer(result.videoId), 150);
        return;
      }
    }
    setIsLoadingStart(false);
    alert(`No verified DJ sets found in ${cityMeta?.name || cityId}. Try another city.`);
  };

  const currentDJEvents = exploreCurrentDJ
    ? cityEvents.filter(e => (e.artists || []).some(a => {
        const cleaned = (a || "").replace(/[{}""'\[\]]/g, "").trim().toLowerCase();
        return cleaned.includes(exploreCurrentDJ.toLowerCase());
      }))
    : [];

  // ─── City selector (no city in URL) ────────────────────────────────────────
  if (!cityId) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", padding: "40px 24px", fontFamily: "'Inter', sans-serif" }}>
        <Link href="/artists" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text-secondary)", textDecoration: "none", fontSize: 13, marginBottom: 36 }}>
          <ArrowLeft size={14} /> Back to Artists
        </Link>
        <h1 style={{ fontSize: 32, fontFamily: "'Poppins', sans-serif", fontWeight: 900, marginBottom: 8 }}>Explore DJs</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 14, marginBottom: 36, maxWidth: 480 }}>
          Pick a city and discover DJ sets — 10 minutes each with seamless 7-second fade transitions.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, maxWidth: 780 }}>
          {CITIES.map(city => (
            <Link key={city.id} href={`/artists/explore?city=${city.id}`}
              style={{ padding: "20px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, textDecoration: "none", color: "var(--text-primary)", display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>{city.name}</span>
              <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 600 }}>▶ Explore →</span>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // ─── Main explore page ──────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-primary)", color: "var(--text-primary)", fontFamily: "'Inter', sans-serif", display: "flex", flexDirection: "column" }}>
      <style>{`
        @keyframes eq-bar { 0% { height: 6px; } 100% { height: 34px; } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {isStarted && (
        <div style={{ position: "fixed", bottom: 2, right: 2, width: 2, height: 2, opacity: 0, pointerEvents: "none", zIndex: 1 }}>
          <div id="explore-page-player" style={{ width: 2, height: 2 }} />
        </div>
      )}

      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", padding: "0 24px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link href={`/artists/${cityId}`} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)", textDecoration: "none", fontSize: 12, fontWeight: 500 }}>
            <ArrowLeft size={14} /> {cityMeta?.name || cityId}
          </Link>
          {isStarted && (
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 11, color: "#a78bfa", fontWeight: 700, letterSpacing: "0.05em" }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", boxShadow: "0 0 6px #a78bfa" }} />
              EXPLORE · {(cityMeta?.name || cityId).toUpperCase()}
            </div>
          )}
        </div>
        {isStarted && (
          <button onClick={stopExplore} style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5", padding: "6px 14px", borderRadius: 8, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
            ■ Stop
          </button>
        )}
      </header>

      {!isStarted ? (
        // ─── Start screen ───────────────────────────────────────────────────
        <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 24px", textAlign: "center", gap: 24 }}>
          <div style={{ fontSize: 48 }}>🎧</div>
          <div>
            <h1 style={{ fontSize: isMobile ? 26 : 34, fontFamily: "'Poppins', sans-serif", fontWeight: 900 }}>
              Explore DJs in {cityMeta?.name || cityId}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14, marginTop: 10, maxWidth: 420, margin: "10px auto 0" }}>
              {allArtists.length > 0
                ? `${allArtists.length} artists in the pool. 10 minutes each with 7-second fade transitions — only verified sets play.`
                : "Loading artists…"}
            </p>
          </div>
          <button onClick={startExplore} disabled={isLoadingStart || allArtists.length === 0}
            style={{ background: isLoadingStart ? "var(--bg-elevated)" : "linear-gradient(135deg, #7c3aed, #4f46e5)", border: "none", color: "#fff", padding: "14px 36px", borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: isLoadingStart ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 10, opacity: allArtists.length === 0 ? 0.4 : 1 }}>
            {isLoadingStart
              ? <><div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />Finding first DJ…</>
              : <>▶ Start Exploring</>}
          </button>
        </div>
      ) : (
        // ─── Active explore ─────────────────────────────────────────────────
        <div style={{ flex: 1, display: "flex", flexDirection: isMobile ? "column" : "row", minHeight: 0 }}>

          {/* Left panel: Now Playing */}
          <div style={{ flex: isMobile ? undefined : "0 0 360px", background: "linear-gradient(180deg, #0f0a1e 0%, #1a0a2e 100%)", padding: isMobile ? "32px 20px" : "52px 36px", display: "flex", flexDirection: "column", justifyContent: "center", gap: 28, borderRight: isMobile ? "none" : "1px solid rgba(124,58,237,0.2)", borderBottom: isMobile ? "1px solid var(--border)" : "none" }}>

            <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.2em" }}>
              {isSkipping ? "Finding next DJ…" : isFadingOut ? "Transitioning…" : "Now Playing"}
            </div>

            {/* EQ bars */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 34 }}>
              {[0.7, 1.2, 0.9, 1.4, 0.8, 1.1, 0.65, 1.3, 0.75].map((dur, i) => (
                <div key={i} style={{ width: 5, borderRadius: 2, minHeight: 4, background: (isFadingOut || isSkipping) ? "rgba(167,139,250,0.2)" : "#7c3aed", height: (isFadingOut || isSkipping) ? 4 : undefined, animation: (!isFadingOut && !isSkipping) ? `eq-bar ${dur}s ease-in-out infinite alternate` : "none", transition: "background 0.4s, height 0.4s" }} />
              ))}
            </div>

            {/* DJ name */}
            <div key={exploreCurrentDJ} style={{ animation: "fadeIn 0.35s ease" }}>
              <h2 style={{ fontSize: isMobile ? 28 : 36, fontFamily: "'Poppins', sans-serif", fontWeight: 900, lineHeight: 1.1, color: "#fff", opacity: isFadingOut ? 0.35 : 1, transition: "opacity 0.5s" }}>
                {isSkipping ? "…" : exploreCurrentDJ}
              </h2>
              {!isSkipping && exploreCurrentDJ && (
                <Link href={`/artists/${cityId}/${encodeURIComponent(exploreCurrentDJ.toLowerCase().replace(/\s+/g, "-"))}`}
                  style={{ fontSize: 11, color: "#a78bfa", textDecoration: "none", marginTop: 8, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  View full profile <ChevronRight size={11} />
                </Link>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ height: 4, background: "rgba(255,255,255,0.08)", borderRadius: 2, overflow: "hidden" }}>
                <div style={{ height: "100%", background: isFadingOut ? "rgba(255,255,255,0.15)" : "linear-gradient(90deg, #7c3aed, #4f46e5)", borderRadius: 2, width: `${Math.min(100, (exploreSecondsPlayed / EXPLORE_PLAY_DURATION) * 100)}%`, transition: "width 1s linear, background 0.5s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                <span>{fmt(exploreSecondsPlayed)}</span>
                <span>{fmt(EXPLORE_PLAY_DURATION)}</span>
              </div>
            </div>

            {/* Next DJ button */}
            <button onClick={advanceExplore} disabled={isSkipping}
              style={{ background: isSkipping ? "rgba(255,255,255,0.03)" : "rgba(124,58,237,0.25)", border: `1px solid ${isSkipping ? "rgba(255,255,255,0.08)" : "rgba(124,58,237,0.45)"}`, color: isSkipping ? "rgba(255,255,255,0.25)" : "#c4b5fd", padding: "10px 20px", borderRadius: 10, fontSize: 12, fontWeight: 700, cursor: isSkipping ? "wait" : "pointer", display: "flex", alignItems: "center", gap: 8, width: "fit-content", transition: "all 0.2s" }}>
              {isSkipping
                ? <><div style={{ width: 10, height: 10, border: "1.5px solid rgba(255,255,255,0.2)", borderTopColor: "#a78bfa", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Finding next DJ…</>
                : "Next DJ →"}
            </button>
          </div>

          {/* Right panel: DJ info */}
          <div style={{ flex: 1, padding: isMobile ? "24px 20px" : "40px 36px", overflowY: "auto", maxHeight: isMobile ? undefined : "calc(100vh - 58px)" }}>

            {/* Upcoming gigs */}
            <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 14 }}>
              Upcoming gigs for {isSkipping ? "…" : exploreCurrentDJ} in {cityMeta?.name || cityId}
            </p>

            {!isSkipping && currentDJEvents.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {currentDJEvents.map(event => (
                  <div key={event.id} onClick={() => router.push(`/event/${(event as any).slug || event.id}`)}
                    style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "border-color 0.15s" }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--primary)")}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <Calendar size={14} style={{ color: "var(--primary)", marginTop: 2, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13 }}>{event.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 3 }}>
                          {(event as any).venue_name || "Venue TBA"} · {new Date((event as any).starts_at || (event as any).date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </div>
                      </div>
                    </div>
                    <ChevronRight size={14} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                  </div>
                ))}
              </div>
            ) : (
              !isSkipping && (
                <div style={{ padding: "20px", background: "var(--bg-secondary)", borderRadius: 12, fontSize: 13, color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
                  No upcoming gigs found for this artist in {cityMeta?.name || cityId}.
                </div>
              )
            )}

            {/* Up Next */}
            {upNext.length > 0 && (
              <div style={{ marginTop: 36 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 14 }}>Up Next</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {upNext.map((dj, i) => (
                    <div key={i} style={{ padding: "10px 16px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 10, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "var(--primary)", fontWeight: 700 }}>{i + 1}</span>
                      {dj}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
