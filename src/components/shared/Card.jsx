/**
 * Reusable card wrapper with optional title
 * Uses glass-card styling from Forge theme
 */
export function Card({ title, children, className = '' }) {
  return (
    <div
      className={`glass-card ${className}`}
      style={{
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: '12px 16px',
            borderBottom: '1px solid var(--border-color)',
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
