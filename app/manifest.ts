import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'PaperTrail',
    short_name: 'PaperTrail',
    description: 'Your Second Brain Reader — save, read, highlight, annotate',
    start_url: '/',
    display: 'standalone',
    background_color: '#fafafa',
    theme_color: '#18181b',
    orientation: 'portrait-primary',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    categories: ['productivity', 'utilities'],
    shortcuts: [
      {
        name: 'Unread',
        url: '/?status=unread',
        description: 'Open unread articles',
      },
    ],
  }
}
