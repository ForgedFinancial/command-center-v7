/**
 * Reusable card wrapper with optional title
 * Uses dark theme CSS variables
 */
export function Card({ title, children, className = '' }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: '8px',
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--text-primary)',
          }}
        >
          {title}
        </div>
      )}
      <div style={{ padding: '16px' }}>{children}</div>
    </div>
  )
}

export default Card
