import { CITIES } from "@/lib/constants";
import CityArtistsClient from "../CityArtistsClient";

interface PageProps {
  params: Promise<{ city: string; artist: string }>;
}

// Capitalize helper to display beautiful artist names in search engine results
function formatArtistSlug(slug: string): string {
  if (!slug) return "";
  const decoded = decodeURIComponent(slug);
  
  // Convert hyphens back to spaces/points appropriately for the UI search matching
  return decoded
    .split("-")
    .map(word => {
      // Keep certain lowercase articles if any, otherwise capitalize first letter
      if (["and", "vs", "live"].includes(word.toLowerCase())) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export async function generateMetadata({ params }: PageProps) {
  const { city, artist } = await params;
  const cityMeta = CITIES.find((c) => c.id === city.toLowerCase());
  const cityName = cityMeta ? cityMeta.name : city;
  const artistName = formatArtistSlug(artist);

  return {
    title: `${artistName} Live DJ Sets & Upcoming Gig Schedule in ${cityName} | Eventure`,
    description: `Watch live video sets from ${artistName} performing in ${cityName}. Discover their HÖR sets, Boiler Room performances and get direct tickets to their upcoming gigs on Eventure.`,
    alternates: {
      canonical: `https://www.eventurer.online/artists/${city.toLowerCase()}/${encodeURIComponent(artist.toLowerCase())}`,
    },
    openGraph: {
      title: `${artistName} in ${cityName} | Eventure`,
      description: `Watch live video performances and find upcoming club gigs for ${artistName} in ${cityName}.`,
      url: `https://www.eventurer.online/artists/${city.toLowerCase()}/${encodeURIComponent(artist.toLowerCase())}`,
    }
  };
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { artist } = await params;
  const artistName = formatArtistSlug(artist);

  return <CityArtistsClient initialArtist={artistName} />;
}
