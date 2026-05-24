import { Metadata } from "next";
import Link from "next/link";
import { permanentRedirect } from "next/navigation";
import { getEventBySlugOrId } from "@/lib/event-utils";
import { createEventUrl } from "@/lib/utils";

const fallbackImage = "https://www.eventurer.online/apple-touch-icon.svg";

export async function generateMetadata(props: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  if (!event) {
    const city = slug.split("-")[0] || "your city";
    const cityName = city.charAt(0).toUpperCase() + city.slice(1);
    return {
      title: `Club Events & DJ Gigs in ${cityName} | Eventure`,
      description: `Find club events, techno parties and DJ gigs in ${cityName}. Browse lineups, venues, dates and get tickets on Eventure.`,
      openGraph: {
        title: `Club Events & DJ Gigs in ${cityName} | Eventure`,
        description: `Find club events, techno parties and DJ gigs in ${cityName}. Browse lineups, venues, dates and get tickets on Eventure.`,
        images: [{ url: fallbackImage, width: 180, height: 180 }],
        type: "website",
      },
      twitter: {
        card: "summary_large_image",
        title: `Club Events & DJ Gigs in ${cityName} | Eventure`,
        description: `Find club events, techno parties and DJ gigs in ${cityName}. Browse lineups, venues, dates and get tickets on Eventure.`,
        images: [fallbackImage],
      },
      robots: { index: false, follow: true },
    };
  }

  const canonicalUrl = createEventUrl(event.title, event.city);

  return {
    title: `${event.title} | Eventure`,
    description: `${event.title} at ${event.venue_name} in ${event.city}. Get tickets on Eventure.`,
    robots: { index: false, follow: true },
    alternates: {
      canonical: `https://www.eventurer.online${canonicalUrl}`,
    },
  };
}

export default async function OldEventPage(props: { params: Promise<{ slug: string }> }) {
  const { slug } = await props.params;
  const event = await getEventBySlugOrId(slug);

  if (!event) {
    const city = slug.split("-")[0] || "your city";
    const cityName = city.charAt(0).toUpperCase() + city.slice(1);
    return (
      <div style={{ padding: 40, textAlign: 'center', background: '#0D1117', color: 'white', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: 64, marginBottom: 20 }}>🔍</div>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 12 }}>Event Not Found</h2>
        <p style={{ color: '#848D97', marginBottom: 24 }}>
          Looking for events in <strong>{cityName}</strong>?
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Link href={`/events/${city.toLowerCase()}`} style={{ padding: '12px 24px', background: '#E63946', color: 'white', borderRadius: 12, textDecoration: 'none', fontWeight: 700 }}>
            Browse Events in {cityName}
          </Link>
          <Link href="/" style={{ padding: '12px 24px', background: 'var(--bg-elevated)', color: 'var(--text-primary)', borderRadius: 12, textDecoration: 'none', fontWeight: 600, border: '1px solid var(--border)' }}>
            Back to Map
          </Link>
        </div>
      </div>
    );
  }

  const newUrl = createEventUrl(event.title, event.city);
  permanentRedirect(newUrl);
}
