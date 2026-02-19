import { useState } from 'react'
import { METRIC_DEFINITIONS, CATEGORIES } from '../../../../services/metricEngine'

const TOGGLE_STATES = ['off', 'watch', 'active']
const TOGGLE_LABELS = { off: 'Off', watch: 'Watch', active: 'Active' }
const TOGGLE_COLORS = {
  off: 'bg-zinc-700 text-zinc-400',
  watch: 'bg-blue-600/30 text-blue-400 border border-blue-500/40',
  active: 'bg-emerald-600/30 text-emerald-400 border border-emerald-500/40',
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
        <h3 className="text-sm font-semibold text-zinc-300">Metric Visibility</h3>
        <div className="flex gap-2">
          {TOGGLE_STATES.map(s => (
            <button
              key={s}
              onClick={() => onBulkChange?.(s)}
              className="text-xs px-2 py-1 rounded bg-zinc-700 hover:bg-zinc-600 text-zinc-300"
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
          <div key={catKey} className="rounded-lg bg-zinc-800/50 overflow-hidden">
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : catKey)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-700/50 transition-colors"
            >
              <span className="flex items-center gap-2 text-sm font-medium text-zinc-200">
                <span>{catDef.icon}</span>
                <span>{catDef.label}</span>
                <span className="text-zinc-500 text-xs">({metrics.length})</span>
              </span>
              <span className="text-zinc-500 text-xs">{isExpanded ? '▲' : '▼'}</span>
            </button>

            {isExpanded && (
              <div className="px-4 pb-3 space-y-2">
                {metrics.map(m => {
                  const current = toggles[m.id] || 'watch'
                  return (
                    <div key={m.id} className="flex items-center justify-between py-1">
                      <div className="min-w-0 flex-1 mr-3">
                        <span className="text-sm text-zinc-300">{m.label}</span>
                        <p className="text-[11px] text-zinc-500 truncate">{m.description}</p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {TOGGLE_STATES.map(s => (
                          <button
                            key={s}
                            onClick={() => onToggleChange?.(m.id, s)}
                            className={`text-xs px-2 py-1 rounded transition-all ${
                              current === s ? TOGGLE_COLORS[s] : 'bg-zinc-700/50 text-zinc-500 hover:bg-zinc-600'
                            }`}
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
