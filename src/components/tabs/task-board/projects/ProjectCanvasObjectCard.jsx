import { useMemo, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import taskboardClient from '../../../../api/taskboardClient'

const SHAPE_STYLE = {
  rectangle: { borderRadius: '10px' },
  circle: { borderRadius: '50%' },
  diamond: { borderRadius: '6px', transform: 'rotate(45deg)' },
  arrow: { clipPath: 'polygon(0 25%, 65% 25%, 65% 0, 100% 50%, 65% 100%, 65% 75%, 0 75%)', borderRadius: '0' },
}

const TYPE_ICON = {
  shape: '⬜',
  image: '🖼️',
  file: '📎',
  metric: '📈',
  'task-card': '📋',
  checklist: '✅',
  'agent-chat': '🤖',
  link: '🔗',
}

export default function ProjectCanvasObjectCard({
  obj,
  isDragging = false,
  isOverlay = false,
  isSelected = false,
  onClick,
  onContextMenu,
  onCreateTask,
}) {
  const { actions } = useTaskBoard()
  const [hovered, setHovered] = useState(false)
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: obj.id })

  const pos = obj.position || { x: 0, y: 0 }
  const size = obj.size || { width: 220, height: 140 }
  const bg = obj.color || 'rgba(255,255,255,0.06)'
  const shapeType = obj.data?.shapeType || 'rectangle'
  const metricValue = obj.data?.value ?? '--'
  const metricLabel = obj.data?.label || 'Metric'
  const checklistItems = Array.isArray(obj.data?.items) ? obj.data.items : []

  const checklistProgress = useMemo(() => {
    if (!checklistItems.length) return 0
    const checked = checklistItems.filter(item => item.checked).length
    return Math.round((checked / checklistItems.length) * 100)
  }, [checklistItems])

  const style = {
    position: isOverlay ? 'relative' : 'absolute',
    left: isOverlay ? undefined : pos.x,
    top: isOverlay ? undefined : pos.y,
    width: size.width,
    minHeight: size.height,
    background: bg,
    border: isSelected ? '2px dashed rgba(0,212,255,0.85)' : '1px solid rgba(255,255,255,0.12)',
    borderRadius: '12px',
    padding: '10px',
    cursor: isDragging ? 'grabbing' : 'grab',
    transform: isDragging && !isOverlay ? undefined : (CSS.Translate.toString(transform) || undefined),
    opacity: isDragging && !isOverlay ? 0 : 1,
    boxShadow: hovered || isOverlay ? '0 10px 24px rgba(0,0,0,0.45)' : '0 2px 8px rgba(0,0,0,0.28)',
    transition: isDragging || isOverlay ? 'none' : 'all 0.15s ease',
    zIndex: isDragging ? 1000 : 6,
    userSelect: 'none',
    overflow: 'hidden',
  }

  const handleToggleChecklist = (index) => {
    const nextItems = checklistItems.map((item, itemIndex) => (
      itemIndex === index ? { ...item, checked: !item.checked } : item
    ))
    actions.updateCanvasObject({ id: obj.id, data: { ...obj.data, items: nextItems } })
    taskboardClient.updateCanvasObject(obj.id, { data: { ...obj.data, items: nextItems } }).catch(() => {})
  }

  return (
    <div
      ref={setNodeRef}
      className="project-canvas-object-card"
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      onContextMenu={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onContextMenu?.(e, { type: obj.type, id: obj.id, data: obj })
      }}
      {...attributes}
      {...listeners}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '14px' }}>{TYPE_ICON[obj.type] || '🧩'}</span>
        <span style={{ fontSize: '11px', fontWeight: 700, color: 'var(--theme-text-primary)', textTransform: 'capitalize' }}>
          {obj.data?.title || obj.type.replace('-', ' ')}
        </span>
      </div>

      {obj.type === 'shape' && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '6px 0 12px' }}>
          <div style={{
            width: '90px',
            height: '62px',
            background: obj.data?.shapeColor || 'rgba(0,212,255,0.35)',
            border: '1px solid rgba(255,255,255,0.25)',
            ...SHAPE_STYLE[shapeType],
          }} />
        </div>
      )}

      {obj.type === 'image' && obj.data?.src && (
        <img
          src={obj.data.src}
          alt={obj.data?.title || 'Canvas image'}
          style={{ width: '100%', height: '92px', objectFit: 'cover', borderRadius: '8px', marginBottom: '8px' }}
        />
      )}

      {obj.type === 'metric' && (
        <div style={{ marginBottom: '12px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#4ade80', lineHeight: 1 }}>{metricValue}</div>
          <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginTop: '4px' }}>{metricLabel}</div>
        </div>
      )}

      {obj.type === 'checklist' && (
        <div style={{ marginBottom: '10px' }}>
          {checklistItems.slice(0, 4).map((item, index) => (
            <label key={`${obj.id}-item-${index}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--theme-text-primary)', marginBottom: '4px' }}>
              <input
                type="checkbox"
                checked={Boolean(item.checked)}
                onChange={(e) => { e.stopPropagation(); handleToggleChecklist(index) }}
                onClick={(e) => e.stopPropagation()}
              />
              <span style={{ textDecoration: item.checked ? 'line-through' : 'none', opacity: item.checked ? 0.65 : 1 }}>
                {item.text || `Item ${index + 1}`}
              </span>
            </label>
          ))}
          <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>{checklistProgress}% complete</div>
        </div>
      )}

      {!['shape', 'image', 'metric', 'checklist'].includes(obj.type) && (
        <p style={{ margin: '0 0 10px', fontSize: '11px', color: 'var(--theme-text-secondary)', lineHeight: 1.4 }}>
          {obj.data?.body || obj.data?.text || 'Canvas item'}
        </p>
      )}

      <div style={{ display: 'flex', gap: '6px' }}>
        <button
          onClick={(e) => { e.stopPropagation(); onCreateTask?.(obj) }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            padding: '4px 8px',
            borderRadius: '6px',
            border: '1px solid rgba(0,212,255,0.45)',
            background: 'rgba(0,212,255,0.12)',
            color: 'var(--theme-accent)',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Create Task
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            actions.removeCanvasObject(obj.id)
            taskboardClient.deleteCanvasObject(obj.id).catch(() => {})
          }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            padding: '4px 7px',
            borderRadius: '6px',
            border: '1px solid rgba(239,68,68,0.45)',
            background: 'rgba(239,68,68,0.1)',
            color: '#fca5a5',
            fontSize: '10px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Remove
        </button>
      </div>
    </div>
  )
}

