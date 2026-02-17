// ========================================
// FEATURE: Sidebar
// Config-driven left sidebar for Task Board + CRM
// ========================================

export default function Sidebar({ items, activeItem, onSelect }) {
  return (
    <aside style={{
      width: '220px',
      flexShrink: 0,
      borderRight: '1px solid rgba(255,255,255,0.06)',
      background: 'rgba(15,15,26,0.95)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px',
      overflowY: 'auto',
    }}>
      <div style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: '#71717a',
        fontWeight: 600,
        padding: '0 16px',
        marginBottom: '12px',
      }}>
        Navigation
      </div>
      {items.map((item) => {
        const isActive = activeItem === item.id
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 16px',
              borderRadius: '8px',
              border: 'none',
              background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
              color: isActive ? '#00d4ff' : '#a1a1aa',
              fontSize: '14px',
              fontWeight: isActive ? 500 : 400,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                e.currentTarget.style.color = '#e4e4e7'
              }
            }}
            onMouseOut={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#a1a1aa'
              }
            }}
          >
            <span style={{ width: '16px', height: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
              {item.icon}
            </span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.badge != null && item.badge > 0 && (
              <span style={{
                fontSize: '10px',
                padding: '2px 7px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.08)',
                color: '#a1a1aa',
                fontWeight: 500,
              }}>
                {item.badge}
              </span>
            )}
          </button>
        )
      })}
    </aside>
  )
}
