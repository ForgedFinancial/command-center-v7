const items = [
  { label: 'Gold = CEO', color: '#f59e0b' },
  { label: 'Blue = COO', color: '#3b82f6' },
  { label: 'Purple = Department Heads', color: '#a855f7' },
  { label: 'Orange = Specialists', color: '#f97316' },
]

export default function ColorLegend() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '28px',
      padding: '10px 24px',
      background: 'var(--theme-bg)',
      border: '1px solid var(--theme-border-subtle)',
      borderRadius: '10px',
      marginBottom: '32px',
      fontSize: '12px',
      color: 'rgba(255,255,255,0.6)',
    }}>
      {items.map((item) => (
        <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '14px',
            height: '14px',
            borderRadius: '4px',
            border: `2px solid ${item.color}`,
            background: `${item.color}26`,
          }} />
          {item.label}
        </div>
      ))}
    </div>
  )
}
