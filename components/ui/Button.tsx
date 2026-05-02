import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes, forwardRef } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'sm' | 'md' | 'lg' | 'icon'
}

const variants = {
  primary:
    'bg-zinc-900 text-white hover:bg-zinc-700 active:bg-zinc-800 ' +
    'dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 dark:active:bg-zinc-300',
  secondary:
    'bg-zinc-100 text-zinc-900 hover:bg-zinc-200 active:bg-zinc-300 ' +
    'dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700 dark:active:bg-zinc-600',
  ghost:
    'text-zinc-600 hover:bg-zinc-100 active:bg-zinc-200 ' +
    'dark:text-zinc-300 dark:hover:bg-zinc-800 dark:active:bg-zinc-700',
  danger:
    'bg-red-50 text-red-600 hover:bg-red-100 active:bg-red-200 ' +
    'dark:bg-red-950/40 dark:text-red-400 dark:hover:bg-red-950/60',
}

const sizes = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-base',
  icon: 'h-8 w-8',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'secondary', size = 'md', className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-500',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
)

Button.displayName = 'Button'
