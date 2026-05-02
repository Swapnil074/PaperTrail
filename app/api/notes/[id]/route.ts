import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  let body: { content: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 })
  }

  const { data, error } = await db
    .from('notes')
    .update({ content: body.content.trim() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ note: data })
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params
  const db = createServerClient()

  const { error } = await db.from('notes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
