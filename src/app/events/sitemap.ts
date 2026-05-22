import { MetadataRoute } from 'next'

import { createClient } from '@supabase/supabase-js'
import { createSlug } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.eventurer.online'

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

  if (!supabaseUrl || !supabaseKey) return []

  const supabase = createClient(supabaseUrl, supabaseKey)

  const eventUrls: MetadataRoute.Sitemap = []
  const seenEventUrls = new Set<string>()

  let hasMore = true
  let offset = 0
  const limit = 1000

  while (hasMore) {
    const { data: events, error } = await supabase
      .from('music_events')
      .select('title, city, updated_at, starts_at')
      .order('starts_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Events sitemap error:', error)
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
        eventUrls.push({
          url,
          lastModified: new Date(e.updated_at || new Date()),
          changeFrequency: 'weekly' as const,
          priority: 0.6,
        })
      }
    }

    offset += limit

    if (offset >= 45000) break
  }

  return eventUrls
}
