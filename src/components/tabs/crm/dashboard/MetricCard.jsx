import { formatMetricValue } from '../../../../services/metricEngine'

const COLOR_MAP = {
  green: { borderColor: 'var(--theme-success)', textColor: 'var(--theme-success)', dotColor: 'var(--theme-success)' },
  yellow: { borderColor: 'var(--theme-warning)', textColor: 'var(--theme-warning)', dotColor: 'var(--theme-warning)' },
  red: { borderColor: 'var(--theme-error)', textColor: 'var(--theme-error)', dotColor: 'var(--theme-error)' },
  gray: { borderColor: 'var(--theme-border)', textColor: 'var(--theme-text-secondary)', dotColor: 'var(--theme-text-secondary)' },
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
        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:brightness-110 transition-all min-w-0"
        style={{ border: `1px solid ${colors.borderColor}`, background: 'var(--theme-surface)' }}
      >
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: colors.dotColor }} />
        <span className="text-xs truncate" style={{ color: 'var(--theme-text-secondary)' }}>{metric.label}</span>
        <span className="text-sm font-bold whitespace-nowrap" style={{ color: colors.textColor }}>
          {formatMetricValue(metric.value, metric.unit)}
        </span>
        <span className={`text-xs ${trendColor}`}>{TREND_ICONS[metric.trend]}</span>
      </button>
    )
  }

  return (
    <button
      onClick={onClick}
      className="flex flex-col p-4 rounded-xl transition-all text-left w-full"
      style={{ borderLeft: `4px solid ${colors.borderColor}`, background: 'var(--theme-surface)' }}
      onMouseOver={e => { e.currentTarget.style.background = 'var(--theme-surface-hover)' }}
      onMouseOut={e => { e.currentTarget.style.background = 'var(--theme-surface)' }}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--theme-text-secondary)' }}>{metric.label}</span>
        <span className={`text-xs ${trendColor} font-medium`}>
          {TREND_ICONS[metric.trend]} {metric.previousValue != null && metric.unit === '%' ? `${metric.previousValue}%` : ''}
        </span>
      </div>
      <div className="text-2xl font-bold" style={{ color: colors.textColor }}>
        {formatMetricValue(metric.value, metric.unit)}
      </div>
      {metric.description && (
        <p className="text-[11px] mt-1 line-clamp-1" style={{ color: 'var(--theme-text-secondary)' }}>{metric.description}</p>
      )}
    </button>
  )
}
