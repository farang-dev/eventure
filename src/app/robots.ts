import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: [
          'GPTBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-Web',
          'CCBot',
          'Anthropic-AI',
          'cohere-ai',
          'Google-Extended',
          'FacebookBot',
          'Omgilibot',
          'Bytespider',
          'Amazonbot',
          'YandexBot',
          'Baiduspider',
          'PetalBot',
          'Sogou web spider'
        ],
        disallow: '/',
      },
      {
        userAgent: '*',
        allow: '/',
        disallow: '/api/',
      }
    ],
    sitemap: 'https://www.eventurer.online/sitemap.xml',
  }
}
