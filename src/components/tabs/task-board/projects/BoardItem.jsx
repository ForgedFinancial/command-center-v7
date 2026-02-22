import { useState } from 'react'
import { BOARD_THEME } from './boardConstants'

const stickyColors = {
  yellow: { background: 'rgba(251,191,36,0.85)', color: '#1a1a1a' },
  cyan: { background: 'rgba(6,182,212,0.85)', color: '#fff' },
  green: { background: 'rgba(16,185,129,0.85)', color: '#fff' },
  pink: { background: 'rgba(236,72,153,0.85)', color: '#fff' },
  orange: { background: 'rgba(249,115,22,0.85)', color: '#fff' },
  purple: { background: 'rgba(139,92,246,0.85)', color: '#fff' },
  red: { background: 'rgba(239,68,68,0.85)', color: '#fff' },
  white: { background: 'rgba(255,255,255,0.92)', color: '#111827' },
  dark: { background: '#1a1f2e', color: '#f9fafb' },
}

export default function BoardItem({ item, isSelected, onPointerDown, onContentChange }) {
  const [editing, setEditing] = useState(false)

  const baseStyle = {
    position: 'absolute', left: item.x, top: item.y, width: item.width, height: item.height,
    transform: `rotate(${item.rotation || 0}deg)`, transformOrigin: 'center',
    border: isSelected ? `1px solid ${BOARD_THEME.activeBorder}` : `1px solid ${BOARD_THEME.border}`,
    boxShadow: isSelected ? '0 0 0 2px #3b82f6, 0 0 12px rgba(59,130,246,0.3)' : '0 0 0 1px rgba(59,130,246,0.0)',
    userSelect: editing ? 'text' : 'none', cursor: editing ? 'text' : 'move', overflow: 'hidden',
  }

  const commonText = {
    contentEditable: editing,
    suppressContentEditableWarning: true,
    onDoubleClick: () => setEditing(true),
    onBlur: (e) => { setEditing(false); onContentChange?.(e.currentTarget.innerText) },
    onKeyDown: (e) => { if (e.key === 'Escape') { e.currentTarget.blur() } },
  }

  if (item.type === 'sticky_note') {
    const colorSet = stickyColors[item.style?.fillColor || 'yellow']
    return <div onPointerDown={onPointerDown} style={{ ...baseStyle, ...colorSet, borderRadius: 12, padding: 16 }}><div {...commonText} style={{ whiteSpace: 'pre-wrap', fontSize: item.style?.fontSize || 14 }}>{item.content}</div></div>
  }

  if (item.type === 'shape') {
    return <div onPointerDown={onPointerDown} style={{ ...baseStyle, background: 'rgba(6,182,212,0.1)', border: `${item.style?.borderWidth || 2}px solid ${item.style?.borderColor || '#06b6d4'}`, borderRadius: item.shape === 'ellipse' ? '999px' : 8, display: 'grid', placeItems: 'center' }}><span {...commonText} style={{ color: item.style?.color || '#f9fafb' }}>{item.content}</span></div>
  }

  return <div onPointerDown={onPointerDown} style={{ ...baseStyle, background: 'transparent', border: isSelected ? `1px solid ${BOARD_THEME.activeBorder}` : '1px dashed transparent', color: item.style?.color || '#f9fafb', display: 'flex', alignItems: 'center', padding: 8 }}><div {...commonText} style={{ whiteSpace: 'pre-wrap', width: '100%', fontSize: item.style?.fontSize || 16 }}>{item.content}</div></div>
}
