'use client'

import { useEffect } from 'react'
import { installSync } from '@/lib/offline-db'

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // SW registration failures are non-fatal
      })
    }
    // Drain pending mutations on online/focus
    installSync()
  }, [])

  return null
}
