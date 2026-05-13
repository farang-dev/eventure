"use client";
import { useRef, useState, useMemo, useCallback, useEffect } from "react";
import Map, { Marker, NavigationControl, GeolocateControl, type MapRef } from "react-map-gl/mapbox";
import { MapPin } from "lucide-react";
import Supercluster from "supercluster";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MusicEvent } from "@/lib/types";
import { GENRE_META } from "@/lib/mock-data";
import GenreIcon from "@/components/GenreIcon";

interface Props {
  events: MusicEvent[];
  selectedGenre: string;
  onEventSelect: (event: MusicEvent) => void;
  selectedEventId?: string;
  viewState: any;
  onViewStateChange: (state: any) => void;
  onBoundsChange?: (bounds: [number, number, number, number]) => void;
  mapStyle?: string;
  userLocation?: { lng: number; lat: number } | null;
}

type GeoPoint = {
  type: "Feature";
  geometry: { type: "Point"; coordinates: [number, number] };
  properties: MusicEvent & { cluster: false };
};

function getUrgencyColor(event: MusicEvent): string {
  if (event.status === "happening_now") return "#E63946"; // Red
  if (event.status === "today") return "#F97316"; // Orange
  
  const start = new Date(event.starts_at);
  const now = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(now.getDate() + 1);
  
  if (start.toDateString() === tomorrow.toDateString()) {
    return "#F59E0B"; // Amber for Tomorrow
  }

  const days = (start.getTime() - now.getTime()) / 86400000;
  if (days < 7) return "#8B5CF6"; // Purple for this week
  return "#484F58"; // Dark for future
}

function getPinScale(event: MusicEvent, isSelected: boolean): number {
  if (event.status === "happening_now") return isSelected ? 1.4 : 1.25;
  if (event.status === "today") return isSelected ? 1.3 : 1.15;
  
  const start = new Date(event.starts_at);
  const tomorrow = new Date();
  tomorrow.setDate(new Date().getDate() + 1);
  if (start.toDateString() === tomorrow.toDateString()) return isSelected ? 1.25 : 1.1;

  const days = (start.getTime() - Date.now()) / 86400000;
  if (days < 7) return isSelected ? 1.1 : 0.95;
  return isSelected ? 1.0 : 0.85;
}

export default function MapView({
  events,
  selectedGenre,
  onEventSelect,
  selectedEventId,
  viewState,
  onViewStateChange,
  onBoundsChange,
  mapStyle = "mapbox://styles/mapbox/dark-v11",
  userLocation,
}: Props) {
  const mapRef = useRef<MapRef>(null);
  const [bounds, setBounds] = useState<[number, number, number, number]>([
    138, 34, 141, 37,
  ]);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const filtered = useMemo(
    () => (selectedGenre === "all" ? events : events.filter((e) => e.genre === selectedGenre)),
    [events, selectedGenre]
  );

  // Build GeoJSON points for supercluster
  // IMPROVEMENT: Group events at the exact same location to prevent pin stacking
  const points: GeoPoint[] = useMemo(() => {
    const groups: Record<string, MusicEvent[]> = {};
    
    filtered.forEach(e => {
      // Use a string key for exact coordinate match
      const key = `${e.lat.toFixed(6)},${e.lng.toFixed(6)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(e);
    });

    return Object.values(groups).map(group => {
      // Sort by starts_at ascending to find the nearest/current event
      const sorted = [...group].sort((a, b) => 
        new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime()
      );
      
      const nearest = sorted[0];
      
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [nearest.lng, nearest.lat] },
        properties: { 
          ...nearest, 
          cluster: false,
          // We can attach the count or other events if we want to show a "multi-event" indicator
          eventCountAtLocation: group.length 
        },
      } as GeoPoint;
    });
  }, [filtered]);

  // Create supercluster — higher radius + maxZoom means clusters replace pins until zoomed in enough
  const sc = useMemo(() => {
    const s = new Supercluster<MusicEvent, {}>({ radius: 80, maxZoom: 16, minZoom: 0 });
    s.load(points as any);
    return s;
  }, [points]);

  const zoom = Math.round(viewState.zoom ?? 12); // round not floor for smoother transitions

  const clusters = useMemo(() => {
    try {
      return sc.getClusters(bounds, zoom);
    } catch {
      return [];
    }
  }, [sc, bounds, zoom]);

  const handleMove = useCallback(
    (evt: any) => {
      onViewStateChange(evt.viewState);
    },
    [onViewStateChange]
  );

  // Sync bounds whenever viewState changes or map is moved
  useEffect(() => {
    const map = mapRef.current;
    if (map) {
      const b = map.getBounds();
      if (b) {
        const nextBounds: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
        // Only update if actually different to avoid loops
        if (JSON.stringify(nextBounds) !== JSON.stringify(bounds)) {
          setBounds(nextBounds);
          onBoundsChange?.(nextBounds);
        }
      }
    }
  }, [viewState, onBoundsChange]);


  const handleIdle = useCallback(() => {
    const map = mapRef.current;
    if (map) {
      const b = map.getBounds();
      if (b) {
        const nextBounds: [number, number, number, number] = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
        if (JSON.stringify(nextBounds) !== JSON.stringify(bounds)) {
          setBounds(nextBounds);
          onBoundsChange?.(nextBounds);
        }
      }
    }
  }, [bounds, onBoundsChange]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Map
        {...viewState}
        ref={mapRef}
        onMove={handleMove}
        onLoad={handleIdle}
        onIdle={handleIdle}
        mapStyle={mapStyle}
        mapboxAccessToken={process.env.NEXT_PUBLIC_MAPBOX_TOKEN}
        style={{ width: "100%", height: "100%" }}
        doubleClickZoom={false}
        onDblClick={(e) => {
          const { lng, lat } = e.lngLat;
          onViewStateChange({
            ...viewState,
            longitude: lng,
            latitude: lat,
            zoom: Math.max(viewState.zoom, 14),
            transitionDuration: 800
          });
        }}
      >
        {/* Map Controls - Snapped to Top-Right corner */}
        {!isMobile && (
          <NavigationControl position="top-right" />
        )}
        <GeolocateControl 
          position="top-right" 
          trackUserLocation 
          showUserLocation 
        />

        {/* Persistent Custom User Location Marker - Enhanced Emphasis */}
        {userLocation && (
          <Marker longitude={userLocation.lng} latitude={userLocation.lat} anchor="center">
            <div style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: 40, height: 40 }}>
              {/* Ripple 1: Main Outer Pulse */}
              <div style={{
                position: "absolute",
                width: "100%", height: "100%",
                borderRadius: "50%",
                background: "#007AFF",
                opacity: 0,
                animation: "ripple 2.5s infinite ease-out"
              }} />
              {/* Ripple 2: Inner Delayed Pulse for more depth */}
              <div style={{
                position: "absolute",
                width: "80%", height: "80%",
                borderRadius: "50%",
                background: "#007AFF",
                opacity: 0,
                animation: "ripple 2.5s infinite ease-out 0.8s"
              }} />
              {/* Glow background */}
              <div style={{
                position: "absolute",
                width: 20, height: 20,
                borderRadius: "50%",
                background: "#007AFF",
                filter: "blur(4px)",
                opacity: 0.3
              }} />
              {/* Core dot */}
              <div style={{
                width: 16, height: 16,
                borderRadius: "50%",
                background: "#007AFF",
                border: "3px solid #FFFFFF",
                boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                zIndex: 2
              }} />
            </div>
          </Marker>
        )}

        {clusters.map((cluster: any) => {
          const [lng, lat] = cluster.geometry.coordinates;
          const { cluster: isCluster, cluster_id, point_count } = cluster.properties;

          // ── CLUSTER MARKER ──
          if (isCluster) {
            let clusterColor = "#848D97";
            try {
              const leaves = sc.getLeaves(cluster_id, Infinity);
              const now = new Date();
              const todayStr = now.toDateString();
              const tomorrowStr = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toDateString();
              const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

              const urgencyOf = (l: any) => {
                const s = new Date(l.properties.starts_at);
                const e = new Date(l.properties.ends_at);
                if (now >= s && now <= e) return 0; // live
                if (s.toDateString() === todayStr) return 1; // today
                if (s.toDateString() === tomorrowStr) return 2; // tomorrow
                const diff = Math.round((new Date(s.getFullYear(), s.getMonth(), s.getDate()).getTime() - nowDay) / 86400000);
                return diff <= 7 ? 3 : 99;
              };
              const best = Math.min(...leaves.map(urgencyOf));
              if (best === 0) clusterColor = "#E63946";
              else if (best === 1) clusterColor = "#F97316";
              else if (best === 2) clusterColor = "#F59E0B";
              else if (best === 3) clusterColor = "#8B5CF6";
            } catch {}

            const radius = 20; 

            return (
              <Marker
                key={`cluster-${cluster_id}`}
                longitude={lng}
                latitude={lat}
                anchor="center"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  const expansionZoom = Math.min(sc.getClusterExpansionZoom(cluster_id), 16);
                  onViewStateChange({ ...viewState, longitude: lng, latitude: lat, zoom: expansionZoom });
                }}
              >
                <div
                  style={{
                    background: clusterColor === "#848D97" ? "rgba(28,33,40,0.92)" : clusterColor,
                    border: `1.5px solid ${clusterColor === "#848D97" ? "var(--border)" : "#FFF"}`,
                    borderRadius: 999,
                    width: 32, height: 32,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    boxShadow: `0 0 15px ${clusterColor}66`,
                    transition: "transform 0.2s",
                    backdropFilter: "blur(8px)",
                  }}
                  title={`${point_count} events here`}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.1)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
                >
                  <span
                    style={{
                      fontFamily: "'Poppins', sans-serif",
                      fontWeight: 800,
                      fontSize: 13,
                      color: "#FFF",
                    }}
                  >
                    {point_count}
                  </span>
                </div>
              </Marker>
            );
          }

          // ── INDIVIDUAL PIN ──
          const event = cluster.properties as MusicEvent;
          const meta = GENRE_META[event.genre] ?? GENRE_META.other;
          const isSelected = selectedEventId === event.id;
          
          // Robust status recalculation
          const start = new Date(event.starts_at);
          const end = new Date(event.ends_at);
          const now = new Date();
          const isLive = now >= start && now <= end;
          const isToday = start.toDateString() === now.toDateString() && !isLive;
          const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
          const isTomorrow = start.toDateString() === tomorrow.toDateString();
          const daysAway = Math.round((new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() - new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()) / 86400000);
          const isThisWeek = daysAway > 1 && daysAway <= 7;

          const urgencyColor = getUrgencyColor(event);
          const scale = getPinScale(event, isSelected);

          const pinBg = isLive      ? "#E63946"           // Red — Live Now
            : isToday               ? "#F97316"           // Orange — Today
            : isTomorrow            ? "#F59E0B"           // Amber — Tomorrow
            : isThisWeek            ? "#8B5CF6"           // Purple — This Week
            : isSelected            ? meta.color
            : "#282C34";                                  // Dark Charcoal — Upcoming

          const isUrgent = isLive || isToday || isTomorrow || isThisWeek;
          const pinBorder = isUrgent || isSelected ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.15)";
          const textColor = "#FFF"; // Always white for maximum readability on dark/colored backgrounds

          return (
            <Marker
              key={event.id}
              longitude={event.lng}
              latitude={event.lat}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                onEventSelect(event);
              }}
              style={{ zIndex: isLive ? 40 : isToday ? 30 : isSelected ? 25 : 10 }}
            >
              <div
                id={`map-pin-${event.id}`}
                style={{ cursor: "pointer", transform: `scale(${scale})`, transition: "transform 0.2s", position: "relative" }}
              >
                {isLive && (
                  <div
                    style={{
                      position: "absolute", inset: -6, borderRadius: "50%",
                      border: "1.5px solid rgba(230,57,70,0.35)",
                      animation: "ripple 2.2s ease-out infinite",
                    }}
                  />
                )}

                {zoom >= 14 ? (
                  // Full pill with name — only at high zoom
                  <div
                    style={{
                      background: pinBg,
                      border: `1.5px solid ${pinBorder}`,
                      borderRadius: 999,
                      padding: "3px 8px",
                      display: "flex", alignItems: "center", gap: 4,
                      boxShadow: isLive ? "0 0 12px #E6394688" : isToday ? "0 0 12px #F9731688" : isUrgent ? `0 0 8px ${pinBg}88` : undefined,
                      whiteSpace: "nowrap",
                      backdropFilter: "blur(6px)",
                    }}
                  >
                    {isLive && (
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#FFF", flexShrink: 0, animation: "pulse 1.5s infinite" }} />
                    )}
                    <GenreIcon name={meta.icon} size={10} color={textColor} />
                    <span
                      style={{
                        fontSize: 10, fontWeight: 700,
                        fontFamily: "'Poppins', sans-serif",
                        color: textColor,
                        maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis",
                      }}
                    >
                      {isLive ? "LIVE" : event.venue_name}
                    </span>
                    {(cluster.properties as any).eventCountAtLocation > 1 && (
                      <span
                        style={{
                          background: "rgba(255,255,255,0.2)",
                          borderRadius: 4,
                          padding: "0 4px",
                          fontSize: 9,
                          fontWeight: 800,
                          color: "#FFF",
                          marginLeft: 2,
                        }}
                      >
                        +{(cluster.properties as any).eventCountAtLocation - 1}
                      </span>
                    )}
                  </div>
                ) : (
                  // Compact dot — at low zoom, no text, just color
                  <div style={{ position: "relative" }}>
                    <div
                      style={{
                        width: isUrgent ? 14 : 11,
                        height: isUrgent ? 14 : 11,
                        borderRadius: "50%",
                        background: pinBg,
                        border: "2.5px solid white",
                        boxShadow: `0 0 15px ${pinBg}, 0 0 5px rgba(0,0,0,0.8)`,
                      }}
                    />
                    {(cluster.properties as any).eventCountAtLocation > 1 && (
                      <div
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          background: "#FFF",
                          color: "#000",
                          borderRadius: "50%",
                          width: 12,
                          height: 12,
                          fontSize: 8,
                          fontWeight: 900,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }}
                      >
                        {(cluster.properties as any).eventCountAtLocation}
                      </div>
                    )}
                  </div>
                )}
              </div>

            </Marker>
          );
        })}
      </Map>

      {/* Legend - Positioned Top-Left to avoid control overlap */}
      <div
        style={{
          position: "absolute", 
          top: isMobile ? 65 : 65, 
          left: 12,
          background: "var(--bg-elevated)", 
          backdropFilter: "blur(10px)",
          border: "1px solid var(--border)", 
          borderRadius: 10,
          padding: "9px 12px", 
          zIndex: 5, // Lower than style toggle if needed
          pointerEvents: "none",
          display: "flex", 
          flexDirection: "column", 
          gap: 5,
          fontSize: 10, 
          fontWeight: 700, 
          color: "var(--text-primary)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        {[
          { color: "#E63946", label: "Live Now" },
          { color: "#F97316", label: "Today" },
          { color: "#F59E0B", label: "Tomorrow" },
          { color: "#8B5CF6", label: "This Week" },
          { color: "#282C34", label: "Upcoming" },
        ].map((r) => (
          <div key={r.label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ 
              width: 6, height: 6, borderRadius: "50%", background: r.color, flexShrink: 0,
              boxShadow: r.label === "Live Now" ? "0 0 6px #E63946" : "none"
            }} />
            {r.label}
          </div>
        ))}
        <div style={{ borderTop: "1px solid var(--border)", marginTop: 2, paddingTop: 6, display: "flex", alignItems: "center", gap: 6, opacity: 0.6 }}>
          <span style={{ width: 12, height: 12, borderRadius: "50%", border: "1.5px solid var(--text-secondary)", background: "var(--bg)", display: "inline-block", flexShrink: 0 }} />
          Cluster
        </div>
      </div>

      <style jsx global>{`
        @keyframes ripple {
          0% { transform: scale(1); opacity: 0.5; }
          100% { transform: scale(2.8); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
