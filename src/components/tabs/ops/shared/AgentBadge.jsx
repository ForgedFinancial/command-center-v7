import { AGENTS } from '../pipeline/pipelineConstants'

export default function AgentBadge({ agent, size = 'sm' }) {
  const info = AGENTS[agent] || { label: agent, color: '#6b7280', icon: '👤' }
  const sz = size === 'sm' ? { fontSize: '11px', padding: '2px 8px' } : { fontSize: '12px', padding: '3px 10px' }

  return (
    <span style={{
      ...sz,
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      backgroundColor: info.color + '20',
      color: info.color,
      borderRadius: '999px',
      fontWeight: 600,
      whiteSpace: 'nowrap',
      letterSpacing: '0.3px',
    }}>
      <span style={{ fontSize: size === 'sm' ? '10px' : '12px' }}>{info.icon}</span>
      {info.label}
    </span>
  )
}
