import { useState } from 'react'
import { METRIC_DEFINITIONS, CATEGORIES } from '../../../../services/metricEngine'

const TOGGLE_STATES = ['off', 'watch', 'active']
const TOGGLE_LABELS = { off: 'Off', watch: 'Watch', active: 'Active' }
const TOGGLE_STYLES = {
  off: { background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)' },
  watch: { background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', border: '1px solid var(--theme-accent)' },
  active: { background: 'color-mix(in srgb, var(--theme-success) 20%, transparent)', color: 'var(--theme-success)', border: '1px solid var(--theme-success)' },
}
const TOGGLE_DESCRIPTIONS = {
  off: 'Hidden (still collecting data)',
  watch: 'Visible on dashboard, no automations',
  active: 'Visible + automations enabled',
}

export default function MetricToggle({ toggles, onToggleChange, onBulkChange }) {
  const [expandedCategory, setExpandedCategory] = useState(null)

  const categorized = {}
  for (const [id, def] of Object.entries(METRIC_DEFINITIONS)) {
    const cat = def.category
    if (!categorized[cat]) categorized[cat] = []
    categorized[cat].push({ id, ...def })
  }

  const sortedCats = Object.entries(CATEGORIES).sort((a, b) => a[1].order - b[1].order)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--theme-text-primary)' }}>Metric Visibility</h3>
        <div className="flex gap-2">
          {TOGGLE_STATES.map(s => (
            <button
              key={s}
              onClick={() => onBulkChange?.(s)}
              className="text-xs px-2 py-1 rounded transition-colors"
              style={{ background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)' }}
            >
              All {TOGGLE_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {sortedCats.map(([catKey, catDef]) => {
        const metrics = categorized[catKey] || []
        if (metrics.length === 0) return null
        const isExpanded = expandedCategory === catKey

        return (
          <div key={catKey} className="rounded-lg overflow-hidden" style={{ background: 'var(--theme-surface)' }}>
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
              className="w-full flex items-center justify-between px-4 py-3 transition-colors"
              style={{ color: 'var(--theme-text-primary)' }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--theme-surface-hover)' }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--theme-text-primary)' }}>
                <span>{catDef.icon}</span>
                <span>{catDef.label}</span>
                <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>({metrics.length})</span>
              </span>
              <span className="text-xs" style={{ color: 'var(--theme-text-secondary)' }}>{isExpanded ? '▲' : '▼'}</span>
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 space-y-2">
                {metrics.map(m => {
                  const current = toggles[m.id] || 'watch'
                  return (
                    <div key={m.id} className="flex items-center justify-between py-1">
                      <div className="min-w-0 flex-1 mr-3">
                        <span className="text-sm" style={{ color: 'var(--theme-text-primary)' }}>{m.label}</span>
                        <p className="text-[11px] truncate" style={{ color: 'var(--theme-text-secondary)' }}>{m.description}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {TOGGLE_STATES.map(s => (
                          <button
                            key={s}
                            onClick={() => onToggleChange?.(m.id, s)}
                            className="text-xs px-2 py-1 rounded transition-all"
                            style={current === s ? TOGGLE_STYLES[s] : { background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)' }}
                            title={TOGGLE_DESCRIPTIONS[s]}
                          >
                            {TOGGLE_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
