export const BOARD_THEME = {
  canvasBg: '#0a0a0a',
  secondaryBg: '#0d0d0d',
  panelBg: '#111827',
  itemBg: '#1a1f2e',
  elevated: '#1e2538',
  border: 'rgba(255,255,255,0.08)',
  activeBorder: '#3b82f6',
  glow: '#06b6d4',
  accentBlue: '#3b82f6',
  accentCyan: '#06b6d4',
  accentPurple: '#8b5cf6',
  textPrimary: '#f9fafb',
  textSecondary: '#9ca3af',
  textMuted: '#4b5563',
}

export const GRID_BASE_SIZE = 24
export const MIN_ZOOM = 0.1
export const MAX_ZOOM = 5
export const DEFAULT_VIEWPORT = { x: 0, y: 0, zoom: 1 }

export const DEFAULT_ITEMS = [
  {
    id: crypto.randomUUID(),
    type: 'sticky_note',
    x: -140,
    y: -100,
    width: 220,
    height: 180,
    rotation: 0,
    content: 'Double-click to edit',
    style: { fillColor: 'yellow', fontSize: 14, textAlign: 'left' },
  },
  {
    id: crypto.randomUUID(),
    type: 'shape',
    shape: 'rectangle',
    x: 140,
    y: -80,
    width: 190,
    height: 130,
    rotation: 0,
    content: 'Shape label',
    style: { borderColor: '#06b6d4', borderWidth: 2, color: '#f9fafb' },
  },
  {
    id: crypto.randomUUID(),
    type: 'text',
    x: -40,
    y: 170,
    width: 260,
    height: 72,
    rotation: 0,
    content: 'Text block\nResizable + rotatable',
    style: { fontSize: 16, color: '#f9fafb', textAlign: 'left' },
  },
]
