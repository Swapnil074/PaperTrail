'use client'

import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ArticleStatus } from '@/types'

type Filter = 'all' | ArticleStatus | 'favorites'

interface FilterBarProps {
  active: Filter
  onChange: (f: Filter) => void
  search: string
  onSearch: (s: string) => void
  total?: number
}

const filters: { key: Filter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'reading', label: 'Reading' },
  { key: 'read', label: 'Read' },
  { key: 'archived', label: 'Archived' },
  { key: 'favorites', label: 'Favorites' },
]

export function FilterBar({ active, onChange, search, onSearch }: FilterBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search titles…"
          inputMode="search"
          className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-4 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-200 transition dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
        />
      </div>

      {/* Filter pills — horizontal scroll on small screens */}
      <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-none -mx-1 px-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => onChange(f.key)}
            className={cn(
              'shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors whitespace-nowrap',
              active === f.key
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900'
                : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700'
            )}
          >
            {f.key === 'favorites' ? '♥ ' : ''}{f.label}
          </button>
        ))}
      </div>
    </div>
  )
}
