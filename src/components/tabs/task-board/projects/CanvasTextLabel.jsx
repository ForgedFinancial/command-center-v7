import { useState, useRef, useEffect } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import taskboardClient from '../../../../api/taskboardClient'
import { useTaskBoard } from '../../../../context/TaskBoardContext'

export default function CanvasTextLabel({ obj, isDragging = false, isOverlay = false, canvasBg, onContextMenu }) {
  const { actions } = useTaskBoard()
  const [editing, setEditing] = useState(false)
  const [hovered, setHovered] = useState(false)
  const textRef = useRef(null)
  const saveTimeout = useRef(null)

  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: obj.id })

  const pos = obj.position || { x: 0, y: 0 }
  const fontSize = obj.data?.fontSize || 24
  const isLightCanvas = ['#e8e6e1', '#ffffff'].includes(canvasBg)
  const textColor = obj.color || (isLightCanvas ? '#1a1a1a' : 'var(--theme-text-primary)')

  const handleTextChange = () => {
    if (!textRef.current) return
    const newText = textRef.current.innerText
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      actions.updateCanvasObject({ id: obj.id, data: { ...obj.data, text: newText } })
      taskboardClient.updateCanvasObject(obj.id, { data: { ...obj.data, text: newText } }).catch(() => {})
    }, 500)
  }

  useEffect(() => {
    if (editing && textRef.current) textRef.current.focus()
  }, [editing])

  const style = {
    position: isOverlay ? 'relative' : 'absolute',
    left: isOverlay ? undefined : pos.x,
    top: isOverlay ? undefined : pos.y,
    cursor: isDragging ? 'grabbing' : editing ? 'text' : 'grab',
    transform: CSS.Translate.toString(transform) || undefined,
    zIndex: isDragging ? 1000 : (obj.zIndex || 1),
    userSelect: editing ? 'text' : 'none',
  }

  return (
    <div
      ref={setNodeRef}
      className="canvas-text-label"
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true) }}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.(e, { type: 'text', id: obj.id, data: obj })
      }}
      {...(editing ? {} : { ...attributes, ...listeners })}
    >
      <div
        ref={textRef}
        contentEditable={editing}
        suppressContentEditableWarning
        onInput={handleTextChange}
        onBlur={() => { setEditing(false); handleTextChange() }}
        onKeyDown={(e) => { if (e.key === 'Escape') setEditing(false) }}
        style={{
          fontSize: `${fontSize}px`,
          fontWeight: 700,
          color: textColor,
          outline: editing ? '2px dashed var(--theme-accent)' : hovered ? '1px dashed rgba(255,255,255,0.15)' : 'none',
          outlineOffset: '4px',
          borderRadius: '4px',
          padding: '4px 8px',
          minWidth: '50px',
          whiteSpace: 'nowrap',
          lineHeight: 1.2,
        }}
      >
        {obj.data?.text || 'Label'}
      </div>

      {hovered && !editing && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            actions.removeCanvasObject(obj.id)
            taskboardClient.deleteCanvasObject(obj.id).catch(() => {})
          }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '-8px', right: '-8px',
            background: 'rgba(0,0,0,0.4)', border: 'none', borderRadius: '50%',
            width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '10px', color: '#fff',
          }}
        >✕</button>
      )}
    </div>
  )
}
