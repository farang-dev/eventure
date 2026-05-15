import { MetadataRoute } from 'next'
 
import { createClient } from '@supabase/supabase-js'
import { createSlug } from '@/lib/utils'

// Force dynamic generation to ensure sitemap is always up-to-date with Supabase
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.eventurer.online'
  const cities = ['tokyo', 'osaka', 'london', 'vilnius', 'belgrade', 'tbilisi']
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
  
  if (!supabaseUrl || !supabaseKey) return [];

  const supabase = createClient(supabaseUrl, supabaseKey)

  const cityUrls = cities.map((city) => ({
    url: `${baseUrl}/?city=${city}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  // Fetch all events for dynamic sitemap
  let eventUrls: any[] = []
  try {
    const { data: events } = await supabase
      .from('music_events')
      .select('title, city, updated_at, starts_at')
      .order('starts_at', { ascending: false })
      .limit(10000)
    if (events) {
      eventUrls = events.map((e) => ({
        url: `${baseUrl}/event/${createSlug(e.title, e.city)}`,
        lastModified: new Date(e.updated_at || new Date()),
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      }))
    }
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
    ...cityUrls,
    ...eventUrls
  ]
}
