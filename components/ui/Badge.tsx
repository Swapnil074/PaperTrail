import { cn } from '@/lib/utils'

interface BadgeProps {
  children: React.ReactNode
  variant?: 'default' | 'reading' | 'read' | 'archived' | 'unread'
  className?: string
}

const variants = {
  default: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  unread:  'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
  reading: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  read:    'bg-green-50 text-green-700 dark:bg-green-950/40 dark:text-green-300',
  archived:'bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400',
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
