import { MetadataRoute } from 'next'

import { createClient } from '@supabase/supabase-js'

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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseKey) return []

  const supabase = createClient(supabaseUrl, supabaseKey)

  const artistPairs = new Set<string>()

  let hasMore = true
  let offset = 0
  const limit = 1000

  while (hasMore) {
    const { data: events, error } = await supabase
      .from('music_events')
      .select('city, artists')
      .order('starts_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Artists sitemap error:', error)
      break
    }

    if (!events || events.length === 0) {
      hasMore = false
      break
    }

    for (const e of events) {
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

  const artistUrls: MetadataRoute.Sitemap = []
  for (const pair of artistPairs) {
    const [city, name] = pair.split('::')
    const slug = encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))
    artistUrls.push({
      url: `${baseUrl}/artists/${city}/${slug}`,
      lastModified: new Date(),
      changeFrequency: 'weekly' as const,
      priority: 0.5,
    })
  }

  return artistUrls
}
