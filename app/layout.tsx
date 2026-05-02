import type { Metadata, Viewport } from 'next'
import './globals.css'
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar'
import { ThemeProvider, ThemePreloadScript } from '@/components/ThemeProvider'

export const metadata: Metadata = {
  title: 'PaperTrail — Your Second Brain Reader',
  description: 'Save links via Telegram, read them in a clean UI, highlight, annotate, and summarize with AI.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PaperTrail',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Allow zoom for accessibility on mobile
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fafafa' },
    { media: '(prefers-color-scheme: dark)', color: '#09090b' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full" suppressHydrationWarning>
      <head>
        <ThemePreloadScript />
      </head>
      <body className="min-h-full flex flex-col bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors">
        <ThemeProvider>
          <ServiceWorkerRegistrar />
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
