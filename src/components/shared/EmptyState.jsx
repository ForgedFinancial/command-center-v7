export default function EmptyState({ icon = '📋', title, message, action }) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '48px 24px',
      textAlign: 'center',
    }}>
      <span style={{ fontSize: '48px', marginBottom: '16px' }}>{icon}</span>
      <h3 style={{ margin: '0 0 8px', fontSize: '16px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
        {title}
      </h3>
      {message && (
        <p style={{ margin: '0 0 16px', fontSize: '13px', color: 'var(--theme-text-secondary)', maxWidth: '320px' }}>
          {message}
        </p>
      )}
      {action}
    </div>
  )
}
