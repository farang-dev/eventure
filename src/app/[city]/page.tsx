import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { CITIES, CITY_META } from "@/lib/constants";
import type { MusicEvent } from "@/lib/types";
import { createSlug } from "@/lib/utils";
import HomePageClient from "../HomePageClient";

export const revalidate = 60;

export async function generateStaticParams() {
  return CITIES.map((c) => ({ city: c.id }));
}

export async function generateMetadata(props: { params: Promise<{ city: string }> }) {
  const { city } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  if (!info) return { title: "Eventure" };
  const meta = CITY_META[city] || {};
  return {
    title: `${info.name} Club Events & Nightlife | Eventure`,
    description: meta.description || `Discover club events in ${info.name}.`,
    keywords: meta.keywords || [`${info.name} events`],
    openGraph: {
      title: `${info.name} Club Events | Eventure`,
      description: meta.description || `Find the best parties in ${info.name}.`,
      url: `https://www.eventurer.online/${city}`,
    },
    alternates: {
      canonical: `https://www.eventurer.online/${city}`,
    },
  };
}

export default async function CityPage(props: { params: Promise<{ city: string }> }) {
  const { city } = await props.params;
  const info = CITIES.find((c) => c.id === city);
  if (!info) notFound();

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
        .gte("ends_at", now)
        .or("is_approved.eq.true,is_approved.is.null")
        .order("starts_at", { ascending: true })
        .limit(500);
      if (data) {
        initialEvents = data as MusicEvent[];
      }
    } catch (e) {
      console.error(`Failed to fetch events for ${city}:`, e);
    }
  }

  const eventCount = initialEvents.length;
  const cityUrl = `https://www.eventurer.online/${city}`;

  const cityLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Eventure", item: "https://www.eventurer.online" },
        { "@type": "ListItem", position: 2, name: info.name, item: cityUrl },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `${info.name} Club Events`,
      description: `Upcoming electronic music events in ${info.name}, ${info.country}.`,
      url: cityUrl,
      numberOfItems: eventCount,
      itemListElement: initialEvents.slice(0, 20).map((e, i) => ({
        "@type": "ListItem",
        position: i + 1,
        item: {
          "@type": "MusicEvent",
          name: e.title,
          url: `https://www.eventurer.online/event/${createSlug(e.title, e.city)}`,
          startDate: e.starts_at,
          location: { "@type": "Place", name: e.venue_name },
        },
      })),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(cityLd) }} />
      <HomePageClient initialEvents={initialEvents} initialCity={city} />
    </>
  );
}
