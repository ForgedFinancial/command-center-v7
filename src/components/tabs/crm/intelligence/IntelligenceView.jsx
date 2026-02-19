import BestTimeHeatmap from './BestTimeHeatmap'
import RevenueForecast from './RevenueForecast'
import FunnelDropOff from './FunnelDropOff'

export default function IntelligenceView() {
  return (
    <div>
      <h2 style={{
        fontSize: '20px',
        fontWeight: 600,
        color: 'var(--theme-text-primary)',
        margin: '0 0 20px',
      }}>
        🧠 Intelligence Hub
      </h2>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '20px',
      }}>
        <BestTimeHeatmap />
        <RevenueForecast />
      </div>

      <div style={{ marginTop: '20px' }}>
        <FunnelDropOff />
      </div>
    </div>
  )
}
