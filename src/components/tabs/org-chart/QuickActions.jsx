import { useState } from 'react'

const btnBase = {
  fontSize: '9px',
  padding: '4px 10px',
  borderRadius: '6px',
  border: '1px solid rgba(255,255,255,0.12)',
  background: 'rgba(255,255,255,0.05)',
  color: 'rgba(255,255,255,0.6)',
  cursor: 'pointer',
  fontFamily: "'JetBrains Mono', monospace",
  transition: 'all 0.15s',
}

const btnPrimary = {
  ...btnBase,
  borderColor: 'rgba(0,212,255,0.3)',
  color: 'rgba(0,212,255,0.7)',
}

export default function QuickActions({ agentId, onRecentOutput, onViewWorkspace, visible }) {
  const [tooltip, setTooltip] = useState(false)
  const [hoveredBtn, setHoveredBtn] = useState(null)

  const getHoverStyle = (key, base) => {
    if (hoveredBtn !== key) return base
    if (key === 'send') {
      return { ...base, background: 'rgba(0,212,255,0.1)', color: '#00d4ff', borderColor: 'rgba(0,212,255,0.5)' }
    }
    return { ...base, background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.25)' }
  }

  return (
    <div style={{
      display: 'flex',
      gap: '6px',
      marginTop: '10px',
      opacity: visible ? 1 : 0,
      transition: 'opacity 0.2s',
      position: 'relative',
    }}>
      <div style={{ position: 'relative' }}>
        <button
          style={getHoverStyle('send', btnPrimary)}
          onMouseEnter={() => { setHoveredBtn('send'); setTooltip(true) }}
          onMouseLeave={() => { setHoveredBtn(null); setTooltip(false) }}
          onClick={(e) => { e.stopPropagation() }}
        >Send to Agent</button>
        {tooltip && (
          <div style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '4px',
            padding: '3px 8px',
            background: 'rgba(0,0,0,0.85)',
            border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: '4px',
            fontSize: '9px',
            color: 'rgba(255,255,255,0.6)',
            whiteSpace: 'nowrap',
            zIndex: 50,
          }}>Coming soon</div>
        )}
      </div>
      <button
        style={getHoverStyle('output', btnBase)}
        onMouseEnter={() => setHoveredBtn('output')}
        onMouseLeave={() => setHoveredBtn(null)}
        onClick={(e) => { e.stopPropagation(); onRecentOutput?.() }}
      >Recent Output</button>
      <button
        style={getHoverStyle('workspace', btnBase)}
        onMouseEnter={() => setHoveredBtn('workspace')}
        onMouseLeave={() => setHoveredBtn(null)}
        onClick={(e) => { e.stopPropagation(); onViewWorkspace?.() }}
      >View Workspace</button>
    </div>
  )
}
