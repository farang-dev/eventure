import { MetadataRoute } from 'next'

import { createClient } from '@supabase/supabase-js'
import { createEventUrl } from '@/lib/utils'
import { CITIES } from '@/lib/constants'
import { GENRE_META } from '@/lib/mock-data'

export const revalidate = 86400

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
  const cityIds = CITIES.map((c) => c.id)
  const genreKeys = Object.keys(GENRE_META)

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  let supabase: any = null
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey)
  }

  const now = new Date()

  // Static pages — always included even if Supabase is unavailable
  const staticUrls: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: `${baseUrl}/events/cities`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/artists`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: `${baseUrl}/venues`, lastModified: now, changeFrequency: 'daily', priority: 0.8 },
  ]

  // City-level event pages (highest priority — these must always be indexed)
  const cityEventUrls: MetadataRoute.Sitemap = cityIds.map((city) => ({
    url: `${baseUrl}/events/${city}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 1,
  }))

  // City artist directory pages
  const artistCityUrls: MetadataRoute.Sitemap = cityIds.map((city) => ({
    url: `${baseUrl}/artists/${city}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  // City venue pages
  const venueCityUrls: MetadataRoute.Sitemap = cityIds.map((city) => ({
    url: `${baseUrl}/venues/${city}`,
    lastModified: now,
    changeFrequency: 'daily',
    priority: 0.9,
  }))

  // City + genre filter pages
  const genrePageUrls: MetadataRoute.Sitemap = cityIds.flatMap((city) =>
    genreKeys.map((genre) => ({
      url: `${baseUrl}/${city}/${genre}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.7,
    }))
  )

  let eventUrls: any[] = []
  let artistPairs = new Set<string>()
  let venueNames = new Map<string, Set<string>>()

  if (supabase) {
    try {
      const seenEventUrls = new Set<string>()
      const uniqueEvents: any[] = []

      let hasMore = true
      let offset = 0
      const limit = 1000

      while (hasMore) {
        const { data: events, error } = await supabase
          .from('music_events')
          .select('title, city, artists, venue_name, updated_at, starts_at')
          .or('is_approved.eq.true,is_approved.is.null')
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
          const url = `${baseUrl}${createEventUrl(e.title, e.city)}`
          if (!seenEventUrls.has(url)) {
            seenEventUrls.add(url)
            uniqueEvents.push({
              url,
              lastModified: new Date(e.updated_at || now),
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

          if (eventCity && e.venue_name) {
            const v = e.venue_name.trim()
            if (v && v.toLowerCase() !== 'tba') {
              if (!venueNames.has(eventCity)) venueNames.set(eventCity, new Set())
              venueNames.get(eventCity)!.add(v)
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
  }

  const artistUrls: any[] = []
  for (const pair of artistPairs) {
    const [city, name] = pair.split('::')
    const slug = encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))
    artistUrls.push({
      url: `${baseUrl}/artists/${city}/${slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })
  }

  const venueDetailUrls: any[] = []
  for (const [city, venues] of venueNames) {
    for (const venueName of venues) {
      const slug = encodeURIComponent(venueName.toLowerCase().replace(/\s+/g, '-'))
      venueDetailUrls.push({
        url: `${baseUrl}/venues/${city}/${slug}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.5,
      })
    }
  }

  return [
    ...staticUrls,
    ...cityEventUrls,
    ...artistCityUrls,
    ...venueCityUrls,
    ...genrePageUrls,
    ...eventUrls,
    ...artistUrls,
    ...venueDetailUrls,
  ]
}
