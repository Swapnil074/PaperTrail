import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import type { CreateHighlightPayload } from '@/types'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  const { data, error } = await db
    .from('highlights')
    .select('*')
    .eq('article_id', id)
    .order('start_offset', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ highlights: data })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  let body: CreateHighlightPayload & { id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { id: clientId, text, start_offset, end_offset, color = 'yellow', note } = body

  if (!text || start_offset == null || end_offset == null) {
    return NextResponse.json(
      { error: 'text, start_offset, end_offset are required' },
      { status: 400 }
    )
  }

  // Idempotent upsert when the client supplies its own UUID — survives retries
  // from the offline mutation queue.
  const insert: Record<string, unknown> = {
    article_id: id,
    text,
    start_offset,
    end_offset,
    color,
    note: note ?? null,
  }
  if (clientId && UUID_RE.test(clientId)) insert.id = clientId

  const query = clientId
    ? db.from('highlights').upsert(insert, { onConflict: 'id' }).select().single()
    : db.from('highlights').insert(insert).select().single()

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ highlight: data }, { status: 201 })
}
