'use client'

import Link from 'next/link'
import { Heart, Clock, ExternalLink, Trash2, BookmarkCheck } from 'lucide-react'
import { cn, getDomain, formatRelativeDate } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import type { Article, ArticleStatus } from '@/types'

interface ArticleCardProps {
  article: Article
  onDelete: (id: string) => void
  onToggleFavorite: (id: string, current: boolean) => void
  onStatusChange: (id: string, status: ArticleStatus) => void
  onTagClick?: (tag: string) => void
}

const statusLabel: Record<ArticleStatus, string> = {
  unread: 'Unread',
  reading: 'Reading',
  read: 'Read',
  archived: 'Archived',
}

export function ArticleCard({
  article,
  onDelete,
  onToggleFavorite,
  onStatusChange,
  onTagClick,
}: ArticleCardProps) {
  const domain = getDomain(article.url)

  return (
    <article className="group relative flex flex-col rounded-xl border border-zinc-200 bg-white hover:border-zinc-300 hover:shadow-sm transition-all duration-150 dark:border-zinc-800 dark:bg-zinc-900 dark:hover:border-zinc-700 dark:hover:shadow-zinc-950/50">
      {/* Cover image */}
      {article.image_url && (
        <div className="h-32 w-full overflow-hidden rounded-t-xl bg-zinc-100 dark:bg-zinc-800 sm:h-36">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={article.image_url}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover"
            onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
          />
        </div>
      )}

      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Source + date */}
        <div className="flex items-center justify-between gap-2 text-xs text-zinc-400 dark:text-zinc-500">
          <span className="truncate font-medium">{article.site_name || domain}</span>
          <span className="shrink-0">{formatRelativeDate(article.created_at)}</span>
        </div>

        {/* Title */}
        <Link
          href={`/article/${article.id}`}
          className="line-clamp-2 text-sm font-semibold text-zinc-900 hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300 transition-colors leading-snug"
        >
          {article.title || domain}
        </Link>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
            {article.excerpt}
          </p>
        )}

        {/* Tags */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {article.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                onClick={(e) => { e.preventDefault(); onTagClick?.(tag) }}
                className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors max-w-35 truncate"
              >
                {tag}
              </button>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Badge variant={article.status as ArticleStatus}>{statusLabel[article.status]}</Badge>
            {article.reading_time && (
              <span className="flex items-center gap-1 text-xs text-zinc-400 dark:text-zinc-500 shrink-0">
                <Clock className="h-3 w-3" />
                {article.reading_time}m
              </span>
            )}
          </div>

          {/* Actions — always visible on touch, hover-only on desktop with hover */}
          <div
            className={cn(
              'flex items-center gap-0.5 shrink-0',
              'opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100',
              '[@media(hover:none)]:opacity-100',
              'transition-opacity'
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggleFavorite(article.id, article.is_favorite)}
              title={article.is_favorite ? 'Unfavorite' : 'Favorite'}
              aria-label={article.is_favorite ? 'Unfavorite' : 'Favorite'}
            >
              <Heart
                className={cn('h-3.5 w-3.5', article.is_favorite ? 'fill-red-500 text-red-500' : '')}
              />
            </Button>
            {article.status !== 'read' && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onStatusChange(article.id, 'read')}
                title="Mark as read"
                aria-label="Mark as read"
              >
                <BookmarkCheck className="h-3.5 w-3.5" />
              </Button>
            )}
            <a href={article.url} target="_blank" rel="noopener noreferrer" aria-label="Open original">
              <Button variant="ghost" size="icon" title="Open original">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(article.id)}
              title="Delete"
              aria-label="Delete"
              className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </article>
  )
}
