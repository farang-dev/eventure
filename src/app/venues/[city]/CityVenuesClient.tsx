"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Search, MapPin, ArrowRight, Building2, SlidersHorizontal, Map as MapIcon, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";

interface VenueInfo {
  name: string;
  slug: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  eventCount: number;
}

interface CityInfo {
  id: string;
  name: string;
  country: string;
}

interface CityVenuesClientProps {
  cityInfo: CityInfo;
  venues: VenueInfo[];
}

export default function CityVenuesClient({ cityInfo, venues }: CityVenuesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"events" | "name">("events");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  // Filter
  const filteredVenues = venues
    .filter((v) => {
      const matchesSearch =
        v.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.address.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (filterActiveOnly) {
        return matchesSearch && v.eventCount > 0;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name);
      }
      return b.eventCount - a.eventCount;
    });

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
          <Link href="/venues" style={{ color: "var(--text-secondary)", textDecoration: "none" }}>
            Venues
          </Link>
          <span>/</span>
          <span style={{ color: "var(--text-primary)", fontWeight: 500 }}>{cityInfo.name}</span>
        </nav>

        {/* Back Button */}
        <Link
          href="/venues"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            fontSize: 13,
            color: "var(--text-secondary)",
            textDecoration: "none",
            marginBottom: 24,
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={14} /> Back to cities
        </Link>

        {/* Header Section */}
        <section style={{ marginBottom: 40 }}>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--primary)",
              marginBottom: 8,
              display: "block",
            }}
          >
            {cityInfo.country}
          </span>
          <h1
            style={{
              fontSize: "clamp(28px, 4vw, 38px)",
              fontFamily: "'Poppins', sans-serif",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: 12,
              color: "var(--text-primary)",
            }}
          >
            Clubs & Dance Venues in {cityInfo.name}
          </h1>
          <p
            style={{
              maxWidth: 720,
              color: "var(--text-secondary)",
              fontSize: 15,
              lineHeight: "1.6",
            }}
          >
            Browse the top electronic music venues in {cityInfo.name}. Filter by active events, search club listings, 
            and see what parties are coming up next.
          </p>
        </section>

        {/* Controls Bar */}
        <section
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 32,
            borderBottom: "1px solid var(--border)",
            paddingBottom: "24px",
          }}
        >
          {/* Search */}
          <div
            style={{
              flex: "1 1 300px",
              maxWidth: 400,
              display: "flex",
              alignItems: "center",
              gap: 10,
              backgroundColor: "var(--bg-secondary)",
              border: "1px solid var(--border)",
              borderRadius: "10px",
              padding: "10px 14px",
            }}
          >
            <Search size={16} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
            <input
              type="text"
              placeholder={`Search clubs in ${cityInfo.name}...`}
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

          {/* Filters & Sorting */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <SlidersHorizontal size={14} color="var(--text-muted)" />
            
            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as "events" | "name")}
              style={{
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                padding: "8px 12px",
                borderRadius: "8px",
                fontSize: 13,
                fontWeight: 600,
                outline: "none",
              }}
            >
              <option value="events">Sort by: Events Count</option>
              <option value="name">Sort by: Name (A-Z)</option>
            </select>

            {/* Active only checkbox */}
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: "8px",
                border: "1px solid var(--border)",
                backgroundColor: filterActiveOnly ? "rgba(124,58,237,0.06)" : "var(--bg-secondary)",
                color: filterActiveOnly ? "var(--primary)" : "var(--text-secondary)",
              }}
            >
              <input
                type="checkbox"
                checked={filterActiveOnly}
                onChange={() => setFilterActiveOnly(!filterActiveOnly)}
                style={{ cursor: "pointer" }}
              />
              Has upcoming events
            </label>
          </div>
        </section>

        {/* Venues Grid */}
        <section style={{ marginBottom: 60 }}>
          {filteredVenues.length > 0 ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 20,
              }}
            >
              {filteredVenues.map((venue) => (
                <Link
                  key={venue.slug}
                  href={`/venues/${cityInfo.id}/${venue.slug}`}
                  style={{
                    textDecoration: "none",
                    color: "inherit",
                    display: "block",
                  }}
                >
                  <div
                    className="card-hover-effect"
                    style={{
                      backgroundColor: "var(--bg-elevated)",
                      border: "1px solid var(--border)",
                      borderRadius: "14px",
                      padding: "20px",
                      height: "100%",
                      display: "flex",
                      flexDirection: "column",
                      justifyContent: "space-between",
                      boxShadow: "var(--shadow-sm)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 8,
                        }}
                      >
                        <h3
                          style={{
                            fontFamily: "'Poppins', sans-serif",
                            fontSize: 18,
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            lineHeight: 1.3,
                          }}
                        >
                          {venue.name}
                        </h3>
                        <div
                          style={{
                            backgroundColor: venue.eventCount > 0 ? "rgba(16, 185, 129, 0.08)" : "var(--bg-secondary)",
                            border: `1px solid ${venue.eventCount > 0 ? "rgba(16, 185, 129, 0.2)" : "var(--border)"}`,
                            color: venue.eventCount > 0 ? "#10B981" : "var(--text-muted)",
                            fontSize: 10,
                            fontWeight: 700,
                            padding: "3px 8px",
                            borderRadius: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          {venue.eventCount > 0 ? "Active" : "Inactive"}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 6,
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          lineHeight: 1.5,
                          marginBottom: 16,
                        }}
                      >
                        <MapPin size={13} style={{ flexShrink: 0, marginTop: 2, color: "var(--text-muted)" }} />
                        <span>{venue.address}</span>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        borderTop: "1px solid var(--border)",
                        paddingTop: "14px",
                        marginTop: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          color: "var(--text-muted)",
                          fontWeight: 500,
                        }}
                      >
                        {venue.eventCount} upcoming {venue.eventCount === 1 ? "event" : "events"}
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
                        View line-up <ArrowRight size={13} />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                backgroundColor: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                borderRadius: "14px",
                color: "var(--text-secondary)",
              }}
            >
              <Building2 size={36} style={{ color: "var(--text-muted)", marginBottom: 12 }} />
              <h3 style={{ fontFamily: "'Poppins', sans-serif', font-weight: 700", marginBottom: 6 }}>No venues found</h3>
              <p style={{ fontSize: 13 }}>Try adjusting your search filters or check another city.</p>
            </div>
          )}
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
        · Music venues directory for {cityInfo.name}
      </footer>
    </div>
  );
}
