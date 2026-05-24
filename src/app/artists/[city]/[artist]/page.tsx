import { CITIES } from "@/lib/constants";
import CityArtistsClient from "../CityArtistsClient";

interface PageProps {
  params: Promise<{ city: string; artist: string }>;
}

function formatArtistSlug(slug: string): string {
  if (!slug) return "";
  const decoded = decodeURIComponent(slug);
  return decoded
    .split("-")
    .map(word => {
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
  const canonicalUrl = `https://www.eventurer.online/artists/${city.toLowerCase()}/${encodeURIComponent(artist.toLowerCase())}`;

  return {
    title: `${artistName} Live DJ Sets & Upcoming Gig Schedule in ${cityName} | Eventure`,
    description: `Watch live video sets from ${artistName} performing in ${cityName}. Discover their HÖR sets, Boiler Room performances and get direct tickets to their upcoming gigs on Eventure.`,
    keywords: [`${artistName}`, `${artistName} ${cityName}`, `${cityName} DJ`, `${artistName} live set`, `${artistName} HÖR`, `${artistName} Boiler Room`, "electronic music", "club events"],
    robots: {
      index: true,
      follow: true,
    },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `${artistName} in ${cityName} | Eventure`,
      description: `Watch live video performances and find upcoming club gigs for ${artistName} in ${cityName}.`,
      url: canonicalUrl,
      type: "profile",
      siteName: "Eventure",
      locale: "en_US",
      images: [{ url: "https://www.eventurer.online/apple-touch-icon.svg", width: 180, height: 180 }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${artistName} in ${cityName} | Eventure`,
      description: `Watch live video performances and find upcoming club gigs for ${artistName} in ${cityName}.`,
      images: ["https://www.eventurer.online/apple-touch-icon.svg"],
    },
  };
}

export default async function ArtistDetailPage({ params }: PageProps) {
  const { artist } = await params;
  const artistName = formatArtistSlug(artist);

  return <CityArtistsClient initialArtist={artistName} />;
}
