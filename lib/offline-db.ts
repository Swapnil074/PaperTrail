'use client'

// ───────────────────────────────────────────────────────────────────
// PaperTrail offline-first store
//
// IndexedDB is the source of truth for the UI.
// Mutations write to IDB instantly, then sync to the server in the
// background via a persisted queue. On `online` events the queue
// drains. Records survive page reloads, tab close, and offline use.
// ───────────────────────────────────────────────────────────────────

import type { Highlight, Note, CreateHighlightPayload, HighlightColor } from '@/types'

const DB_NAME = 'papertrail'
const DB_VERSION = 1

const STORE_HIGHLIGHTS = 'highlights'
const STORE_NOTES = 'notes'
const STORE_QUEUE = 'mutation_queue'

let _dbPromise: Promise<IDBDatabase> | null = null

function openDB(): Promise<IDBDatabase> {
  if (_dbPromise) return _dbPromise
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'))
  }
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE_HIGHLIGHTS)) {
        const s = db.createObjectStore(STORE_HIGHLIGHTS, { keyPath: 'id' })
        s.createIndex('article_id', 'article_id', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_NOTES)) {
        const s = db.createObjectStore(STORE_NOTES, { keyPath: 'id' })
        s.createIndex('article_id', 'article_id', { unique: false })
      }
      if (!db.objectStoreNames.contains(STORE_QUEUE)) {
        db.createObjectStore(STORE_QUEUE, { keyPath: 'id' })
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
  return _dbPromise
}

function txStore(name: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  return openDB().then((db) => db.transaction(name, mode).objectStore(name))
}

function reqAsPromise<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function put(name: string, record: unknown): Promise<void> {
  const store = await txStore(name, 'readwrite')
  await reqAsPromise(store.put(record as never))
}

async function del(name: string, id: string): Promise<void> {
  const store = await txStore(name, 'readwrite')
  await reqAsPromise(store.delete(id))
}

async function getAllByArticle<T>(name: string, articleId: string): Promise<T[]> {
  const store = await txStore(name, 'readonly')
  return reqAsPromise(store.index('article_id').getAll(articleId)) as Promise<T[]>
}

async function getAll<T>(name: string): Promise<T[]> {
  const store = await txStore(name, 'readonly')
  return reqAsPromise(store.getAll()) as Promise<T[]>
}

// ── Public read helpers ────────────────────────────────────────────

export async function localHighlights(articleId: string): Promise<Highlight[]> {
  try {
    const rows = await getAllByArticle<Highlight & { _deleted?: boolean }>(STORE_HIGHLIGHTS, articleId)
    return rows
      .filter((r) => !r._deleted)
      .sort((a, b) => a.start_offset - b.start_offset)
  } catch {
    return []
  }
}

export async function localNotes(articleId: string): Promise<Note[]> {
  try {
    const rows = await getAllByArticle<Note & { _deleted?: boolean }>(STORE_NOTES, articleId)
    return rows
      .filter((r) => !r._deleted)
      .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
  } catch {
    return []
  }
}

// ── Server reconciliation ──────────────────────────────────────────
// Server is authoritative for synced records. Local pending records
// (those still in the mutation queue) are preserved as-is.

async function pendingIds(): Promise<{
  highlights: Set<string>
  notes: Set<string>
}> {
  const items = await getAll<QueueItem>(STORE_QUEUE)
  const h = new Set<string>()
  const n = new Set<string>()
  for (const it of items) {
    if (it.entity === 'highlight') h.add(it.recordId)
    else if (it.entity === 'note') n.add(it.recordId)
  }
  return { highlights: h, notes: n }
}

export async function reconcileHighlights(
  articleId: string,
  serverRecords: Highlight[]
): Promise<void> {
  const local = await getAllByArticle<Highlight>(STORE_HIGHLIGHTS, articleId)
  const { highlights: pending } = await pendingIds()
  const serverIds = new Set(serverRecords.map((r) => r.id))

  // Pending records always win over server (offline tombstones, edits)
  for (const r of serverRecords) {
    if (pending.has(r.id)) continue
    await put(STORE_HIGHLIGHTS, r)
  }

  // Drop synced local rows that no longer exist on server
  for (const r of local) {
    if (pending.has(r.id)) continue
    if (!serverIds.has(r.id)) await del(STORE_HIGHLIGHTS, r.id)
  }
}

export async function reconcileNotes(
  articleId: string,
  serverRecords: Note[]
): Promise<void> {
  const local = await getAllByArticle<Note>(STORE_NOTES, articleId)
  const { notes: pending } = await pendingIds()
  const serverIds = new Set(serverRecords.map((r) => r.id))

  for (const r of serverRecords) {
    if (pending.has(r.id)) continue
    await put(STORE_NOTES, r)
  }

  for (const r of local) {
    if (pending.has(r.id)) continue
    if (!serverIds.has(r.id)) await del(STORE_NOTES, r.id)
  }
}

// ── Mutation queue ─────────────────────────────────────────────────

type Entity = 'highlight' | 'note'
type Op = 'create' | 'update' | 'delete'

interface QueueItem {
  id: string
  entity: Entity
  op: Op
  articleId: string         // empty for update/delete (we use recordId)
  recordId: string          // the entity's UUID (client- or server-generated)
  payload?: unknown
  attempts: number
  createdAt: number
}

async function enqueue(item: Omit<QueueItem, 'id' | 'attempts' | 'createdAt'>): Promise<void> {
  const full: QueueItem = {
    ...item,
    id: crypto.randomUUID(),
    attempts: 0,
    createdAt: Date.now(),
  }
  await put(STORE_QUEUE, full)
}

function uuid(): string {
  return crypto.randomUUID()
}

// ── Highlight mutations (instant, optimistic) ──────────────────────

export async function createHighlightLocal(
  articleId: string,
  payload: CreateHighlightPayload
): Promise<Highlight> {
  const now = new Date().toISOString()
  const record: Highlight = {
    id: uuid(),
    article_id: articleId,
    text: payload.text,
    start_offset: payload.start_offset,
    end_offset: payload.end_offset,
    color: payload.color ?? 'yellow',
    note: payload.note ?? null,
    created_at: now,
    updated_at: now,
  }
  await put(STORE_HIGHLIGHTS, record)
  await enqueue({
    entity: 'highlight',
    op: 'create',
    articleId,
    recordId: record.id,
    payload: {
      id: record.id,
      text: record.text,
      start_offset: record.start_offset,
      end_offset: record.end_offset,
      color: record.color,
      note: record.note,
    },
  })
  void flushQueue()
  return record
}

export async function updateHighlightLocal(
  id: string,
  patch: { color?: HighlightColor; note?: string | null }
): Promise<void> {
  const store = await txStore(STORE_HIGHLIGHTS, 'readwrite')
  const existing = await reqAsPromise(store.get(id)) as Highlight | undefined
  if (!existing) return
  const updated: Highlight = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  }
  await reqAsPromise(store.put(updated))
  await enqueue({
    entity: 'highlight',
    op: 'update',
    articleId: existing.article_id,
    recordId: id,
    payload: patch,
  })
  void flushQueue()
}

export async function deleteHighlightLocal(id: string): Promise<void> {
  const store = await txStore(STORE_HIGHLIGHTS, 'readwrite')
  const existing = await reqAsPromise(store.get(id)) as Highlight | undefined
  if (!existing) return
  // Tombstone — keeps it out of UI, lets queue still find articleId
  await reqAsPromise(store.put({ ...existing, _deleted: true }))
  await enqueue({
    entity: 'highlight',
    op: 'delete',
    articleId: existing.article_id,
    recordId: id,
  })
  void flushQueue()
}

// ── Note mutations ─────────────────────────────────────────────────

export async function createNoteLocal(
  articleId: string,
  content: string
): Promise<Note> {
  const now = new Date().toISOString()
  const record: Note = {
    id: uuid(),
    article_id: articleId,
    content,
    created_at: now,
    updated_at: now,
  }
  await put(STORE_NOTES, record)
  await enqueue({
    entity: 'note',
    op: 'create',
    articleId,
    recordId: record.id,
    payload: { id: record.id, content },
  })
  void flushQueue()
  return record
}

export async function updateNoteLocal(id: string, content: string): Promise<void> {
  const store = await txStore(STORE_NOTES, 'readwrite')
  const existing = await reqAsPromise(store.get(id)) as Note | undefined
  if (!existing) return
  const updated: Note = { ...existing, content, updated_at: new Date().toISOString() }
  await reqAsPromise(store.put(updated))
  await enqueue({
    entity: 'note',
    op: 'update',
    articleId: existing.article_id,
    recordId: id,
    payload: { content },
  })
  void flushQueue()
}

export async function deleteNoteLocal(id: string): Promise<void> {
  const store = await txStore(STORE_NOTES, 'readwrite')
  const existing = await reqAsPromise(store.get(id)) as Note | undefined
  if (!existing) return
  await reqAsPromise(store.put({ ...existing, _deleted: true }))
  await enqueue({
    entity: 'note',
    op: 'delete',
    articleId: existing.article_id,
    recordId: id,
  })
  void flushQueue()
}

// ── Sync engine ────────────────────────────────────────────────────

let flushing = false
const listeners = new Set<() => void>()

export function onSync(cb: () => void): () => void {
  listeners.add(cb)
  return () => { listeners.delete(cb) }
}
function notifySync() { listeners.forEach((cb) => cb()) }

function isOnline(): boolean {
  if (typeof navigator === 'undefined') return true
  return navigator.onLine !== false
}

async function executeMutation(item: QueueItem): Promise<void> {
  if (item.entity === 'highlight') {
    if (item.op === 'create') {
      const res = await fetch(`/api/articles/${item.articleId}/highlights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      })
      if (!res.ok) throw new Error(`POST highlight failed (${res.status})`)
      // Server may have generated a new updated_at — refresh local copy
      const { highlight } = await res.json()
      if (highlight) await put(STORE_HIGHLIGHTS, highlight)
    } else if (item.op === 'update') {
      const res = await fetch(`/api/highlights/${item.recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      })
      if (!res.ok && res.status !== 404) throw new Error(`PATCH highlight failed (${res.status})`)
    } else if (item.op === 'delete') {
      const res = await fetch(`/api/highlights/${item.recordId}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 404) throw new Error(`DELETE highlight failed (${res.status})`)
      await del(STORE_HIGHLIGHTS, item.recordId)
    }
  } else if (item.entity === 'note') {
    if (item.op === 'create') {
      const res = await fetch(`/api/articles/${item.articleId}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      })
      if (!res.ok) throw new Error(`POST note failed (${res.status})`)
      const { note } = await res.json()
      if (note) await put(STORE_NOTES, note)
    } else if (item.op === 'update') {
      const res = await fetch(`/api/notes/${item.recordId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.payload),
      })
      if (!res.ok && res.status !== 404) throw new Error(`PATCH note failed (${res.status})`)
    } else if (item.op === 'delete') {
      const res = await fetch(`/api/notes/${item.recordId}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 404) throw new Error(`DELETE note failed (${res.status})`)
      await del(STORE_NOTES, item.recordId)
    }
  }
}

export async function flushQueue(): Promise<void> {
  if (flushing || !isOnline()) return
  flushing = true
  try {
    const items = (await getAll<QueueItem>(STORE_QUEUE)).sort(
      (a, b) => a.createdAt - b.createdAt
    )
    let progressed = false
    for (const item of items) {
      try {
        await executeMutation(item)
        await del(STORE_QUEUE, item.id)
        progressed = true
      } catch (err) {
        // Bump attempt; on too many fails for a clearly-bad payload, drop it
        const updated = { ...item, attempts: item.attempts + 1 }
        await put(STORE_QUEUE, updated)
        // Stop on first failure — likely network. We'll retry on next online event.
        break
      }
    }
    if (progressed) notifySync()
  } finally {
    flushing = false
  }
}

export async function pendingMutationCount(): Promise<number> {
  try {
    const items = await getAll<QueueItem>(STORE_QUEUE)
    return items.length
  } catch {
    return 0
  }
}

// Auto-flush hook — call once from a top-level client component
let installed = false
export function installSync(): void {
  if (installed || typeof window === 'undefined') return
  installed = true
  window.addEventListener('online', () => { void flushQueue() })
  // Flush opportunistically when the tab regains focus
  window.addEventListener('focus', () => { void flushQueue() })
  // First-load drain
  setTimeout(() => { void flushQueue() }, 500)
}
