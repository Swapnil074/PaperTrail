'use client'

import { useState } from 'react'
import { Trash2, MessageSquare, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { HIGHLIGHT_COLOR_HEX } from '@/lib/utils'
import type { Highlight } from '@/types'

interface HighlightsSidebarProps {
  highlights: Highlight[]
  onDelete: (id: string) => void
  onUpdateNote: (id: string, note: string) => void
}

export function HighlightsSidebar({ highlights, onDelete, onUpdateNote }: HighlightsSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNote, setEditNote] = useState('')

  if (highlights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500">
        <span className="text-3xl mb-3">✏️</span>
        <p className="text-sm">No highlights yet.</p>
        <p className="text-xs mt-1">Select any text in the article to highlight it.</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {highlights.map((h) => {
        const colorHex = HIGHLIGHT_COLOR_HEX[h.color] ?? HIGHLIGHT_COLOR_HEX.yellow
        return (
          <div
            key={h.id}
            className="rounded-lg border border-zinc-100 bg-white overflow-hidden dark:border-zinc-800 dark:bg-zinc-900"
          >
            <div
              className="px-3 py-2.5 text-xs leading-relaxed wrap-break-word text-zinc-700 dark:text-zinc-200"
              style={{ borderLeft: `3px solid ${colorHex}`, background: `${colorHex}18` }}
            >
              <span style={{ background: colorHex, color: '#18181b', borderRadius: 2, padding: '0 2px' }}>
                {h.text}
              </span>
            </div>

            {editingId === h.id ? (
              <div className="border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/50 p-2.5 flex flex-col gap-1.5">
                <textarea
                  rows={2}
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  autoFocus
                  placeholder="Add a note…"
                  className="w-full rounded border border-zinc-200 bg-white p-2 text-xs text-zinc-700 resize-none focus:outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:focus:border-zinc-600"
                />
                <div className="flex gap-1.5 justify-end">
                  <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                    <X className="h-3 w-3" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => { onUpdateNote(h.id, editNote); setEditingId(null) }}
                  >
                    <Check className="h-3 w-3" /> Save
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {h.note && (
                  <div className="border-t border-zinc-100 dark:border-zinc-800 px-3 py-2">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 italic wrap-break-word">{h.note}</p>
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-zinc-50 dark:border-zinc-800 px-3 py-1.5">
                  <button
                    onClick={() => { setEditingId(h.id); setEditNote(h.note ?? '') }}
                    className="flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200 transition-colors"
                  >
                    <MessageSquare className="h-3 w-3" />
                    {h.note ? 'Edit note' : 'Add note'}
                  </button>
                  <button
                    onClick={() => onDelete(h.id)}
                    className="p-1 text-zinc-300 hover:text-red-500 dark:text-zinc-600 dark:hover:text-red-400 transition-colors"
                    aria-label="Delete highlight"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
