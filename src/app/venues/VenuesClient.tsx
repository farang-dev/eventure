"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, MapPin, ArrowRight, Building2 } from "lucide-react";
import Header from "@/components/Header";

interface CityWithVenueCount {
  id: string;
  name: string;
  country: string;
  venueCount: number;
  meta: {
    description: string;
    keywords: string[];
  };
}

interface VenuesClientProps {
  cities: CityWithVenueCount[];
}

export default function VenuesClient({ cities }: VenuesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCities = cities.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      case "san-francisco":
        return "linear-gradient(135deg, rgba(244, 63, 94, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)";
      case "detroit":
        return "linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(107, 114, 128, 0.15) 100%)";
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
      case "sydney":
        return "rgba(6, 182, 212, 0.2)";
      case "melbourne":
        return "rgba(244, 63, 94, 0.2)";
      case "perth":
        return "rgba(234, 179, 8, 0.2)";
      case "new-york":
        return "rgba(99, 102, 241, 0.15)";
      case "amsterdam":
        return "rgba(249, 115, 22, 0.15)";
      case "paris":
        return "rgba(236, 72, 153, 0.15)";
      case "osaka":
        return "rgba(139, 92, 246, 0.15)";
      case "vilnius":
        return "rgba(14, 165, 233, 0.15)";
      case "belgrade":
        return "rgba(245, 158, 11, 0.15)";
      case "tbilisi":
        return "rgba(220, 38, 38, 0.15)";
      case "los-angeles":
        return "rgba(251, 146, 60, 0.15)";
      case "chicago":
        return "rgba(59, 130, 246, 0.15)";
      case "miami":
        return "rgba(6, 182, 212, 0.15)";
      case "manchester":
        return "rgba(249, 115, 22, 0.15)";
      case "liverpool":
        return "rgba(168, 85, 247, 0.15)";
      case "birmingham":
        return "rgba(245, 158, 11, 0.15)";
      case "bristol":
        return "rgba(20, 184, 166, 0.15)";
      case "brighton":
        return "rgba(6, 182, 212, 0.15)";
      case "glasgow":
        return "rgba(139, 92, 246, 0.15)";
      case "edinburgh":
        return "rgba(245, 158, 11, 0.15)";
      case "newcastle":
        return "rgba(6, 182, 212, 0.15)";
      case "leeds":
        return "rgba(132, 204, 22, 0.15)";
      case "sheffield":
        return "rgba(239, 68, 68, 0.15)";
      case "munich":
        return "rgba(59, 130, 246, 0.15)";
      case "hamburg":
        return "rgba(239, 68, 68, 0.15)";
      case "cologne":
        return "rgba(31, 41, 55, 0.15)";
      case "stuttgart":
        return "rgba(251, 191, 36, 0.15)";
      case "frankfurt":
        return "rgba(37, 99, 235, 0.15)";
      case "adelaide":
        return "rgba(20, 184, 166, 0.15)";
      case "hobart":
        return "rgba(99, 102, 241, 0.15)";
      case "brisbane":
        return "rgba(249, 115, 22, 0.15)";
      case "san-francisco":
        return "rgba(244, 63, 94, 0.15)";
      case "detroit":
        return "rgba(239, 68, 68, 0.15)";
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
      <Header activePage="venues" />

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
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Venues</span>
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
              color: "var(--text-primary)",
            }}
          >
            Electronic Clubs & Party Venues Directory
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
            Explore underground techno warehouses, intimate house basements, and iconic festival spaces. 
            Choose a city to explore its best dance clubs and electronic event spaces.
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
                href={`/venues/${city.id}`}
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  display: "block",
                }}
              >
                <div
                  className="card card-hover-effect"
                  style={{
                    background: getCityGradient(city.id),
                    border: `1px solid ${getCityBorderGlow(city.id)}`,
                    borderRadius: "16px",
                    padding: "24px",
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    position: "relative",
                    overflow: "hidden",
                    boxShadow: "var(--shadow-sm)",
                  }}
                >
                  {/* Content container */}
                  <div style={{ position: "relative", zIndex: 1 }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: 16,
                      }}
                    >
                      <div>
                        <h2
                          style={{
                            fontFamily: "'Poppins', sans-serif",
                            fontSize: 20,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            marginBottom: 4,
                          }}
                        >
                          {city.name}
                        </h2>
                        <span
                          style={{
                            fontSize: 12,
                            color: "var(--text-secondary)",
                            fontWeight: 500,
                          }}
                        >
                          {city.country}
                        </span>
                      </div>
                      <div
                        style={{
                          backgroundColor: getCityBorderGlow(city.id),
                          color: "var(--primary)",
                          borderRadius: "50%",
                          width: "36px",
                          height: "36px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <Building2 size={16} />
                      </div>
                    </div>

                    <p
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                        marginBottom: 20,
                      }}
                    >
                      {city.meta.description}
                    </p>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderTop: "1px solid var(--border)",
                      paddingTop: "16px",
                      marginTop: "12px",
                      position: "relative",
                      zIndex: 1,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <MapPin size={14} color="var(--primary)" />
                      {city.venueCount} {city.venueCount === 1 ? "Active Venue" : "Active Venues"}
                    </span>
                    <span
                      style={{
                        fontSize: 12,
                        color: "var(--primary)",
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      Explore <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "24px 20px",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: 12,
          marginTop: "auto",
        }}
      >
        <Link href="/" style={{ color: "var(--text-secondary)", textDecoration: "none", fontWeight: 600 }}>
          Eventure
        </Link>{" "}
        · Directory of electronic clubs and party spaces worldwide
      </footer>
    </div>
  );
}
