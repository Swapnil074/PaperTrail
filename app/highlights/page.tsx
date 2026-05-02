'use client'

import { useState, useDeferredValue } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import {
  ArrowLeft,
  Search,
  ExternalLink,
  MessageSquare,
  BookOpen,
  StickyNote,
  Highlighter,
} from 'lucide-react'
import { cn, getDomain, formatRelativeDate, HIGHLIGHT_COLOR_HEX } from '@/lib/utils'
import { Spinner } from '@/components/ui/Spinner'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { HighlightColor } from '@/types'

interface HighlightWithArticle {
  id: string
  article_id: string
  text: string
  start_offset: number
  end_offset: number
  color: HighlightColor
  note: string | null
  created_at: string
  updated_at: string
  articles: {
    id: string
    title: string | null
    url: string
    site_name: string | null
    image_url: string | null
  } | null
}

interface NoteWithArticle {
  id: string
  article_id: string
  content: string
  created_at: string
  updated_at: string
  articles: {
    id: string
    title: string | null
    url: string
    site_name: string | null
  } | null
}

type Tab = 'highlights' | 'notes'

const COLORS: { key: HighlightColor | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'yellow', label: 'Yellow' },
  { key: 'green', label: 'Green' },
  { key: 'blue', label: 'Blue' },
  { key: 'pink', label: 'Pink' },
  { key: 'purple', label: 'Purple' },
]

const fetcher = (url: string) => fetch(url).then((r) => r.json())

export default function HighlightsPage() {
  const [tab, setTab] = useState<Tab>('highlights')
  const [colorFilter, setColorFilter] = useState<HighlightColor | 'all'>('all')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)

  const hlParams = new URLSearchParams()
  if (colorFilter !== 'all') hlParams.set('color', colorFilter)
  if (deferredSearch) hlParams.set('q', deferredSearch)

  const noteParams = new URLSearchParams()
  if (deferredSearch) noteParams.set('q', deferredSearch)

  const { data: hlData, isLoading: hlLoading } = useSWR<{ highlights: HighlightWithArticle[] }>(
    `/api/highlights?${hlParams.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const { data: noteData, isLoading: noteLoading } = useSWR<{ notes: NoteWithArticle[] }>(
    `/api/notes?${noteParams.toString()}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const highlights = hlData?.highlights ?? []
  const notes = noteData?.notes ?? []

  const groupedHighlights = highlights.reduce<Record<string, HighlightWithArticle[]>>((acc, h) => {
    if (!acc[h.article_id]) acc[h.article_id] = []
    acc[h.article_id].push(h)
    return acc
  }, {})

  const groupedNotes = notes.reduce<Record<string, NoteWithArticle[]>>((acc, n) => {
    if (!acc[n.article_id]) acc[n.article_id] = []
    acc[n.article_id].push(n)
    return acc
  }, {})

  const isLoading = tab === 'highlights' ? hlLoading : noteLoading

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <div className="flex items-center gap-2 sm:gap-3 py-3">
            <Link href="/" aria-label="Back to library">
              <button className="flex items-center justify-center h-8 w-8 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </button>
            </Link>
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <BookOpen className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
              <h1 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50 truncate">Library</h1>
            </div>
            <span className="hidden sm:inline text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
              {tab === 'highlights' ? `${highlights.length} highlights` : `${notes.length} notes`}
            </span>
            <ThemeToggle />
          </div>

          {/* Tabs */}
          <div className="flex border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setTab('highlights')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                tab === 'highlights'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
              )}
            >
              <Highlighter className="h-3.5 w-3.5" />
              Highlights
              {highlights.length > 0 && (
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {highlights.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('notes')}
              className={cn(
                'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors',
                tab === 'notes'
                  ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50'
                  : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
              )}
            >
              <StickyNote className="h-3.5 w-3.5" />
              Notes
              {notes.length > 0 && (
                <span className="rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                  {notes.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5 sm:px-6 sm:py-6">
        {/* Search */}
        <div className="mb-5 flex flex-col gap-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={tab === 'highlights' ? 'Search highlights…' : 'Search notes…'}
              inputMode="search"
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-100 transition dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
            />
          </div>

          {tab === 'highlights' && (
            <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
              {COLORS.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setColorFilter(key)}
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap',
                    colorFilter === key
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                      : 'bg-white border border-zinc-200 text-zinc-600 hover:border-zinc-300 dark:bg-zinc-900 dark:border-zinc-800 dark:text-zinc-300 dark:hover:border-zinc-700'
                  )}
                >
                  {key !== 'all' && (
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: HIGHLIGHT_COLOR_HEX[key as HighlightColor] }}
                    />
                  )}
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner className="h-6 w-6" />
          </div>
        ) : tab === 'highlights' ? (
          highlights.length === 0 ? (
            <EmptyState
              icon={<Highlighter className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />}
              title="No highlights yet"
              description="Open any article and select text to create your first highlight."
            />
          ) : (
            <div className="flex flex-col gap-6 sm:gap-8">
              {Object.entries(groupedHighlights).map(([articleId, items]) => {
                const article = items[0].articles
                if (!article) return null
                return (
                  <ArticleSection
                    key={articleId}
                    articleId={articleId}
                    title={article.title || getDomain(article.url)}
                    siteName={article.site_name}
                    url={article.url}
                    count={items.length}
                    countLabel="highlight"
                  >
                    {items.map((h) => (
                      <HighlightCard key={h.id} highlight={h} articleId={articleId} />
                    ))}
                  </ArticleSection>
                )
              })}
            </div>
          )
        ) : (
          notes.length === 0 ? (
            <EmptyState
              icon={<StickyNote className="h-8 w-8 text-zinc-300 dark:text-zinc-600" />}
              title="No notes yet"
              description="Open any article and use the Notes panel to write your first note."
            />
          ) : (
            <div className="flex flex-col gap-6 sm:gap-8">
              {Object.entries(groupedNotes).map(([articleId, items]) => {
                const article = items[0].articles
                if (!article) return null
                return (
                  <ArticleSection
                    key={articleId}
                    articleId={articleId}
                    title={article.title || getDomain(article.url)}
                    siteName={article.site_name}
                    url={article.url}
                    count={items.length}
                    countLabel="note"
                  >
                    {items.map((n) => (
                      <NoteCard key={n.id} note={n} articleId={articleId} />
                    ))}
                  </ArticleSection>
                )
              })}
            </div>
          )
        )}
      </main>
    </div>
  )
}

function ArticleSection({
  articleId,
  title,
  siteName,
  url,
  count,
  countLabel,
  children,
}: {
  articleId: string
  title: string
  siteName: string | null | undefined
  url: string
  count: number
  countLabel: string
  children: React.ReactNode
}) {
  return (
    <section>
      <div className="mb-3 flex items-start justify-between gap-3">
        <Link href={`/article/${articleId}`} className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300 truncate transition-colors">
            {title}
          </h2>
          {siteName && (
            <p className="mt-0.5 text-xs text-zinc-400 dark:text-zinc-500 truncate">{siteName}</p>
          )}
        </Link>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs text-zinc-400 dark:text-zinc-500 whitespace-nowrap">
            {count} {countLabel}{count !== 1 ? 's' : ''}
          </span>
          <a href={url} target="_blank" rel="noopener noreferrer" aria-label="Open original">
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors" />
          </a>
        </div>
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  )
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode
  title: string
  description: string
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-zinc-700 dark:text-zinc-200 mb-1">{title}</h3>
      <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-xs px-4">{description}</p>
    </div>
  )
}

function HighlightCard({
  highlight,
  articleId,
}: {
  highlight: HighlightWithArticle
  articleId: string
}) {
  const colorHex = HIGHLIGHT_COLOR_HEX[highlight.color] ?? HIGHLIGHT_COLOR_HEX.yellow

  return (
    <Link href={`/article/${articleId}`}>
      <div className="group rounded-xl border border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 transition-all overflow-hidden">
        <div
          className="px-4 py-3 text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed wrap-break-word"
          style={{ borderLeft: `3px solid ${colorHex}`, background: `${colorHex}18` }}
        >
          <span style={{ background: colorHex, color: '#18181b', borderRadius: '2px', padding: '0 2px' }}>
            {highlight.text}
          </span>
        </div>

        {highlight.note && (
          <div className="flex items-start gap-2.5 border-t border-zinc-50 dark:border-zinc-800 px-4 py-2.5">
            <div className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xs font-bold">
              S
            </div>
            <p className="text-xs text-zinc-600 dark:text-zinc-300 leading-relaxed wrap-break-word">{highlight.note}</p>
          </div>
        )}

        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-50 dark:border-zinc-800">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{formatRelativeDate(highlight.created_at)}</span>
          {highlight.note ? (
            <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500">
              <MessageSquare className="h-3 w-3" />
              Note
            </span>
          ) : (
            <span className="text-xs text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 transition-colors">
              Click to read
            </span>
          )}
        </div>
      </div>
    </Link>
  )
}

function NoteCard({
  note,
  articleId,
}: {
  note: NoteWithArticle
  articleId: string
}) {
  return (
    <Link href={`/article/${articleId}#notes`}>
      <div className="group rounded-xl border border-zinc-100 bg-white hover:border-zinc-200 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 transition-all overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-3.5">
          <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 text-xs font-bold">
            S
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-zinc-800 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap wrap-break-word">
              {note.content}
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2 border-t border-zinc-50 dark:border-zinc-800">
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{formatRelativeDate(note.created_at)}</span>
          <span className="text-xs text-zinc-300 dark:text-zinc-600 group-hover:text-zinc-400 dark:group-hover:text-zinc-500 transition-colors">
            Click to read
          </span>
        </div>
      </div>
    </Link>
  )
}
