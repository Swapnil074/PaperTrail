'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  localNotes,
  reconcileNotes,
  createNoteLocal,
  updateNoteLocal,
  deleteNoteLocal,
  onSync,
} from '@/lib/offline-db'
import type { Note } from '@/types'

export function useNotes(articleId: string) {
  const [notes, setNotes] = useState<Note[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const cancelledRef = useRef(false)

  const refreshFromIDB = useCallback(async () => {
    if (!articleId) return
    const local = await localNotes(articleId)
    if (!cancelledRef.current) setNotes(local)
  }, [articleId])

  useEffect(() => {
    cancelledRef.current = false
    if (!articleId) { setIsLoading(false); return }

    let aborted = false
    ;(async () => {
      const local = await localNotes(articleId)
      if (aborted) return
      setNotes(local)
      setIsLoading(false)

      try {
        const res = await fetch(`/api/articles/${articleId}/notes`)
        if (!res.ok) return
        const { notes: serverRows } = (await res.json()) as { notes: Note[] }
        await reconcileNotes(articleId, serverRows)
        if (aborted) return
        const merged = await localNotes(articleId)
        setNotes(merged)
      } catch {
        // Offline
      }
    })()

    const unsubscribe = onSync(() => { void refreshFromIDB() })

    return () => {
      aborted = true
      cancelledRef.current = true
      unsubscribe()
    }
  }, [articleId, refreshFromIDB])

  const createNote = useCallback(
    async (content: string): Promise<Note> => {
      const created = await createNoteLocal(articleId, content)
      setNotes((prev) => [created, ...prev])
      return created
    },
    [articleId]
  )

  const updateNote = useCallback(async (id: string, content: string): Promise<void> => {
    await updateNoteLocal(id, content)
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, content, updated_at: new Date().toISOString() } : n))
    )
  }, [])

  const deleteNote = useCallback(async (id: string): Promise<void> => {
    await deleteNoteLocal(id)
    setNotes((prev) => prev.filter((n) => n.id !== id))
  }, [])

  return {
    notes,
    isLoading,
    error: null,
    mutate: refreshFromIDB,
    createNote,
    updateNote,
    deleteNote,
  }
}
