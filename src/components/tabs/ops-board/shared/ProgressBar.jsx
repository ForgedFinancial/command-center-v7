export default function ProgressBar({ percentage = 0, color = 'var(--theme-accent)' }) {
  const clamped = Math.max(0, Math.min(100, Number(percentage) || 0))

  return (
    <div
      style={{
        width: '100%',
        height: '6px',
        borderRadius: '999px',
        backgroundColor: 'rgba(255,255,255,0.08)',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: `${clamped}%`,
          height: '100%',
          backgroundColor: color,
          transition: 'width 0.2s ease',
        }}
      />
    </div>
  )
}
