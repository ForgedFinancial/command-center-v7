export default function CanvasMetricWidget({ obj }) {
  return <div style={{ fontSize: 12, color: '#00D4FF' }}>{obj?.data?.title || 'Metric'}</div>
}
