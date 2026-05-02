import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { fetchAndParse } from '@/lib/parser'

type Params = { params: Promise<{ id: string }> }

// On-demand: fetch + parse article content
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  const { data: article, error: fetchErr } = await db
    .from('articles')
    .select('id, url, fetched_at')
    .eq('id', id)
    .single()

  if (fetchErr || !article) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const parsed = await fetchAndParse(article.url)

    const { data: updated, error } = await db
      .from('articles')
      .update({
        title: parsed.title,
        content: parsed.content,
        excerpt: parsed.excerpt,
        author: parsed.author,
        site_name: parsed.site_name,
        image_url: parsed.image_url,
        published_at: parsed.published_at,
        reading_time: parsed.reading_time,
        fetched_at: new Date().toISOString(),
        fetch_error: null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ article: updated })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to fetch'
    await db.from('articles').update({ fetch_error: msg }).eq('id', id)
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
