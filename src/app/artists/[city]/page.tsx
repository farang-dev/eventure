import { CITIES } from "@/lib/constants";
import CityArtistsClient from "./CityArtistsClient";

interface PageProps {
  params: Promise<{ city: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { city } = await params;
  const cityMeta = CITIES.find((c) => c.id === city.toLowerCase());
  const name = cityMeta ? cityMeta.name : city;

  const canonicalUrl = `https://www.eventurer.online/artists/${city.toLowerCase()}`;

  return {
    title: `Best DJs, Underground Artists & Live Sets in ${name} | Eventure`,
    description: `Discover local resident DJs, touring electronic artists and underground music selectors based in ${name}. Watch live HÖR and Boiler Room sets, and view upcoming gigs on Eventure.`,
    alternates: {
      canonical: canonicalUrl,
    },
  };
}

export default async function CityArtistsPage({ params }: PageProps) {
  const { city } = await params;
  return <CityArtistsClient initialArtist={null} />;
}
