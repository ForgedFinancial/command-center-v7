export default function CanvasFileCard({ obj }) {
  return <div style={{ fontSize: 12, color: '#E2E8F0' }}>📎 {obj?.data?.fileName || 'File'}</div>
}
