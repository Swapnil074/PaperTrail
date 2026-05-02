import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const db = createServerClient()
  const { searchParams } = new URL(req.url)

  const status = searchParams.get('status')
  const q = searchParams.get('q')
  const tag = searchParams.get('tag')
  const favorites = searchParams.get('favorites') === 'true'
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)
  const offset = (page - 1) * limit

  let query = db
    .from('articles')
    .select('id,url,title,excerpt,author,site_name,image_url,reading_time,status,tags,is_favorite,fetch_error,created_at,updated_at', {
      count: 'exact',
    })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (status && status !== 'all') query = query.eq('status', status)
  if (favorites) query = query.eq('is_favorite', true)
  if (tag) query = query.contains('tags', [tag])
  if (q) query = query.ilike('title', `%${q}%`)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ articles: data, total: count, page, limit })
}

export async function POST(req: NextRequest) {
  const db = createServerClient()

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { url } = body
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'url is required' }, { status: 400 })
  }

  // Normalise URL
  let normalised: string
  try {
    normalised = new URL(url).toString()
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 })
  }

  // Deduplicate
  const { data: existing } = await db
    .from('articles')
    .select('id')
    .eq('url', normalised)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ error: 'Already saved', id: existing.id }, { status: 409 })
  }

  const { data, error } = await db
    .from('articles')
    .insert({ url: normalised, status: 'unread', tags: [], is_favorite: false, fetch_error: null, fetched_at: null })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ article: data }, { status: 201 })
}
