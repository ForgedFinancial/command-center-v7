import { useState, useMemo, useEffect, useCallback } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import { calculateAllMetrics, getMetricsByCategory, CATEGORIES, getDefaultToggles, DEFAULT_SCORECARD_METRICS } from '../../../../services/metricEngine'
import ScorecardBar from './ScorecardBar'
import TimeFilter from './TimeFilter'
import MetricCard from './MetricCard'
import MetricToggle from './MetricToggle'
import DrillDownModal from './DrillDownModal'

const VIEWS = [
  { key: 'overview', label: 'Overview', icon: '📊' },
  { key: 'pipeline', label: 'Pipeline Health', icon: '🔄' },
  { key: 'revenue', label: 'Revenue & Production', icon: '💰' },
  { key: 'efficiency', label: 'Efficiency', icon: '⚙️' },
  { key: 'persistency', label: 'Persistency', icon: '🛡️' },
  { key: 'manager', label: 'Manager View', icon: '👔' },
]

const VIEW_CATEGORIES = {
  overview: null, // shows all
  pipeline: ['pipeline'],
  revenue: ['revenue'],
  efficiency: ['efficiency', 'automation'],
  persistency: ['persistency', 'client'],
  manager: ['activity', 'pipeline', 'revenue', 'efficiency', 'persistency', 'client', 'automation', 'manager'],
}

const STORAGE_KEY = 'cc7-dashboard-prefs'

function loadPrefs() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

function savePrefs(prefs) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs)) } catch {}
}

export default function DashboardView() {
  const { state } = useCRM()
  const leads = state.leads

  const saved = useMemo(() => loadPrefs(), [])
  const [activeView, setActiveView] = useState(saved?.view || 'overview')
  const [timeRange, setTimeRange] = useState(saved?.timeRange || 'month')
  const [customStart, setCustomStart] = useState(saved?.customStart || '')
  const [customEnd, setCustomEnd] = useState(saved?.customEnd || '')
  const [toggles, setToggles] = useState(saved?.toggles || getDefaultToggles())
  const [scorecardKeys, setScorecardKeys] = useState(saved?.scorecardKeys || DEFAULT_SCORECARD_METRICS)
  const [drillMetric, setDrillMetric] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  // Persist prefs
  useEffect(() => {
    savePrefs({ view: activeView, timeRange, customStart, customEnd, toggles, scorecardKeys })
  }, [activeView, timeRange, customStart, customEnd, toggles, scorecardKeys])

  // Calculate all 39 metrics
  const metrics = useMemo(
    () => calculateAllMetrics(leads, leads, timeRange, customStart, customEnd),
    [leads, timeRange, customStart, customEnd]
  )

  const grouped = useMemo(() => getMetricsByCategory(metrics), [metrics])

  const handleToggleChange = useCallback((id, val) => {
    setToggles(prev => ({ ...prev, [id]: val }))
  }, [])

  const handleBulkChange = useCallback((val) => {
    setToggles(prev => {
      const next = { ...prev }
      for (const k of Object.keys(next)) next[k] = val
      return next
    })
  }, [])

  // Filter categories based on active view
  const visibleCategories = useMemo(() => {
    const cats = VIEW_CATEGORIES[activeView]
    const isManager = activeView === 'manager'
    const sortedCats = Object.entries(CATEGORIES).sort((a, b) => a[1].order - b[1].order)

    return sortedCats.filter(([key]) => {
      if (cats === null) return true // overview
      return cats.includes(key)
    }).map(([key, def]) => {
      const catMetrics = (grouped[key] || []).filter(m => {
        if (isManager) return true // Manager sees all
        return toggles[m.id] !== 'off'
      })
      return { key, ...def, metrics: catMetrics }
    }).filter(c => c.metrics.length > 0)
  }, [activeView, grouped, toggles])

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-zinc-800">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-bold text-zinc-100 flex items-center gap-2">
            📊 Production Dashboard
          </h1>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="text-xs px-3 py-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300 transition-colors"
          >
            {showSettings ? '← Back to Dashboard' : '⚙️ Settings'}
          </button>
        </div>

        {!showSettings && (
          <>
            {/* View tabs */}
            <div className="flex gap-1 mb-3 overflow-x-auto pb-1">
              {VIEWS.map(v => (
                <button
                  key={v.key}
                  onClick={() => setActiveView(v.key)}
                  className={`text-xs px-3 py-1.5 rounded-md whitespace-nowrap transition-all ${
                    activeView === v.key
                      ? 'bg-blue-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                  }`}
                >
                  {v.icon} {v.label}
                </button>
              ))}
            </div>

            {/* Time filter */}
            <TimeFilter
              value={timeRange}
              onChange={setTimeRange}
              customStart={customStart}
              customEnd={customEnd}
              onCustomChange={(which, val) => which === 'start' ? setCustomStart(val) : setCustomEnd(val)}
            />
          </>
        )}
      </div>

      {/* Settings panel */}
      {showSettings ? (
        <div className="flex-1 overflow-y-auto p-4">
          <MetricToggle
            toggles={toggles}
            onToggleChange={handleToggleChange}
            onBulkChange={handleBulkChange}
          />

          <div className="mt-6">
            <h3 className="text-sm font-semibold text-zinc-300 mb-3">Scorecard Metrics</h3>
            <p className="text-xs text-zinc-500 mb-2">Select which metrics appear in the top scorecard bar.</p>
            <div className="flex flex-wrap gap-2">
              {Object.keys(metrics).map(k => {
                const m = metrics[k]
                const selected = scorecardKeys.includes(k)
                return (
                  <button
                    key={k}
                    onClick={() => {
                      setScorecardKeys(prev =>
                        selected ? prev.filter(x => x !== k) : [...prev, k]
                      )
                    }}
                    className={`text-xs px-2 py-1 rounded transition-all ${
                      selected
                        ? 'bg-blue-600/30 text-blue-400 border border-blue-500/40'
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}
                  >
                    {m.label}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Scorecard top bar */}
          <ScorecardBar
            metrics={metrics}
            scorecardKeys={scorecardKeys}
            toggles={toggles}
            onDrill={setDrillMetric}
          />

          {/* Metric sections */}
          {visibleCategories.map(cat => (
            <div key={cat.key}>
              <h2 className="text-sm font-semibold text-zinc-300 mb-3 flex items-center gap-2">
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
                <span className="text-zinc-600 text-xs font-normal">({cat.metrics.length})</span>
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                {cat.metrics.map(m => (
                  <MetricCard
                    key={m.id}
                    metric={m}
                    onClick={() => setDrillMetric(m.id)}
                  />
                ))}
              </div>
            </div>
          ))}

          {visibleCategories.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
              <span className="text-4xl mb-3">📊</span>
              <p className="text-sm">No metrics visible. Enable metrics in Settings.</p>
            </div>
          )}
        </div>
      )}

      {/* Drill-down modal */}
      {drillMetric && (
        <DrillDownModal
          metricId={drillMetric}
          metric={metrics[drillMetric]}
          onClose={() => setDrillMetric(null)}
        />
      )}
    </div>
  )
}
