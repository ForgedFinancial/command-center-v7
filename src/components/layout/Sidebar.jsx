// ========================================
// FEATURE: Sidebar
// Config-driven left sidebar for Task Board + CRM
// Theme-aware via CSS custom properties
// ========================================

export default function Sidebar({ items, activeItem, onSelect }) {
  return (
    <aside style={{
      width: '220px',
      flexShrink: 0,
      borderRight: '1px solid var(--theme-border)',
      background: 'var(--theme-sidebar)',
      display: 'flex',
      flexDirection: 'column',
      padding: '16px 12px',
      overflowY: 'auto',
    }}>
      <div style={{
        fontSize: '11px',
        textTransform: 'uppercase',
        letterSpacing: '1.5px',
        color: 'var(--theme-text-secondary)',
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
              background: isActive ? 'var(--theme-accent-muted)' : 'transparent',
              color: isActive ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
              fontSize: '14px',
              fontWeight: isActive ? 500 : 400,
              cursor: 'pointer',
              width: '100%',
              textAlign: 'left',
              transition: 'all 0.15s',
            }}
            onMouseOver={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'var(--theme-sidebar-hover)'
                e.currentTarget.style.color = 'var(--theme-text-primary)'
              }
            }}
            onMouseOut={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--theme-text-secondary)'
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
                background: 'var(--theme-surface)',
                color: 'var(--theme-text-secondary)',
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
