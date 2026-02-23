// ========================================
// Tree Org Chart Constants
// Lean 4-agent hierarchy constants
// Replaces radialConstants.js
// ========================================

export const TIER_COLORS = {
  ceo: '#f59e0b',
  coo: '#3b82f6',
  department: '#a855f7',
  specialist: '#f97316',
};

export const TIER_MAP = {
  ceo: 'ceo',
  clawd: 'coo',
  codex: 'department',
  sentinel: 'department',
  kyle: 'specialist',
};

export const MODEL_DISPLAY = {
  'Human': 'Human',
  'claude-opus-4-6': 'Claude Opus 4.6',
  'claude-sonnet-4': 'Claude Sonnet 4',
  'claude-sonnet-4-6': 'Claude Sonnet 4.6',
  'codex-5.3': 'Codex 5.3',
  'openai-o3': 'OpenAI o3',
  'gpt-5.3-codex': 'Codex 5.3',
  'gpt-4o': 'GPT-4o',
  'gpt-3.5-turbo': 'GPT-3.5 Turbo',
};

export const STATUS_COLORS = {
  online: { color: '#4ade80', glow: 'rgba(74,222,128,0.5)' },
  idle: { color: '#f59e0b', glow: 'rgba(245,158,11,0.3)' },
  offline: { color: '#6b7280', glow: 'none' },
  busy: { color: '#4ade80', glow: 'rgba(74,222,128,0.8)' },
};

export const KEYFRAMES = `
@keyframes linePulse {
  0%, 100% { opacity: 0.6; box-shadow: 0 0 6px rgba(0,212,255,0.2); }
  50% { opacity: 1; box-shadow: 0 0 14px rgba(0,212,255,0.6); }
}
`;

export const DEPT_HEADS = ['codex', 'sentinel'];

export const SPECIALIST_MAP = {
  codex: [],
  sentinel: [],
};

// Agents that report directly to Clawd but are NOT department heads
export const CLAWD_DIRECTS = ['kyle'];
