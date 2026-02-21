import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useTaskBoard } from '../../../../context/TaskBoardContext'

export default function ProjectFolderCard({ project, dimmed = false, isDragging = false, isOverlay = false, onContextMenu, isSelected = false, isConnectSource = false, onClick }) {
  const { state, actions } = useTaskBoard()
  const [hovered, setHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: project.id,
  })

  const pos = project.canvasPosition || { x: 0, y: 0 }
  const taskCount = state.tasks.filter(t => t.projectId === project.id).length
  const docCount = state.documents.filter(d => d.projectId === project.id).length
  const colCount = (project.columns || []).length

  const handleOpen = () => {
    actions.setSelectedProject(project)
    actions.setProjectTab('board')
  }

  const style = {
    position: isOverlay ? 'relative' : 'absolute',
    left: isOverlay ? undefined : pos.x,
    top: isOverlay ? undefined : pos.y,
    width: '240px',
    minHeight: '160px',
    borderRadius: '12px',
    background: 'var(--theme-surface)',
    border: `${isSelected ? '2px dashed var(--theme-accent)' : isConnectSource ? '2px solid var(--theme-accent)' : `1px solid ${isDragging || isOverlay ? (project.color || 'var(--theme-accent)') : hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`}`,
    borderLeft: `4px solid ${project.color || '#71717a'}`,
    padding: '16px',
    cursor: isDragging ? 'grabbing' : 'pointer',
    transition: isDragging || isOverlay ? 'none' : 'all 0.15s ease',
    transform: CSS.Translate.toString(transform) || undefined,
    scale: isDragging || isOverlay ? '1.04' : '1',
    boxShadow: isDragging || isOverlay
      ? `0 12px 32px rgba(0,0,0,0.6)`
      : hovered
        ? '0 4px 12px rgba(0,0,0,0.4)'
        : '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: isDragging ? 1000 : isSelected ? 8 : 5,
    boxSizing: 'border-box',
    filter: isConnectSource ? 'drop-shadow(0 0 8px rgba(0,212,255,0.6))' : isSelected ? 'drop-shadow(0 0 4px rgba(0,212,255,0.3))' : 'none',
    opacity: dimmed ? 0.3 : 1,
    userSelect: 'none',
  }

  return (
    <div
      ref={setNodeRef}
      className="folder-card"
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onDoubleClick={handleOpen}
      onClick={onClick}
      onContextMenu={onContextMenu}
      {...attributes}
      {...listeners}
    >
      {/* Drag grip - visible on hover */}
      {hovered && !isDragging && (
        <div style={{
          position: 'absolute', top: '8px', right: '8px',
          fontSize: '10px', color: 'rgba(255,255,255,0.3)',
          letterSpacing: '2px', lineHeight: '8px',
        }}>
          ⋮⋮
        </div>
      )}

      {/* Icon + Name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px' }}>{project.icon || '📁'}</span>
        <span style={{
          fontSize: '14px', fontWeight: 600, color: 'var(--theme-text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {project.name}
        </span>
      </div>

      {/* Description */}
      {project.description && (
        <p style={{
          margin: '0 0 10px', fontSize: '11px', color: 'var(--theme-text-secondary)',
          lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis',
          display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
        }}>
          {project.description}
        </p>
      )}

      <div style={{ flex: 1 }} />

      {/* Footer stats */}
      <div style={{
        display: 'flex', gap: '10px', fontSize: '10px', color: 'var(--theme-text-secondary)',
        marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span>📋 {taskCount}</span>
        <span>📎 {docCount}</span>
        <span>📊 {colCount} cols</span>
        <span style={{
          marginLeft: 'auto', fontSize: '9px', fontWeight: 600,
          color: project.status === 'active' ? 'var(--theme-accent)' : project.status === 'completed' ? '#4ade80' : '#f59e0b',
          textTransform: 'uppercase',
        }}>
          {project.status}
        </span>
      </div>

      {/* Open button - visible on hover */}
      {hovered && !isDragging && (
        <button
          onClick={(e) => { e.stopPropagation(); handleOpen() }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{
            position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)',
            padding: '4px 14px', borderRadius: '12px', fontSize: '10px', fontWeight: 600,
            border: '1px solid var(--theme-accent)', background: 'rgba(10,10,15,0.95)',
            color: 'var(--theme-accent)', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          Open →
        </button>
      )}
    </div>
  )
}
