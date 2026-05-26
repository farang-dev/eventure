import { createClient } from "@supabase/supabase-js";
import { CITIES, CITY_META } from "@/lib/constants";
import VenuesClient from "./VenuesClient";

export const revalidate = 60;

export async function generateMetadata() {
  return {
    title: "Explore Electronic Music Clubs & Underground Venues | Eventure",
    description:
      "Browse the best party venues, electronic clubs, techno basements, and concert halls worldwide. Find venue addresses, maps, and schedules.",
    keywords: [
      "electronic music clubs",
      "best clubs in the world",
      "techno venues",
      "house music clubs",
      "womb tokyo",
      "berlin clubs list",
    ],
    alternates: {
      canonical: "https://www.eventurer.online/venues",
    },
    openGraph: {
      title: "Explore Electronic Music Clubs & Party Venues | Eventure",
      description: "Discover underground music clubs, warehouses, and electronic event spaces on live interactive maps.",
      url: "https://www.eventurer.online/venues",
    },
  };
}

export default async function VenuesPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const venueSets: Record<string, Set<string>> = {};
  CITIES.forEach((c) => {
    venueSets[c.id] = new Set();
  });

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      
      // Fetch city and venue_name for all events to count unique venues per city
      const { data } = await supabase
        .from("music_events")
        .select("city, venue_name");
      
      if (data) {
        data.forEach((row: { city: string; venue_name: string }) => {
          const cityId = (row.city || "").toLowerCase();
          if (venueSets[cityId] && row.venue_name) {
            venueSets[cityId].add(row.venue_name);
          }
        });
      }
    } catch (e) {
      console.error("Failed to fetch venue counts:", e);
    }
  }

  const citiesWithVenueCounts = CITIES.map((city) => ({
    ...city,
    venueCount: venueSets[city.id] ? venueSets[city.id].size : 0,
    meta: CITY_META[city.id] || {
      description: `Discover club nights, techno parties, and live music in ${city.name}.`,
      keywords: [],
    },
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Electronic Music Venues and Clubs Guide",
    "description": "Directory of global cities with lists of active music venues and clubs.",
    "url": "https://www.eventurer.online/venues",
    "numberOfItems": citiesWithVenueCounts.length,
    "itemListElement": citiesWithVenueCounts.map((city, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "Guide",
        "name": `${city.name} Clubs and Venues`,
        "url": `https://www.eventurer.online/venues/${city.id}`,
        "description": `Browse the top electronic music venues and dance clubs in ${city.name}.`,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <VenuesClient cities={citiesWithVenueCounts} />
    </>
  );
}
