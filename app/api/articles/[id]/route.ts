import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  const { data: article, error } = await db
    .from('articles')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !article) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch associated AI summary if exists
  const { data: aiSummary } = await db
    .from('ai_summaries')
    .select('*')
    .eq('article_id', id)
    .maybeSingle()

  return NextResponse.json({ article, ai_summary: aiSummary ?? null })
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const allowed = ['title', 'status', 'tags', 'is_favorite', 'author', 'excerpt']
  const update: Record<string, unknown> = {}
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 })
  }

  const { data, error } = await db
    .from('articles')
    .update(update)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ article: data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  const { error } = await db.from('articles').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
