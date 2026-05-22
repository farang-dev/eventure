import { CITIES } from '@/lib/constants'
import { GENRE_META } from '@/lib/mock-data'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  const baseUrl = 'https://www.eventurer.online'
  const cities = CITIES.map((c) => c.id)
  const genreKeys = Object.keys(GENRE_META)
  const now = new Date().toISOString()

  const entries = [
    { loc: baseUrl, freq: 'daily', priority: '1.0' },
    { loc: `${baseUrl}/cities`, freq: 'daily', priority: '0.9' },
    { loc: `${baseUrl}/artists`, freq: 'daily', priority: '0.8' },
    ...cities.map((c) => ({ loc: `${baseUrl}/${c}`, freq: 'daily', priority: '0.8' })),
    ...cities.flatMap((c) =>
      genreKeys.map((g) => ({ loc: `${baseUrl}/${c}/${g}`, freq: 'weekly', priority: '0.7' }))
    ),
    ...cities.map((c) => ({ loc: `${baseUrl}/artists/${c}`, freq: 'weekly', priority: '0.6' })),
  ]

  const urls = entries
    .map(
      (e) => `  <url>
    <loc>${e.loc}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>${e.freq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
    )
    .join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml' },
  })
}
