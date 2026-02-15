// ========================================
// RADIAL ORG CHART — Constants & Design Tokens
// All magic numbers, colors, orbit radii, theme palettes
// ========================================

export const SVG_SIZE = 1000
export const SVG_CENTER = SVG_SIZE / 2 // 500

// Orbit radii (SVG units from center)
export const ORBITS = {
  CENTER: 0,
  ORBIT_1: 160,
  ORBIT_2: 300,
  ORBIT_3: 420,
}

// Node circle radii by orbit tier
export const NODE_RADIUS = {
  0: 45,
  1: 36,
  2: 30,
  3: 24,
}

// Typography sizes by orbit tier
export const FONT_SIZES = {
  0: { name: 16, role: 11, weight: 700 },
  1: { name: 14, role: 10, weight: 600 },
  2: { name: 13, role: 10, weight: 600 },
  3: { name: 11, role: 9, weight: 600 },
}

// Active/offline drift multipliers
export const DRIFT = {
  active: 0.92,
  offline: 1.12,
  default: 1.0,
}

// Node color tiers
export const NODE_COLORS = {
  ceo: {
    stroke: '#f59e0b',
    gradientInner: '#1a1000',
    gradientOuter: '#0d0800',
    glow: 'rgba(245,158,11,0.25)',
    glowRadius: 30,
  },
  coo: {
    stroke: '#3b82f6',
    gradientInner: '#0a1a2a',
    gradientOuter: '#060d18',
    glow: 'rgba(59,130,246,0.2)',
    glowRadius: 20,
  },
  deptHead: {
    stroke: '#8b5cf6',
    gradientInner: '#120a20',
    gradientOuter: '#0d0b1a',
    glow: 'rgba(139,92,246,0.15)',
    glowRadius: 15,
  },
  specialist: {
    stroke: '#10b981',
    gradientInner: '#0a1510',
    gradientOuter: '#060d0a',
    glow: 'rgba(16,185,129,0.12)',
    glowRadius: 12,
  },
}

// Map agent IDs to color tiers
export function getNodeColorTier(agentId) {
  if (agentId === 'ceo') return 'ceo'
  if (agentId === 'clawd') return 'coo'
  if (['architect', 'mason', 'sentinel'].includes(agentId)) return 'deptHead'
  return 'specialist'
}

// Status colors
export const STATUS_COLORS = {
  online: '#4ade80',
  active: '#4ade80',
  busy: '#fbbf24',
  error: '#ef4444',
  offline: '#6b7280',
  defined: '#6b7280',
}

// Connection line specs
export const CONNECTION = {
  baseStroke: 'rgba(255,255,255,0.06)',
  baseWidth: 1.5,
  pulseActiveStroke: 'rgba(0,212,255,0.15)',
  pulseDotRadius: 4,
  pulseDotColor: '#00d4ff',
  pulseDotGlow: 'drop-shadow(0 0 6px #00d4ff)',
  travelDuration: 1200,
  travelEasing: 'cubic-bezier(0.4, 0, 0.2, 1)',
  frequencyActive: [3000, 5000],
  frequencyIdle: [8000, 12000],
}

// Pulse colors by type
export const PULSE_COLORS = {
  delegation: '#00d4ff',
  inspection: '#f59e0b',
  error: '#ef4444',
  heartbeat: 'rgba(255,255,255,0.3)',
}

// Animation timing
export const ANIMATION = {
  recenterDuration: 600,
  recenterEasing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  entranceBase: 400,
  entranceStagger: 100,
  connectionDrawDuration: 600,
  connectionDrawDelay: 400,
  detailPanelOpen: 300,
  detailPanelClose: 200,
  hoverDim: 200,
  breathCycle: 2500,
  busySpin: 1500,
  errorBlink: 1000,
  maxSimultaneousPulses: 3,
}

// Detail panel
export const DETAIL_PANEL = {
  width: 320,
  blur: 20,
  border: '1px solid rgba(255,255,255,0.08)',
}

// Theme palettes — org chart specific
export const THEME_PALETTES = {
  forge:    { void: '#050508', panel: 'rgba(10,22,40,0.85)', panelSolid: '#0a1628', text: '#e4e4e7', textMuted: '#71717a', border: 'rgba(255,255,255,0.06)', orbitStroke: 'rgba(255,255,255,0.08)', isLight: false },
  charcoal: { void: '#080808', panel: 'rgba(20,20,20,0.85)', panelSolid: '#141414', text: '#ffffff', textMuted: '#737373', border: 'rgba(255,255,255,0.08)', orbitStroke: 'rgba(255,255,255,0.08)', isLight: false },
  tokyo:    { void: '#0d0e1a', panel: 'rgba(26,27,38,0.85)', panelSolid: '#1a1b26', text: '#c0caf5', textMuted: '#565f89', border: 'rgba(255,255,255,0.08)', orbitStroke: 'rgba(127,127,255,0.08)', isLight: false },
  steel:    { void: '#0a0b10', panel: 'rgba(28,30,38,0.85)', panelSolid: '#1c1e26', text: '#d4d4d8', textMuted: '#71717a', border: 'rgba(255,255,255,0.08)', orbitStroke: 'rgba(255,255,255,0.08)', isLight: false },
  offwhite: { void: '#e8e8ec', panel: 'rgba(255,255,255,0.9)', panelSolid: '#ffffff', text: '#1a1a2e', textMuted: '#6b7280', border: 'rgba(0,0,0,0.1)', orbitStroke: 'rgba(0,0,0,0.08)', isLight: true },
  white:    { void: '#f0f0f4', panel: 'rgba(255,255,255,0.95)', panelSolid: '#ffffff', text: '#0f0f1a', textMuted: '#6b7280', border: 'rgba(0,0,0,0.08)', orbitStroke: 'rgba(0,0,0,0.06)', isLight: true },
}

// Light theme overrides for node colors
export const LIGHT_NODE_COLORS = {
  ceo: {
    stroke: '#d97706',
    gradientInner: '#fef3c7',
    gradientOuter: '#fde68a',
    glow: 'rgba(217,119,6,0.2)',
    glowRadius: 30,
  },
  coo: {
    stroke: '#2563eb',
    gradientInner: '#dbeafe',
    gradientOuter: '#bfdbfe',
    glow: 'rgba(37,99,235,0.15)',
    glowRadius: 20,
  },
  deptHead: {
    stroke: '#7c3aed',
    gradientInner: '#ede9fe',
    gradientOuter: '#ddd6fe',
    glow: 'rgba(124,58,237,0.12)',
    glowRadius: 15,
  },
  specialist: {
    stroke: '#059669',
    gradientInner: '#d1fae5',
    gradientOuter: '#a7f3d0',
    glow: 'rgba(5,150,105,0.1)',
    glowRadius: 12,
  },
}

// Light theme pulse colors
export const LIGHT_PULSE_COLORS = {
  delegation: '#0284c7',
  inspection: '#d97706',
  error: '#dc2626',
  heartbeat: 'rgba(0,0,0,0.2)',
}

export const LIGHT_CONNECTION = {
  baseStroke: 'rgba(0,0,0,0.08)',
  pulseActiveStroke: 'rgba(2,132,199,0.15)',
  pulseDotColor: '#0284c7',
  pulseDotGlow: 'drop-shadow(0 0 6px #0284c7)',
}
