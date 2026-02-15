/**
 * Centered loading spinner
 * Sizes: sm (16px), md (24px), lg (32px)
 */
const sizes = {
  sm: 16,
  md: 24,
  lg: 32,
}

export function LoadingSpinner({ size = 'md', className = '' }) {
  const px = sizes[size] || sizes.md

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: px,
          height: px,
          border: '2px solid var(--border)',
          borderTopColor: 'var(--accent)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      <style>
        {`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  )
}

export default LoadingSpinner
