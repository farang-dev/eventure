"use client";
import { useState, useMemo, useEffect } from "react";
import GenreFilter from "@/components/GenreFilter";
import MusicEventCard from "@/components/MusicEventCard";
import MusicEventDetail from "@/components/MusicEventDetail";
import MapView from "@/components/MapView";
import SubmitEventModal from "@/components/SubmitEventModal";
import AuthModal from "@/components/AuthModal";
import { useSession } from "next-auth/react";
import GenreIcon from "@/components/GenreIcon";
import type { MusicEvent, AppView } from "@/lib/types";
import { GENRE_META, getDaysUntil } from "@/lib/mock-data";
import { CITIES } from "@/lib/constants";
import { Search, SlidersHorizontal, X, Map as MapIcon, Info, Plus, Moon, Sun, Layers, ChevronDown, ChevronUp, Building2, Menu, Users } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createEventUrl } from "@/lib/utils";

interface ViewState {
  longitude: number;
  latitude: number;
  zoom: number;
  pitch: number;
  transitionDuration?: number;
}

export default function HomePageClient({ initialEvents, initialCity, initialGenre }: { initialEvents?: MusicEvent[]; initialCity?: string; initialGenre?: string }) {
  const [view, setView] = useState<AppView>(initialCity ? "home" : "home");
  const [genre, setGenre] = useState(initialGenre || "all");
  const [isListHidden, setIsListHidden] = useState(false);
  const [cityFilter, setCityFilter] = useState<string | null>(initialCity || null);
  const [cityCounts, setCityCounts] = useState<Record<string, number>>({});
  const router = useRouter();
  
  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setIsListHidden(true);
    }
  }, []);
  const [selectedEvent, setSelectedEvent] = useState<MusicEvent | null>(null as MusicEvent | null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [dynamicVideoId, setDynamicVideoId] = useState<string | null>(null);
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const [allArtists, setAllArtists] = useState<string[]>([]);
  const [cityEvents, setCityEvents] = useState<MusicEvent[]>([]);
  const [artistSearchQuery, setArtistSearchQuery] = useState("");
  const supabase = createClient();

  useEffect(() => {
    const fetchAllCityEvents = async () => {
      const targetCity = cityFilter || "vilnius"; 
      const { data, error } = await supabase
        .from('music_events')
        .select('*')
        .eq('city', targetCity.toLowerCase());
        
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
    };
    fetchAllCityEvents();
  }, [cityFilter, supabase]);

  useEffect(() => {
    if (!selectedArtist) {
      setDynamicVideoId(null);
      setIsLoadingVideo(false);
      return;
    }

    const fetchVideo = async () => {
      setIsLoadingVideo(true);
      setDynamicVideoId(null);
      try {
        const key = selectedArtist.replace(/[{}""'\[\]]/g, "").trim().toLowerCase();
        const videoMap: Record<string, string> = {
          "manfredas": "TpgU8U09HmM",
          "roe deers": "yknu7gD5kqs",
          "saulty": "h0LfZkW3yqA",
          "anna hanna": "EVJIl98ZKko",
          "vidis": "0fStWP79Z5A",
        };

        if (videoMap[key]) {
          setDynamicVideoId(videoMap[key]);
        } else {
          const res = await fetch(`/api/youtube-search?q=${encodeURIComponent(selectedArtist)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.videoId) {
              setDynamicVideoId(data.videoId);
            }
          }
        }
      } catch (err) {
        console.error("Error fetching dynamic video:", err);
      } finally {
        setIsLoadingVideo(false);
      }
    };

    fetchVideo();
  }, [selectedArtist]);
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [mapBounds, setMapBounds] = useState<[number, number, number, number] | null>(null);
  const [eventsData, setEventsData] = useState<MusicEvent[]>(initialEvents || []);

  const { data: session } = useSession();
  const [showAuthModal, setShowAuthModal] = useState(false);

  const handleOpenSubmit = () => {
    if (session?.user) {
      setShowSubmit(true);
    } else {
      setShowAuthModal(true);
    }
  };

  useEffect(() => {
    if (!mapBounds) return;
    
    const [west, south, east, north] = mapBounds;
    
    const timer = setTimeout(async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from('music_events')
        .select('*')
        .gte('ends_at', now)
        .gte('lat', south - 0.05)
        .lte('lat', north + 0.05)
        .gte('lng', west - 0.05)
        .lte('lng', east + 0.05)
        .or('is_approved.eq.true,is_approved.is.null')
        .order('starts_at', { ascending: true })
        .limit(1000);
        
      if (data && !error) {
        setEventsData(data as MusicEvent[]);
      }
    }, 400);
    
    return () => clearTimeout(timer);
  }, [mapBounds, supabase]);

  const [searchQuery, setSearchQuery] = useState("");

  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setLocationSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const resp = await fetch(
          `/api/geocode?q=${encodeURIComponent(searchQuery)}`
        );
        const data = await resp.json();
        if (data.features) setLocationSuggestions(data.features);
      } catch (err) {}
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const [timeFilter, setTimeFilter] = useState("all");
  const [viewState, setViewState] = useState<ViewState>({
    longitude: 25.2797,
    latitude: 54.6872,
    zoom: 12.2,
    pitch: 40,
  });
  
  const [mapStyle, setMapStyle] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("eventure-map-style") || "mapbox://styles/mapbox/dark-v11";
    }
    return "mapbox://styles/mapbox/dark-v11";
  });
  const [userLocation, setUserLocation] = useState<{ lng: number; lat: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    if (!isMounted) return;
    
    if (selectedEvent) {
      const url = createEventUrl(selectedEvent.title, selectedEvent.city || "event");
      window.history.pushState(null, "", url);
    } else {
      const params = new URLSearchParams(window.location.search);
      const url = params.toString() ? `/?${params.toString()}` : "/";
      window.history.replaceState(null, "", url);
    }
  }, [selectedEvent, isMounted]);

  useEffect(() => {
    setIsMounted(true);
    
    const params = new URLSearchParams(window.location.search);
    const cityParam = params.get("city");

    const savedViewState = localStorage.getItem("eventure-viewstate");
    if (savedViewState && !cityParam) {
      try {
        setViewState(JSON.parse(savedViewState));
      } catch (e) {}
    }

    const savedMapStyle = localStorage.getItem("eventure-map-style");
    if (savedMapStyle) {
      setMapStyle(savedMapStyle);
    }

    if (cityParam) {
      setCityFilter(cityParam.toLowerCase());
      const fetchCity = async () => {
        try {
          const resp = await fetch(
            `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityParam)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
          );
          const data = await resp.json();
          if (data.features && data.features.length > 0) {
            const [lng, lat] = data.features[0].center;
            setViewState({
              longitude: lng,
              latitude: lat,
              zoom: 12.2,
              pitch: 40,
              transitionDuration: 2000
            });
          }
        } catch (err) {
          console.error("Failed to geocode city from URL:", err);
        }
      };
      fetchCity();
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { longitude, latitude } = position.coords;
          setUserLocation({ lng: longitude, lat: latitude });
          setViewState((prev) => ({
            ...prev,
            longitude,
            latitude,
            zoom: 12.2,
            transitionDuration: 1500
          }));
        },
        (error) => console.warn("Geolocation denied:", error)
      );
    }

    // Parse Artists query params on direct link loading
    const viewParam = params.get("view");
    const artistParam = params.get("artist");
    if (viewParam === "artists") {
      setView("artists");
      if (artistParam) {
        setSelectedArtist(decodeURIComponent(artistParam));
      }
    }
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const params = new URLSearchParams(window.location.search);
    const eventParam = params.get("event");
    if (eventParam && eventsData.length > 0) {
      const found = eventsData.find(e => e.id === eventParam);
      if (found) {
        setSelectedEvent(found);
        setViewState({
          longitude: found.lng,
          latitude: found.lat,
          zoom: 13.5,
          pitch: 40,
          transitionDuration: 1500
        });
        // Clear the parameter from URL silently to keep URL clean
        const newUrl = window.location.pathname + window.location.search.replace(/&?event=[^&]*/, "");
        window.history.replaceState(null, "", newUrl);
      }
    }
  }, [eventsData, isMounted]);

  useEffect(() => {
    const fetchCityCounts = async () => {
      const { data } = await supabase
        .from("music_events")
        .select("city")
        .gte("ends_at", new Date().toISOString())
        .or("is_approved.eq.true,is_approved.is.null");
      if (data) {
        const counts: Record<string, number> = {};
        for (const row of data) {
          const c = (row.city || "").toLowerCase();
          counts[c] = (counts[c] || 0) + 1;
        }
        setCityCounts(counts);
      }
    };
    fetchCityCounts();
  }, [supabase]);

  useEffect(() => {
    if (!isMounted || !initialCity) return;
    const city = CITIES.find((c) => c.id === initialCity);
    if (city) {
      setViewState({
        longitude: city.lng,
        latitude: city.lat,
        zoom: 12.2,
        pitch: 40,
        transitionDuration: 1500,
      });
    }
  }, [isMounted, initialCity]);

  useEffect(() => {
    if (!isMounted) return;
    const isDark = mapStyle.includes("dark");
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
    localStorage.setItem("eventure-map-style", mapStyle);
  }, [mapStyle, isMounted]);

  useEffect(() => {
    if (!isMounted) return;
    localStorage.setItem("eventure-viewstate", JSON.stringify(viewState));
  }, [viewState, isMounted]);

  const handleReset = () => {
    setView("home");
    setGenre("all");
    setCityFilter(null);
    setSearchQuery("");
    setSelectedEvent(null);
    setViewState({
      longitude: 25.2797,
      latitude: 54.6872,
      zoom: 12.2,
      pitch: 40,
      transitionDuration: 1000
    });
    router.push("/");
    if (typeof window !== "undefined") {
      if (window.innerWidth < 768) {
        setIsListHidden(true);
      }
    }
  };

  const events = useMemo(() => {
    const seen = new Set<string>();
    return eventsData
      .map(e => {
        const now = new Date();
        const start = new Date(e.starts_at);
        const end = new Date(e.ends_at);
        let status: any = "upcoming";
        if (now >= start && now <= end) status = "happening_now";
        else if (start.toDateString() === now.toDateString()) status = "today";
        else if (start < now) status = "past";
        return { ...e, status };
      })
      .filter(e => {
        if (e.status === "past") return false; 
        const key = `${e.title}|${e.venue_name}|${e.starts_at}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [eventsData]);
  const filteredEvents = useMemo(() => {
    return events.filter((e) => {
      if (cityFilter && e.city?.toLowerCase() !== cityFilter) return false;

      if (genre !== "all" && e.genre !== genre) return false;

      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        const matchesText = 
          e.title.toLowerCase().includes(q) ||
          e.venue_name.toLowerCase().includes(q) ||
          e.artists.some((a) => a.toLowerCase().includes(q));
        
        if (!matchesText) return false;
      }

      if (timeFilter !== "all") {
        const start = new Date(e.starts_at);
        const now = new Date();
        const days = getDaysUntil(e.starts_at);
        
        if (timeFilter === "today") {
          if (start.toDateString() !== now.toDateString() && e.status !== "happening_now") return false;
        } else if (timeFilter === "tonight") {
          if (start.toDateString() !== now.toDateString() || (start.getHours() < 17 && e.status !== "happening_now")) return false;
        } else if (timeFilter === "weekend") {
          if (![0, 6].includes(start.getDay())) return false;
        } else if (timeFilter === "week") {
          if (days < 0 || days > 7) return false;
        } else {
          const dayMap: Record<string, number> = {
            sunday: 0, monday: 1, tuesday: 2, wednesday: 3,
            thursday: 4, friday: 5, saturday: 6
          };
          if (dayMap[timeFilter] !== undefined && start.getDay() !== dayMap[timeFilter]) return false;
        }
      }

      return true;
    });
  }, [events, genre, searchQuery, timeFilter, cityFilter]);

  const visibleEvents = useMemo(() => {
    return filteredEvents.filter(e => {
      if (!mapBounds) return true;
      const [west, south, east, north] = mapBounds;
      return e.lng >= west && e.lng <= east && e.lat >= south && e.lat <= north;
    });
  }, [filteredEvents, mapBounds]);

  const sortedEvents = useMemo(() =>
    [...filteredEvents].sort((a, b) => {
      const p = (e: MusicEvent) => e.status === "happening_now" ? 0 : e.status === "today" ? 1 : 2;
      const statusDiff = p(a) - p(b);
      if (statusDiff !== 0) return statusDiff;
      
      const timeA = new Date(a.starts_at).getTime();
      const timeB = new Date(b.starts_at).getTime();
      if (timeA !== timeB) return timeA - timeB;

      if (mapBounds) {
        const [w, s, e, n] = mapBounds;
        const inA = a.lng >= w && a.lng <= e && a.lat >= s && a.lat <= n;
        const inB = b.lng >= w && b.lng <= e && b.lat >= s && b.lat <= n;
        if (inA && !inB) return -1;
        if (!inA && inB) return 1;
      }
      
      return 0;
    }),
  [filteredEvents, mapBounds]);

  const liveCount = events.filter((e) => e.status === "happening_now").length;
  const todayCount = events.filter((e) => e.status === "today").length;

  const TIME_FILTERS = [
    { id: "all", label: "All Dates" },
    { id: "today", label: "Today" },
    { id: "tonight", label: "Tonight" },
    { id: "weekend", label: "Weekend" },
    { id: "week", label: "Next 7 Days" },
  ];

  const DAY_FILTERS = [
    { id: "monday", label: "Mon" },
    { id: "tuesday", label: "Tue" },
    { id: "wednesday", label: "Wed" },
    { id: "thursday", label: "Thu" },
    { id: "friday", label: "Fri" },
    { id: "saturday", label: "Sat" },
    { id: "sunday", label: "Sun" },
  ];

  const navigate = (v: AppView) => { setSelectedEvent(null); setView(v); };

  const handleSearch = async (query: string) => {
    if (!query) return;
    
    const hasResults = events.some(e => 
      e.title.toLowerCase().includes(query.toLowerCase()) || 
      e.genre.toLowerCase().includes(query.toLowerCase())
    );

    try {
      const resp = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${process.env.NEXT_PUBLIC_MAPBOX_TOKEN}&limit=1`
      );
      const data = await resp.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        setViewState({
          ...viewState,
          longitude: lng,
          latitude: lat,
          zoom: query.toLowerCase().includes("tokyo") || query.toLowerCase().includes("london") ? 11 : 14,
          transitionDuration: 1500
        } as any);
        setSearchQuery("");
        navigate("home");
      }
    } catch (err) {
      console.error("Geocoding error", err);
    }
  };

  const SidebarNav = () => (
    <>
      {[
        { id: "home", icon: <MapIcon size={19} />, label: "Map", href: "/" },
        { id: "search", icon: <Search size={19} />, label: "Search" },
        { id: "cities", icon: <Building2 size={19} />, label: "Cities", href: "/events/cities" },
        { id: "artists", icon: <Users size={19} />, label: "Artists", href: "/artists" },
        { id: "about", icon: <Info size={19} />, label: "About" },
      ].map((item) => {
        const isActive = view === item.id;
        const className = `nav-item ${isActive ? "active" : ""}`;
        const style = { width: 56, height: 52, borderRadius: 12, textDecoration: "none", display: "flex", justifyContent: "center" };
        
        if (item.href) {
          return (
            <Link
              key={item.id}
              id={`nav-${item.id}`}
              href={item.href}
              onClick={() => {
                if (item.id === "home") {
                  handleReset();
                }
              }}
              className={className}
              style={style}
            >
              {item.icon}
              <span>{item.label}</span>
            </Link>
          );
        }
        
        return (
          <button
            key={item.id}
            id={`nav-${item.id}`}
            onClick={() => navigate(item.id as AppView)}
            className={className}
            style={style}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        );
      })}
    </>
  );

  return (
    <div className="app-shell">

      {/* ── Desktop Sidebar ── */}
      <div className="desktop-sidebar">
        <div
          onClick={() => navigate("home")}
          style={{ cursor: "pointer", marginBottom: 32, textAlign: "center", padding: "0 10px" }}
        >
          <div
            style={{
              width: 44, height: 44, borderRadius: 12,
              background: "var(--primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, margin: "0 auto",
              boxShadow: "0 4px 12px var(--primary-glow)"
            }}
          >
            ⚡️
          </div>
        </div>
        <SidebarNav />
        <div style={{ marginTop: "auto", marginBottom: 12, textAlign: "center" }}>
          <button
            id="sidebar-submit-btn"
            onClick={handleOpenSubmit}
            title="Submit an event"
            style={{
              width: 38, height: 38, borderRadius: 10,
              background: "var(--primary-dim)", border: "1px solid rgba(230,57,70,0.3)",
              color: "var(--primary)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <Plus size={18} />
          </button>
          <span style={{ fontSize: 9, color: "var(--text-muted)", display: "block", marginTop: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Submit
          </span>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="main-content">

        {/* HOME */}
        {view === "home" && !selectedEvent && (
          <>
            {/* Top bar */}
            <div className="top-header">
              <h1 style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", border: 0 }}>
                Eventure — World Club Event Map & Techno Guide
              </h1>
              <div className="top-header-row">
                <div
                  id="header-logo"
                  onClick={handleReset}
                  style={{
                    fontFamily: "'Poppins', sans-serif", fontWeight: 900,
                    fontSize: 22, color: "var(--text-primary)", flexShrink: 0,
                    display: "flex", alignItems: "center", gap: 6,
                    letterSpacing: "-0.02em", cursor: "pointer", userSelect: "none"
                  }}
                  className="animate-fadein"
                >
                  <span className="gradient-text">Eventure</span>
                </div>
                
                <div
                  className="search-bar desktop-search"
                  style={{ cursor: "pointer" }}
                  onClick={() => setView("search")}
                  id="home-search-bar-desktop"
                >
                  <Search size={14} color="var(--text-muted)" />
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    Search venues, artists…
                  </span>
                </div>

                <div className="header-actions">
                  <button
                    id="home-submit-btn"
                    onClick={handleOpenSubmit}
                    className="btn-primary-sm"
                    style={{
                      display: "flex", alignItems: "center", gap: 5,
                      padding: "8px 14px", borderRadius: 10,
                      background: "var(--primary)", border: "none",
                      color: "#fff", fontSize: 13, fontWeight: 700,
                      boxShadow: "0 4px 12px var(--primary-glow)",
                      cursor: "pointer"
                    }}
                  >
                    <Plus size={14} /> Submit
                  </button>

                  <button
                    className="btn-icon"
                    id="home-filter-btn"
                    onClick={() => setShowFilters(true)}
                    style={{
                      background: timeFilter !== "all" ? "var(--primary-dim)" : "var(--bg-elevated)",
                      borderColor: timeFilter !== "all" ? "rgba(230,57,70,0.35)" : "var(--border)",
                      color: timeFilter !== "all" ? "var(--primary)" : "var(--text-primary)",
                      width: 38, height: 38, borderRadius: 10
                    }}
                  >
                    <SlidersHorizontal size={18} />
                  </button>
                  <button
                    className="btn-icon"
                    id="home-theme-btn"
                    onClick={() => setMapStyle(mapStyle.includes("dark") ? "mapbox://styles/mapbox/streets-v12" : "mapbox://styles/mapbox/dark-v11")}
                    title={mapStyle.includes("dark") ? "Light Mode" : "Dark Mode"}
                    style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {mapStyle.includes("dark") ? <Sun size={18} /> : <Moon size={18} />}
                  </button>
                  <button
                    className="btn-icon mobile-only"
                    id="home-menu-btn"
                    onClick={() => setShowMobileMenu(true)}
                    style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      color: "var(--text-primary)",
                    }}
                  >
                    <Menu size={20} />
                  </button>
                </div>
              </div>

              <div
                className="search-bar mobile-search"
                style={{ cursor: "pointer", marginTop: 12 }}
                onClick={() => setView("search")}
                id="home-search-bar-mobile"
              >
                <Search size={16} color="var(--text-muted)" />
                <span style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500 }}>
                  Search venues, artists, events…
                </span>
              </div>
            </div>

            {/* Live alert bar */}
            {liveCount > 0 && (
              <div
                style={{
                  padding: "7px 14px",
                  background: "rgba(230,57,70,0.07)",
                  borderBottom: "1px solid rgba(230,57,70,0.14)",
                  display: "flex", alignItems: "center", gap: 8,
                  flexShrink: 0, cursor: "pointer",
                }}
                onClick={() => setTimeFilter("today")}
              >
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--primary)" }}>
                  {liveCount} event{liveCount > 1 ? "s" : ""} happening right now
                </span>
                {todayCount > 0 && (
                  <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: "auto" }}>
                    +{todayCount} more today
                  </span>
                )}
              </div>
            )}

            {/* Genre filter */}
            <div style={{ 
              borderBottom: "1px solid var(--border)", 
              flexShrink: 0, 
              background: "var(--bg-secondary)",
              position: "relative",
              zIndex: 30 
            }}>
              <GenreFilter selected={genre} onChange={setGenre} />
            </div>

            {/* Active filter pills */}
            {(timeFilter !== "all" || cityFilter) && (
              <div style={{ padding: "6px 14px", borderBottom: "1px solid var(--border)", display: "flex", gap: 8, flexShrink: 0 }}>
                {timeFilter !== "all" && (
                  <div
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "3px 10px", borderRadius: 999,
                      background: "var(--primary-dim)", border: "1px solid rgba(230,57,70,0.28)",
                      color: "var(--primary)", fontSize: 11, fontWeight: 700,
                    }}
                  >
                    {TIME_FILTERS.find((t) => t.id === timeFilter)?.label}
                    <X size={12} onClick={() => setTimeFilter("all")} style={{ cursor: "pointer" }} />
                  </div>
                )}
                {cityFilter && (
                  <div
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      padding: "3px 10px", borderRadius: 999,
                      background: "var(--purple-dim)", border: "1px solid rgba(139,92,246,0.28)",
                      color: "var(--purple)", fontSize: 11, fontWeight: 700,
                    }}
                  >
                    <Building2 size={11} />
                    {CITIES.find((c) => c.id === cityFilter)?.name || cityFilter}
                    <X size={12} onClick={() => { setCityFilter(null); router.push("/"); }} style={{ cursor: "pointer" }} />
                  </div>
                )}
              </div>
            )}

            {/* Map + Bottom Sheet */}
            <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
              <MapView
                events={filteredEvents}
                selectedGenre={genre}
                onEventSelect={setSelectedEvent}
                selectedEventId={(selectedEvent as any)?.id}
                viewState={viewState}
                onViewStateChange={setViewState}
                onBoundsChange={setMapBounds}
                mapStyle={mapStyle}
                userLocation={userLocation}
              />

              {/* Map Style Toggle (Top Left) */}
              <div style={{
                position: "absolute",
                top: 14,
                left: 14,
                display: "flex",
                gap: 6,
                zIndex: 10
              }}>
                {[
                  { id: "dark", label: "Dark", style: "mapbox://styles/mapbox/dark-v11", icon: <Moon size={14} /> },
                  { id: "streets", label: "Streets", style: "mapbox://styles/mapbox/streets-v12", icon: <MapIcon size={14} /> },
                  { id: "satellite", label: "Satellite", style: "mapbox://styles/mapbox/satellite-streets-v12", icon: <Layers size={14} /> },
                ].map((m) => (
                  <button
                    key={m.id}
                    className={`btn ${mapStyle === m.style ? "btn-primary" : ""}`}
                    style={{
                      width: 34,
                      height: 34,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: 10,
                      boxShadow: "var(--shadow-sm)",
                      border: mapStyle === m.style ? "2px solid white" : "1px solid var(--border)",
                      background: mapStyle === m.style ? "var(--primary)" : "var(--bg-elevated)",
                      color: mapStyle === m.style ? "#FFF" : "var(--text-primary)",
                      backdropFilter: "blur(8px)",
                      cursor: "pointer",
                      transition: "all 0.2s ease"
                    }}
                    onClick={() => setMapStyle(m.style)}
                    title={m.label}
                  >
                    {m.icon}
                  </button>
                ))}
              </div>
            </div>

            {/* Bottom Sheet */}
            <div className="bottom-sheet-container" style={{ zIndex: 999 }}>
              <div
                className="bottom-sheet"
                style={{
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  maxHeight: isListHidden ? "56px" : (sheetExpanded ? "70vh" : "210px"),
                  overflowY: "hidden", 
                  opacity: 1,
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
                }}
              >
                  <div 
                    onClick={() => { 
                      if (isListHidden) {
                        setIsListHidden(false);
                        setSheetExpanded(false); 
                      } else {
                        setSheetExpanded(!sheetExpanded);
                      }
                    }}
                    style={{ 
                      cursor: "pointer", 
                      position: "sticky", 
                      top: 0, 
                      background: "var(--bg-secondary)", 
                      zIndex: 10, 
                      borderBottom: isListHidden ? "none" : "1px solid var(--border)",
                      touchAction: "none"
                    }}
                  >
                    <div className="sheet-handle" />
                    <div style={{ padding: "8px 14px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <div 
                        style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}
                      >
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 13 }}>
                          {timeFilter === "today" || liveCount > 0 ? "Now & Tonight" : "Upcoming Events"}
                        </span>
                        {liveCount > 0 && (
                          <span className="badge badge-live">
                            <span className="live-dot" style={{ width: 5, height: 5 }} />
                            {liveCount} live
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 11, padding: "4px 8px", color: "var(--text-secondary)", minWidth: 60 }}
                          onClick={(e) => { e.stopPropagation(); setIsListHidden(!isListHidden); if(sheetExpanded) setSheetExpanded(false); }}
                        >
                          {isListHidden ? "Show List" : "Hide"}
                        </button>
                        {!isListHidden && (
                          <button
                            className="btn btn-ghost"
                            onClick={(e) => { 
                              e.preventDefault();
                              e.stopPropagation(); 
                              setSheetExpanded(!sheetExpanded); 
                            }}
                            style={{ 
                              padding: "4px 10px", 
                              color: sheetExpanded ? "var(--text-muted)" : "var(--primary)",
                              display: "flex", 
                              alignItems: "center", 
                              gap: 4,
                              minHeight: 36,
                              minWidth: 36,
                            }}
                          >
                            {sheetExpanded ? (
                              <ChevronDown size={20} strokeWidth={2.5} />
                            ) : (
                              <>
                                <span style={{ fontSize: 11, fontWeight: 700 }}>All ({sortedEvents.length})</span>
                                <ChevronUp size={14} strokeWidth={2.5} />
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div style={{ overflowY: sheetExpanded ? "auto" : "hidden", flex: 1 }}>
                  {!sheetExpanded ? (
                    <div
                      style={{
                        display: "flex",
                        gap: 9,
                        padding: "4px 14px 16px",
                        overflowX: "auto",
                        overflowY: "hidden",
                        scrollbarWidth: "none",
                      }}
                    >
                      {sortedEvents.length > 0 ? sortedEvents.map((e) => (
                        <MusicEventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} compact />
                      )) : (
                        <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "12px 0", whiteSpace: "nowrap" }}>No events in this area</p>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: "0 14px 14px", display: "flex", flexDirection: "column", gap: 9 }}>
                      {sortedEvents.map((e) => (
                        <MusicEventCard key={e.id} event={e} onClick={() => { setSelectedEvent(e); setSheetExpanded(false); }} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* EVENT DETAIL */}
        {view === "home" && selectedEvent && (
          <div className="view-panel event-detail-panel">
            <MusicEventDetail
              event={events.find((e) => e.id === selectedEvent.id) ?? selectedEvent}
              onBack={() => setSelectedEvent(null)}
              onArtistClick={(artistName) => {
                setSelectedEvent(null);
                setView("artists");
                setSelectedArtist(artistName);
              }}
            />
          </div>
        )}

        {/* SEARCH */}
        {view === "search" && (
          <div className="view-panel">
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", gap: 10, alignItems: "center" }}>
              <button onClick={() => navigate("home")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <X size={19} />
              </button>
              <div className="search-bar" style={{ flex: 1 }}>
                <Search size={14} color="var(--text-muted)" />
                <input
                  id="search-input"
                  autoFocus
                  placeholder="Search venues, artists, genres…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleSearch(searchQuery);
                    }
                  }}
                />
                {searchQuery && (
                  <X
                    size={14}
                    style={{ color: "var(--text-muted)", cursor: "pointer" }}
                    onClick={() => setSearchQuery("")}
                  />
                )}
              </div>
            </div>

            <div className="scroll-y" style={{ flex: 1, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
              {searchQuery ? (
                <>
                  {locationSuggestions.length > 0 && (
                    <div style={{ marginBottom: 5 }}>
                      <p className="label" style={{ padding: "0 0 6px" }}>Places</p>
                      {locationSuggestions.map((feat) => (
                        <div
                          key={feat.id}
                          className="card-hover-effect"
                          onClick={() => {
                            const [lng, lat] = feat.center;
                            setViewState({
                              ...viewState,
                              longitude: lng,
                              latitude: lat,
                              zoom: feat.place_type?.includes("region") || feat.place_type?.includes("country") ? 10 : 14,
                              transitionDuration: 1500
                            });
                            
                            if (typeof window !== "undefined") {
                              const url = new URL(window.location.href);
                              const cityName = feat.text || feat.place_name.split(",")[0];
                              url.searchParams.set("city", cityName.toLowerCase());
                              window.history.pushState({}, "", url);
                            }

                            setSearchQuery("");
                            setView("home");
                          }}
                          style={{
                            padding: "10px 14px", background: "var(--card-bg)",
                            border: "1px solid var(--border)", borderRadius: 8,
                            marginBottom: 8, cursor: "pointer", display: "flex",
                            alignItems: "center", gap: 12
                          }}
                        >
                          <MapIcon size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                          <span style={{ fontSize: 13, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {feat.place_name}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {sortedEvents.length > 0 && <p className="label" style={{ padding: "8px 0 6px" }}>Events</p>}
                  {sortedEvents.length > 0 ? sortedEvents.map((e) => (
                    <MusicEventCard key={e.id} event={e} onClick={() => { setSelectedEvent(e); navigate("home"); }} />
                  )) : (
                    locationSuggestions.length === 0 && (
                      <div style={{ textAlign: "center", paddingTop: 56, color: "var(--text-muted)" }}>
                        <div style={{ fontSize: 36, marginBottom: 10 }}>🔍</div>
                        <p style={{ fontSize: 14 }}>No results for "{searchQuery}"</p>
                      </div>
                    )
                  )}
                </>
              ) : (
                <>
                  <p className="label" style={{ padding: "2px 0 6px" }}>Browse by Genre</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
                    {["techno","house","tech-house","trance","drum-and-bass","dubstep","disco","funk","hiphop"].map((g) => {
                      const m = GENRE_META[g];
                      const count = events.filter((e) => e.genre === g).length;
                      return (
                        <button
                          key={g}
                          id={`search-genre-${g}`}
                          onClick={() => { setGenre(g); navigate("home"); }}
                          style={{
                            background: m.bg, border: `1px solid ${m.color}22`,
                            borderRadius: 12, padding: "14px",
                            cursor: "pointer", textAlign: "left", transition: "all 0.18s",
                          }}
                        >
                          <div style={{ marginBottom: 5 }}><GenreIcon name={m.icon} size={22} color={m.color} /></div>
                          <div style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 13, color: m.color }}>{m.label}</div>
                          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{count} event{count !== 1 ? "s" : ""}</div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* CITIES: events grouped by city */}
        {view === "cities" && (
          <div className="view-panel">
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => navigate("home")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <X size={19} />
              </button>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15 }}>All Cities</span>
            </div>
            <div className="scroll-y" style={{ flex: 1 }}>
              {CITIES.map((c) => {
                const cityEvents = sortedEvents.filter((e) => e.city?.toLowerCase() === c.id);
                if (cityEvents.length === 0) return null;
                return (
                  <div key={c.id}>
                    <div
                      onClick={() => router.push(`/${c.id}`)}
                      style={{
                        padding: "10px 14px", borderBottom: "1px solid var(--border)",
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        cursor: "pointer", background: "var(--bg-secondary)",
                        position: "sticky", top: 0, zIndex: 10,
                      }}
                    >
                      <div>
                        <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>{c.name}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 8 }}>{c.country}</span>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "var(--purple)" }}>
                        {cityEvents.length} event{cityEvents.length !== 1 ? "s" : ""} →
                      </span>
                    </div>
                    <div style={{ padding: "8px 14px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                      {cityEvents.slice(0, 5).map((e) => (
                        <MusicEventCard key={e.id} event={e} onClick={() => { setSelectedEvent(e); navigate("home"); }} />
                      ))}
                      {cityEvents.length > 5 && (
                        <button
                          onClick={() => router.push(`/${c.id}`)}
                          style={{
                            background: "none", border: "1px solid var(--border)", borderRadius: 10,
                            padding: "8px", color: "var(--purple)", fontSize: 12, fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          View all {cityEvents.length} events in {c.name}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ARTISTS */}
        {view === "artists" && (
          <div className="view-panel" style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Header */}
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <button 
                onClick={() => { setSelectedArtist(null); navigate("home"); }} 
                style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}
              >
                <X size={19} />
              </button>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15 }}>
                {selectedArtist ? `${selectedArtist} (Artist Profile)` : "Artists"}
              </span>
              {cityFilter && (
                <span style={{ fontSize: 11, background: "var(--bg-elevated)", color: "var(--text-secondary)", padding: "2px 8px", borderRadius: 12, marginLeft: "auto" }}>
                  {cityFilter.toUpperCase()}
                </span>
              )}
            </div>

            {/* Split Screen if an artist is selected */}
            <div style={{ display: "flex", flex: 1, overflow: "hidden", flexDirection: selectedArtist ? "column" : "row" }} className="scroll-y">
              
              {/* Artist List View (When no artist is selected) */}
              {!selectedArtist ? (
                <div style={{ flex: 1, padding: "14px", display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 4 }}>
                    DJs and Artists performing in {cityFilter ? cityFilter.toUpperCase() : "all cities"}. Select an artist to view their live set.
                  </p>
                  
                  {/* Dynamic Artist Search Bar */}
                  <div style={{ position: "relative", width: "100%", marginBottom: 8 }}>
                    <input
                      type="text"
                      placeholder="Search DJs / Artists..."
                      value={artistSearchQuery}
                      onChange={(e) => setArtistSearchQuery(e.target.value)}
                      style={{
                        width: "100%",
                        padding: "10px 14px 10px 36px",
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border)",
                        borderRadius: 10,
                        color: "var(--text-primary)",
                        fontSize: 13,
                        outline: "none"
                      }}
                    />
                    <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
                    {artistSearchQuery && (
                      <button 
                        onClick={() => setArtistSearchQuery("")}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 0 }}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 10 }}>
                    {allArtists
                      .filter(artist => artist.toLowerCase().includes(artistSearchQuery.toLowerCase()))
                      .map((artistName) => {
                      // Calculate upcoming gig count
                      const gigCount = events.filter(e => 
                        (e.artists || []).some(a => {
                          const cleanedRaw = (a || "").replace(/[{}""'\[\]]/g, "").trim().toLowerCase();
                          return cleanedRaw.includes(artistName.toLowerCase());
                        })
                      ).length;
                      
                      return (
                        <div 
                          key={artistName}
                          onClick={() => setSelectedArtist(artistName)}
                          style={{ 
                            background: "var(--card-bg)", 
                            border: "1px solid var(--border)", 
                            borderRadius: 12, 
                            padding: "12px 14px", 
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            display: "flex",
                            flexDirection: "column",
                            justifyContent: "space-between",
                            height: 100
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = "var(--primary)";
                            e.currentTarget.style.transform = "translateY(-2px)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = "var(--border)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }}
                        >
                          <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                            {artistName}
                          </span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {gigCount} {gigCount === 1 ? "Upcoming Gig" : "Gigs"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Artist Detail View */
                <div style={{ flex: 1, padding: "16px", display: "flex", flexDirection: "column", gap: 16 }}>
                  <button 
                    onClick={() => setSelectedArtist(null)} 
                    style={{ alignSelf: "flex-start", background: "var(--bg-elevated)", border: "1px solid var(--border)", color: "var(--text-primary)", borderRadius: 8, padding: "6px 12px", fontSize: 12, cursor: "pointer", fontWeight: 600 }}
                  >
                    ← Back to Artists list
                  </button>

                  {/* YouTube iframe or Search Redirect based on actual mapping */}
                  {isLoadingVideo ? (
                    <div style={{ 
                      width: "100%", 
                      height: 200, 
                      background: "var(--bg-elevated)", 
                      borderRadius: 14, 
                      border: "1px solid var(--border)", 
                      display: "flex", 
                      flexDirection: "column", 
                      justifyContent: "center", 
                      alignItems: "center",
                      gap: 12
                    }}>
                      <div className="spinner animate-spin" style={{ width: 24, height: 24, border: "2px solid rgba(255,255,255,0.1)", borderTopColor: "var(--primary)", borderRadius: "50%", animation: "spin 1s linear infinite" }} />
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Searching YouTube for {selectedArtist}'s live set...</span>
                    </div>
                  ) : dynamicVideoId ? (
                    <div style={{ width: "100%", position: "relative", paddingTop: "56.25%", background: "#000", borderRadius: 14, overflow: "hidden", border: "1px solid var(--border)" }}>
                      <iframe
                        key={selectedArtist} // Force iframe reconstruction on click
                        style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: 0 }}
                        src={`https://www.youtube.com/embed/${dynamicVideoId}?autoplay=1`}
                        title={`${selectedArtist} DJ set`}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  ) : (
                    <div style={{ 
                      width: "100%", 
                      height: 180, 
                      background: "var(--bg-elevated)", 
                      borderRadius: 14, 
                      border: "1px solid var(--border)", 
                      display: "flex", 
                      flexDirection: "column", 
                      justifyContent: "center", 
                      alignItems: "center",
                      gap: 12,
                      padding: 20,
                      textAlign: "center"
                    }}>
                      <span style={{ fontSize: 24 }}>🎵</span>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>No Preview Video Registered</div>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 2 }}>We couldn't auto-fetch a video. You can search directly on YouTube.</div>
                      </div>
                      <a 
                        href={`https://www.youtube.com/results?search_query=${encodeURIComponent(selectedArtist + " dj set")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          background: "var(--primary)",
                          color: "#fff",
                          padding: "8px 16px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          textDecoration: "none"
                        }}
                      >
                        Search on YouTube ↗
                      </a>
                    </div>
                  )}

                  <div>
                    <h2 style={{ fontSize: 18, fontWeight: 900, marginBottom: 4 }}>{selectedArtist}</h2>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", flexDirection: "column", gap: 4 }}>
                      <span>Preview live performances & see upcoming tour schedule below.</span>
                      <span style={{ fontSize: 10, color: "var(--text-muted)", opacity: 0.7 }}>
                        Matched Key: "{(selectedArtist || "").replace(/[{}""'\[\]]/g, "").trim().toLowerCase()}"
                      </span>
                    </p>
                  </div>

                  {/* Gig Schedule (Events the DJ plays at) */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)" }}>Gigs on Eventure</p>
                    
                    {cityEvents
                      .filter(e => e.artists?.some(a => {
                        const cleanedRaw = (a || "").replace(/[{}""'\[\]]/g, "").trim().toLowerCase();
                        return cleanedRaw.includes((selectedArtist || "").toLowerCase().trim());
                      }))
                      .map(event => (
                        <div 
                          key={event.id}
                          onClick={() => {
                            setSelectedEvent(event);
                            setView("home");
                            // Center the map view to this event's venue
                            setViewState({
                              longitude: event.lng,
                              latitude: event.lat,
                              zoom: 13.5,
                              pitch: 40,
                              transitionDuration: 1500
                            });
                          }}
                          style={{
                            background: "var(--bg-elevated)",
                            border: "1px solid var(--border)",
                            borderRadius: 12,
                            padding: "12px 14px",
                            cursor: "pointer",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center"
                          }}
                        >
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{event.title}</div>
                            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>{event.venue_name} ({event.city})</div>
                          </div>
                          <span style={{ fontSize: 11, color: "var(--primary)", fontWeight: 700 }}>
                            View on Map →
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ABOUT */}
        {view === "about" && (
          <div className="view-panel">
            <div style={{ padding: "12px 14px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => navigate("home")} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <X size={19} />
              </button>
              <span style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 15 }}>About</span>
            </div>
            <div className="scroll-y" style={{ flex: 1, padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ textAlign: "center", paddingTop: 16 }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>⚡️</div>
                <h1
                  style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 900, fontSize: 26, marginBottom: 10 }}
                  className="gradient-text"
                >
                  Eventure
                </h1>
                <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.65 }}>
                  Discover the best club nights, live music, and underground events — on a real-time global map.
                  Filter by genre, find what's happening tonight, and get tickets in one tap.
                </p>
              </div>

              <div style={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
                <p className="label">Map Color Guide</p>
                {[
                  { color: "#E63946", label: "Live Now", desc: "Event is happening right now" },
                  { color: "#F97316", label: "Today", desc: "Starting later today" },
                  { color: "#848D97", label: "This Week", desc: "Within the next 7 days" },
                  { color: "#484F58", label: "Upcoming", desc: "Further in the future" },
                ].map((item) => (
                  <div key={item.label} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{item.label}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{item.desc}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ background: "var(--primary-dim)", border: "1px solid rgba(230,57,70,0.25)", borderRadius: 14, padding: "16px" }}>
                <p style={{ fontFamily: "'Poppins', sans-serif", fontWeight: 700, fontSize: 14, marginBottom: 6 }}>Are you a venue or promoter?</p>
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 14, lineHeight: 1.55 }}>
                  Get your events listed on Eventure. Submissions are reviewed within 24 hours.
                </p>
                <button className="btn btn-primary" onClick={handleOpenSubmit} style={{ width: "100%", padding: "12px", borderRadius: 10 }}>
                  <Plus size={15} /> Submit an Event
                </button>
              </div>

              <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center" }}>
                Event data sourced from Resident Advisor and direct venue submissions.
              </p>
            </div>
          </div>
        )}

        {/* Mobile menu drawer */}
        {showMobileMenu && (
          <div className="overlay animate-fadein" onClick={() => setShowMobileMenu(false)} style={{ zIndex: 200, alignItems: "flex-start", justifyContent: "flex-end", paddingTop: 70 }}>
            <div className="mobile-menu-drawer animate-slideleft" onClick={(e) => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Menu</span>
                <button onClick={() => setShowMobileMenu(false)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                  <X size={18} />
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <Link
                  href="/events/cities"
                  onClick={() => setShowMobileMenu(false)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
                >
                  <Building2 size={18} />
                  Cities
                </Link>
                <Link
                  href="/artists"
                  onClick={() => setShowMobileMenu(false)}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, fontWeight: 600, textDecoration: "none" }}
                >
                  <Users size={18} />
                  Artists
                </Link>
                <button
                  onClick={() => { setShowMobileMenu(false); setView("about"); }}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 10, color: "var(--text-primary)", fontSize: 14, fontWeight: 600, cursor: "pointer", textAlign: "left", background: "none", border: "none" }}
                >
                  <Info size={18} />
                  About
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* FILTERS MODAL */}
      {showFilters && (
        <div className="overlay animate-fadein" style={{ zIndex: 100 }}>
          <div className="modal animate-slideup" style={{ padding: 22, maxWidth: 440 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
              <h2 style={{ fontSize: 17 }}>Filter Events</h2>
              <button className="btn btn-ghost" onClick={() => setShowFilters(false)} style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            <p className="label" style={{ marginBottom: 10 }}>Quick Filters</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
              {TIME_FILTERS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTimeFilter(t.id)}
                  style={{
                    padding: "10px", borderRadius: 10,
                    border: `1px solid ${timeFilter === t.id ? "rgba(230,57,70,0.4)" : "var(--border)"}`,
                    background: timeFilter === t.id ? "var(--primary-dim)" : "var(--bg-elevated)",
                    color: timeFilter === t.id ? "var(--primary)" : "var(--text-secondary)",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <p className="label" style={{ marginBottom: 10 }}>Day of the Week</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 24 }}>
              {DAY_FILTERS.map((d) => (
                <button
                  key={d.id}
                  onClick={() => setTimeFilter(d.id)}
                  style={{
                    flex: 1, minWidth: "42px", padding: "10px 0", borderRadius: 10,
                    border: `1px solid ${timeFilter === d.id ? "rgba(230,57,70,0.4)" : "var(--border)"}`,
                    background: timeFilter === d.id ? "var(--primary-dim)" : "var(--bg-elevated)",
                    color: timeFilter === d.id ? "var(--primary)" : "var(--text-secondary)",
                    fontSize: 12, fontWeight: 700, cursor: "pointer",
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>

            <button className="btn btn-primary btn-full" onClick={() => setShowFilters(false)} style={{ padding: "13px", borderRadius: 12 }}>
              Show {sortedEvents.length} Event{sortedEvents.length !== 1 ? "s" : ""}
            </button>
            <button className="btn btn-ghost btn-full" onClick={() => { setTimeFilter("all"); setGenre("all"); }} style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
              Reset all filters
            </button>
          </div>
        </div>
      )}

      {/* SUBMIT EVENT MODAL */}
      {showSubmit && <SubmitEventModal onClose={() => setShowSubmit(false)} />}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onSuccess={() => { setShowAuthModal(false); setShowSubmit(true); }} />}
    </div>
  );
}
