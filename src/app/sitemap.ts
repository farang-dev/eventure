import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://eventure-cyan.vercel.app'
  const cities = ['tokyo', 'osaka', 'london', 'vilnius', 'belgrade', 'tbilisi']
  
  const cityUrls = cities.map((city) => ({
    url: `${baseUrl}/?city=${city}`,
    lastModified: new Date(),
    changeFrequency: 'daily' as const,
    priority: 0.8,
  }))

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    ...cityUrls
  ]
}
