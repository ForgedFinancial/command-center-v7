import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'cc7-bg-theme'

export const THEMES = [
  { id: 'default', name: 'Default', value: 'var(--bg-primary)', isDefault: true },
  { id: 'white', name: 'White', value: '#FFFFFF', light: true },
  { id: 'tokyo-midnight', name: 'Tokyo Midnight', value: '#1a1a2e', light: false },
  { id: 'off-white', name: 'Off White', value: '#FAF9F6', light: true },
  { id: 'cream', name: 'Cream', value: '#FFFDD0', light: true },
  { id: 'black', name: 'Black', value: '#000000', light: false },
  { id: 'gun-metal', name: 'Gun Metal', value: '#2a3439', light: false },
  { id: 'silver', name: 'Silver', value: '#C0C0C0', light: true },
  { id: 'black-gold', name: 'Black & Gold', value: 'linear-gradient(135deg, #000000, #FFD700)', light: false, isGradient: true },
]

export function useTheme() {
  const [themeId, setThemeId] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'default'
  })

  const theme = THEMES.find(t => t.id === themeId) || THEMES[0]

  const selectTheme = useCallback((id) => {
    setThemeId(id)
    localStorage.setItem(STORAGE_KEY, id)
  }, [])

  // Apply theme to document
  useEffect(() => {
    const root = document.documentElement
    if (theme.isDefault) {
      root.style.removeProperty('--cc7-bg-override')
      root.removeAttribute('data-cc7-light')
    } else {
      root.style.setProperty('--cc7-bg-override', theme.value)
      if (theme.light) {
        root.setAttribute('data-cc7-light', 'true')
      } else {
        root.removeAttribute('data-cc7-light')
      }
    }
  }, [theme])

  return { themeId, theme, selectTheme, themes: THEMES }
}
