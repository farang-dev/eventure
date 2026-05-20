import { createClient } from "@supabase/supabase-js";
import { CITIES, CITY_META } from "@/lib/constants";
import Link from "next/link";
import { Search, MapPin, ArrowRight, Sparkles } from "lucide-react";
import CitiesClient from "./CitiesClient";

export const revalidate = 60;

export async function generateMetadata() {
  return {
    title: "Explore Electronic Music Guides & Club Maps by City | Eventure",
    description:
      "Find the best club guides, techno nights, house parties, and electronic events worldwide. Click on a city to view its live interactive party map.",
    keywords: [
      "electronic music cities",
      "best techno cities",
      "clubbing cities",
      "tokyo techno",
      "berlin clubs",
      "london raves",
      "barcelona party map",
    ],
    alternates: {
      canonical: "https://www.eventurer.online/cities",
    },
    openGraph: {
      title: "Explore Electronic Music Guides by City | Eventure",
      description: "Find techno, house, and underground events on live interactive maps.",
      url: "https://www.eventurer.online/cities",
    },
  };
}

export default async function CitiesPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  const eventCounts: Record<string, number> = {};

  if (supabaseUrl && supabaseKey) {
    try {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("music_events")
        .select("city")
        .gte("ends_at", now)
        .or("is_approved.eq.true,is_approved.is.null");

      if (data) {
        data.forEach((e) => {
          if (e.city) {
            const cityId = e.city.toLowerCase();
            eventCounts[cityId] = (eventCounts[cityId] || 0) + 1;
          }
        });
      }
    } catch (e) {
      console.error("Failed to fetch event counts:", e);
    }
  }

  const citiesWithCounts = CITIES.map((city) => ({
    ...city,
    eventCount: eventCounts[city.id] || 0,
    meta: CITY_META[city.id] || {
      description: `Discover club nights, techno parties, and live music in ${city.name}.`,
      keywords: [],
    },
  }));

  // Structured Data (JSON-LD) for SEO
  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Electronic Music City Guides",
    "description": "Directory of global cities with live interactive club maps.",
    "url": "https://www.eventurer.online/cities",
    "numberOfItems": citiesWithCounts.length,
    "itemListElement": citiesWithCounts.map((city, idx) => ({
      "@type": "ListItem",
      "position": idx + 1,
      "item": {
        "@type": "Guide",
        "name": `${city.name} Club Guide`,
        "url": `https://www.eventurer.online/${city.id}`,
        "description": city.meta.description,
      },
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <CitiesClient cities={citiesWithCounts} />
    </>
  );
}
