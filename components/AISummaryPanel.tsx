'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown, ChevronUp } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Spinner } from '@/components/ui/Spinner'
import type { AISummary } from '@/types'

interface AISummaryPanelProps {
  articleId: string
  existing: AISummary | null
}

export function AISummaryPanel({ articleId, existing }: AISummaryPanelProps) {
  const [summary, setSummary] = useState<AISummary | null>(existing)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(true)

  async function generate() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/articles/${articleId}/summarize`, { method: 'POST' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed')
      }
      const { summary: data } = await res.json()
      setSummary(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI request failed')
    } finally {
      setLoading(false)
    }
  }

  if (!summary) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-zinc-500 dark:text-zinc-400" />
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-200">AI Summary</span>
        </div>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3">
          Generate a summary, key points, and insights for this article.
        </p>
        {error && <p className="text-xs text-red-500 dark:text-red-400 mb-2 wrap-break-word">{error}</p>}
        <Button size="sm" variant="primary" onClick={generate} disabled={loading}>
          {loading ? (
            <><Spinner className="h-3.5 w-3.5" /> Summarizing…</>
          ) : (
            <><Sparkles className="h-3.5 w-3.5" /> Generate</>
          )}
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-linear-to-br from-zinc-50 to-white overflow-hidden dark:border-zinc-800 dark:from-zinc-900 dark:to-zinc-950">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-between gap-2 p-4 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-violet-500 dark:text-violet-400 shrink-0" />
          <span className="text-sm font-semibold text-zinc-800 dark:text-zinc-100 truncate">AI Summary</span>
          {summary.model && (
            <span className="text-xs text-zinc-400 dark:text-zinc-500 font-normal truncate hidden sm:inline">
              {summary.model}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-zinc-400 dark:text-zinc-500 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 dark:border-zinc-800 px-4 pb-4 pt-3 flex flex-col gap-4">
          {summary.summary && (
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                Summary
              </p>
              <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed wrap-break-word">{summary.summary}</p>
            </div>
          )}

          {summary.key_points && summary.key_points.length > 0 && (
            <div>
              <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">
                Key Points
              </p>
              <ul className="flex flex-col gap-1.5">
                {summary.key_points.map((point, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-zinc-700 dark:text-zinc-200 wrap-break-word">
                    <span className="mt-0.5 h-4 w-4 shrink-0 flex items-center justify-center rounded-full bg-violet-100 text-violet-600 dark:bg-violet-950/40 dark:text-violet-300 text-xs font-medium">
                      {i + 1}
                    </span>
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {summary.insights && (
            <div className="rounded-lg bg-violet-50 border border-violet-100 p-3 dark:bg-violet-950/20 dark:border-violet-900/40">
              <p className="text-xs font-medium text-violet-600 dark:text-violet-300 uppercase tracking-wide mb-1">
                💡 Insight
              </p>
              <p className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed wrap-break-word">{summary.insights}</p>
            </div>
          )}

          {error && <p className="text-xs text-red-500 dark:text-red-400 wrap-break-word">{error}</p>}

          <Button size="sm" variant="ghost" onClick={generate} disabled={loading} className="self-start text-xs">
            {loading ? <Spinner className="h-3 w-3" /> : <Sparkles className="h-3 w-3" />}
            Regenerate
          </Button>
        </div>
      )}
    </div>
  )
}
