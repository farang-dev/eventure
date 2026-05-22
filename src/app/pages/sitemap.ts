import { MetadataRoute } from 'next'

import { CITIES } from '@/lib/constants'
import { GENRE_META } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://www.eventurer.online'
  const cities = CITIES.map((c) => c.id)
  const genreKeys = Object.keys(GENRE_META)
  const now = new Date()

  return [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/cities`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/artists`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 0.8,
    },
    ...cities.map((city) => ({
      url: `${baseUrl}/${city}`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    })),
    ...cities.flatMap((city) =>
      genreKeys.map((genre) => ({
        url: `${baseUrl}/${city}/${genre}`,
        lastModified: now,
        changeFrequency: 'weekly' as const,
        priority: 0.7,
      }))
    ),
    ...cities.map((city) => ({
      url: `${baseUrl}/artists/${city}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
  ]
}
