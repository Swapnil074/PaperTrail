'use client'

import { useState, useCallback, useDeferredValue } from 'react'
import Link from 'next/link'
import { BookOpen, Send, Highlighter, RefreshCw } from 'lucide-react'
import { useArticles, deleteArticle, updateArticle } from '@/hooks/useArticles'
import { ArticleCard } from '@/components/ArticleCard'
import { AddArticleBar } from '@/components/AddArticleBar'
import { FilterBar } from '@/components/FilterBar'
import { Spinner } from '@/components/ui/Spinner'
import { ThemeToggle } from '@/components/ThemeToggle'
import type { ArticleStatus } from '@/types'

type Filter = 'all' | ArticleStatus | 'favorites'

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [activeTag, setActiveTag] = useState<string | undefined>(undefined)
  const deferredSearch = useDeferredValue(search)

  const { articles, total, isLoading, mutate } = useArticles({
    status: activeFilter === 'favorites' ? undefined : (activeFilter as ArticleStatus | 'all'),
    favorites: activeFilter === 'favorites',
    q: deferredSearch || undefined,
    tag: activeTag,
  })

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm('Delete this article?')) return
      await deleteArticle(id)
    },
    []
  )

  const handleToggleFavorite = useCallback(
    async (id: string, current: boolean) => {
      await updateArticle(id, { is_favorite: !current })
    },
    []
  )

  const handleStatusChange = useCallback(
    async (id: string, status: ArticleStatus) => {
      await updateArticle(id, { status })
    },
    []
  )

  const handleTagClick = useCallback((tag: string) => {
    setActiveTag((prev) => (prev === tag ? undefined : tag))
  }, [])

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/80 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-900 dark:bg-zinc-100">
              <BookOpen className="h-4 w-4 text-white dark:text-zinc-900" />
            </div>
            <span className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">PaperTrail</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/highlights"
              className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100 transition-colors"
            >
              <Highlighter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Library</span>
            </Link>
            <span className="hidden md:flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500">
              <Send className="h-3.5 w-3.5" />
              via Telegram
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-5 sm:px-6 sm:py-6">
        {/* Add URL bar */}
        <div className="mb-5 sm:mb-6">
          <AddArticleBar onAdded={() => mutate()} />
        </div>

        {/* Filters */}
        <div className="mb-4 sm:mb-5">
          <FilterBar
            active={activeFilter}
            onChange={setActiveFilter}
            search={search}
            onSearch={setSearch}
            total={total}
          />
        </div>

        {/* Stats row */}
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <p className="text-sm text-zinc-500 dark:text-zinc-400 shrink-0">
              {isLoading ? (
                <span className="flex items-center gap-1.5">
                  <Spinner className="h-3.5 w-3.5" /> Loading…
                </span>
              ) : (
                `${total} article${total !== 1 ? 's' : ''}`
              )}
            </p>
            {activeTag && (
              <button
                onClick={() => setActiveTag(undefined)}
                className="inline-flex items-center gap-1 rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900 max-w-45 truncate"
              >
                <span className="truncate">#{activeTag}</span>
                <span className="shrink-0">✕</span>
              </button>
            )}
          </div>
          <button
            onClick={() => mutate()}
            className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw className="h-3 w-3" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-48 rounded-xl border border-zinc-100 bg-white animate-pulse dark:border-zinc-800 dark:bg-zinc-900"
              />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-800">
              <BookOpen className="h-8 w-8 text-zinc-400 dark:text-zinc-500" />
            </div>
            <h3 className="text-base font-semibold text-zinc-700 mb-1 dark:text-zinc-200">
              {search ? 'No results found' : 'Your reading list is empty'}
            </h3>
            <p className="text-sm text-zinc-400 dark:text-zinc-500 max-w-xs px-4">
              {search
                ? 'Try a different search term.'
                : 'Paste a URL above or send one via Telegram to get started.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                onDelete={handleDelete}
                onToggleFavorite={handleToggleFavorite}
                onStatusChange={handleStatusChange}
                onTagClick={handleTagClick}
              />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-100 py-4 text-center text-xs text-zinc-400 dark:border-zinc-800 dark:text-zinc-500">
        PaperTrail — Your Second Brain Reader
      </footer>
    </div>
  )
}
