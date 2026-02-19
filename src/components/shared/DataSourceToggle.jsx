// ========================================
// FEATURE: Personal/Business/All Toggle
// Added: 2026-02-18 by Mason (FF-BLD-001)
// Syncs across Contacts, Phone, Messages views
// ========================================

import { useDataSource } from '../../hooks/useDataSource'

const MODES = [
  { key: 'personal', label: '👤 Personal' },
  { key: 'business', label: '💼 Business' },
  { key: 'all', label: 'All' },
]

export default function DataSourceToggle() {
  const { source, setSource } = useDataSource()

  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {MODES.map(m => {
        const active = source === m.key
        return (
          <button
            key={m.key}
            onClick={() => setSource(m.key)}
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: active ? 600 : 400,
              borderRadius: '6px',
              border: '1px solid ' + (active ? 'var(--theme-accent)' : 'rgba(255,255,255,0.08)'),
              background: active ? 'var(--theme-accent-muted)' : 'transparent',
              color: active ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {m.label}
          </button>
        )
      })}
    </div>
  )
}
