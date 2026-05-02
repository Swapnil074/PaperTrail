import { clsx, type ClassValue } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function getDomain(url: string): string {
  try {
    return new URL(url).hostname.replace('www.', '')
  } catch {
    return url
  }
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  try {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateStr))
  } catch {
    return ''
  }
}

export function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
  return `${Math.floor(diffDays / 365)}y ago`
}

export function estimateReadingTime(content: string): number {
  const words = content.replace(/<[^>]+>/g, '').split(/\s+/).length
  return Math.max(1, Math.ceil(words / 200))
}

export const HIGHLIGHT_COLORS: Record<string, { bg: string; text: string }> = {
  yellow: { bg: 'bg-yellow-200', text: 'text-yellow-900' },
  green: { bg: 'bg-green-200', text: 'text-green-900' },
  blue: { bg: 'bg-blue-200', text: 'text-blue-900' },
  pink: { bg: 'bg-pink-200', text: 'text-pink-900' },
  purple: { bg: 'bg-purple-200', text: 'text-purple-900' },
}

export const HIGHLIGHT_COLOR_HEX: Record<string, string> = {
  yellow: '#fef08a',
  green: '#bbf7d0',
  blue: '#bfdbfe',
  pink: '#fbcfe8',
  purple: '#e9d5ff',
}
