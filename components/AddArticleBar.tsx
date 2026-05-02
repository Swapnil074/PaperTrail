'use client'

import { useState } from 'react'
import { Plus, Link as LinkIcon } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import { saveArticle } from '@/hooks/useArticles'

interface AddArticleBarProps {
  onAdded?: () => void
}

export function AddArticleBar({ onAdded }: AddArticleBarProps) {
  const [url, setUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!url.trim()) return
    setLoading(true)
    setError('')
    try {
      await saveArticle(url.trim())
      setUrl('')
      onAdded?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <div className="relative flex-1 min-w-0">
          <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste a URL to save…"
            inputMode="url"
            autoComplete="url"
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
            disabled={loading}
          />
        </div>
        <Button type="submit" variant="primary" disabled={loading || !url.trim()} className="shrink-0">
          {loading ? <Spinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          <span className="hidden sm:inline">Save</span>
        </Button>
      </div>
      {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
    </form>
  )
}
