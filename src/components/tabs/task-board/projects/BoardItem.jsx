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

function ConnectionDots({ onStartConnector }) {
  const dot = (style, side) => (
    <button
      onPointerDown={(e) => { e.stopPropagation(); onStartConnector?.(e, side) }}
      style={{ position: 'absolute', width: 10, height: 10, borderRadius: 999, border: '1px solid #06b6d4', background: '#0d0d0d', ...style }}
    />
  )
  return (
    <>
      {dot({ left: '50%', top: -7, transform: 'translateX(-50%)' }, 'top')}
      {dot({ right: -7, top: '50%', transform: 'translateY(-50%)' }, 'right')}
      {dot({ left: '50%', bottom: -7, transform: 'translateX(-50%)' }, 'bottom')}
      {dot({ left: -7, top: '50%', transform: 'translateY(-50%)' }, 'left')}
    </>
  )
}

export default function BoardItem({ item, isSelected, onPointerDown, onContentChange, onContextMenu, onAiAction, onDocumentExpand, onStartConnector }) {
  const [editing, setEditing] = useState(false)
  const [hovered, setHovered] = useState(false)

  const lockedStyle = item.locked ? { border: '1px solid rgba(239,68,68,0.8)', boxShadow: '0 0 0 1px rgba(239,68,68,0.5)' } : {}
  const baseStyle = {
    position: 'absolute', left: item.x, top: item.y, width: item.width, height: item.height,
    transform: `rotate(${item.rotation || 0}deg)`, transformOrigin: 'center',
    border: isSelected ? `1px solid ${BOARD_THEME.activeBorder}` : `1px solid ${BOARD_THEME.border}`,
    boxShadow: isSelected ? '0 0 0 2px #3b82f6, 0 0 12px rgba(59,130,246,0.3)' : '0 0 0 1px rgba(59,130,246,0.0)',
    userSelect: editing ? 'text' : 'none', cursor: editing ? 'text' : (item.locked ? 'not-allowed' : 'move'), overflow: 'hidden',
    ...lockedStyle,
  }

  const commonText = {
    contentEditable: editing && !item.locked,
    suppressContentEditableWarning: true,
    onDoubleClick: () => !item.locked && setEditing(true),
    onBlur: (e) => { setEditing(false); onContentChange?.(e.currentTarget.innerText) },
    onKeyDown: (e) => { if (e.key === 'Escape') e.currentTarget.blur() },
  }

  const shellProps = {
    onPointerDown,
    onContextMenu,
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => setHovered(false),
  }

  const lockBadge = item.locked ? <div style={{ position: 'absolute', right: 6, top: 6, fontSize: 12 }}>🔒</div> : null

  if (item.type === 'sticky_note') {
    const colorSet = stickyColors[item.style?.fillColor || 'yellow']
    return <div {...shellProps} style={{ ...baseStyle, ...colorSet, borderRadius: 12, padding: 16 }}><div {...commonText} style={{ whiteSpace: 'pre-wrap', fontSize: item.style?.fontSize || 14 }}>{item.content}</div>{lockBadge}{hovered && !item.locked && <ConnectionDots onStartConnector={onStartConnector} />}</div>
  }

  if (item.type === 'shape') {
    return <div {...shellProps} style={{ ...baseStyle, background: 'rgba(6,182,212,0.1)', border: `${item.style?.borderWidth || 2}px solid ${item.style?.borderColor || '#06b6d4'}`, borderRadius: item.shape === 'ellipse' ? '999px' : 8, display: 'grid', placeItems: 'center' }}><span {...commonText} style={{ color: item.style?.color || '#f9fafb' }}>{item.content}</span>{lockBadge}{hovered && !item.locked && <ConnectionDots onStartConnector={onStartConnector} />}</div>
  }

  if (item.type === 'frame') {
    return <div {...shellProps} style={{ ...baseStyle, border: '1.5px dashed rgba(255,255,255,0.2)', background: 'transparent', overflow: 'visible' }}><div style={{ position: 'absolute', top: -24, left: 0, background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px 6px 0 0', padding: '2px 10px', fontSize: 11, color: '#9ca3af' }} {...commonText}>{item.content || 'Frame'}</div>{lockBadge}{hovered && !item.locked && <ConnectionDots onStartConnector={onStartConnector} />}</div>
  }

  if (item.type === 'card') {
    return <div {...shellProps} style={{ ...baseStyle, background: '#1a1f2e', borderRadius: 10, borderLeft: '3px solid #3b82f6', padding: '14px 16px', boxShadow: '0 2px 12px rgba(0,0,0,0.4)' }}><div {...commonText} style={{ fontWeight: 700 }}>{item.content || 'Card name'}</div><div style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>{item.description || 'Description...'}</div>{lockBadge}{hovered && !item.locked && <ConnectionDots onStartConnector={onStartConnector} />}</div>
  }

  if (item.type === 'image') {
    return <div {...shellProps} style={{ ...baseStyle, background: '#111827', borderRadius: 10 }}><img alt={item.name || 'image'} src={item.src || 'https://placehold.co/400x240/1e293b/f8fafc?text=Image'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />{lockBadge}{hovered && !item.locked && <ConnectionDots onStartConnector={onStartConnector} />}</div>
  }

  if (item.type === 'document') {
    return <div {...shellProps} style={{ ...baseStyle, background: '#1a1f2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, overflow: 'hidden' }}><div style={{ background: '#111827', padding: '6px 8px', display: 'flex', justifyContent: 'space-between' }}><strong style={{ fontSize: 12 }}>{item.content || 'Document'}</strong><button onClick={(e) => { e.stopPropagation(); onDocumentExpand?.(item) }}>⤢</button></div><div style={{ padding: 8, fontSize: 12, color: '#9ca3af', whiteSpace: 'pre-wrap' }}>{item.markdown || 'Markdown content...'}</div>{lockBadge}{hovered && !item.locked && <ConnectionDots onStartConnector={onStartConnector} />}</div>
  }

  if (item.type === 'ai_suggestion') {
    return <div {...shellProps} style={{ ...baseStyle, background: 'rgba(6,182,212,0.06)', border: '1px solid #06b6d4', borderRadius: 12, padding: 12 }}><div style={{ fontSize: 11, color: '#06b6d4', marginBottom: 6 }}>✦ AI ({item.agentId || 'mason'})</div><div style={{ whiteSpace: 'pre-wrap', fontSize: 13 }}>{item.content}</div><div style={{ display: 'flex', gap: 6, marginTop: 8 }}><button onClick={(e) => { e.stopPropagation(); onAiAction?.('accept', item) }}>Accept</button><button onClick={(e) => { e.stopPropagation(); onAiAction?.('dismiss', item) }}>Dismiss</button></div>{lockBadge}{hovered && !item.locked && <ConnectionDots onStartConnector={onStartConnector} />}</div>
  }

  if (item.type === 'group') {
    return <div {...shellProps} style={{ ...baseStyle, background: 'rgba(139,92,246,0.08)', border: '1px dashed rgba(139,92,246,0.7)', borderRadius: 12 }}><div {...commonText} style={{ fontSize: 12, padding: 8 }}>{item.content || 'Group'}</div>{lockBadge}</div>
  }

  return <div {...shellProps} style={{ ...baseStyle, background: 'transparent', border: isSelected ? `1px solid ${BOARD_THEME.activeBorder}` : '1px dashed transparent', color: item.style?.color || '#f9fafb', display: 'flex', alignItems: 'center', padding: 8 }}><div {...commonText} style={{ whiteSpace: 'pre-wrap', width: '100%', fontSize: item.style?.fontSize || 16 }}>{item.content}</div>{lockBadge}{hovered && !item.locked && <ConnectionDots onStartConnector={onStartConnector} />}</div>
}
