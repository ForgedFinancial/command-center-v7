import { useMemo, useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { useTaskBoard } from '../../../../context/TaskBoardContext'

const STATUS_COLORS = {
  active: '#22C55E',
  planning: '#EAB308',
  on_hold: '#F97316',
  completed: '#00D4FF',
}

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

  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: project.id })

  const pos = project.canvasPosition || { x: 0, y: 0 }
  const taskCount = state.tasks.filter((task) => task.projectId === project.id).length
  const docCount = state.documents.filter((doc) => doc.projectId === project.id).length
  const childCount = state.projects.filter((child) => child.parentProjectId === project.id && child.status !== 'archived').length

  const computedProgress = useMemo(() => {
    if (typeof progress === 'number') return progress

    const objects = state.canvasObjects.filter((obj) => obj.projectId === project.id || obj.data?.projectId === project.id)
    const taskObjects = objects.filter((obj) => obj.type === 'task' || obj.type === 'taskcard' || obj.type === 'task-card')
    if (!taskObjects.length) return project.progress || 0

    const done = taskObjects.filter((obj) => obj.data?.status === 'done').length
    return Math.round((done / taskObjects.length) * 100)
  }, [progress, project.progress, project.id, state.canvasObjects])

  const handleOpen = () => {
    if (onOpen) {
      onOpen(project)
      return
    }
    actions.setSelectedProject(project)
    actions.setProjectTab('canvas')
  }

  const handleActivate = (event) => {
    onClick?.(event)
    if (event.defaultPrevented || event.shiftKey) return
    handleOpen()
  }

  const statusColor = STATUS_COLORS[project.status] || '#00D4FF'
  const spawnFresh = project.__spawnAt && (Date.now() - project.__spawnAt) < 2500

  return (
    <article
      ref={setNodeRef}
      className="project-folder-card folder-card"
      style={{
        position: isOverlay ? 'relative' : 'absolute',
        left: isOverlay ? undefined : pos.x,
        top: isOverlay ? undefined : pos.y,
        width: 240,
        minHeight: 170,
        borderRadius: 12,
        background: 'var(--theme-surface)',
        border: isSelected ? '2px dashed rgba(0,212,255,0.85)' : isConnectSource ? '2px solid rgba(0,212,255,0.68)' : '1px solid rgba(154,167,188,0.20)',
        borderLeft: `4px solid ${project.color || statusColor}`,
        padding: 16,
        cursor: isDragging ? 'grabbing' : 'pointer',
        transition: isDragging || isOverlay ? 'none' : 'all var(--motion-fast)',
        transform: isDragging && !isOverlay ? 'rotate(1.5deg) translateY(-2px) scale(1.02)' : (CSS.Translate.toString(transform) || undefined),
        boxShadow: isDragging || isOverlay ? '0 16px 34px rgba(0,0,0,0.62)' : hovered ? '0 12px 28px rgba(0,0,0,0.40)' : '0 8px 24px rgba(0,0,0,0.34)',
        zIndex: isDragging ? 1000 : isSelected ? 8 : 5,
        opacity: isDragging && !isOverlay ? 0 : (dimmed ? 0.3 : 1),
        filter: isConnectSource ? 'drop-shadow(0 0 8px rgba(0,212,255,0.6))' : 'none',
        userSelect: 'none',
        animation: spawnFresh ? 'project-folder-spawn 180ms cubic-bezier(0.22,1,0.36,1)' : 'none',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={handleActivate}
      onDoubleClick={(e) => {
        e.preventDefault()
        handleOpen()
      }}
      onContextMenu={onContextMenu}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          handleOpen()
        }
      }}
      {...attributes}
      {...listeners}
    >
      <div className="project-card-arrow" aria-hidden="true" style={{ position: 'absolute', top: 10, right: 10, color: hovered ? '#00D4FF' : '#66758C', transform: hovered ? 'translateX(2px)' : 'translateX(0)', transition: 'transform var(--motion-fast), color var(--motion-fast)', fontWeight: 700 }}>→</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{project.icon || project.emoji || '📁'}</span>
        <span style={{ fontSize: 14, fontWeight: 600, color: '#E6EDF7', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{project.name}</span>
      </div>

      {project.description && (
        <p style={{ margin: '0 0 10px', fontSize: 11, color: '#9AA7BC', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
          {project.description}
        </p>
      )}

      <div style={{ marginTop: 6, marginBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3, fontSize: 10, color: '#9AA7BC' }}>
          <span>Progress</span>
          <span>{computedProgress}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 999, background: 'rgba(154,167,188,0.18)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${computedProgress}%`, background: computedProgress === 100 ? 'linear-gradient(90deg,#00D4FF,#D4A574)' : (project.color || '#00D4FF'), transition: 'width var(--motion-fast)' }} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, fontSize: 10, color: '#9AA7BC', marginTop: 8, paddingTop: 8, borderTop: '1px solid rgba(154,167,188,0.16)' }}>
        <span>📋 {taskCount}</span>
        <span>📎 {docCount}</span>
        <span>📁 {childCount}</span>
        <span style={{ marginLeft: 'auto', fontWeight: 700, color: statusColor, textTransform: 'uppercase' }}>
          {project.status?.replace('_', ' ') || 'active'}
        </span>
      </div>

      <div className="project-open-actions" style={{ position: 'absolute', bottom: -12, left: '50%', transform: 'translateX(-50%)', display: hovered ? 'flex' : 'none', gap: 6 }}>
        <button
          className="project-open-cta"
          onClick={(e) => { e.stopPropagation(); handleOpen() }}
          onMouseDown={(e) => e.stopPropagation()}
          style={{ padding: '4px 12px', borderRadius: 12, fontSize: 10, fontWeight: 600, border: '1px solid rgba(0,212,255,0.52)', background: 'rgba(10,10,15,0.95)', color: '#00D4FF', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          Open →
        </button>

        {onCreateTaskFromProject && (
          <button
            onClick={(e) => { e.stopPropagation(); onCreateTaskFromProject(project) }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{ padding: '4px 10px', borderRadius: 12, fontSize: 10, fontWeight: 600, border: '1px solid rgba(74,222,128,0.5)', background: 'rgba(74,222,128,0.14)', color: '#86efac', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            + Task
          </button>
        )}
      </div>
    </article>
  )
}
