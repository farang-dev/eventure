"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { CITIES } from "@/lib/constants";
import { Search, ArrowLeft, Users, X, Building2, Map as MapIcon, ChevronRight } from "lucide-react";
import type { MusicEvent } from "@/lib/types";
import { EXPLORE_PLAY_DURATION, EXPLORE_FADE_DURATION, fetchVideoForArtist } from "@/lib/youtube";

interface Props {
  initialArtist: string | null;
}

export default function CityArtistsClient({ initialArtist }: Props) {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();

  const cityId = (params.city as string) || "vilnius";
  const cityMeta = CITIES.find(c => c.id === cityId.toLowerCase());

  const [allArtists, setAllArtists] = useState<string[]>([]);
  const [cityEvents, setCityEvents] = useState<MusicEvent[]>([]);
  const [artistSearchQuery, setArtistSearchQuery] = useState("");
  
  // Initialize state from the server-passed initialArtist
  const [selectedArtist, setSelectedArtist] = useState<string | null>(initialArtist);
  const [dynamicVideoId, setDynamicVideoId] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [isLoadingEvents, setIsLoadingLoadingEvents] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [isAudioOnly, setIsAudioOnly] = useState(false);
  const [estimatedSeconds, setEstimatedSeconds] = useState(0);
  const [duration, setDuration] = useState(7200); // Default to 2 hours
  const [videoTitle, setVideoTitle] = useState<string | null>(null);
  const [isVideoReliable, setIsVideoReliable] = useState(true);
  const [flaggedArtists, setFlaggedArtists] = useState<string[]>([]);
  const [isReporting, setIsReporting] = useState(false);
  const playerRef = useRef<any>(null);

  // ── Explore mode state ──────────────────────────────────────────────────────
  const [isExploreMode, setIsExploreMode] = useState(false);
  const [isLoadingExplore, setIsLoadingExplore] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);
  const [exploreCurrentDJ, setExploreCurrentDJ] = useState<string | null>(null);
  const [exploreInitVideoId, setExploreInitVideoId] = useState<string | null>(null);
  const [exploreSecondsPlayed, setExploreSecondsPlayed] = useState(0);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [upNext, setUpNext] = useState<string[]>([]);
  const explorePlayerRef = useRef<any>(null);
  const exploreIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const exploreQueueRef = useRef<string[]>([]);
  const exploreIndexRef = useRef(0);
  const advanceExploreRef = useRef<() => void>(() => {});

  const updateUpNext = (queue: string[], index: number) => {
    const next: string[] = [];
    for (let i = 1; i <= 3; i++) {
      const idx = (index + i) % queue.length;
      if (next.includes(queue[idx])) break;
      next.push(queue[idx]);
    }
    setUpNext(next);
  };
  // ────────────────────────────────────────────────────────────────────────────

  // Fetch flagged artists that should be hidden (count >= 3) on component mount
  useEffect(() => {
    const fetchFlagged = async () => {
      try {
        const { data, error } = await supabase
          .from("artist_flags")
          .select("artist_name")
          .gte("flag_count", 3);
          
        if (data && !error) {
          setFlaggedArtists(data.map((item: any) => item.artist_name.toLowerCase()));
        }
      } catch (err) {
        console.warn("Could not fetch flagged artists (table may not exist yet):", err);
      }
    };
    fetchFlagged();
  }, [supabase]);

  // Action: Submit spam report for incorrect video / DJ mapping
  const handleFlagArtist = async () => {
    if (!selectedArtist) return;
    setIsReporting(true);
    
    const storeKey = `flagged-${selectedArtist.toLowerCase()}`;
    if (localStorage.getItem(storeKey)) {
      alert("You have already reported this DJ profile as incorrect. Thank you for your feedback!");
      setIsReporting(false);
      return;
    }

    try {
      const normalizedName = selectedArtist.toLowerCase().trim();
      
      // Fetch current flags for this artist
      const { data: existing, error: fetchErr } = await supabase
        .from("artist_flags")
        .select("flag_count")
        .eq("artist_name", normalizedName)
        .maybeSingle();

      if (existing) {
        const nextCount = (existing.flag_count || 1) + 1;
        await supabase
          .from("artist_flags")
          .update({ flag_count: nextCount })
          .eq("artist_name", normalizedName);
          
        if (nextCount >= 3) {
          // Immediately kick out from list on screen
          setFlaggedArtists(prev => [...prev, normalizedName]);
          setSelectedArtist(null);
        }
      } else {
        // First report
        await supabase
          .from("artist_flags")
          .insert({ 
            artist_name: normalizedName, 
            flag_count: 1,
            city: cityId.toLowerCase()
          });
      }
      
      localStorage.setItem(storeKey, "true");
      alert("Thank you! Your report has been submitted. If this DJ profile collects 3 spam reports, it will be automatically removed from the directory.");
    } catch (err) {
      console.error("Error flagging artist:", err);
      alert("Report submitted successfully! Thank you for helping keep the community accurate.");
    } finally {
      setIsReporting(false);
    }
  };

  // 1. Inject official YouTube Iframe API Script tag once
  useEffect(() => {
    if (typeof window === "undefined") return;
    const win = window as any;
    if (!win.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, []);

  // 2. Bind YT.Player to our placeholder div and poll exact duration and playhead progress
  useEffect(() => {
    if (!dynamicVideoId || !selectedArtist || !isVideoReliable) return;

    let player: any = null;
    let interval: NodeJS.Timeout;
    const win = window as any;

    const initPlayer = () => {
      const element = document.getElementById("youtube-audio-player");
      if (element && win.YT && win.YT.Player) {
        // Destroy existing player first to prevent duplicate bindings on re-render
        if (playerRef.current) {
          try {
            playerRef.current.destroy();
          } catch (e) {}
        }

        player = new win.YT.Player("youtube-audio-player", {
          videoId: dynamicVideoId,
          playerVars: {
            autoplay: 1,
            enablejsapi: 1,
            origin: typeof window !== "undefined" ? window.location.origin : ""
          },
          events: {
            onReady: () => {
              playerRef.current = player;
              
              // Poll duration and current playing progress every second
              interval = setInterval(() => {
                if (player && typeof player.getCurrentTime === "function") {
                  try {
                    const current = player.getCurrentTime();
                    const total = player.getDuration();
                    if (current !== undefined && !isNaN(current)) {
                      setEstimatedSeconds(Math.floor(current));
                    }
                    if (total && total > 0 && !isNaN(total)) {
                      setDuration(Math.floor(total));
                    }
                  } catch (e) {
                    // Ignore transient frame buffer query errors
                  }
                }
              }, 1000);
            }
          }
        });
      } else {
        // Retry shortly if API is still booting
        setTimeout(initPlayer, 400);
      }
    };

    initPlayer();

    return () => {
      if (interval) clearInterval(interval);
      playerRef.current = null;
      if (player && typeof player.destroy === "function") {
        try {
          player.destroy();
        } catch (e) {}
      }
    };
  }, [dynamicVideoId, selectedArtist]);

  // Reset timer and duration on artist change
  useEffect(() => {
    setEstimatedSeconds(0);
    setDuration(7200);
  }, [selectedArtist]);

  const handleSeek = (seconds: number) => {
    let target = seconds;
    if (target < 0) target = 0;
    if (target > duration) target = duration;
    setEstimatedSeconds(target);
    
    if (playerRef.current && typeof playerRef.current.seekTo === "function") {
      playerRef.current.seekTo(target, true);
    }
  };

  const handleRelativeSeek = (offsetSeconds: number) => {
    handleSeek(estimatedSeconds + offsetSeconds);
  };

  const formatDuration = (sec: number) => {
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (h > 0) {
      return `${h}:${m < 10 ? "0" : ""}${m}:${s < 10 ? "0" : ""}${s}`;
    }
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  // ── Explore Mode ────────────────────────────────────────────────────────────

  const stopExplore = () => {
    if (exploreIntervalRef.current) clearInterval(exploreIntervalRef.current);
    if (explorePlayerRef.current) {
      try {
        explorePlayerRef.current.stopVideo(); // stop audio first
        explorePlayerRef.current.destroy();
      } catch (e) {}
    }
    explorePlayerRef.current = null;
    setIsExploreMode(false);
    setExploreCurrentDJ(null);
    setExploreInitVideoId(null);
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
      if (secs >= EXPLORE_PLAY_DURATION) {
        clearInterval(interval);
        advanceExploreRef.current();
      }
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
      } else {
        setTimeout(doLoad, 300);
      }
    };
    doLoad();
  };

  const advanceExplore = async () => {
    if (exploreIntervalRef.current) clearInterval(exploreIntervalRef.current);
    setIsFadingOut(false);
    setExploreSecondsPlayed(0);
    setIsSkipping(true);
    const queue = exploreQueueRef.current;
    const startIdx = (exploreIndexRef.current + 1) % queue.length;
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

  const startExplore = async () => {
    setIsLoadingExplore(true);
    const shuffled = [...allArtists
      .filter(a => !flaggedArtists.includes(a.toLowerCase()))
    ].sort(() => Math.random() - 0.5);
    exploreQueueRef.current = shuffled;

    for (let i = 0; i < shuffled.length; i++) {
      const result = await fetchVideoForArtist(shuffled[i]);
      if (result?.reliable) {
        exploreIndexRef.current = i;
        updateUpNext(shuffled, i);
        setExploreCurrentDJ(shuffled[i]);
        setExploreInitVideoId(result.videoId);
        setIsExploreMode(true);
        setIsLoadingExplore(false);
        return;
      }
    }
    setIsLoadingExplore(false);
    alert(`No verified DJ sets found in ${cityMeta?.name || cityId} to explore. Try another city!`);
  };

  // Initialize the YouTube player for explore mode when it first activates
  useEffect(() => {
    if (!isExploreMode || !exploreInitVideoId) return;
    const win = window as any;
    const randomStart = Math.floor(Math.random() * 2400) + 300;
    const initExplorePlayer = () => {
      const element = document.getElementById("explore-yt-player");
      if (element && win.YT?.Player) {
        if (explorePlayerRef.current) {
          try { explorePlayerRef.current.destroy(); } catch (e) {}
        }
        explorePlayerRef.current = new win.YT.Player("explore-yt-player", {
          videoId: exploreInitVideoId,
          playerVars: { autoplay: 1, start: randomStart, enablejsapi: 1 },
          events: {
            onReady: (event: any) => {
              event.target.setVolume(100);
              startTimer();
            }
          }
        });
      } else {
        setTimeout(initExplorePlayer, 400);
      }
    };
    initExplorePlayer();
    return () => {
      if (exploreIntervalRef.current) clearInterval(exploreIntervalRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExploreMode, exploreInitVideoId]);

  // ────────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Synchronize state if URL / SSR parameter changes (back/forward browser clicks) with high-precision fuzzy matching
  useEffect(() => {
    if (!initialArtist) {
      setSelectedArtist(null);
      return;
    }
    if (allArtists.length > 0) {
      const match = allArtists.find(a => {
        const cleanA = a.replace(/[^\w]/g, "").toLowerCase();
        const cleanInit = initialArtist.replace(/[^\w]/g, "").toLowerCase();
        return cleanA === cleanInit || cleanA.includes(cleanInit) || cleanInit.includes(cleanA);
      });
      if (match) {
        setSelectedArtist(match);
      } else {
        setSelectedArtist(initialArtist);
      }
    } else {
      setSelectedArtist(initialArtist);
    }
  }, [initialArtist, allArtists]);

  // 1. Fetch all events and extract artists
  useEffect(() => {
    const fetchCityData = async () => {
      setIsLoadingLoadingEvents(true);
      const { data, error } = await supabase
        .from('music_events')
        .select('*')
        .eq('city', cityId.toLowerCase());
        
      if (data && !error) {
        setCityEvents(data as MusicEvent[]);
        const unique = new Set<string>();
        data.forEach(e => {
          const list = e.artists || [];
          list.forEach((a: string) => {
            if (!a) return;
            a.split(/[,;&]|\s+vs\.?\s+|\s+and\s+/i).forEach((name: string) => {
              const clean = name.replace(/[{}""'\[\]]/g, "").trim();
              if (clean && clean.toLowerCase() !== "tba") {
                unique.add(clean);
              }
            });
          });
        });
        setAllArtists(Array.from(unique).sort());
      }
      setIsLoadingLoadingEvents(false);
    };
    fetchCityData();
  }, [cityId, supabase]);

  // 2. Fetch video on artist selection
  useEffect(() => {
    if (!selectedArtist) {
      setDynamicVideoId(null);
      setIsLoadingVideo(false);
      return;
    }

    const fetchVideo = async () => {
      setIsLoadingVideo(true);
      setDynamicVideoId(null);
      setVideoTitle(null);
      setIsVideoReliable(true);
      try {
        const result = await fetchVideoForArtist(selectedArtist);
        if (result) {
          setDynamicVideoId(result.videoId);
          setVideoTitle(result.title || null);
          setIsVideoReliable(result.reliable);
        }
      } catch (err) {
        console.error("Error fetching dynamic video:", err);
      } finally {
        setIsLoadingVideo(false);
      }
    };

    fetchVideo();
  }, [selectedArtist]);

  const filteredArtists = allArtists.filter(artist =>
    artist.toLowerCase().includes(artistSearchQuery.toLowerCase())
  );

  const handleArtistClick = (artistName: string) => {
    setSelectedArtist(artistName);
    // Push slug URL quietly for seamless SEO link display
    const slug = encodeURIComponent(artistName.replace(/\s+/g, "-").toLowerCase());
    window.history.pushState(null, "", `/artists/${cityId}/${slug}`);
  };

  const handleClearArtist = () => {
    setSelectedArtist(null);
    window.history.pushState(null, "", `/artists/${cityId}`);
  };

  const currentDJEvents = exploreCurrentDJ ? cityEvents.filter(e =>
    (e.artists || []).some(a => {
      const cleaned = (a || "").replace(/[{}""'\[\]]/g, "").trim().toLowerCase();
      return cleaned.includes(exploreCurrentDJ.toLowerCase());
    })
  ) : [];

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--border)", backgroundColor: "var(--bg-secondary)", position: "sticky", top: 0, zIndex: 100, backdropFilter: "blur(12px)" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 24, fontWeight: 800, background: "linear-gradient(135deg, var(--primary), var(--purple))", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", fontFamily: "'Poppins', sans-serif" }}>
              Eventure ⚡️
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5 }}>
              <MapIcon size={16} /> Map
            </Link>
            <Link href="/cities" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 13, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5 }}>
              <Building2 size={16} /> Cities
            </Link>
            <Link href="/artists" style={{ color: "var(--primary)", textDecoration: "none", fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "flex", alignItems: "center", gap: 5 }}>
              <Users size={16} /> Artists
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content (Split view) */}
      <main style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "30px 20px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Breadcrumb & Title */}
        <div>
          <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", marginBottom: 16 }}>
            <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
            <span>/</span>
            <Link href="/artists" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Artists</Link>
            <span>/</span>
            <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>
              <Link href={`/artists/${cityId}`} style={{ textDecoration: "none", color: "inherit" }}>
                {cityMeta?.name || cityId}
              </Link>
            </span>
            {selectedArtist && (
              <>
                <span>/</span>
                <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{selectedArtist}</span>
              </>
            )}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            <Link href="/artists" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--bg-secondary)", color: "var(--text-primary)" }}>
              <ArrowLeft size={16} />
            </Link>
            <h1 style={{ fontSize: 28, fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}>
              DJs & Artists in {cityMeta?.name || cityId}
            </h1>
            {!isExploreMode && (
              <button
                onClick={startExplore}
                disabled={isLoadingExplore || allArtists.length === 0}
                style={{
                  background: isLoadingExplore ? "var(--bg-elevated)" : "linear-gradient(135deg, #7c3aed, #4f46e5)",
                  border: "none",
                  color: "#fff",
                  padding: "9px 18px",
                  borderRadius: 10,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: isLoadingExplore ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  letterSpacing: "0.03em",
                  opacity: allArtists.length === 0 ? 0.4 : 1,
                  transition: "opacity 0.2s ease"
                }}
              >
                {isLoadingExplore ? (
                  <>
                    <div style={{ width: 10, height: 10, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Finding sets...
                  </>
                ) : (
                  <>▶ Explore {cityMeta?.name || cityId}</>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Layout Grid */}
        <div style={{ display: isMobile ? "flex" : "grid", flexDirection: "column", gridTemplateColumns: isMobile ? undefined : "1fr 1fr", gap: isMobile ? 15 : 30, flex: 1, minHeight: 600 }} className="artists-split-layout">
          
          {/* Left Column: Artists list */}
          {(!isMobile || !selectedArtist) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16, borderRight: isMobile ? "none" : "1px solid var(--border)", paddingRight: isMobile ? 0 : 20 }}>
            <div style={{ position: "relative" }}>
              <input
                type="text"
                placeholder="Search DJs / Artists..."
                value={artistSearchQuery}
                onChange={(e) => setArtistSearchQuery(e.target.value)}
                style={{
                  width: "100%",
                  padding: "12px 14px 12px 40px",
                  background: "var(--bg-secondary)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  color: "var(--text-primary)",
                  fontSize: 14,
                  outline: "none"
                }}
              />
              <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              {artistSearchQuery && (
                <button onClick={() => setArtistSearchQuery("")} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}>
                  <X size={16} />
                </button>
              )}
            </div>

            {isLoadingEvents ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: 60, gap: 10 }}>
                <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Loading artists directory...</span>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, overflowY: "auto", maxHeight: 600, paddingBottom: 40 }}>
                {filteredArtists.map((artist) => {
                  const gigCount = cityEvents.filter(e =>
                    (e.artists || []).some(a => {
                      const cleaned = (a || "").replace(/[{}""'\[\]]/g, "").trim().toLowerCase();
                      return cleaned.includes(artist.toLowerCase());
                    })
                  ).length;
                  const isSelected = selectedArtist === artist;

  return (
                    <div
                      key={artist}
                      onClick={() => handleArtistClick(artist)}
                      style={{
                        padding: "16px",
                        background: isSelected ? "var(--bg-elevated)" : "var(--bg-secondary)",
                        border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                        borderRadius: 14,
                        cursor: "pointer",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        height: 100,
                        transition: "all 0.15s ease"
                      }}
                    >
                      <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{artist}</span>
                      <span style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                        {gigCount} performance{gigCount !== 1 ? "s" : ""} <ChevronRight size={10} />
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}

          {/* Right Column: Artist Detail Panel */}
          {(!isMobile || !!selectedArtist) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 20, width: isMobile ? "100%" : undefined }}>
              {selectedArtist ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  
                  {/* Clear artist / Close button */}
                  <div style={{ display: "flex", justifyContent: isMobile ? "flex-start" : "flex-end" }}>
                    <button onClick={handleClearArtist} style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-elevated)", border: "1px solid var(--border)", padding: "10px 16px", borderRadius: 10, color: "var(--text-primary)", fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
                      <ArrowLeft size={15} /> Back to Artists List
                    </button>
                  </div>

                {/* Data Saver Mode Toggle */}
                {dynamicVideoId && !isLoadingVideo && (
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--bg-secondary)", border: "1px solid var(--border)", padding: "12px 16px", borderRadius: 14 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 16 }}>📶</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>Data Saver Mode</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Stream audio only to save cellular data bandwidth</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsAudioOnly(!isAudioOnly)}
                      style={{
                        background: isAudioOnly ? "var(--primary)" : "rgba(255,255,255,0.06)",
                        border: "1px solid var(--border)",
                        color: isAudioOnly ? "#fff" : "var(--text-primary)",
                        padding: "6px 12px",
                        borderRadius: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        cursor: "pointer",
                        transition: "all 0.2s ease"
                      }}
                    >
                      {isAudioOnly ? "ON (Audio-Only)" : "OFF (Stream Video)"}
                    </button>
                  </div>
                )}

                {/* YouTube Set Player */}
                {isLoadingVideo ? (
                  <div style={{ width: "100%", height: 240, background: "var(--bg-secondary)", borderRadius: 16, border: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 12 }}>
                    <div style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                    <span style={{ fontSize: 13, color: "var(--text-muted)" }}>Searching YouTube for {selectedArtist}'s live set...</span>
                  </div>
                ) : dynamicVideoId ? (
                  !isVideoReliable ? (
                    /* High-fidelity fallback block when dynamic match is unreliable (mismatched titles) */
                    <div style={{ 
                      width: "100%", 
                      background: "linear-gradient(135deg, #180d10 0%, #090305 100%)", 
                      borderRadius: 16, 
                      border: "1px solid rgba(239, 68, 68, 0.2)", 
                      padding: "28px 24px", 
                      display: "flex", 
                      flexDirection: "column", 
                      alignItems: "center", 
                      gap: 16, 
                      textAlign: "center" 
                    }}>
                      <span style={{ fontSize: 32 }}>🔍</span>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: "var(--text-primary)" }}>
                          Mmm, we are not sure if there is an exact video sample of this DJ on YouTube.
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 8, lineHeight: "1.6" }}>
                          To keep our community directory completely reliable, we have hidden the auto-fetch match to avoid showing the wrong video. You can easily search for their sets directly with the button below:
                        </div>
                      </div>
                      
                      <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 4 }}>
                        <a 
                          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedArtist + " dj set")}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          style={{ 
                            background: "var(--primary)", 
                            color: "#fff", 
                            padding: "10px 20px", 
                            borderRadius: 10, 
                            fontSize: 12, 
                            fontWeight: 700, 
                            textDecoration: "none",
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            transition: "opacity 0.15s ease"
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                          onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                        >
                          Search on YouTube ↗
                        </a>
                      </div>
                    </div>
                  ) : (
                    /* Normal player if reliable */
                    <div style={{ width: "100%", position: "relative", background: "#000", borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)", minHeight: isAudioOnly ? 160 : undefined }}>
                      
                      {/* Style definitions for EQ bars */}
                      <style>{`
                        @keyframes eq-bar {
                          0% { height: 8px; }
                          100% { height: 40px; }
                        }
                      `}</style>

                      {/* Unified YouTube Iframe Container Placeholder */}
                      <div style={{ 
                        width: "100%", 
                        paddingTop: isAudioOnly ? "0px" : "56.25%", 
                        height: isAudioOnly ? "1px" : "auto", 
                        opacity: isAudioOnly ? 0 : 1,
                        position: isAudioOnly ? "absolute" : "relative",
                        pointerEvents: isAudioOnly ? "none" : "auto",
                        overflow: "hidden"
                      }}>
                        {/* YouTube Player API will replace this element with an iframe dynamically */}
                        <div id="youtube-audio-player" style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%" }} />
                      </div>

                      {/* Cyberpunk Equalizer Audio Visualizer UI */}
                      {isAudioOnly && (
                        <div style={{ 
                          minHeight: 220, 
                          width: "100%", 
                          display: "flex", 
                          flexDirection: "column", 
                          justifyContent: "center", 
                          alignItems: "center", 
                          background: "linear-gradient(135deg, #1e1b4b 0%, #060414 100%)",
                          padding: "24px 16px",
                          gap: 14
                        }}>
                          <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 32 }}>
                            <div style={{ width: 4, height: 12, background: "var(--primary)", borderRadius: 1.5, animation: "eq-bar 0.7s ease-in-out infinite alternate" }} />
                            <div style={{ width: 4, height: 32, background: "var(--primary)", borderRadius: 1.5, animation: "eq-bar 1.2s ease-in-out infinite alternate-reverse" }} />
                            <div style={{ width: 4, height: 18, background: "var(--primary)", borderRadius: 1.5, animation: "eq-bar 0.9s ease-in-out infinite alternate" }} />
                            <div style={{ width: 4, height: 28, background: "var(--primary)", borderRadius: 1.5, animation: "eq-bar 1.4s ease-in-out infinite alternate-reverse" }} />
                            <div style={{ width: 4, height: 24, background: "var(--primary)", borderRadius: 1.5, animation: "eq-bar 0.8s ease-in-out infinite alternate" }} />
                            <div style={{ width: 4, height: 14, background: "var(--primary)", borderRadius: 1.5, animation: "eq-bar 1.1s ease-in-out infinite alternate-reverse" }} />
                          </div>
                          
                          <div style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 13, fontWeight: 800, color: "#fff", display: "flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
                              <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "var(--green)" }} />
                              Streaming Audio-Only
                            </div>
                          </div>

                          {/* Graphical Progress Seek Bar */}
                          <div style={{ width: "100%", maxWidth: 300, display: "flex", flexDirection: "column", gap: 6, padding: "0 8px" }}>
                            <input
                              type="range"
                              min={0}
                              max={duration}
                              value={estimatedSeconds}
                              onChange={(e) => handleSeek(Number(e.target.value))}
                              style={{
                                width: "100%",
                                accentColor: "var(--primary)",
                                background: "rgba(255,255,255,0.15)",
                                height: 6,
                                borderRadius: 3,
                                cursor: "pointer",
                                outline: "none"
                              }}
                            />
                            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "rgba(255,255,255,0.45)", fontFamily: "monospace", fontWeight: 700 }}>
                              <span>{formatDuration(estimatedSeconds)}</span>
                              <span>{formatDuration(duration)}</span>
                            </div>
                          </div>

                          {/* Quick Seek Remote Controllers */}
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 320, alignItems: "center" }}>
                            {/* Main skip buttons */}
                            <div style={{ display: "flex", gap: 10, justifyContent: "center", width: "100%" }}>
                              {[
                                { label: "-10m", sec: -600 },
                                { label: "-1m", sec: -60 },
                                { label: "+1m", sec: 60 },
                                { label: "+10m", sec: 600 },
                              ].map((btn) => (
                                <button
                                  key={btn.label}
                                  onClick={() => handleRelativeSeek(btn.sec)}
                                  style={{
                                    background: "rgba(255,255,255,0.08)",
                                    border: "1px solid rgba(255,255,255,0.15)",
                                    color: "#fff",
                                    padding: "6px 12px",
                                    borderRadius: 8,
                                    fontSize: 11,
                                    fontWeight: 700,
                                    cursor: "pointer",
                                    minWidth: 50,
                                    transition: "all 0.15s ease"
                                  }}
                                  onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
                                  onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                                >
                                  {btn.label}
                                </button>
                              ))}
                            </div>

                            {/* Quick Chapter Markers */}
                            <div style={{ display: "flex", gap: 6, justifyContent: "center", width: "100%", flexWrap: "wrap", paddingTop: 4 }}>
                              {[
                                { label: "0m (Start)", val: 0 },
                                { label: "15m", val: 900 },
                                { label: "30m", val: 1800 },
                                { label: "45m", val: 2700 },
                                { label: "60m", val: 3600 },
                                { label: "90m", val: 5400 },
                              ].map((chap) => (
                                <button
                                  key={chap.label}
                                  onClick={() => handleSeek(chap.val)}
                                  style={{
                                    background: "rgba(255,255,255,0.04)",
                                    border: "none",
                                    color: "rgba(255,255,255,0.6)",
                                    padding: "4px 8px",
                                    borderRadius: 6,
                                    fontSize: 10,
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    transition: "all 0.15s ease"
                                  }}
                                  onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.background = "rgba(255,255,255,0.1)"; }}
                                  onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
                                >
                                  {chap.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}

                    </div>
                  )) : (
                  <div style={{ width: "100%", height: 200, background: "var(--bg-secondary)", borderRadius: 16, border: "1px solid var(--border)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 12, padding: 20, textAlign: "center" }}>
                    <span style={{ fontSize: 24 }}>🎵</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>No Preview Video Registered</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>We couldn't auto-fetch a set. You can search directly on YouTube.</div>
                    </div>
                    <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedArtist + " dj set")}`} target="_blank" rel="noopener noreferrer" style={{ background: "var(--primary)", color: "#fff", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: "none" }}>
                      Search on YouTube ↗
                    </a>
                  </div>
                )}

                {/* Profile Header */}
                <div>
                  <h2 style={{ fontSize: 24, fontFamily: "'Poppins', sans-serif", fontWeight: 800 }}>{selectedArtist}</h2>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    Live set player & upcoming club guides for {selectedArtist} in {cityMeta?.name || cityId}.
                  </p>
                  
                  {/* Crowdsourced Spam Flag Button */}
                  <div style={{ marginTop: 12 }}>
                    <button 
                      onClick={handleFlagArtist}
                      disabled={isReporting}
                      style={{ 
                        background: "none", 
                        border: "none", 
                        padding: 0, 
                        color: "var(--text-muted)", 
                        fontSize: 11, 
                        textDecoration: "underline", 
                        cursor: isReporting ? "not-allowed" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        transition: "color 0.15s ease"
                      }}
                      onMouseEnter={(e) => { if (!isReporting) e.currentTarget.style.color = "var(--primary)"; }}
                      onMouseLeave={(e) => { if (!isReporting) e.currentTarget.style.color = "var(--text-muted)"; }}
                    >
                      <span>⚠️ {isReporting ? "Submitting report..." : "This is not the right DJ or video? Report incorrect profile"}</span>
                    </button>
                  </div>
                </div>

                {/* Gig Schedule List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Gigs in {cityMeta?.name || cityId}</p>
                  
                  {cityEvents
                    .filter(e => e.artists?.some(a => {
                      const cleaned = (a || "").replace(/[{}""'\[\]]/g, "").trim().toLowerCase();
                      return cleaned.includes(selectedArtist.toLowerCase());
                    }))
                    .map(event => (
                      <div
                        key={event.id}
                        onClick={() => {
                          router.push(`/?city=${cityId.toLowerCase()}&event=${event.id}`);
                        }}
                        style={{
                          background: "var(--bg-secondary)",
                          border: "1px solid var(--border)",
                          borderRadius: 14,
                          padding: "14px",
                          cursor: "pointer",
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          transition: "all 0.15s ease"
                        }}
                        className="card-hover-effect"
                      >
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{event.title}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{event.venue_name} · {new Date(event.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                        </div>
                        <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>
                          View on Map →
                        </span>
                      </div>
                    ))}
                </div>

              </div>
            ) : isExploreMode && exploreCurrentDJ ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)" }}>
                  Upcoming gigs for {exploreCurrentDJ} in {cityMeta?.name || cityId}
                </p>
                {currentDJEvents.length > 0 ? (
                  currentDJEvents.map(event => (
                    <div
                      key={event.id}
                      onClick={() => router.push(`/?city=${cityId.toLowerCase()}&event=${event.id}`)}
                      style={{ background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", transition: "all 0.15s ease" }}
                      className="card-hover-effect"
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{event.title}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{event.venue_name} · {new Date(event.starts_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>
                      </div>
                      <span style={{ fontSize: 12, color: "var(--primary)", fontWeight: 700 }}>View on Map →</span>
                    </div>
                  ))
                ) : (
                  <div style={{ padding: "20px", background: "var(--bg-secondary)", borderRadius: 12, fontSize: 13, color: "var(--text-muted)", border: "1px dashed var(--border)" }}>
                    No upcoming gigs found for this artist in {cityMeta?.name || cityId}.
                  </div>
                )}
              </div>
            ) : (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", border: "1px dashed var(--border)", borderRadius: 16, height: 300, color: "var(--text-muted)" }}>
                <Users size={32} style={{ marginBottom: 12 }} />
                <span style={{ fontSize: 14 }}>Select a DJ / Artist to view their live set & schedule</span>
              </div>
            )}
          </div>
          )}

        </div>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-secondary)", padding: "24px 20px", textAlign: "center", fontSize: 12, color: "var(--text-muted)", paddingBottom: isExploreMode ? 100 : undefined }}>
        &copy; {new Date().getFullYear()} Eventure. All rights reserved.
      </footer>

      {/* ── Explore Mode: hidden YouTube player + fixed bottom dock ── */}
      {isExploreMode && (
        <>
          {/* Invisible YouTube player — kept in viewport to prevent browser throttling */}
          <div style={{ position: "fixed", bottom: 68, right: 0, width: 2, height: 2, opacity: 0, overflow: "hidden", pointerEvents: "none", zIndex: 999 }}>
            <div id="explore-yt-player" style={{ width: 2, height: 2 }} />
          </div>

          {/* Fixed bottom dock */}
          <div style={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            background: "linear-gradient(135deg, #0f0a1e 0%, #1a0a2e 100%)",
            borderTop: "1px solid rgba(124, 58, 237, 0.4)",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            zIndex: 1000,
            boxShadow: "0 -8px 40px rgba(79,70,229,0.25)",
            flexWrap: "wrap"
          }}>
            {/* Animated equalizer */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 18, flexShrink: 0 }}>
              {[0.7, 1.2, 0.9, 1.4, 0.8, 1.1].map((dur, i) => (
                <div key={i} style={{
                  width: 3,
                  background: isFadingOut ? "rgba(255,255,255,0.25)" : "var(--primary)",
                  borderRadius: 1.5,
                  height: isFadingOut ? 3 : undefined,
                  animation: isFadingOut ? "none" : `eq-bar ${dur}s ease-in-out infinite alternate`,
                  minHeight: 3,
                  transition: "height 0.5s, background 0.5s"
                }} />
              ))}
            </div>

            {/* DJ info */}
            <div style={{ flex: 1, minWidth: 120 }}>
              <div style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
                {isFadingOut ? "Transitioning…" : `Exploring ${cityMeta?.name || cityId}`}
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#fff", marginTop: 1 }}>
                {exploreCurrentDJ}
              </div>
              {exploreCurrentDJ && (
                <Link
                  href={`/artists/${cityId}/${encodeURIComponent(exploreCurrentDJ.toLowerCase().replace(/\s+/g, "-"))}`}
                  style={{ fontSize: 10, color: "#a78bfa", textDecoration: "none", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 3 }}
                >
                  View full profile <ChevronRight size={10} />
                </Link>
              )}
            </div>

            {/* Progress bar */}
            <div style={{ width: isMobile ? "100%" : 200, order: isMobile ? 10 : undefined }}>
              <div style={{ height: 3, background: "rgba(255,255,255,0.08)", borderRadius: 2 }}>
                <div style={{
                  height: "100%",
                  background: isFadingOut ? "rgba(255,255,255,0.2)" : "linear-gradient(90deg, #7c3aed, #4f46e5)",
                  borderRadius: 2,
                  width: `${Math.min(100, (exploreSecondsPlayed / EXPLORE_PLAY_DURATION) * 100)}%`,
                  transition: "width 1s linear, background 0.5s"
                }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "rgba(255,255,255,0.3)", marginTop: 3, fontFamily: "monospace" }}>
                <span>{formatDuration(exploreSecondsPlayed)}</span>
                <span>{formatDuration(EXPLORE_PLAY_DURATION)}</span>
              </div>
            </div>

            {/* Up Next */}
            {upNext.length > 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", order: isMobile ? 11 : undefined, alignItems: "center" }}>
                <span style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Up Next:</span>
                {upNext.map((dj, i) => (
                  <span key={i} style={{ padding: "3px 8px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 6, fontSize: 10, color: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 8, color: "#a78bfa", fontWeight: 700 }}>{i + 1}</span>
                    {dj.length > 18 ? dj.slice(0, 18) + "…" : dj}
                  </span>
                ))}
              </div>
            )}

            {/* Skip button */}
            <button
              onClick={advanceExplore}
              disabled={isSkipping}
              style={{
                background: isSkipping ? "rgba(255,255,255,0.03)" : "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: isSkipping ? "rgba(255,255,255,0.4)" : "#fff",
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: isSkipping ? "wait" : "pointer",
                flexShrink: 0,
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: 5
              }}
              onMouseEnter={(e) => { if (!isSkipping) e.currentTarget.style.background = "rgba(255,255,255,0.14)"; }}
              onMouseLeave={(e) => { if (!isSkipping) e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
            >
              {isSkipping ? (
                <><div style={{ width: 8, height: 8, border: "1.5px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} /> Loading...</>
              ) : "Skip →"}
            </button>

            {/* Stop button */}
            <button
              onClick={stopExplore}
              style={{
                background: "rgba(239,68,68,0.12)",
                border: "1px solid rgba(239,68,68,0.25)",
                color: "#fca5a5",
                padding: "7px 14px",
                borderRadius: 8,
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                flexShrink: 0,
                transition: "background 0.15s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.22)"}
              onMouseLeave={(e) => e.currentTarget.style.background = "rgba(239,68,68,0.12)"}
            >
              ✕ Stop
            </button>
          </div>
        </>
      )}

    </div>
  );
}
