import { STAGE_CONFIG } from '../../../../config/taskboard'

export default function ColumnHeader({ stage, count }) {
  const config = STAGE_CONFIG[stage]
  if (!config) return null

  return (
    <div style={{
      padding: '10px 14px',
      borderRadius: '10px',
      background: 'rgba(255,255,255,0.03)',
      border: `1px solid ${config.borderColor}`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '8px',
    }}>
      <span style={{
        fontSize: '11px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: config.color,
      }}>
        {config.label}
      </span>
      <span style={{
        fontSize: '10px',
        padding: '2px 8px',
        borderRadius: '10px',
        background: 'rgba(255,255,255,0.06)',
        color: '#a1a1aa',
        fontWeight: 500,
      }}>
        {count}
      </span>
    </div>
  )
}
