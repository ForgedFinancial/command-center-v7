import { STATUS_COLORS } from './treeConstants'

export default function StatusBadge({ status = 'offline' }) {
  const s = STATUS_COLORS[status] || STATUS_COLORS.offline
  return (
    <div style={{
      position: 'absolute',
      top: '10px',
      right: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
      fontSize: '10px',
      color: 'rgba(255,255,255,0.4)',
    }}>
      <span>{status}</span>
      <div style={{
        width: '7px',
        height: '7px',
        borderRadius: '50%',
        background: s.color,
        boxShadow: s.glow !== 'none' ? `0 0 6px ${s.glow}` : 'none',
      }} />
    </div>
  )
}
