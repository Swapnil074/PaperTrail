'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TagEditorProps {
  tags: string[]
  onChange: (tags: string[]) => void
  className?: string
}

export function TagEditor({ tags, onChange, className }: TagEditorProps) {
  const [input, setInput] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag || tags.includes(tag)) {
      setInput('')
      return
    }
    onChange([...tags, tag])
    setInput('')
  }

  function removeTag(tag: string) {
    onChange(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    } else if (e.key === 'Backspace' && !input && tags.length > 0) {
      removeTag(tags[tags.length - 1])
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2 py-1.5 focus-within:border-zinc-400 focus-within:ring-2 focus-within:ring-zinc-100 transition cursor-text dark:border-zinc-800 dark:bg-zinc-900 dark:focus-within:border-zinc-600 dark:focus-within:ring-zinc-800',
        className
      )}
      onClick={() => inputRef.current?.focus()}
    >
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-0.5 rounded-full bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 max-w-full"
        >
          <span className="truncate">{tag}</span>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); removeTag(tag) }}
            className="ml-0.5 text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors shrink-0"
            aria-label={`Remove ${tag}`}
          >
            <X className="h-2.5 w-2.5" />
          </button>
        </span>
      ))}
      <input
        ref={inputRef}
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => input && addTag(input)}
        placeholder={tags.length === 0 ? 'Add tags…' : ''}
        className="min-w-20 flex-1 bg-transparent text-xs text-zinc-700 placeholder-zinc-400 focus:outline-none dark:text-zinc-200 dark:placeholder-zinc-500"
      />
    </div>
  )
}
