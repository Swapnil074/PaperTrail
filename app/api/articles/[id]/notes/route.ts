import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  const { data, error } = await db
    .from('notes')
    .select('*')
    .eq('article_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ notes: data })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  let body: { content: string; id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const insert: Record<string, unknown> = {
    article_id: id,
    content: body.content.trim(),
  }
  if (body.id && UUID_RE.test(body.id)) insert.id = body.id

  const query = body.id
    ? db.from('notes').upsert(insert, { onConflict: 'id' }).select().single()
    : db.from('notes').insert(insert).select().single()

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ note: data }, { status: 201 })
}
