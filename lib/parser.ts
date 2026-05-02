import { JSDOM } from 'jsdom'
import { Readability } from '@mozilla/readability'

export interface ParsedArticle {
  title: string
  content: string
  excerpt: string
  author: string | null
  site_name: string | null
  image_url: string | null
  published_at: string | null
  reading_time: number
}

export async function fetchAndParse(url: string): Promise<ParsedArticle> {
  const res = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (compatible; PaperTrailBot/1.0; +https://papertrail.app)',
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!res.ok) {
    throw new Error(`Failed to fetch: ${res.status} ${res.statusText}`)
  }

  const html = await res.text()
  const dom = new JSDOM(html, { url })
  const reader = new Readability(dom.window.document)
  const article = reader.parse()

  if (!article) {
    throw new Error('Could not parse article content')
  }

  // Extract OG image
  const ogImage =
    dom.window.document
      .querySelector('meta[property="og:image"]')
      ?.getAttribute('content') || null

  // Extract OG site name
  const ogSiteName =
    dom.window.document
      .querySelector('meta[property="og:site_name"]')
      ?.getAttribute('content') || null

  // Extract published date
  const publishedAt =
    dom.window.document
      .querySelector('meta[property="article:published_time"]')
      ?.getAttribute('content') ||
    dom.window.document
      .querySelector('time[datetime]')
      ?.getAttribute('datetime') ||
    null

  const wordCount = article.textContent?.trim().split(/\s+/).length ?? 0
  const readingTime = Math.max(1, Math.ceil(wordCount / 200))

  return {
    title: article.title || new URL(url).hostname,
    content: article.content || '',
    excerpt: article.excerpt || article.textContent?.slice(0, 280) || '',
    author: article.byline || null,
    site_name: ogSiteName || new URL(url).hostname,
    image_url: ogImage,
    published_at: publishedAt,
    reading_time: readingTime,
  }
}
