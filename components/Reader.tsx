'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Check, Highlighter } from 'lucide-react'
import { HIGHLIGHT_COLOR_HEX } from '@/lib/utils'
import type { Highlight, HighlightColor } from '@/types'

interface ReaderProps {
  content: string
  highlights: Highlight[]
  onHighlight: (text: string, start: number, end: number, color: HighlightColor) => Promise<Highlight | null>
  onHighlightUpdate: (id: string, note: string) => void
  onHighlightDelete: (id: string) => void
}

const DEFAULT_COLOR: HighlightColor = 'yellow'

const MERMAID_PATTERN =
  /^(graph\s|flowchart\s|sequenceDiagram|gantt|classDiagram|stateDiagram(-v2)?|pie(\s|$)|erDiagram|journey|gitGraph|mindmap|timeline|block-beta|xychart-beta|quadrantChart|sankey-beta)/m

// ── Outside component: no stale-closure risk ───────────────────────
function getTextOffset(container: Node, node: Node, offset: number): number {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
  let total = 0
  let current: Node | null
  while ((current = walker.nextNode())) {
    if (current === node) return total + offset
    total += current.textContent?.length ?? 0
  }
  return total + offset
}

// Splits text nodes and wraps the target range in a <mark> — no surroundContents
function applyHighlightToDOM(container: HTMLElement, h: Highlight): void {
  const colorHex = HIGHLIGHT_COLOR_HEX[h.color] ?? HIGHLIGHT_COLOR_HEX.yellow
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)

  let charCount = 0
  const toMark: Array<{ node: Text; localStart: number; localEnd: number }> = []

  let current: Node | null
  while ((current = walker.nextNode())) {
    const text = current as Text

    // Skip script/style descendants
    let anc: Node | null = text.parentNode
    let skip = false
    while (anc && anc !== container) {
      const tag = (anc as HTMLElement).tagName?.toLowerCase()
      if (tag === 'script' || tag === 'style') { skip = true; break }
      anc = anc.parentNode
    }
    if (skip) { charCount += text.length; continue }

    const nodeEnd = charCount + text.length
    if (nodeEnd > h.start_offset && charCount < h.end_offset) {
      toMark.push({
        node: text,
        localStart: Math.max(0, h.start_offset - charCount),
        localEnd: Math.min(text.length, h.end_offset - charCount),
      })
    }
    charCount += text.length
    if (charCount >= h.end_offset) break
  }

  // Process in reverse so earlier sibling offsets stay valid
  for (const { node, localStart, localEnd } of toMark.reverse()) {
    try {
      const fullText = node.textContent ?? ''
      const before = fullText.slice(0, localStart)
      const mid = fullText.slice(localStart, localEnd)
      const after = fullText.slice(localEnd)

      const mark = document.createElement('mark')
      mark.dataset.highlightId = h.id
      // Only color is inline; layout-affecting styles live in globals.css
      mark.style.background = colorHex
      if (h.note) mark.dataset.hasNote = '1'
      mark.textContent = mid

      const frag = document.createDocumentFragment()
      if (before) frag.appendChild(document.createTextNode(before))
      frag.appendChild(mark)
      if (after) frag.appendChild(document.createTextNode(after))

      node.parentNode!.replaceChild(frag, node)
    } catch {
      // skip malformed nodes
    }
  }
}

// ── Mermaid (outside to keep component lean) ──────────────────────
function renderMermaid(container: HTMLElement) {
  const explicit = Array.from(
    container.querySelectorAll<HTMLElement>(
      '.mermaid, .language-mermaid, [data-lang="mermaid"], code[class*="mermaid"]'
    )
  )
  const codeBlocks = Array.from(
    container.querySelectorAll<HTMLElement>('pre code, pre')
  ).filter((el) => !explicit.includes(el) && MERMAID_PATTERN.test(el.textContent?.trim() ?? ''))

  const candidates = [...explicit, ...codeBlocks]
  if (candidates.length === 0) return

  import('mermaid').then(({ default: mermaid }) => {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'neutral',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      flowchart: { curve: 'basis', useMaxWidth: true },
    })
    candidates.forEach(async (el, idx) => {
      const code = el.textContent?.trim()
      if (!code) return
      const target = el.tagName === 'CODE' && el.parentElement?.tagName === 'PRE' ? el.parentElement : el
      if ((target as HTMLElement).dataset.mermaidRendered) return
      ;(target as HTMLElement).dataset.mermaidRendered = '1'
      try {
        const { svg } = await mermaid.render(`mermaid-${Date.now()}-${idx}`, code)
        const wrapper = document.createElement('div')
        wrapper.className = 'mermaid-diagram'
        wrapper.innerHTML = svg
        target.replaceWith(wrapper)
      } catch {
        delete (target as HTMLElement).dataset.mermaidRendered
      }
    })
  })
}

// ── Main component ─────────────────────────────────────────────────
export function Reader({
  content,
  highlights,
  onHighlight,
  onHighlightUpdate,
  onHighlightDelete,
}: ReaderProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Floating toolbar shown when the user has an active text selection
  const [selectionBar, setSelectionBar] = useState<{
    text: string; start: number; end: number; x: number; y: number
  } | null>(null)

  // Popover shown when clicking an existing highlight
  const [commentPopover, setCommentPopover] = useState<{
    highlight: Highlight; x: number; y: number
  } | null>(null)
  const [noteInput, setNoteInput] = useState('')

  // Undo toast
  const [undoId, setUndoId] = useState<string | null>(null)
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Refs so document-level handlers avoid stale closures
  const commentPopoverRef = useRef<typeof commentPopover>(null)
  useEffect(() => { commentPopoverRef.current = commentPopover }, [commentPopover])

  function showUndo(id: string) {
    if (undoTimer.current) clearTimeout(undoTimer.current)
    setUndoId(id)
    undoTimer.current = setTimeout(() => setUndoId(null), 4000)
  }
  function handleUndo() {
    if (!undoId) return
    if (undoTimer.current) clearTimeout(undoTimer.current)
    onHighlightDelete(undoId)
    setUndoId(null)
  }
  useEffect(() => () => { if (undoTimer.current) clearTimeout(undoTimer.current) }, [])

  // ── Set HTML ────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return
    containerRef.current.innerHTML = content ?? ''
    renderMermaid(containerRef.current)
  }, [content])

  // ── Apply highlight marks ───────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.querySelectorAll('mark[data-highlight-id]').forEach((mark) => {
      const parent = mark.parentNode
      if (!parent) return
      while (mark.firstChild) parent.insertBefore(mark.firstChild, mark)
      parent.removeChild(mark)
      parent.normalize()
    })

    const sorted = [...highlights].sort((a, b) => a.start_offset - b.start_offset)
    for (const h of sorted) applyHighlightToDOM(container, h)
  }, [highlights, content])

  // ── Selection toolbar — works on both mouse and touch ─────────
  useEffect(() => {
    let touchDebounce: ReturnType<typeof setTimeout> | null = null

    function processSelection() {
      if (commentPopoverRef.current) return
      const container = containerRef.current
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed || !container) { setSelectionBar(null); return }
      const range = sel.getRangeAt(0)
      if (!container.contains(range.commonAncestorContainer)) { setSelectionBar(null); return }
      const text = sel.toString().trim()
      if (!text || text.length < 2) { setSelectionBar(null); return }
      const anc = range.commonAncestorContainer as HTMLElement
      if (anc.closest?.('mark[data-highlight-id]')) { setSelectionBar(null); return }
      const start = getTextOffset(container, range.startContainer, range.startOffset)
      const end   = getTextOffset(container, range.endContainer,   range.endOffset)
      if (start >= end) { setSelectionBar(null); return }
      const rect = range.getBoundingClientRect()
      const toolbarH = 40, gap = 6
      const yAbove = rect.top - toolbarH - gap
      const y = yAbove >= 8 ? yAbove : rect.bottom + gap
      setSelectionBar({ text, start, end, x: rect.left + rect.width / 2, y })
    }

    // Mouse: respond immediately on release
    function onMouseUp(e: MouseEvent) {
      if ((e.target as HTMLElement).closest('[data-popup]')) return
      processSelection()
    }

    // Touch: selectionchange fires while handles are being dragged — debounce
    // so we only show the toolbar once the selection has stabilised
    function onSelectionChange() {
      if (touchDebounce) clearTimeout(touchDebounce)
      touchDebounce = setTimeout(processSelection, 350)
    }

    document.addEventListener('mouseup', onMouseUp)
    document.addEventListener('selectionchange', onSelectionChange)
    return () => {
      document.removeEventListener('mouseup', onMouseUp)
      document.removeEventListener('selectionchange', onSelectionChange)
      if (touchDebounce) clearTimeout(touchDebounce)
    }
  }, [])

  // ── Pointerdown outside popups → dismiss everything ────────────
  // pointerdown covers both mouse clicks and touch taps
  useEffect(() => {
    function onPointerDown(e: PointerEvent) {
      if ((e.target as HTMLElement).closest('[data-popup]')) return
      setCommentPopover(null)
      setSelectionBar(null)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

  // ── Confirm highlight from toolbar ─────────────────────────────
  async function handleConfirmHighlight() {
    if (!selectionBar) return
    const { text, start, end } = selectionBar
    setSelectionBar(null)
    window.getSelection()?.removeAllRanges()
    const created = await onHighlight(text, start, end, DEFAULT_COLOR)
    if (created) showUndo(created.id)
  }

  // ── Click existing mark → comment popover ──────────────────────
  function handleClick(e: React.MouseEvent) {
    const mark = (e.target as HTMLElement).closest('mark[data-highlight-id]') as HTMLElement | null
    if (!mark) return
    const h = highlights.find((h) => h.id === mark.dataset.highlightId)
    if (!h) return
    const rect = mark.getBoundingClientRect()
    setCommentPopover({ highlight: h, x: rect.left + rect.width / 2, y: rect.bottom + 8 })
    setNoteInput(h.note ?? '')
  }

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="reader-prose selection:bg-yellow-200/70 dark:selection:bg-yellow-300/40"
        onClick={handleClick}
      />

      {/* Selection toolbar */}
      {selectionBar && (
        <SelectionToolbar
          x={selectionBar.x}
          y={selectionBar.y}
          onHighlight={handleConfirmHighlight}
          onDismiss={() => {
            setSelectionBar(null)
            window.getSelection()?.removeAllRanges()
          }}
        />
      )}

      {/* Comment popover */}
      {commentPopover && (
        <CommentPopover
          highlight={commentPopover.highlight}
          x={commentPopover.x}
          y={commentPopover.y}
          noteInput={noteInput}
          onNoteChange={setNoteInput}
          onSave={() => {
            onHighlightUpdate(commentPopover.highlight.id, noteInput)
            setCommentPopover(null)
          }}
          onDelete={() => {
            onHighlightDelete(commentPopover.highlight.id)
            setCommentPopover(null)
          }}
          onClose={() => setCommentPopover(null)}
        />
      )}

      {/* Undo toast */}
      {undoId && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 flex items-center gap-3 rounded-full border border-zinc-200 bg-white px-4 py-2.5 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
          <span className="text-sm text-zinc-700 dark:text-zinc-200">Highlighted</span>
          <button
            onClick={handleUndo}
            className="text-sm font-semibold text-zinc-900 hover:text-zinc-600 dark:text-zinc-50 dark:hover:text-zinc-300 transition-colors underline underline-offset-2"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  )
}

// ── Selection toolbar ──────────────────────────────────────────────
function SelectionToolbar({
  x, y, onHighlight, onDismiss,
}: {
  x: number; y: number
  onHighlight: () => void
  onDismiss: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  useEffect(() => {
    if (!ref.current) return
    const { width } = ref.current.getBoundingClientRect()
    const clampedX = Math.max(8, Math.min(x - width / 2, window.innerWidth - width - 8))
    setPos({ x: clampedX, y })
  }, [x, y])

  return (
    <div
      ref={ref}
      data-popup
      className="fixed z-50 flex items-center gap-0.5 rounded-lg border border-zinc-700 bg-zinc-900 px-1 py-1 shadow-xl"
      style={{ left: pos.x, top: pos.y }}
    >
      <button
        onPointerDown={(e) => e.preventDefault()}
        onClick={onHighlight}
        className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 transition-colors"
      >
        <Highlighter className="h-3.5 w-3.5 text-yellow-400" />
        Highlight
      </button>
      <div className="mx-0.5 h-4 w-px bg-zinc-700" />
      <button
        onPointerDown={(e) => e.preventDefault()}
        onClick={onDismiss}
        className="flex items-center justify-center h-7 w-7 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
        title="Dismiss"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// ── Comment popover ────────────────────────────────────────────────
interface CommentPopoverProps {
  highlight: Highlight
  x: number
  y: number
  noteInput: string
  onNoteChange: (v: string) => void
  onSave: () => void
  onDelete: () => void
  onClose: () => void
}

function CommentPopover({
  highlight, x, y, noteInput, onNoteChange, onSave, onDelete, onClose,
}: CommentPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [pos, setPos] = useState({ x, y })

  useEffect(() => {
    if (!ref.current) return
    const { width } = ref.current.getBoundingClientRect()
    const clampedX = Math.max(8, Math.min(x - width / 2, window.innerWidth - width - 8))
    setPos({ x: clampedX, y })
  }, [x, y])

  const colorHex = HIGHLIGHT_COLOR_HEX[highlight.color] ?? HIGHLIGHT_COLOR_HEX.yellow

  return (
    <div
      ref={ref}
      data-popup
      className="fixed z-50 w-72 max-w-[calc(100vw-1rem)] rounded-xl border border-zinc-200 bg-white shadow-xl overflow-hidden dark:border-zinc-700 dark:bg-zinc-900"
      style={{ left: pos.x, top: pos.y }}
    >
      {/* Excerpt */}
      <div
        className="px-4 py-2.5 text-xs text-zinc-600 italic leading-relaxed border-b border-zinc-100 wrap-break-word dark:text-zinc-400 dark:border-zinc-800"
        style={{ borderLeft: `3px solid ${colorHex}`, background: `${colorHex}20` }}
      >
        "{highlight.text.length > 100 ? highlight.text.slice(0, 100) + '…' : highlight.text}"
      </div>

      {/* Existing note */}
      {highlight.note && (
        <div className="flex items-start gap-2.5 px-4 py-3 border-b border-zinc-100 dark:border-zinc-800">
          <div className="h-6 w-6 shrink-0 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold mt-0.5 dark:bg-zinc-100 dark:text-zinc-900">
            S
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-zinc-700 mb-0.5 dark:text-zinc-200">You</p>
            <p className="text-sm text-zinc-600 leading-relaxed wrap-break-word dark:text-zinc-300">{highlight.note}</p>
          </div>
        </div>
      )}

      {/* Note input */}
      <div className="flex items-start gap-2 px-3 py-2.5 bg-zinc-50 dark:bg-zinc-950/50">
        <div className="h-6 w-6 shrink-0 rounded-full bg-zinc-900 flex items-center justify-center text-white text-xs font-bold mt-1 dark:bg-zinc-100 dark:text-zinc-900">
          S
        </div>
        <div className="flex flex-1 items-end gap-1.5 min-w-0">
          <textarea
            rows={2}
            value={noteInput}
            onChange={(e) => onNoteChange(e.target.value)}
            placeholder={highlight.note ? 'Edit note…' : 'Add a comment…'}
            onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) onSave() }}
            className="flex-1 resize-none rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-sm text-zinc-700 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 transition dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500"
            autoFocus
          />
          <button
            onClick={onSave}
            className="h-7 w-7 shrink-0 flex items-center justify-center rounded-full bg-zinc-900 text-white hover:bg-zinc-700 transition dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            aria-label="Save note"
          >
            <Check className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Delete */}
      <div className="flex justify-end px-4 py-2 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={onDelete}
          className="text-xs text-red-400 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors"
        >
          Remove highlight
        </button>
      </div>

      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute right-2 top-2 p-0.5 rounded text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:text-zinc-500 dark:hover:text-zinc-300 dark:hover:bg-zinc-800 transition"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}
