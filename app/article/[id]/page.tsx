'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ExternalLink,
  Heart,
  BookmarkCheck,
  RefreshCw,
  StickyNote,
  Highlighter,
  Sparkles,
  Clock,
  User,
  Calendar,
  X,
} from 'lucide-react'
import { useArticle, updateArticle, fetchArticleContent } from '@/hooks/useArticles'
import { useHighlights } from '@/hooks/useHighlights'
import { useNotes } from '@/hooks/useNotes'
import { Reader } from '@/components/Reader'
import { HighlightsSidebar } from '@/components/HighlightsSidebar'
import { NotesSidebar } from '@/components/NotesSidebar'
import { AISummaryPanel } from '@/components/AISummaryPanel'
import { TagEditor } from '@/components/TagEditor'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { ThemeToggle } from '@/components/ThemeToggle'
import { getDomain, formatDate, cn } from '@/lib/utils'
import type { HighlightColor, ArticleStatus } from '@/types'

type Panel = 'highlights' | 'notes' | 'ai'

export default function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  const { article, aiSummary, isLoading } = useArticle(id)
  const { highlights, createHighlight, updateHighlight, deleteHighlight } = useHighlights(id)
  const { notes, createNote, updateNote, deleteNote } = useNotes(id)

  const [activePanel, setActivePanel] = useState<Panel>('highlights')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [fetching, setFetching] = useState(false)

  // Auto-mark as 'reading' when first opened (only if unread). Mutations are
  // optimistic so no extra refetch dance.
  useEffect(() => {
    if (article && article.status === 'unread') {
      updateArticle(id, { status: 'reading' }).catch(() => {})
    }
  }, [article?.id, article?.status]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lock body scroll when sidebar is open as overlay (mobile only)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const isMobile = window.matchMedia('(max-width: 639px)').matches
    if (sidebarOpen && isMobile) {
      const prev = document.body.style.overflow
      document.body.style.overflow = 'hidden'
      return () => { document.body.style.overflow = prev }
    }
  }, [sidebarOpen])

  async function handleFetchContent() {
    setFetching(true)
    try {
      await fetchArticleContent(id)
    } finally {
      setFetching(false)
    }
  }

  async function handleHighlight(
    text: string,
    start: number,
    end: number,
    color: HighlightColor
  ) {
    try {
      return await createHighlight({ text, start_offset: start, end_offset: end, color })
    } catch {
      return null
    }
  }

  async function handleHighlightUpdate(highlightId: string, note: string) {
    await updateHighlight(highlightId, { note })
  }

  async function handleHighlightDelete(highlightId: string) {
    await deleteHighlight(highlightId)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-zinc-500 dark:text-zinc-400">Article not found.</p>
        <Link href="/">
          <Button variant="secondary">← Back to library</Button>
        </Link>
      </div>
    )
  }

  const domain = getDomain(article.url)

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-zinc-950">
      {/* Top bar */}
      <header className="shrink-0 z-40 flex items-center justify-between gap-2 border-b border-zinc-100 bg-white/90 backdrop-blur-sm px-3 py-2.5 sm:px-6 dark:border-zinc-800 dark:bg-zinc-950/90">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Link href="/" aria-label="Back to library">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <span className="hidden truncate text-sm text-zinc-500 dark:text-zinc-400 sm:block">
            {article.title || domain}
          </span>
        </div>

        <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
          {/* Fetch button shown if content missing */}
          {!article.content && (
            <Button
              size="sm"
              variant="secondary"
              onClick={handleFetchContent}
              disabled={fetching}
            >
              {fetching ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">Load content</span>
            </Button>
          )}

          {/* Favorite */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => updateArticle(id, { is_favorite: !article.is_favorite })}
            title={article.is_favorite ? 'Unfavorite' : 'Favorite'}
            aria-label={article.is_favorite ? 'Unfavorite' : 'Favorite'}
          >
            <Heart
              className={cn('h-4 w-4', article.is_favorite ? 'fill-red-500 text-red-500' : '')}
            />
          </Button>

          {/* Mark read */}
          {article.status !== 'read' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => updateArticle(id, { status: 'read' as ArticleStatus })}
              title="Mark as read"
              aria-label="Mark as read"
            >
              <BookmarkCheck className="h-4 w-4" />
            </Button>
          )}

          {/* Open original */}
          <a href={article.url} target="_blank" rel="noopener noreferrer" aria-label="Open original">
            <Button variant="ghost" size="icon" title="Open original">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </a>

          <ThemeToggle />

          {/* Toggle sidebar */}
          <Button
            variant={sidebarOpen ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-pressed={sidebarOpen}
            aria-label="Toggle notes panel"
          >
            <StickyNote className="h-3.5 w-3.5" />
            <span className="hidden md:inline">Notes</span>
          </Button>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 min-h-0">
        {/* Article content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <article className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
            {/* Meta */}
            <div className="mb-6">
              {article.site_name && (
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
                  {article.site_name}
                </p>
              )}
              <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 leading-tight sm:text-3xl mb-3 wrap-break-word">
                {article.title || domain}
              </h1>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 dark:text-zinc-500">
                {article.author && (
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
                    <span className="truncate max-w-40">{article.author}</span>
                  </span>
                )}
                {article.published_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {formatDate(article.published_at)}
                  </span>
                )}
                {article.reading_time && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {article.reading_time} min read
                  </span>
                )}
              </div>

              {/* Tags */}
              <div className="mt-3">
                <TagEditor
                  tags={article.tags ?? []}
                  onChange={(tags) => updateArticle(id, { tags })}
                />
              </div>
            </div>

            {/* Cover image */}
            {article.image_url && (
              <div className="mb-6 -mx-4 sm:-mx-6 lg:mx-0">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={article.image_url}
                  alt=""
                  loading="lazy"
                  className="w-full max-h-64 object-cover sm:rounded-xl"
                />
              </div>
            )}

            {/* AI Summary (if available) */}
            {(aiSummary || article.content) && (
              <div className="mb-6">
                <AISummaryPanel articleId={id} existing={aiSummary} />
              </div>
            )}

            {/* Content */}
            {article.content ? (
              <Reader
                content={article.content}
                highlights={highlights}
                onHighlight={handleHighlight}
                onHighlightUpdate={handleHighlightUpdate}
                onHighlightDelete={handleHighlightDelete}
              />
            ) : article.fetch_error ? (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/30">
                <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-1">Failed to load content</p>
                <p className="text-xs text-red-500 dark:text-red-400 wrap-break-word">{article.fetch_error}</p>
                <Button
                  size="sm"
                  variant="secondary"
                  className="mt-3"
                  onClick={handleFetchContent}
                  disabled={fetching}
                >
                  {fetching ? <Spinner className="h-3.5 w-3.5" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Retry
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50 p-8 text-center dark:border-zinc-800 dark:bg-zinc-900">
                <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">Content not yet loaded.</p>
                <Button size="md" variant="primary" onClick={handleFetchContent} disabled={fetching}>
                  {fetching ? (
                    <><Spinner className="h-4 w-4" /> Loading…</>
                  ) : (
                    <><RefreshCw className="h-4 w-4" /> Load Article</>
                  )}
                </Button>
              </div>
            )}
          </article>
        </main>

        {/* Sidebar — overlay on mobile (z-50), in-flow on lg+ */}
        {sidebarOpen && (
          <>
            {/* Mobile backdrop */}
            <button
              type="button"
              aria-label="Close sidebar"
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px] lg:hidden"
            />
            <aside
              className={cn(
                'fixed right-0 top-0 bottom-0 z-50 flex w-full max-w-md flex-col border-l border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950',
                'sm:w-96',
                'lg:relative lg:z-auto lg:w-80 xl:w-96 lg:max-w-none'
              )}
            >
              {/* Sidebar tabs */}
              <div className="flex border-b border-zinc-100 dark:border-zinc-800">
                {(
                  [
                    { key: 'highlights', icon: Highlighter, label: 'Highlights', count: highlights.length },
                    { key: 'notes', icon: StickyNote, label: 'Notes', count: notes.length },
                    { key: 'ai', icon: Sparkles, label: 'AI', count: 0 },
                  ] as const
                ).map(({ key, icon: Icon, label, count }) => (
                  <button
                    key={key}
                    onClick={() => setActivePanel(key)}
                    className={cn(
                      'flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-medium transition-colors',
                      activePanel === key
                        ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-100 dark:text-zinc-50'
                        : 'text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300'
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {label}
                    {count > 0 && (
                      <span className="ml-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                        {count}
                      </span>
                    )}
                  </button>
                ))}
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Close sidebar"
                  className="px-3 text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 lg:hidden"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Sidebar content */}
              <div className="flex-1 overflow-y-auto p-4">
                {activePanel === 'highlights' && (
                  <HighlightsSidebar
                    highlights={highlights}
                    onDelete={deleteHighlight}
                    onUpdateNote={(hid, note) => updateHighlight(hid, { note })}
                  />
                )}
                {activePanel === 'notes' && (
                  <NotesSidebar
                    notes={notes}
                    onAdd={createNote}
                    onUpdate={updateNote}
                    onDelete={deleteNote}
                  />
                )}
                {activePanel === 'ai' && (
                  <AISummaryPanel articleId={id} existing={aiSummary} />
                )}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  )
}
