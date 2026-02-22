import { useMemo, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { getProjectProgress } from './projectWorkspaceUtils'

export default function ProjectFolderCard({
  project,
  dimmed = false,
  isDragging = false,
  isOverlay = false,
  onContextMenu,
  isSelected = false,
  isConnectSource = false,
  onClick,
  onOpen,
  onCreateTaskFromProject,
  progress,
}) {
  const { state, actions } = useTaskBoard()
  const [hovered, setHovered] = useState(false)

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: project.id,
  })

  const pos = project.canvasPosition || { x: 0, y: 0 }
  const taskCount = state.tasks.filter(t => t.projectId === project.id).length
  const docCount = state.documents.filter(d => d.projectId === project.id).length
  const childCount = state.projects.filter(p => p.parentProjectId === project.id && p.status !== 'archived').length

  const computedProgress = useMemo(
    () => (typeof progress === 'number' ? progress : getProjectProgress(project.id, state.projects, state.tasks)),
    [progress, project.id, state.projects, state.tasks],
  )

  const handleOpen = () => {
    if (onOpen) {
      onOpen(project)
      return
    }
    actions.setSelectedProject(project)
    actions.setProjectTab('canvas')
  }

  const style = {
    position: isOverlay ? 'relative' : 'absolute',
    left: isOverlay ? undefined : pos.x,
    top: isOverlay ? undefined : pos.y,
    width: '240px',
    minHeight: '170px',
    borderRadius: '12px',
    background: 'var(--theme-surface)',
    border: `${isSelected ? '2px dashed var(--theme-accent)' : isConnectSource ? '2px solid var(--theme-accent)' : `1px solid ${isDragging || isOverlay ? (project.color || 'var(--theme-accent)') : hovered ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.06)'}`}`,
    borderLeft: `4px solid ${project.color || '#71717a'}`,
    padding: '16px',
    cursor: isDragging ? 'grabbing' : 'pointer',
    transition: isDragging || isOverlay ? 'none' : 'all var(--motion-fast, 120ms ease)',
    transform: isDragging && !isOverlay
      ? 'rotate(1.5deg) translateY(-2px) scale(1.02)'
      : (CSS.Translate.toString(transform) || undefined),
    boxShadow: isDragging || isOverlay
      ? '0 16px 34px rgba(0,0,0,0.62)'
      : hovered
        ? '0 4px 12px rgba(0,0,0,0.4)'
        : '0 2px 8px rgba(0,0,0,0.3)',
    zIndex: isDragging ? 1000 : isSelected ? 8 : 5,
    boxSizing: 'border-box',
    filter: isConnectSource ? 'drop-shadow(0 0 8px rgba(0,212,255,0.6))' : isSelected ? 'drop-shadow(0 0 4px rgba(0,212,255,0.3))' : 'none',
    opacity: isDragging && !isOverlay ? 0 : (dimmed ? 0.3 : 1),
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
      {hovered && !isDragging && (
        <div style={{
          position: 'absolute',
          top: '8px',
          right: '8px',
          fontSize: '10px',
          color: 'rgba(255,255,255,0.3)',
          letterSpacing: '2px',
          lineHeight: '8px',
        }}>
          ⋮⋮
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontSize: '18px' }}>{project.icon || '📁'}</span>
        <span style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'var(--theme-text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1,
        }}>
          {project.name}
        </span>
      </div>

      {project.description && (
        <p style={{
          margin: '0 0 10px',
          fontSize: '11px',
          color: 'var(--theme-text-secondary)',
          lineHeight: 1.4,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
        }}>
          {project.description}
        </p>
      )}

      <div style={{ marginTop: '6px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', fontSize: '10px', color: 'var(--theme-text-secondary)' }}>
          <span>Progress</span>
          <span>{computedProgress}%</span>
        </div>
        <div style={{ height: '4px', borderRadius: '999px', background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${computedProgress}%`, background: project.color || 'var(--theme-accent)', transition: 'width 0.2s' }} />
        </div>
      </div>

      <div style={{ flex: 1 }} />

      <div style={{
        display: 'flex',
        gap: '10px',
        fontSize: '10px',
        color: 'var(--theme-text-secondary)',
        marginTop: '8px',
        paddingTop: '8px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <span>📋 {taskCount}</span>
        <span>📎 {docCount}</span>
        <span>📁 {childCount}</span>
        <span style={{
          marginLeft: 'auto',
          fontSize: '9px',
          fontWeight: 600,
          color: project.status === 'active' ? 'var(--theme-accent)' : project.status === 'completed' ? '#4ade80' : '#f59e0b',
          textTransform: 'uppercase',
        }}>
          {project.status}
        </span>
      </div>

      {hovered && !isDragging && (
        <div style={{ position: 'absolute', bottom: '-12px', left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '6px' }}>
          <button
            onClick={(e) => { e.stopPropagation(); handleOpen() }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              padding: '4px 12px',
              borderRadius: '12px',
              fontSize: '10px',
              fontWeight: 600,
              border: '1px solid var(--theme-accent)',
              background: 'rgba(10,10,15,0.95)',
              color: 'var(--theme-accent)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            Open →
          </button>
          {onCreateTaskFromProject && (
            <button
              onClick={(e) => { e.stopPropagation(); onCreateTaskFromProject(project) }}
              onMouseDown={(e) => e.stopPropagation()}
              style={{
                padding: '4px 10px',
                borderRadius: '12px',
                fontSize: '10px',
                fontWeight: 600,
                border: '1px solid rgba(74,222,128,0.5)',
                background: 'rgba(74,222,128,0.14)',
                color: '#86efac',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              + Task
            </button>
          )}
        </div>
      )}
    </div>
  )
}

