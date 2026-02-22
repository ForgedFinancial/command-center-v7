import { OPS_CLASSIFICATIONS } from '../../../../config/opsBoard'

export default function ClassificationBadge({ classification }) {
  const cfg = OPS_CLASSIFICATIONS.find(item => item.id === classification) || {
    label: classification || 'Unknown',
    color: '#71717a',
  }

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '999px',
        backgroundColor: `${cfg.color}22`,
        border: `1px solid ${cfg.color}66`,
        fontSize: '10px',
        fontWeight: 600,
        letterSpacing: '0.04em',
        color: cfg.color,
        textTransform: 'uppercase',
      }}
    >
      {cfg.label}
    </span>
  )
}


