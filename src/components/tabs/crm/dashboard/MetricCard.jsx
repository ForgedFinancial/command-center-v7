import { formatMetricValue } from '../../../../services/metricEngine'

const COLOR_MAP = {
  green: { border: 'border-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  yellow: { border: 'border-yellow-500', bg: 'bg-yellow-500/10', text: 'text-yellow-400', dot: 'bg-yellow-400' },
  red: { border: 'border-red-500', bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400' },
  gray: { border: 'border-zinc-600', bg: 'bg-zinc-700/30', text: 'text-zinc-400', dot: 'bg-zinc-500' },
}

const TREND_ICONS = {
  up: '↑',
  down: '↓',
  flat: '→',
}

export default function MetricCard({ metric, compact = false, onClick }) {
  if (!metric) return null
  const colors = COLOR_MAP[metric.color] || COLOR_MAP.gray
  const trendColor = metric.invertThreshold
    ? (metric.trend === 'down' ? 'text-emerald-400' : metric.trend === 'up' ? 'text-red-400' : 'text-zinc-400')
    : (metric.trend === 'up' ? 'text-emerald-400' : metric.trend === 'down' ? 'text-red-400' : 'text-zinc-400')

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${colors.border} ${colors.bg} hover:brightness-110 transition-all min-w-0`}
      >
        <span className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />
        <span className="text-xs text-zinc-400 truncate">{metric.label}</span>
        <span className={`text-sm font-bold ${colors.text} whitespace-nowrap`}>
          {formatMetricValue(metric.value, metric.unit)}
        </span>
        <span className={`text-xs ${trendColor}`}>{TREND_ICONS[metric.trend]}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className={`flex flex-col p-4 rounded-xl border-l-4 ${colors.border} bg-zinc-800/60 hover:bg-zinc-800/80 transition-all text-left w-full`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-zinc-400 uppercase tracking-wide">{metric.label}</span>
        <span className={`text-xs ${trendColor} font-medium`}>
          {TREND_ICONS[metric.trend]} {metric.previousValue != null && metric.unit === '%' ? `${metric.previousValue}%` : ''}
        </span>
      </div>
      <div className={`text-2xl font-bold ${colors.text}`}>
        {formatMetricValue(metric.value, metric.unit)}
      </div>
      {metric.description && (
        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-1">{metric.description}</p>
      )}
    </button>
  )
}
