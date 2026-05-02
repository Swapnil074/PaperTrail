'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

export type Theme = 'light' | 'dark' | 'system'
type Resolved = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: Resolved
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
})

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext)
}

function readStored(): Theme {
  if (typeof window === 'undefined') return 'system'
  try {
    const v = window.localStorage.getItem('theme')
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {}
  return 'system'
}

function systemPrefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [resolvedTheme, setResolvedTheme] = useState<Resolved>('light')

  // Hydrate from storage once
  useEffect(() => {
    setThemeState(readStored())
  }, [])

  // Apply class + listen to system changes
  useEffect(() => {
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const apply = () => {
      const next: Resolved = theme === 'system' ? (mql.matches ? 'dark' : 'light') : theme
      const root = document.documentElement
      root.classList.toggle('dark', next === 'dark')
      root.style.colorScheme = next
      setResolvedTheme(next)
    }
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    try { window.localStorage.setItem('theme', t) } catch {}
    setThemeState(t)
  }, [])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

// Inline script to set the .dark class before hydration — prevents FOUC.
// Render this in <head>.
export function ThemePreloadScript() {
  const code = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;if(d){r.classList.add('dark');r.style.colorScheme='dark';}else{r.style.colorScheme='light';}}catch(e){}})();`
  return <script dangerouslySetInnerHTML={{ __html: code }} />
}
