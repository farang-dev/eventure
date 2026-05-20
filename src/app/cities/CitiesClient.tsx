"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, MapPin, ArrowRight, Sparkles, Building2, Map as MapIcon, Info } from "lucide-react";

interface CityWithCount {
  id: string;
  name: string;
  country: string;
  eventCount: number;
  meta: {
    description: string;
    keywords: string[];
  };
}

interface CitiesClientProps {
  cities: CityWithCount[];
}

export default function CitiesClient({ cities }: CitiesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCities = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        return "linear-gradient(135deg, rgba(100, 116, 139, 0.15) 0%, rgba(71, 85, 105, 0.15) 100%)";
      case "tbilisi":
        return "linear-gradient(135deg, rgba(220, 38, 38, 0.15) 0%, rgba(14, 165, 233, 0.15) 100%)";
      default:
        return "linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)";
    }
  };

  const getCityBorderGlow = (cityId: string) => {
    switch (cityId) {
      case "tokyo":
        return "rgba(230, 57, 70, 0.15)";
      case "berlin":
        return "rgba(16, 185, 129, 0.15)";
      case "london":
        return "rgba(59, 130, 246, 0.15)";
      case "barcelona":
        return "rgba(245, 158, 11, 0.15)";
      default:
        return "rgba(255, 255, 255, 0.1)";
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg)",
        color: "var(--text-primary)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      {/* Navigation Header */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          backgroundColor: "var(--bg-secondary)",
          position: "sticky",
          top: 0,
          zIndex: 100,
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "16px 20px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link
            href="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                fontSize: 24,
                fontWeight: 800,
                background: "linear-gradient(135deg, var(--primary), var(--purple))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontFamily: "'Poppins', sans-serif",
              }}
            >
              Eventure ⚡️
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              href="/"
              style={{
                color: "var(--text-secondary)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
              className="nav-link-hover"
            >
              <MapIcon size={16} /> Map
            </Link>
            <Link
              href="/cities"
              style={{
                color: "var(--primary)",
                textDecoration: "none",
                fontSize: 13,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Building2 size={16} /> Cities
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: 1200, width: "100%", margin: "0 auto", padding: "40px 20px" }}>
        {/* Breadcrumbs */}
        <nav
          aria-label="Breadcrumb"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--text-secondary)",
            marginBottom: 24,
          }}
        >
          <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            Home
          </Link>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Cities</span>
        </nav>

        {/* Hero Section */}
        <section style={{ marginBottom: 40, textAlign: "center" }}>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 42px)",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: 16,
              background: "linear-gradient(135deg, #FFF 60%, var(--text-secondary))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Club Event Guides & Live Maps by City
          </h1>
          <p
            style={{
              maxWidth: 720,
              margin: "0 auto 32px",
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: "1.6",
            }}
          >
            Explore upcoming techno club nights, house parties, and electronic events in the world's
            most vibrant cities. Click on any city below to open its live interactive party map.
          </p>

          {/* Search Bar */}
          <div
            style={{
              maxWidth: 480,
              margin: "0 auto",
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "14px",
              padding: "12px 16px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <Search size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Search cities or countries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                background: "none",
                border: "none",
                outline: "none",
                color: "var(--text-primary)",
                fontSize: 14,
              }}
            />
          </div>
        </section>

        {/* Cities Grid */}
        <section style={{ marginBottom: 60 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: 20,
            }}
          >
            {filteredCities.map((city) => (
              <Link
                key={city.id}
                href={`/${city.id}`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <div
                  className="card card-hover-effect"
                  style={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    padding: 24,
                    background: getCityGradient(city.id),
                    border: `1px solid ${getCityBorderGlow(city.id)}`,
                    borderRadius: "16px",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.08em",
                          color: "var(--primary)",
                        }}
                      >
                        {city.country}
                      </span>
                      {city.eventCount > 0 && (
                        <span
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            backgroundColor: "var(--primary-dim)",
                            color: "var(--primary)",
                            padding: "2px 8px",
                            borderRadius: 12,
                            marginLeft: "auto",
                          }}
                        >
                          LIVE
                        </span>
                      )}
                    </div>

                    <h3
                      style={{
                        fontSize: 22,
                        fontFamily: "'Poppins', sans-serif",
                        fontWeight: 700,
                        marginBottom: 8,
                        color: "var(--text-primary)",
                      }}
                    >
                      {city.name}
                    </h3>

                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: "1.5",
                        marginBottom: 24,
                      }}
                    >
                      {city.meta.description}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderTop: "1px solid rgba(255, 255, 255, 0.05)",
                      paddingTop: 16,
                      marginTop: "auto",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>
                      {city.eventCount} event{city.eventCount !== 1 ? "s" : ""}
                    </span>
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        fontSize: 13,
                        fontWeight: 700,
                        color: "var(--primary)",
                      }}
                    >
                      Explore Map <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filteredCities.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-secondary)" }}>
              No cities found matching your search.
            </div>
          )}
        </section>

        {/* SEO Rich Text Section */}
        <section
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: 48,
            marginTop: 48,
            color: "var(--text-secondary)",
            fontSize: 14,
            lineHeight: "1.7",
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 32 }}>
            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 12,
                }}
              >
                Why Choose Eventure for Nightlife Discovery?
              </h2>
              <p style={{ marginBottom: 12 }}>
                Eventure is built for electronic music enthusiasts who want to discover events in real-time. 
                Instead of searching through endless static lists, our map-centered experience pinpoints exactly 
                where club nights, raves, and festivals are happening.
              </p>
              <p>
                From the legendary underground techno vaults of Berlin to the vibrant high-rise club landscape 
                of Tokyo, we curate verified schedules directly from local party hosts and venue organizers.
              </p>
            </div>

            <div>
              <h2
                style={{
                  fontSize: 18,
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 12,
                }}
              >
                Supported Music Genres & Event Formats
              </h2>
              <p style={{ marginBottom: 12 }}>
                We cover a wide range of electronic styles including Techno, Industrial, Deep House, Melodic Tech, 
                Drum & Bass, Psytrance, and Ambient. Our listing guides flag both standard club nights 
                and multi-day festivals.
              </p>
              <p>
                Each city guide is optimized with custom coordinates, Mapbox routing data, and direct ticket links 
                so you can safely secure entry to any event.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          backgroundColor: "var(--bg-secondary)",
          padding: "24px 20px",
          textAlign: "center",
          fontSize: 12,
          color: "var(--text-muted)",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto" }}>
          &copy; {new Date().getFullYear()} Eventure. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
