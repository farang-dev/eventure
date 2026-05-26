import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CITIES } from "@/lib/constants";
import CityVenuesClient from "./CityVenuesClient";

export const revalidate = 60;

export async function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.id }));
}

export function createVenueSlug(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function generateMetadata(props: { params: Promise<{ city: string }> }) {
  const { city } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  if (!info) return { title: "Venues | Eventure" };

  return {
    title: `Best Electronic Music Clubs & Party Venues in ${info.name} | Eventure`,
    description: `Discover the top underground techno clubs, house party venues, and electronic music spaces in ${info.name}. Map, addresses, and complete schedules.`,
    alternates: {
      canonical: `https://www.eventurer.online/venues/${city}`,
    },
    openGraph: {
      title: `Best Electronic Music Clubs & Party Venues in ${info.name} | Eventure`,
      description: `Explore the absolute best underground party spots, clubs, and music venues in ${info.name} with live schedules.`,
      url: `https://www.eventurer.online/venues/${city}`,
    },
  };
}

export default async function CityVenuesPage(props: { params: Promise<{ city: string }> }) {
  const { city } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  if (!info) notFound();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const venueMap: Record<string, {
    name: string;
    slug: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    eventCount: number;
  }> = {};

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const now = new Date().toISOString();
      
      const { data } = await supabase
        .from("music_events")
        .select("venue_name, venue_address, lat, lng, ends_at")
        .eq("city", city)
        .or("is_approved.eq.true,is_approved.is.null");
      
      if (data) {
        data.forEach((row) => {
          if (!row.venue_name) return;
          const vName = row.venue_name;
          const vSlug = createVenueSlug(vName);
          const isUpcoming = row.ends_at && new Date(row.ends_at) >= new Date();

          if (!venueMap[vSlug]) {
            venueMap[vSlug] = {
              name: vName,
              slug: vSlug,
              address: row.venue_address || "Address unavailable",
              latitude: row.lat || null,
              longitude: row.lng || null,
              eventCount: 0,
            };
          }

          if (isUpcoming) {
            venueMap[vSlug].eventCount += 1;
          }
        });
      }
    } catch (e) {
      console.error(`Failed to fetch venues for ${city}:`, e);
    }
  }

  const venues = Object.values(venueMap).sort((a, b) => b.eventCount - a.eventCount);

  return <CityVenuesClient cityInfo={info} venues={venues} />;
}
