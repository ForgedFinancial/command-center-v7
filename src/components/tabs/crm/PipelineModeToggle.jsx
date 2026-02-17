import { useCRM } from '../../../context/CRMContext'

const MODES = [
  { key: 'new', label: '🆕 New' },
  { key: 'aged', label: '📜 Aged' },
  { key: 'all', label: 'All' },
]

export default function PipelineModeToggle() {
  const { state, actions } = useCRM()

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {MODES.map(m => {
        const active = state.pipelineMode === m.key
        return (
          <button
            key={m.key}
            onClick={() => actions.setPipelineMode(m.key)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: active ? 600 : 400,
              borderRadius: '6px',
              border: '1px solid ' + (active ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)'),
              background: active ? 'rgba(0,212,255,0.1)' : 'transparent',
              color: active ? '#00d4ff' : '#71717a',
              cursor: 'pointer',
            }}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}

export function filterByPipelineMode(leads, mode) {
  if (mode === 'all') return leads
  return leads.filter(c => (c.pipeline || 'new') === mode)
}
