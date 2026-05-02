'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  localHighlights,
  reconcileHighlights,
  createHighlightLocal,
  updateHighlightLocal,
  deleteHighlightLocal,
  onSync,
} from '@/lib/offline-db'
import type { Highlight, CreateHighlightPayload, HighlightColor } from '@/types'

// IDB-first hook. UI reads from IndexedDB instantly on mount,
// then a background fetch reconciles with the server. Mutations
// are local-synchronous and queued for background sync.
export function useHighlights(articleId: string) {
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const cancelledRef = useRef(false)

  const refreshFromIDB = useCallback(async () => {
    if (!articleId) return
    const local = await localHighlights(articleId)
    if (!cancelledRef.current) setHighlights(local)
  }, [articleId])

  useEffect(() => {
    cancelledRef.current = false
    if (!articleId) { setIsLoading(false); return }

    let aborted = false
    ;(async () => {
      // 1. Render IDB instantly
      const local = await localHighlights(articleId)
      if (aborted) return
      setHighlights(local)
      setIsLoading(false)

      // 2. Pull from server in the background, reconcile into IDB
      try {
        const res = await fetch(`/api/articles/${articleId}/highlights`)
        if (!res.ok) return
        const { highlights: serverRows } = (await res.json()) as { highlights: Highlight[] }
        await reconcileHighlights(articleId, serverRows)
        if (aborted) return
        const merged = await localHighlights(articleId)
        setHighlights(merged)
      } catch {
        // Offline — IDB already showing
      }
    })()

    // Refresh whenever the sync engine drains a mutation
    const unsubscribe = onSync(() => { void refreshFromIDB() })

    return () => {
      aborted = true
      cancelledRef.current = true
      unsubscribe()
    }
  }, [articleId, refreshFromIDB])

  const createHighlight = useCallback(
    async (payload: CreateHighlightPayload): Promise<Highlight> => {
      const created = await createHighlightLocal(articleId, payload)
      setHighlights((prev) => {
        const next = [...prev, created]
        return next.sort((a, b) => a.start_offset - b.start_offset)
      })
      return created
    },
    [articleId]
  )

  const updateHighlight = useCallback(
    async (id: string, patch: { color?: HighlightColor; note?: string | null }): Promise<void> => {
      await updateHighlightLocal(id, patch)
      setHighlights((prev) =>
        prev.map((h) => (h.id === id ? { ...h, ...patch, updated_at: new Date().toISOString() } : h))
      )
    },
    []
  )

  const deleteHighlight = useCallback(async (id: string): Promise<void> => {
    await deleteHighlightLocal(id)
    setHighlights((prev) => prev.filter((h) => h.id !== id))
  }, [])

  return {
    highlights,
    isLoading,
    error: null,
    mutate: refreshFromIDB,
    createHighlight,
    updateHighlight,
    deleteHighlight,
  }
}
