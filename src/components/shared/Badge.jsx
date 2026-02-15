/**
 * Status badge / pill component
 * Variants: success, warning, error, info
 */
const variantStyles = {
  success: {
    backgroundColor: 'var(--status-online)',
    color: '#000',
  },
  warning: {
    backgroundColor: 'var(--status-busy)',
    color: '#000',
  },
  error: {
    backgroundColor: 'var(--status-error)',
    color: '#fff',
  },
  info: {
    backgroundColor: 'var(--accent)',
    color: '#fff',
  },
  neutral: {
    backgroundColor: 'var(--bg-tertiary)',
    color: 'var(--text-secondary)',
  },
}

export function Badge({ variant = 'neutral', children, className = '' }) {
  const styles = variantStyles[variant] || variantStyles.neutral

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: 500,
        ...styles,
      }}
    >
      {children}
    </span>
  )
}

export default Badge
