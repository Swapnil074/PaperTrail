import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/notes — all notes across all articles, joined with article title/url
export async function GET(req: NextRequest) {
  const db = createServerClient()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')

  let query = db
    .from('notes')
    .select(`
      id,
      article_id,
      content,
      created_at,
      updated_at,
      articles (
        id,
        title,
        url,
        site_name
      )
    `)
    .order('created_at', { ascending: false })

  if (q) query = query.ilike('content', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ notes: data })
}
