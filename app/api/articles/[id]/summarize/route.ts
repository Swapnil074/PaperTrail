import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { summarizeArticle } from '@/lib/ai'

type Params = { params: Promise<{ id: string }> }

// On-demand AI summarization — cached after first run
export async function POST(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  // Return cached if exists
  const { data: cached } = await db
    .from('ai_summaries')
    .select('*')
    .eq('article_id', id)
    .maybeSingle()

  if (cached) {
    return NextResponse.json({ summary: cached, cached: true })
  }

  const { data: article } = await db
    .from('articles')
    .select('title, content')
    .eq('id', id)
    .single()

  if (!article?.content) {
    return NextResponse.json(
      { error: 'Article content not available. Fetch the article first.' },
      { status: 422 }
    )
  }

  if (!process.env.AI_API_KEY) {
    return NextResponse.json({ error: 'AI not configured' }, { status: 501 })
  }

  try {
    const result = await summarizeArticle(article.title || '', article.content)

    const { data: saved, error } = await db
      .from('ai_summaries')
      .insert({
        article_id: id,
        summary: result.summary,
        key_points: result.key_points,
        insights: result.insights,
        model: result.model,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ summary: saved, cached: false })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'AI request failed'
    return NextResponse.json({ error: msg }, { status: 502 })
  }
}
