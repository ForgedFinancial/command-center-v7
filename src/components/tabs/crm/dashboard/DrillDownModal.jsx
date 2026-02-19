import { METRIC_DEFINITIONS, formatMetricValue } from '../../../../services/metricEngine'

const COLOR_MAP = {
  green: 'text-emerald-400',
  yellow: 'text-yellow-400',
  red: 'text-red-400',
  gray: 'text-zinc-400',
}

export default function DrillDownModal({ metricId, metric, onClose }) {
  if (!metricId || !metric) return null
  const def = METRIC_DEFINITIONS[metricId] || {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl w-full max-w-lg mx-4 p-6" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">{def.label || metricId}</h2>
            <p className="text-sm text-zinc-400 mt-0.5">{def.description}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl">✕</button>
        </div>

        {/* Big number */}
        <div className="text-center py-6 bg-zinc-800/50 rounded-xl mb-6">
          <div className={`text-5xl font-bold ${COLOR_MAP[metric.color] || COLOR_MAP.gray}`}>
            {formatMetricValue(metric.value, metric.unit)}
          </div>
          <div className="text-sm text-zinc-400 mt-2">
            {metric.trend === 'up' ? '↑ Trending Up' : metric.trend === 'down' ? '↓ Trending Down' : '→ Flat'}
            {metric.previousValue != null && (
              <span className="ml-2 text-zinc-500">
                (prev: {formatMetricValue(metric.previousValue, metric.unit)})
              </span>
            )}
          </div>
        </div>

        {/* Thresholds */}
        <div className="space-y-2 mb-6">
          <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wide">Thresholds</h3>
          {def.thresholds && Object.entries(def.thresholds).map(([color, range]) => (
            <div key={color} className="flex items-center gap-2 text-sm">
              <span className={`w-3 h-3 rounded-full ${
                color === 'green' ? 'bg-emerald-400' : color === 'yellow' ? 'bg-yellow-400' : 'bg-red-400'
              }`} />
              <span className="text-zinc-300 capitalize">{color}:</span>
              <span className="text-zinc-400">
                {range[0] === 0 && range[1] === Infinity ? 'Any value' :
                 range[1] === Infinity ? `≥ ${range[0]}` :
                 range[0] === 0 ? `≤ ${range[1]}` :
                 `${range[0]} – ${range[1]}`}
                {metric.unit ? ` ${metric.unit}` : ''}
              </span>
            </div>
          ))}
        </div>

        {/* Category + meta */}
        <div className="flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-700 pt-3">
          <span>Category: {def.category}</span>
          <span>ID: {metricId}</span>
        </div>
      </div>
    </div>
  )
}
