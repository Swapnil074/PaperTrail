'use client'

import useSWR, { mutate as globalMutate } from 'swr'
import type { Article, ArticleStatus, AISummary } from '@/types'

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface ArticlesFilter {
  status?: ArticleStatus | 'all'
  q?: string
  tag?: string
  favorites?: boolean
  page?: number
}

export function useArticles(filter: ArticlesFilter = {}) {
  const params = new URLSearchParams()
  if (filter.status && filter.status !== 'all') params.set('status', filter.status)
  if (filter.q) params.set('q', filter.q)
  if (filter.tag) params.set('tag', filter.tag)
  if (filter.favorites) params.set('favorites', 'true')
  if (filter.page && filter.page > 1) params.set('page', String(filter.page))

  const key = `/api/articles?${params.toString()}`
  const { data, error, isLoading, mutate } = useSWR<{
    articles: Article[]
    total: number
  }>(key, fetcher, { revalidateOnFocus: false })

  return {
    articles: data?.articles ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    mutate,
  }
}

export function useArticle(id: string) {
  const { data, error, isLoading, mutate } = useSWR<{
    article: Article
    ai_summary: AISummary | null
  }>(id ? `/api/articles/${id}` : null, fetcher, { revalidateOnFocus: false })

  return {
    article: data?.article ?? null,
    aiSummary: data?.ai_summary ?? null,
    isLoading,
    error,
    mutate,
  }
}

export async function saveArticle(url: string): Promise<Article> {
  const res = await fetch('/api/articles', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Failed to save')
  }
  const { article } = await res.json()
  globalMutate((key) => typeof key === 'string' && key.startsWith('/api/articles'))
  // Kick off content fetch immediately in the background — don't block the UI
  fetchArticleContent(article.id).catch(() => {})
  return article
}

// Optimistically patch the per-article SWR cache + the list cache, then PATCH.
// Reverts if the request fails.
export async function updateArticle(
  id: string,
  patch: Partial<Pick<Article, 'status' | 'is_favorite' | 'tags' | 'title'>>
): Promise<Article> {
  // Optimistic per-article update
  await globalMutate(
    `/api/articles/${id}`,
    async (current: { article: Article; ai_summary: unknown } | undefined) => {
      if (!current?.article) return current
      return { ...current, article: { ...current.article, ...patch } }
    },
    { revalidate: false }
  )

  // Optimistic list update (any list filter we have cached)
  await globalMutate(
    (key) => typeof key === 'string' && key.startsWith('/api/articles?'),
    (current: { articles: Article[]; total: number } | undefined) => {
      if (!current?.articles) return current
      return {
        ...current,
        articles: current.articles.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      }
    },
    { revalidate: false }
  )

  try {
    const res = await fetch(`/api/articles/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    if (!res.ok) throw new Error('Update failed')
    const { article } = await res.json()
    // Reconcile with server state
    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/articles'))
    return article
  } catch (err) {
    // Revert by triggering refetch
    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/articles'))
    throw err
  }
}

export async function deleteArticle(id: string): Promise<void> {
  // Optimistic removal from list
  await globalMutate(
    (key) => typeof key === 'string' && key.startsWith('/api/articles?'),
    (current: { articles: Article[]; total: number } | undefined) => {
      if (!current?.articles) return current
      return {
        ...current,
        articles: current.articles.filter((a) => a.id !== id),
        total: Math.max(0, current.total - 1),
      }
    },
    { revalidate: false }
  )
  try {
    await fetch(`/api/articles/${id}`, { method: 'DELETE' })
  } finally {
    globalMutate((key) => typeof key === 'string' && key.startsWith('/api/articles'))
  }
}

export async function fetchArticleContent(id: string): Promise<Article> {
  const res = await fetch(`/api/articles/${id}/fetch`, { method: 'POST' })
  if (!res.ok) throw new Error('Fetch failed')
  const { article } = await res.json()
  // Refresh both per-article cache and list cards (title/excerpt/image update)
  globalMutate(`/api/articles/${id}`)
  globalMutate((key) => typeof key === 'string' && key.startsWith('/api/articles?'))
  return article
}
