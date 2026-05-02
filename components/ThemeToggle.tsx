'use client'

import { useState, useRef, useEffect } from 'react'
import { Sun, Moon, Monitor, Check } from 'lucide-react'
import { useTheme, type Theme } from './ThemeProvider'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function dismiss(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', dismiss)
    return () => document.removeEventListener('mousedown', dismiss)
  }, [open])

  const Icon = resolvedTheme === 'dark' ? Moon : Sun

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="Toggle theme"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
      >
        <Icon className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-50 mt-1.5 w-32 overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-lg dark:border-zinc-800 dark:bg-zinc-900"
        >
          {OPTIONS.map(({ value, label, icon: I }) => {
            const active = theme === value
            return (
              <button
                key={value}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => { setTheme(value); setOpen(false) }}
                className={cn(
                  'flex w-full items-center gap-2 px-2.5 py-2 text-xs transition-colors',
                  active
                    ? 'bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-50'
                    : 'text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60'
                )}
              >
                <I className="h-3.5 w-3.5" />
                <span className="flex-1 text-left">{label}</span>
                {active && <Check className="h-3 w-3" />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
