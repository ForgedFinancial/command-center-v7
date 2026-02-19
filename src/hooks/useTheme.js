import { useState, useEffect, useCallback, useMemo } from 'react'

const STORAGE_KEY = 'cc7-bg-theme'
const DEFAULT_THEME = 'obsidian'

// Migration map: old theme ids → new theme ids
const MIGRATION_MAP = {
  'default': 'obsidian',
  'white': 'arctic',
  'tokyo-midnight': 'obsidian',
  'off-white': 'sandstorm',
  'cream': 'sandstorm',
  'black': 'phantom',
  'gun-metal': 'titanium',
  'silver': 'arctic',
}

// Complete theme definitions for the picker UI
export const THEME_DEFINITIONS = {
  obsidian: {
    name: 'Obsidian',
    emoji: '⬛',
    category: 'dark',
    vibe: 'Professional Focus',
    colors: {
      bg: '#0f172a',
      surface: '#1e293b',
      sidebar: '#0b1120',
      accent: '#3b82f6',
      textPrimary: '#f1f5f9',
      textSecondary: '#94a3b8',
    },
  },
  'deep-ocean': {
    name: 'Deep Ocean',
    emoji: '🌊',
    category: 'rich',
    vibe: 'Oceanic Depth',
    colors: {
      bg: '#0a1628',
      surface: '#122240',
      sidebar: '#06101e',
      accent: '#0ea5e9',
      textPrimary: '#e0f2fe',
      textSecondary: '#7dd3fc',
    },
  },
  phantom: {
    name: 'Phantom',
    emoji: '👻',
    category: 'dark',
    vibe: 'Minimal Power',
    colors: {
      bg: '#101010',
      surface: '#1a1a1a',
      sidebar: '#0a0a0a',
      accent: '#a78bfa',
      textPrimary: '#e5e5e5',
      textSecondary: '#a3a3a3',
    },
  },
  'midnight-ember': {
    name: 'Midnight Ember',
    emoji: '🌹',
    category: 'rich',
    vibe: 'Warm Noir',
    colors: {
      bg: '#1a1015',
      surface: '#261a20',
      sidebar: '#140c10',
      accent: '#f472b6',
      textPrimary: '#fce4ec',
      textSecondary: '#c48b9f',
    },
  },
  evergreen: {
    name: 'Evergreen',
    emoji: '🌲',
    category: 'rich',
    vibe: 'Forest Calm',
    colors: {
      bg: '#0c1a14',
      surface: '#152e22',
      sidebar: '#081410',
      accent: '#34d399',
      textPrimary: '#ecfdf5',
      textSecondary: '#86efac',
    },
  },
  titanium: {
    name: 'Titanium',
    emoji: '⚙️',
    category: 'dark',
    vibe: 'Carbon Steel',
    colors: {
      bg: '#18181b',
      surface: '#27272a',
      sidebar: '#111114',
      accent: '#f97316',
      textPrimary: '#fafafa',
      textSecondary: '#a1a1aa',
    },
  },
  aurora: {
    name: 'Aurora',
    emoji: '🌌',
    category: 'rich',
    vibe: 'Cosmic Violet',
    colors: {
      bg: '#0f0f23',
      surface: '#191933',
      sidebar: '#0a0a1a',
      accent: '#818cf8',
      textPrimary: '#e8e8f0',
      textSecondary: '#9898c8',
    },
  },
  'noir-gold': {
    name: 'Noir Gold',
    emoji: '👑',
    category: 'dark',
    vibe: 'Black Luxury',
    colors: {
      bg: '#0d0d0d',
      surface: '#1a1a1a',
      sidebar: '#080808',
      accent: '#eab308',
      textPrimary: '#f5f5f5',
      textSecondary: '#a3a3a3',
    },
  },
  sandstorm: {
    name: 'Sandstorm',
    emoji: '☀️',
    category: 'light',
    vibe: 'Warm Paper',
    colors: {
      bg: '#faf7f2',
      surface: '#ffffff',
      sidebar: '#f0ebe3',
      accent: '#b45309',
      textPrimary: '#1c1917',
      textSecondary: '#57534e',
    },
  },
  arctic: {
    name: 'Arctic',
    emoji: '❄️',
    category: 'light',
    vibe: 'Crisp Clarity',
    colors: {
      bg: '#f8fafc',
      surface: '#ffffff',
      sidebar: '#f1f5f9',
      accent: '#0369a1',
      textPrimary: '#0f172a',
      textSecondary: '#475569',
    },
  },
  // === Gold/Black/White Luxury Collection ===
  'black-gold': {
    name: 'Black Gold',
    emoji: '🏆',
    category: 'luxury',
    vibe: 'Dark Luxury',
    colors: {
      bg: '#0a0a0a',
      surface: '#161616',
      sidebar: '#080808',
      accent: '#d4a843',
      textPrimary: '#f0e6d3',
      textSecondary: '#bfb39e',
    },
  },
  'white-gold': {
    name: 'White Gold',
    emoji: '✨',
    category: 'luxury',
    isLightTheme: true,
    vibe: 'Boardroom Elegance',
    colors: {
      bg: '#faf8f5',
      surface: '#ffffff',
      sidebar: '#f5f2ec',
      accent: '#b8922e',
      textPrimary: '#1a1714',
      textSecondary: '#4a4540',
    },
  },
  'gilt-edge': {
    name: 'Gilt Edge',
    emoji: '🥂',
    category: 'luxury',
    vibe: 'Rose Gold Power',
    colors: {
      bg: '#14120f',
      surface: '#201d19',
      sidebar: '#100e0b',
      accent: '#c9886e',
      textPrimary: '#ede4d8',
      textSecondary: '#b8ad9e',
    },
  },
  sovereign: {
    name: 'Sovereign',
    emoji: '♛',
    category: 'luxury',
    vibe: 'Platinum Empire',
    colors: {
      bg: '#050505',
      surface: '#121212',
      sidebar: '#030303',
      accent: '#c8b07a',
      textPrimary: '#e8e8e8',
      textSecondary: '#a8a8a8',
    },
  },
  // === Unexpected & Unique ===
  'neon-noir': {
    name: 'Neon Noir',
    emoji: '⚡',
    category: 'unique',
    vibe: 'Cyberpunk Terminal',
    colors: {
      bg: '#0a0a0f',
      surface: '#12121e',
      sidebar: '#08080e',
      accent: '#00e5ff',
      textPrimary: '#e0f0ff',
      textSecondary: '#8eafc8',
    },
  },
  sakura: {
    name: 'Sakura',
    emoji: '🌸',
    category: 'unique',
    vibe: 'Cherry Blossom',
    colors: {
      bg: '#120f14',
      surface: '#1e1a22',
      sidebar: '#0e0c10',
      accent: '#e8729a',
      textPrimary: '#f0e4ee',
      textSecondary: '#b8a0b4',
    },
  },
  ultraviolet: {
    name: 'Ultraviolet',
    emoji: '🔮',
    category: 'unique',
    vibe: 'Deep Space Purple',
    colors: {
      bg: '#0c0814',
      surface: '#161226',
      sidebar: '#0a0610',
      accent: '#a855f7',
      textPrimary: '#e4daf5',
      textSecondary: '#a898c4',
    },
  },
  // === The Dano Collection ===
  'lake-shore': {
    name: 'Lake Shore',
    emoji: '🏙️',
    category: 'dano',
    vibe: 'Chicago Winter',
    colors: {
      bg: '#0a0e14',
      surface: '#141c28',
      sidebar: '#080c12',
      accent: '#5ba4d9',
      textPrimary: '#dce6f0',
      textSecondary: '#8ea4be',
    },
  },
  'after-hours': {
    name: 'After Hours',
    emoji: '🌙',
    category: 'dano',
    vibe: '2AM Grind',
    colors: {
      bg: '#0c0a08',
      surface: '#1a1714',
      sidebar: '#0a0808',
      accent: '#e8a832',
      textPrimary: '#e8e0d4',
      textSecondary: '#b0a490',
    },
  },
  'south-side': {
    name: 'South Side',
    emoji: '🔴',
    category: 'dano',
    vibe: 'Industrial Grit',
    colors: {
      bg: '#121212',
      surface: '#1e1e1e',
      sidebar: '#0e0e0e',
      accent: '#d43030',
      textPrimary: '#e0e0e0',
      textSecondary: '#a0a0a0',
    },
  },
  blueprint: {
    name: 'Blueprint',
    emoji: '📐',
    category: 'dano',
    vibe: 'Builder\'s Grid',
    colors: {
      bg: '#0a0c14',
      surface: '#121828',
      sidebar: '#080a10',
      accent: '#3b82f6',
      textPrimary: '#d8e4f0',
      textSecondary: '#8098b8',
    },
  },
}

// Theme ordering for picker display
export const THEME_ORDER = {
  dark: ['obsidian', 'phantom', 'noir-gold', 'titanium'],
  rich: ['deep-ocean', 'aurora', 'evergreen', 'midnight-ember'],
  light: ['sandstorm', 'arctic'],
  luxury: ['black-gold', 'white-gold', 'gilt-edge', 'sovereign'],
  unique: ['neon-noir', 'sakura', 'ultraviolet'],
  dano: ['lake-shore', 'after-hours', 'south-side', 'blueprint'],
}

export const ALL_THEME_IDS = [
  ...THEME_ORDER.dark,
  ...THEME_ORDER.rich,
  ...THEME_ORDER.light,
  ...THEME_ORDER.luxury,
  ...THEME_ORDER.unique,
  ...THEME_ORDER.dano,
]

function migrateThemeId(id) {
  if (THEME_DEFINITIONS[id]) return id
  if (MIGRATION_MAP[id]) return MIGRATION_MAP[id]
  return DEFAULT_THEME
}

function applyThemeToDOM(themeId) {
  const html = document.documentElement

  // Add transition class
  html.classList.add('theme-transitioning')

  // Apply theme
  html.setAttribute('data-theme', themeId)

  // Remove old overrides from previous theme system
  html.style.removeProperty('--cc7-bg-override')
  html.removeAttribute('data-cc7-light')

  // Remove transition class after animation completes
  setTimeout(() => {
    html.classList.remove('theme-transitioning')
  }, 250)
}

export function useTheme() {
  const [themeId, setThemeId] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return DEFAULT_THEME
    const migrated = migrateThemeId(stored)
    // Persist migration
    if (migrated !== stored) {
      localStorage.setItem(STORAGE_KEY, migrated)
    }
    return migrated
  })

  const theme = useMemo(() => {
    const def = THEME_DEFINITIONS[themeId] || THEME_DEFINITIONS[DEFAULT_THEME]
    return {
      id: themeId,
      ...def,
      isDark: def.category !== 'light' && !def.isLightTheme,
      isLight: def.category === 'light' || !!def.isLightTheme,
    }
  }, [themeId])

  const selectTheme = useCallback((id) => {
    const validId = THEME_DEFINITIONS[id] ? id : DEFAULT_THEME
    setThemeId(validId)
    localStorage.setItem(STORAGE_KEY, validId)
  }, [])

  // Apply theme to DOM on mount and change
  useEffect(() => {
    applyThemeToDOM(themeId)
  }, [themeId])

  // Apply immediately on first load (no transition)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', themeId)
    // Clean up old theme system artifacts
    document.documentElement.style.removeProperty('--cc7-bg-override')
    document.documentElement.removeAttribute('data-cc7-light')
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    themeId,
    theme,
    selectTheme,
    themes: THEME_DEFINITIONS,
    themeOrder: THEME_ORDER,
    allThemeIds: ALL_THEME_IDS,
  }
}
