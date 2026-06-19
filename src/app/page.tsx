import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import HomePageClient from "./HomePageClient";
import type { MusicEvent } from "@/lib/types";
import { CITIES } from "@/lib/constants";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Eventure — Live Interactive Map of Club Events & Parties Worldwide",
  description:
    "Discover techno, house, drum & bass and electronic music events worldwide on a live interactive map. Browse club nights, find underground parties, and explore nightlife in Tokyo, Berlin, London, New York, and 30+ cities.",
  keywords: [
    "club events", "techno parties", "house music events", "rave map",
    "electronic music", "nightlife map", "Tokyo clubs", "Berlin techno",
    "London raves", "New York parties", "live music map",
  ],
  openGraph: {
    title: "Eventure — Live Interactive Map of Club Events Worldwide",
    description:
      "Discover the best club & electronic music events happening right now in 30+ cities worldwide. Interactive live map with real-time schedules.",
    type: "website",
    siteName: "Eventure",
    locale: "en_US",
    images: [{ url: "https://www.eventurer.online/apple-touch-icon.svg", width: 180, height: 180 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Eventure — Live Interactive Map of Club Events Worldwide",
    description:
      "Discover the best club & electronic music events happening right now in 30+ cities worldwide.",
    images: ["https://www.eventurer.online/apple-touch-icon.svg"],
  },
  alternates: {
    canonical: "https://www.eventurer.online",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default async function Page() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  let initialEvents: MusicEvent[] = [];

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("music_events")
        .select("*")
        .gte("ends_at", now)
        .or("is_approved.eq.true,is_approved.is.null")
        .order("starts_at", { ascending: true })
        .limit(1000);
      if (data) {
        initialEvents = data as MusicEvent[];
      }
    } catch (e) {
      console.error("Failed to fetch initial events:", e);
    }
  }

  return (
    <>
      <HomePageClient initialEvents={initialEvents} />
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          backgroundColor: "var(--bg-secondary)",
          padding: "32px 20px",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            fontSize: 13,
            color: "var(--text-secondary)",
            lineHeight: 1.7,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 32,
              marginBottom: 24,
            }}
          >
            <div>
              <h4
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--text-primary)",
                  marginBottom: 12,
                }}
              >
                Explore Cities
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {CITIES.slice(0, 10).map((c) => (
                  <Link
                    key={c.id}
                    href={`/events/${c.id}`}
                    style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 12 }}
                  >
                    {c.name} Events
                  </Link>
                ))}
                <Link
                  href="/events/cities"
                  style={{ color: "var(--primary)", textDecoration: "none", fontSize: 12, fontWeight: 600 }}
                >
                  All Cities →
                </Link>
              </div>
            </div>
            <div>
              <h4
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--text-primary)",
                  marginBottom: 12,
                }}
              >
                Browse
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Link href="/artists" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 12 }}>
                  Artists
                </Link>
                <Link href="/venues" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 12 }}>
                  Venues
                </Link>
                <Link href="/events/cities" style={{ color: "var(--text-secondary)", textDecoration: "none", fontSize: 12 }}>
                  Cities
                </Link>
              </div>
            </div>
            <div>
              <h4
                style={{
                  fontFamily: "'Poppins', sans-serif",
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--text-primary)",
                  marginBottom: 12,
                }}
              >
                About Eventure
              </h4>
              <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                Eventure is a live interactive map of electronic music events worldwide.
                Find club nights, underground parties, and festivals in 30+ cities.
                Powered by real-time data from venues and promoters.
              </p>
            </div>
          </div>
          <div
            style={{
              borderTop: "1px solid var(--border)",
              paddingTop: 16,
              textAlign: "center",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            &copy; {new Date().getFullYear()} Eventure. All rights reserved.
          </div>
        </div>
      </footer>
    </>
  );
}
