'use client'

import { useState } from 'react'
import { Pencil, Trash2, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { formatRelativeDate } from '@/lib/utils'
import type { Note } from '@/types'

interface NotesSidebarProps {
  notes: Note[]
  onAdd: (content: string) => void
  onUpdate: (id: string, content: string) => void
  onDelete: (id: string) => void
}

export function NotesSidebar({ notes, onAdd, onUpdate, onDelete }: NotesSidebarProps) {
  const [newNote, setNewNote] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editContent, setEditContent] = useState('')

  function handleAdd() {
    if (!newNote.trim()) return
    onAdd(newNote.trim())
    setNewNote('')
  }

  function startEdit(note: Note) {
    setEditingId(note.id)
    setEditContent(note.content)
  }

  function saveEdit() {
    if (!editingId || !editContent.trim()) return
    onUpdate(editingId, editContent.trim())
    setEditingId(null)
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Add new note */}
      <div className="flex flex-col gap-1.5">
        <textarea
          rows={3}
          placeholder="Write a note about this article…"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAdd()
          }}
          className="w-full rounded-lg border border-zinc-200 bg-white p-2.5 text-sm text-zinc-700 resize-none focus:outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-200 transition placeholder-zinc-400 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 dark:placeholder-zinc-500 dark:focus:border-zinc-600 dark:focus:ring-zinc-800"
        />
        <Button
          size="sm"
          variant="primary"
          disabled={!newNote.trim()}
          onClick={handleAdd}
          className="self-end"
        >
          Add note
        </Button>
      </div>

      {notes.length === 0 ? (
        <div className="py-8 text-center text-zinc-400 dark:text-zinc-500">
          <span className="text-3xl mb-3 block">📝</span>
          <p className="text-sm">No notes yet.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {notes.map((note) => (
            <div
              key={note.id}
              className="group rounded-lg border border-zinc-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              {editingId === note.id ? (
                <div className="flex flex-col gap-1.5">
                  <textarea
                    rows={3}
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    autoFocus
                    className="w-full rounded border border-zinc-200 bg-zinc-50 p-2 text-sm text-zinc-700 resize-none focus:outline-none focus:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:focus:border-zinc-600"
                  />
                  <div className="flex gap-1.5 justify-end">
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-3 w-3" /> Cancel
                    </Button>
                    <Button size="sm" variant="primary" onClick={saveEdit}>
                      <Check className="h-3 w-3" /> Save
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <p className="text-sm text-zinc-700 dark:text-zinc-200 leading-relaxed whitespace-pre-wrap wrap-break-word">
                    {note.content}
                  </p>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {formatRelativeDate(note.created_at)}
                    </span>
                    <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => startEdit(note)}
                        aria-label="Edit note"
                      >
                        <Pencil className="h-3 w-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                        onClick={() => onDelete(note.id)}
                        aria-label="Delete note"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
