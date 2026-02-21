import { useState, useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import taskboardClient from '../../../../api/taskboardClient'
import { useTaskBoard } from '../../../../context/TaskBoardContext'

export default function CanvasFrame({ obj, isDragging = false, isOverlay = false, canvasBg, onContextMenu }) {
  const { actions } = useTaskBoard()
  const [editingTitle, setEditingTitle] = useState(false)
  const [title, setTitle] = useState(obj.data?.title || 'Untitled Section')
  const [hovered, setHovered] = useState(false)
  const titleRef = useRef(null)

  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: obj.id })

  const pos = obj.position || { x: 0, y: 0 }
  const size = obj.size || { width: 500, height: 350 }
  const bgColor = obj.color || 'rgba(0,212,255,0.04)'
  const borderColor = obj.data?.borderColor || 'rgba(0,212,255,0.15)'

  const isLightCanvas = ['#e8e6e1', '#ffffff'].includes(canvasBg)
  const titleColor = isLightCanvas ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.5)'

  const handleTitleSave = () => {
    setEditingTitle(false)
    if (title.trim() && title !== obj.data?.title) {
      actions.updateCanvasObject({ id: obj.id, data: { ...obj.data, title: title.trim() } })
      taskboardClient.updateCanvasObject(obj.id, { data: { ...obj.data, title: title.trim() } }).catch(() => {})
    }
  }

  const style = {
    position: isOverlay ? 'relative' : 'absolute',
    left: isOverlay ? undefined : pos.x,
    top: isOverlay ? undefined : pos.y,
    width: size.width,
    height: size.height,
    borderRadius: '12px',
    background: bgColor,
    border: `2px dashed ${hovered ? 'rgba(0,212,255,0.3)' : borderColor}`,
    cursor: isDragging ? 'grabbing' : 'grab',
    transition: isDragging || isOverlay ? 'none' : 'border-color 0.15s',
    transform: CSS.Translate.toString(transform) || undefined,
    zIndex: isDragging ? 999 : 0,
    userSelect: 'none',
    pointerEvents: 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      className="canvas-frame"
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.(e, { type: 'frame', id: obj.id, data: obj })
      }}
      {...(editingTitle ? {} : { ...attributes, ...listeners })}
    >
      {/* Title */}
      <div style={{
        position: 'absolute', top: '-22px', left: '12px',
        display: 'flex', alignItems: 'center', gap: '6px',
      }}>
        {editingTitle ? (
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleTitleSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') { setTitle(obj.data?.title || 'Untitled Section'); setEditingTitle(false) } }}
            autoFocus
            style={{
              fontSize: '13px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.5px', color: 'var(--theme-text-primary)',
              background: 'var(--theme-surface)', border: '1px solid var(--theme-accent)',
              borderRadius: '4px', padding: '2px 8px', outline: 'none', fontFamily: 'inherit',
            }}
          />
        ) : (
          <span
            onDoubleClick={(e) => { e.stopPropagation(); setEditingTitle(true) }}
            style={{
              fontSize: '13px', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '0.5px', color: titleColor, cursor: 'text',
            }}
          >
            {obj.data?.title || 'Untitled Section'}
          </span>
        )}
      </div>

      {/* Delete on hover */}
      {hovered && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            actions.removeCanvasObject(obj.id)
            taskboardClient.deleteCanvasObject(obj.id).catch(() => {})
          }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', top: '6px', right: '6px',
            background: 'rgba(0,0,0,0.3)', border: 'none', borderRadius: '50%',
            width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: '10px', color: '#fff', opacity: 0.6,
          }}
        >✕</button>
      )}
    </div>
  )
}
