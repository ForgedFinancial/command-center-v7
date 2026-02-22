export default function CanvasShape({ obj }) {
  return <div style={{ fontSize: 12, color: '#94A3B8' }}>{obj?.data?.shape || 'Shape'}</div>
}
