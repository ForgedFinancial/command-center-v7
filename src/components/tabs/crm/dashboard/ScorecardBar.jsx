import MetricCard from './MetricCard'
import { DEFAULT_SCORECARD_METRICS } from '../../../../services/metricEngine'

export default function ScorecardBar({ metrics, scorecardKeys, toggles, onDrill }) {
  const keys = (scorecardKeys && scorecardKeys.length > 0)
    ? scorecardKeys
    : DEFAULT_SCORECARD_METRICS

  // Only show metrics that are watch or active
  const visible = keys.filter(k => {
    const t = toggles?.[k]
    return t !== 'off' && metrics[k]
  })

  if (visible.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
      {visible.map(k => (
        <MetricCard
          key={k}
          metric={metrics[k]}
          compact
          onClick={() => onDrill?.(k)}
        />
      ))}
    </div>
  )
}
