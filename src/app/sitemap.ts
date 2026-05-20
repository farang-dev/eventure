import { MetadataRoute } from 'next'
 
import { createClient } from '@supabase/supabase-js'
import { createSlug } from '@/lib/utils'
import { CITIES } from '@/lib/constants'
import { GENRE_META } from '@/lib/mock-data'

// Force dynamic generation to ensure sitemap is always up-to-date with Supabase
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.eventurer.online'
  const cities = CITIES.map((c) => c.id)
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  
  if (!supabaseUrl || !supabaseKey) return [];

  const supabase = createClient(supabaseUrl, supabaseKey)

  const cityUrls = cities.map((city) => ({
    url: `${baseUrl}/${city}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  const genreKeys = Object.keys(GENRE_META)
  const genreUrls = cities.flatMap((city) =>
    genreKeys.map((genre) => ({
      url: `${baseUrl}/${city}/${genre}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  )

  // Fetch all events for dynamic sitemap
  let eventUrls: any[] = []
  try {
    const seenUrls = new Set<string>();
    const uniqueEvents: any[] = [];
    
    let hasMore = true;
    let offset = 0;
    const limit = 1000; // Supabase default max_rows limit is 1000
    
    while (hasMore) {
      const { data: events, error } = await supabase
        .from('music_events')
        .select('title, city, updated_at, starts_at')
        .order('starts_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) {
        console.error("Sitemap error:", error);
        break;
      }

      if (!events || events.length === 0) {
        hasMore = false;
        break;
      }

      for (const e of events) {
        const slug = createSlug(e.title, e.city);
        const url = `${baseUrl}/event/${slug}`;
        if (!seenUrls.has(url)) {
          seenUrls.add(url);
          uniqueEvents.push({
            url,
            lastModified: new Date(e.updated_at || new Date()),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          });
        }
      }

      offset += limit;

      // Safety limit: Google allows up to 50,000 URLs per sitemap
      if (offset >= 45000) {
        break;
      }
    }
    
    eventUrls = uniqueEvents;
  } catch (err) {
    console.error("Sitemap error:", err)
  }

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/cities`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...cityUrls,
    ...genreUrls,
    ...eventUrls
  ]
}
