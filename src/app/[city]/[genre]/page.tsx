import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CITIES } from "@/lib/constants";
import { GENRE_META } from "@/lib/mock-data";
import type { MusicEvent } from "@/lib/types";
import { createSlug } from "@/lib/utils";
import HomePageClient from "../../HomePageClient";

export const revalidate = 60;

const GENRE_KEYS = Object.keys(GENRE_META);

export async function generateStaticParams() {
  const params: { city: string; genre: string }[] = [];
  for (const city of CITIES) {
    for (const genre of GENRE_KEYS) {
      params.push({ city: city.id, genre });
    }
  }
  return params;
}

export async function generateMetadata(props: { params: Promise<{ city: string; genre: string }> }) {
  const { city, genre } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  const meta = GENRE_META[genre];
  if (!info || !meta) return { title: "Eventure" };
  return {
    title: `${meta.label} Events in ${info.name} | Eventure`,
    description: `Find the best ${meta.label.toLowerCase()} nights, parties & club events in ${info.name}, ${info.country}. Live map with real-time schedules and ticket links.`,
    alternates: {
      canonical: `https://www.eventurer.online/${city}/${genre}`,
    },
    openGraph: {
      title: `${meta.label} Events in ${info.name} | Eventure`,
      description: `Find ${meta.label.toLowerCase()} parties in ${info.name} on a live map.`,
    },
  };
}

export default async function CityGenrePage(props: { params: Promise<{ city: string; genre: string }> }) {
  const { city, genre } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  const meta = GENRE_META[genre];
  if (!info || !meta) notFound();

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
        .eq("city", city)
        .eq("genre", genre)
        .gte("ends_at", now)
        .or("is_approved.eq.true,is_approved.is.null")
        .order("starts_at", { ascending: true })
        .limit(500);
      if (data) {
        initialEvents = data as MusicEvent[];
      }
    } catch (e) {
      console.error(`Failed to fetch events for ${city}/${genre}:`, e);
    }
  }

  const eventLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Eventure", item: "https://www.eventurer.online" },
      { "@type": "ListItem", position: 2, name: info.name, item: `https://www.eventurer.online/${city}` },
      { "@type": "ListItem", position: 3, name: `${meta.label} Events`, item: `https://www.eventurer.online/${city}/${genre}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(eventLd) }} />
      <HomePageClient initialEvents={initialEvents} initialCity={city} initialGenre={genre} />
    </>
  );
}
