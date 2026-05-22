import { MetadataRoute } from 'next'

import { createClient } from '@supabase/supabase-js'
import { createSlug } from '@/lib/utils'
import { CITIES } from '@/lib/constants'
import { GENRE_META } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

function parseArtistNames(rawArtists: unknown): string[] {
  const names = new Set<string>()
  if (!rawArtists) return []
  const list = Array.isArray(rawArtists) ? rawArtists : [String(rawArtists)]
  for (const entry of list) {
    if (!entry) continue
    for (const part of String(entry).split(/[,;&]|\s+vs\.?\s+|\s+and\s+/i)) {
      const clean = part.replace(/[{}""'\[\]]/g, '').trim()
      if (clean && clean.toLowerCase() !== 'tba') {
        names.add(clean)
      }
    }
  }
  return Array.from(names)
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.eventurer.online'
  const cities = CITIES.map((c) => c.id)
  const genreKeys = Object.keys(GENRE_META)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseKey) return []

  const supabase = createClient(supabaseUrl, supabaseKey)

  let eventUrls: any[] = []
  let artistPairs = new Set<string>()
  try {
    const seenEventUrls = new Set<string>()
    const uniqueEvents: any[] = []

    let hasMore = true
    let offset = 0
    const limit = 1000

    while (hasMore) {
      const { data: events, error } = await supabase
        .from('music_events')
        .select('title, city, artists, updated_at, starts_at')
        .order('starts_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (error) {
        console.error('Sitemap error:', error)
        break
      }

      if (!events || events.length === 0) {
        hasMore = false
        break
      }

      for (const e of events) {
        const slug = createSlug(e.title, e.city)
        const url = `${baseUrl}/event/${slug}`
        if (!seenEventUrls.has(url)) {
          seenEventUrls.add(url)
          uniqueEvents.push({
            url,
            lastModified: new Date(e.updated_at || new Date()),
            changeFrequency: 'weekly' as const,
            priority: 0.6,
          })
        }

        const eventCity = (e.city || '').toLowerCase().trim()
        if (eventCity) {
          for (const name of parseArtistNames(e.artists)) {
            artistPairs.add(`${eventCity}::${name}`)
          }
        }
      }

      offset += limit

      if (offset >= 45000) break
    }

    eventUrls = uniqueEvents
  } catch (err) {
    console.error('Sitemap error:', err)
  }

  const artistCityUrls = new Set<string>()
  const artistUrls: any[] = []
  for (const pair of artistPairs) {
    const [city, name] = pair.split('::')
    artistCityUrls.add(city)
    const slug = encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))
    artistUrls.push({
      url: `${baseUrl}/artists/${city}/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })
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
    {
      url: `${baseUrl}/artists`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
    ...Array.from(artistCityUrls).map((city) => ({
      url: `${baseUrl}/artists/${city}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...cities.map((city) => ({
      url: `${baseUrl}/${city}`,
      lastModified: new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...cities.flatMap((city) =>
      genreKeys.map((genre) => ({
        url: `${baseUrl}/${city}/${genre}`,
        lastModified: new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    ),
    ...eventUrls,
    ...artistUrls,
  ]
}
