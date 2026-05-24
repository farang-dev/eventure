import { createClient } from "@supabase/supabase-js";
import { CITIES, CITY_META } from "@/lib/constants";
import Link from "next/link";
import { Search, MapPin, ArrowRight, Users, Music, Building2, Map as MapIcon } from "lucide-react";
import Header from "@/components/Header";
import ArtistSearchBar from "@/components/ArtistSearchBar";

export const revalidate = 60;

export async function generateMetadata() {
  return {
    title: "Discover Local DJs, Artists & Music Gigs by City | Eventure",
    description:
      "Explore local DJs, music selectors, and touring electronic artists by city. Watch live Boiler Room sets, check HÖR performances, and find where they are playing next.",
    keywords: [
      "local djs directory",
      "electronic music artists",
      "boiler room sets",
      "vilnius djs",
      "tbilisi techno djs",
      "berlin resident djs",
    ],
    alternates: {
      canonical: "https://www.eventurer.online/artists",
    },
  };
}

export default async function ArtistsHubPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const artistCounts: Record<string, number> = {};

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      await Promise.all(
        CITIES.map(async (city) => {
          const { data } = await supabase
            .from("music_events")
            .select("artists")
            .eq("city", city.id);
            
          if (data) {
            const unique = new Set<string>();
            data.forEach((e: any) => {
              const list = e.artists || [];
              list.forEach((a: string) => {
                if (!a) return;
                a.split(/[,;&]|\s+vs\.?\s+|\s+and\s+/i).forEach((name: string) => {
                  const clean = name.replace(/[{}""'\[\]]/g, "").trim();
                  if (clean && clean.toLowerCase() !== "tba") {
                    unique.add(clean.toLowerCase());
                  }
                });
              });
            });
            artistCounts[city.id] = unique.size;
          }
        })
      );
    } catch (e) {
      console.error("Failed to fetch artist counts:", e);
    }
  }

  // Gradient styles corresponding to each city's unique theme
  const getCityGradient = (cityId: string) => {
    switch (cityId) {
      case "tokyo":
        return "linear-gradient(135deg, rgba(230, 57, 70, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)";
      case "berlin":
        return "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)";
      case "london":
        return "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)";
      case "barcelona":
        return "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)";
      case "new-york":
        return "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)";
      case "amsterdam":
        return "linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(245, 158, 11, 0.15) 100%)";
      case "paris":
        return "linear-gradient(135deg, rgba(236, 72, 153, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)";
      case "osaka":
        return "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(6, 182, 212, 0.15) 100%)";
      case "vilnius":
        return "linear-gradient(135deg, rgba(14, 165, 233, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)";
      case "belgrade":
        return "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)";
      case "tbilisi":
        return "linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)";
      case "sydney":
        return "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(99, 102, 241, 0.15) 100%)";
      case "melbourne":
        return "linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)";
      case "perth":
        return "linear-gradient(135deg, rgba(234, 179, 8, 0.15) 0%, rgba(20, 184, 166, 0.15) 100%)";
      case "los-angeles":
        return "linear-gradient(135deg, rgba(251, 146, 60, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)";
      case "chicago":
        return "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(239, 68, 68, 0.15) 100%)";
      case "miami":
        return "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(244, 63, 94, 0.15) 100%)";
      case "manchester":
        return "linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)";
      case "liverpool":
        return "linear-gradient(135deg, rgba(168, 85, 247, 0.15) 0%, rgba(236, 72, 153, 0.15) 100%)";
      case "birmingham":
        return "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(234, 179, 8, 0.15) 100%)";
      case "bristol":
        return "linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)";
      case "brighton":
        return "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)";
      case "glasgow":
        return "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)";
      case "edinburgh":
        return "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.15) 100%)";
      case "newcastle":
        return "linear-gradient(135deg, rgba(6, 182, 212, 0.15) 0%, rgba(13, 148, 136, 0.15) 100%)";
      case "leeds":
        return "linear-gradient(135deg, rgba(132, 204, 22, 0.15) 0%, rgba(34, 197, 94, 0.15) 100%)";
      case "sheffield":
        return "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%)";
      case "munich":
        return "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(96, 165, 250, 0.15) 100%)";
      case "hamburg":
        return "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(248, 113, 113, 0.15) 100%)";
      case "cologne":
        return "linear-gradient(135deg, rgba(31, 41, 55, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)";
      case "stuttgart":
        return "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(31, 41, 55, 0.15) 100%)";
      case "frankfurt":
        return "linear-gradient(135deg, rgba(37, 99, 235, 0.15) 0%, rgba(220, 38, 38, 0.15) 100%)";
      case "adelaide":
        return "linear-gradient(135deg, rgba(20, 184, 166, 0.15) 0%, rgba(34, 197, 94, 0.15) 100%)";
      case "hobart":
        return "linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(168, 85, 247, 0.15) 100%)";
      case "brisbane":
        return "linear-gradient(135deg, rgba(249, 115, 22, 0.15) 0%, rgba(234, 179, 8, 0.15) 100%)";
      default:
        return "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)";
    }
  };

  const getCityBorderGlow = (cityId: string) => {
    switch (cityId) {
      case "tokyo": return "rgba(230, 57, 70, 0.15)";
      case "berlin": return "rgba(16, 185, 129, 0.15)";
      case "london": return "rgba(59, 130, 246, 0.15)";
      case "barcelona": return "rgba(245, 158, 11, 0.15)";
      case "vilnius": return "rgba(14, 165, 233, 0.15)";
      case "belgrade": return "rgba(245, 158, 11, 0.15)";
      case "tbilisi": return "rgba(220, 38, 38, 0.15)";
      case "manchester": return "rgba(249, 115, 22, 0.15)";
      case "liverpool": return "rgba(168, 85, 247, 0.15)";
      case "birmingham": return "rgba(245, 158, 11, 0.15)";
      case "bristol": return "rgba(20, 184, 166, 0.15)";
      case "brighton": return "rgba(6, 182, 212, 0.15)";
      case "glasgow": return "rgba(139, 92, 246, 0.15)";
      case "edinburgh": return "rgba(245, 158, 11, 0.15)";
      case "newcastle": return "rgba(6, 182, 212, 0.15)";
      case "leeds": return "rgba(132, 204, 22, 0.15)";
      case "sheffield": return "rgba(239, 68, 68, 0.15)";
      case "munich": return "rgba(59, 130, 246, 0.15)";
      case "hamburg": return "rgba(239, 68, 68, 0.15)";
      case "cologne": return "rgba(31, 41, 55, 0.15)";
      case "stuttgart": return "rgba(251, 191, 36, 0.15)";
      case "frankfurt": return "rgba(37, 99, 235, 0.15)";
      case "adelaide": return "rgba(20, 184, 166, 0.15)";
      case "hobart": return "rgba(99, 102, 241, 0.15)";
      case "brisbane": return "rgba(249, 115, 22, 0.15)";
      default: return "rgba(255, 255, 255, 0.1)";
    }
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--bg)", color: "var(--text-primary)", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      <Header activePage="artists" />

      {/* Content */}
      <main style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "40px 20px" }}>
        {/* Breadcrumb */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-secondary)", marginBottom: 24 }}>
          <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>Home</Link>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Artists</span>
        </nav>

        {/* Hero */}
        <section style={{ marginBottom: 48, textAlign: "center" }}>
          <h1 style={{ fontSize: "clamp(28px, 4vw, 42px)", fontFamily: "'Poppins', sans-serif", fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 16 }}>
            Discover Local Artists & DJs by City
          </h1>
          <p style={{ maxWidth: 720, margin: "0 auto", color: "var(--text-secondary)", fontSize: 15, lineHeight: "1.6" }}>
            Explore local residents, international headliners, and up-and-coming DJs playing across underground club venues. Select any city to view profiles, play sets, and check their gig schedules.
          </p>
        </section>

        {/* Search */}
        <div style={{ marginBottom: 40 }}>
          <ArtistSearchBar />
        </div>

        {/* Grid */}
        <section>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 20 }}>
            {CITIES.map((city) => {
              const count = artistCounts[city.id] || 0;
              return (
                <Link key={city.id} href={`/artists/${city.id}`} style={{ textDecoration: "none" }}>
                  <div style={{ padding: 24, background: getCityGradient(city.id), border: `1px solid ${getCityBorderGlow(city.id)}`, borderRadius: "16px", display: "flex", flexDirection: "column", height: "100%" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>
                      {city.country}
                    </span>
                    <h3 style={{ fontSize: 22, fontFamily: "'Poppins', sans-serif", fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                      {city.name}
                    </h3>
                    <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: "1.5", marginBottom: 24 }}>
                      Explore local sound selectors, underground legends, and live music performers based in {city.name}.
                    </p>

                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 16, marginTop: "auto" }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                        {count} registered DJ{count !== 1 ? "s" : ""}
                      </span>
                      <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, fontWeight: 700, color: "var(--primary)" }}>
                        View Artists <ArrowRight size={14} />
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <footer style={{ borderTop: "1px solid var(--border)", backgroundColor: "var(--bg-secondary)", padding: "24px 20px", textAlign: "center", fontSize: 12, color: "var(--text-muted)", marginTop: 60 }}>
        &copy; {new Date().getFullYear()} Eventure. All rights reserved.
      </footer>
    </div>
  );
}
