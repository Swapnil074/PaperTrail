import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

// GET /api/highlights — all highlights across all articles, joined with article title/url
export async function GET(req: NextRequest) {
  const db = createServerClient()
  const { searchParams } = new URL(req.url)
  const color = searchParams.get('color')
  const q = searchParams.get('q') // search within highlight text

  let query = db
    .from('highlights')
    .select(`
      id,
      article_id,
      text,
      start_offset,
      end_offset,
      color,
      note,
      created_at,
      updated_at,
      articles (
        id,
        title,
        url,
        site_name,
        image_url
      )
    `)
    .order('created_at', { ascending: false })

  if (color) query = query.eq('color', color)
  if (q) query = query.ilike('text', `%${q}%`)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ highlights: data })
}
