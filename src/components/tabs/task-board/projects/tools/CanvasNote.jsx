export default function CanvasNote({ obj }) {
  return <div style={{ fontSize: 12, color: '#E2E8F0' }}>{obj?.data?.title || obj?.data?.text || 'Note'}</div>
}
