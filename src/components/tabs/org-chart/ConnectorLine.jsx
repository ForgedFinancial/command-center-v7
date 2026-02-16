export default function ConnectorLine({ fromColor, toColor, isActive, height = 32 }) {
  const baseStyle = {
    width: '2px',
    height: `${height}px`,
    margin: '0 auto',
    position: 'relative',
    background: `linear-gradient(to bottom, ${fromColor}40, ${toColor}40)`,
  }

  if (isActive) {
    return (
      <div style={{
        ...baseStyle,
        background: 'linear-gradient(to bottom, rgba(0,212,255,0.8), rgba(0,212,255,0.3))',
        boxShadow: '0 0 10px rgba(0,212,255,0.4)',
        animation: 'linePulse 2s ease-in-out infinite',
      }} />
    )
  }

  return <div style={baseStyle} />
}
