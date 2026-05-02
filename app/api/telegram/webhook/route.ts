import { after } from 'next/server'
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase'
import { sendMessage, extractUrls, isAuthorizedUser } from '@/lib/telegram'
import { fetchAndParse } from '@/lib/parser'

// Give background work (fetch + parse) up to 60s after the response is sent
export const maxDuration = 60

// Verify the request comes from Telegram
function verifySecret(req: NextRequest): boolean {
  const secret = req.headers.get('x-telegram-bot-api-secret-token')
  return secret === process.env.TELEGRAM_WEBHOOK_SECRET
}

export async function POST(req: NextRequest) {
  if (!verifySecret(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const message = body?.message
  if (!message) return NextResponse.json({ ok: true })

  const chatId = message.chat?.id
  const userId = message.from?.id
  const text: string = message.text || ''
  const messageId: number = message.message_id

  if (!isAuthorizedUser(userId)) {
    await sendMessage(chatId, '⛔ Not authorized.')
    return NextResponse.json({ ok: true })
  }

  const urls = extractUrls(text)

  if (urls.length === 0) {
    await sendMessage(
      chatId,
      '👋 <b>PaperTrail Bot</b>\n\nSend me a URL and I\'ll save it to your reading list.'
    )
    return NextResponse.json({ ok: true })
  }

  const db = createServerClient()

  // Save stubs immediately and collect article IDs for background processing
  const toFetch: { id: string; url: string }[] = []
  const quickReplies: string[] = []

  for (const url of urls) {
    const { data: existing } = await db
      .from('articles')
      .select('id, title')
      .eq('url', url)
      .maybeSingle()

    if (existing) {
      quickReplies.push(`⚠️ Already saved: <i>${existing.title || url}</i>`)
      continue
    }

    const { data: article, error } = await db
      .from('articles')
      .insert({
        url,
        status: 'unread',
        telegram_message_id: messageId,
        tags: [],
        is_favorite: false,
        fetch_error: null,
        fetched_at: null,
      })
      .select('id')
      .single()

    if (error || !article) {
      quickReplies.push(`❌ Failed to save: ${url}`)
      continue
    }

    toFetch.push({ id: article.id, url })
    quickReplies.push(`⏳ Saving: ${url}`)
  }

  // Acknowledge Telegram immediately — must respond before timeout
  await sendMessage(chatId, quickReplies.join('\n'))

  // Fetch and parse content after the response is sent
  after(async () => {
    const db2 = createServerClient()
    const updates: string[] = []

    for (const { id, url } of toFetch) {
      try {
        const parsed = await fetchAndParse(url)
        await db2
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

        updates.push(`✅ Ready: <b>${parsed.title}</b>`)
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : 'Parse failed'
        await db2.from('articles').update({ fetch_error: errMsg }).eq('id', id)
        updates.push(`⚠️ Saved but couldn't fetch content: ${url}`)
      }
    }

    if (updates.length > 0) {
      await sendMessage(chatId, updates.join('\n'))
    }
  })

  return NextResponse.json({ ok: true })
}
