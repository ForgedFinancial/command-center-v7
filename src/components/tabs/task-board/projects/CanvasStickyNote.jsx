import { useState, useRef, useEffect, useCallback } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import taskboardClient from '../../../../api/taskboardClient'
import { useTaskBoard } from '../../../../context/TaskBoardContext'

export default function CanvasStickyNote({ obj, isDragging = false, isOverlay = false, onContextMenu, isSelected = false, onClick, onCreateTask }) {
  const { actions } = useTaskBoard()
  const [editing, setEditing] = useState(false)
  const [hovered, setHovered] = useState(false)
  const textRef = useRef(null)
  const saveTimeout = useRef(null)

  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: obj.id })

  const pos = obj.position || { x: 0, y: 0 }
  const size = obj.size || { width: 180, height: 180 }
  const text = obj.data?.text || ''
  const color = obj.color || '#fef08a'

  // Determine text color based on sticky color brightness
  const isLightSticky = ['#fef08a', '#86efac', '#fdba74', '#93c5fd', '#c4b5fd', '#fda4af'].includes(color)
  const textColor = isLightSticky ? '#1a1a1a' : '#fff'

  const handleTextChange = useCallback(() => {
    if (!textRef.current) return
    const newText = textRef.current.innerText
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      actions.updateCanvasObject({ id: obj.id, data: { ...obj.data, text: newText } })
      taskboardClient.updateCanvasObject(obj.id, { data: { ...obj.data, text: newText } }).catch(() => {})
    }, 500)
  }, [obj.id, obj.data, actions])

  useEffect(() => {
    if (editing && textRef.current) {
      textRef.current.focus()
      // Place cursor at end
      const range = document.createRange()
      range.selectNodeContents(textRef.current)
      range.collapse(false)
      const sel = window.getSelection()
      sel.removeAllRanges()
      sel.addRange(range)
    }
  }, [editing])

  const style = {
    position: isOverlay ? 'relative' : 'absolute',
    left: isOverlay ? undefined : pos.x,
    top: isOverlay ? undefined : pos.y,
    width: size.width,
    height: size.height,
    borderRadius: '4px',
    background: color,
    padding: '28px 12px 12px',
    cursor: isDragging ? 'grabbing' : editing ? 'text' : 'grab',
    transition: isDragging || isOverlay ? 'none' : 'box-shadow 0.15s, transform 0.15s',
    transform: CSS.Translate.toString(transform) || undefined,
    scale: isDragging || isOverlay ? '1.02' : '1',
    boxShadow: isDragging || isOverlay
      ? '0 12px 32px rgba(0,0,0,0.5)'
      : hovered
        ? '0 4px 16px rgba(0,0,0,0.4)'
        : '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: isDragging ? 1000 : isSelected ? 9 : (obj.zIndex || 2),
    outline: isSelected ? '2px dashed rgba(0,212,255,0.8)' : 'none',
    outlineOffset: '2px',
    userSelect: editing ? 'text' : 'none',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  }

  return (
    <div
      ref={setNodeRef}
      className="canvas-sticky"
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.(e, { type: 'sticky', id: obj.id, data: obj })
      }}
      {...(editing ? {} : { ...attributes, ...listeners })}
    >
      {/* Pin icon */}
      <div style={{
        position: 'absolute', top: '6px', left: '8px',
        fontSize: '12px', opacity: 0.5,
      }}>📌</div>

      {/* Delete button on hover */}
      {hovered && !editing && (
        <>
          {onCreateTask && (
            <button
              onClick={(e) => { e.stopPropagation(); onCreateTask(obj) }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                position: 'absolute', top: '4px', right: '28px',
                background: 'rgba(0,0,0,0.2)', border: `1px solid ${textColor}55`, borderRadius: '10px',
                height: '18px', padding: '0 6px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', fontSize: '9px', color: textColor, opacity: 0.8,
              }}
            >
              Task
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation()
              actions.removeCanvasObject(obj.id)
              taskboardClient.deleteCanvasObject(obj.id).catch(() => {})
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute', top: '4px', right: '6px',
              background: 'rgba(0,0,0,0.2)', border: 'none', borderRadius: '50%',
              width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', fontSize: '10px', color: textColor, opacity: 0.7,
            }}
          >✕</button>
        </>
      )}

      {/* Text */}
      <div
        ref={textRef}
        contentEditable={editing}
        suppressContentEditableWarning
        onInput={handleTextChange}
        onBlur={() => { setEditing(false); handleTextChange() }}
        onKeyDown={(e) => { if (e.key === 'Escape') { setEditing(false) } }}
        style={{
          flex: 1,
          fontSize: text.length > 100 ? '11px' : text.length > 50 ? '12px' : '14px',
          lineHeight: 1.4,
          color: textColor,
          fontWeight: 500,
          outline: 'none',
          wordBreak: 'break-word',
          overflow: 'hidden',
        }}
      >
        {text || (editing ? '' : 'Double-click to edit...')}
      </div>
    </div>
  )
}
