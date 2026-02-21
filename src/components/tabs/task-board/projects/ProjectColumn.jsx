import { useState } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import ProjectTaskCard from './ProjectTaskCard'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'

export default function ProjectColumn({ column, tasks, project, onEditColumn }) {
  const { actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [showAddTask, setShowAddTask] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [saving, setSaving] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [editingName, setEditingName] = useState(false)
  const [editName, setEditName] = useState(column.name)

  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const taskIds = tasks.map(t => t.id)

  const handleAddTask = async () => {
    if (!newTitle.trim()) return
    setSaving(true)
    try {
      const res = await taskboardClient.createTask({
        title: newTitle.trim(),
        projectId: project.id,
        projectColumn: column.id,
        stage: 'in_progress',
      })
      if (res.ok) {
        actions.addTask(res.data)
        setNewTitle('')
        setShowAddTask(false)
      }
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Failed: ${err.message}` })
    } finally {
      setSaving(false)
    }
  }

  const handleNameSave = () => {
    if (editName.trim() && editName !== column.name) {
      onEditColumn(column.id, { name: editName.trim() })
    }
    setEditingName(false)
  }

  return (
    <div style={{
      width: '280px', minWidth: '280px', flexShrink: 0,
      display: 'flex', flexDirection: 'column',
      background: 'rgba(255,255,255,0.02)',
      borderRadius: '10px',
      border: isOver ? '1px solid var(--theme-accent)' : '1px solid rgba(255,255,255,0.04)',
      transition: 'border-color 0.15s',
    }}>
      {/* Column header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)',
      }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: column.color || '#71717a', flexShrink: 0 }} />

        {editingName ? (
          <input value={editName} onChange={(e) => setEditName(e.target.value)}
            onBlur={handleNameSave}
            onKeyDown={(e) => { if (e.key === 'Enter') handleNameSave(); if (e.key === 'Escape') { setEditName(column.name); setEditingName(false) } }}
            autoFocus
            style={{
              flex: 1, fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)',
              background: 'rgba(255,255,255,0.04)', border: '1px solid var(--theme-accent)',
              borderRadius: '4px', padding: '2px 6px', outline: 'none', fontFamily: 'inherit',
            }} />
        ) : (
          <span onClick={() => { setEditName(column.name); setEditingName(true) }}
            style={{ flex: 1, fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)', cursor: 'text' }}>
            {column.name}
          </span>
        )}

        <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>{tasks.length}</span>

        {/* Menu */}
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowMenu(!showMenu)}
            style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', cursor: 'pointer', fontSize: '14px', padding: '0 2px' }}>
            ⋮
          </button>
          {showMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, zIndex: 30,
              background: 'var(--theme-surface)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px', padding: '4px 0', minWidth: '140px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }} onMouseLeave={() => setShowMenu(false)}>
              {[
                { label: 'Rename', action: () => { setEditName(column.name); setEditingName(true); setShowMenu(false) } },
                { label: 'Color', action: () => { onEditColumn(column.id, { showColorPicker: true }); setShowMenu(false) } },
                { label: 'Move Left', action: () => { onEditColumn(column.id, { moveDir: -1 }); setShowMenu(false) } },
                { label: 'Move Right', action: () => { onEditColumn(column.id, { moveDir: 1 }); setShowMenu(false) } },
                { label: 'Delete', action: () => { onEditColumn(column.id, { delete: true }); setShowMenu(false) }, color: '#ef4444' },
              ].map(item => (
                <button key={item.label} onClick={item.action}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '6px 14px', background: 'none', border: 'none',
                    color: item.color || 'var(--theme-text-primary)', fontSize: '12px',
                    cursor: 'pointer',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'none' }}>
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Task list */}
      <div ref={setNodeRef} style={{ flex: 1, padding: '8px', display: 'flex', flexDirection: 'column', gap: '6px', overflowY: 'auto', minHeight: '60px' }}>
        <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <ProjectTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>
      </div>

      {/* Add task */}
      <div style={{ padding: '8px' }}>
        {showAddTask ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAddTask(); if (e.key === 'Escape') setShowAddTask(false) }}
              placeholder="Task title..." autoFocus
              style={{
                width: '100%', padding: '8px 10px', borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
                color: 'var(--theme-text-primary)', fontSize: '12px', outline: 'none',
                fontFamily: 'inherit', boxSizing: 'border-box',
              }} />
            <div style={{ display: 'flex', gap: '4px' }}>
              <button onClick={handleAddTask} disabled={saving || !newTitle.trim()}
                style={{
                  flex: 1, padding: '5px', borderRadius: '6px', border: '1px solid var(--theme-accent)',
                  background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)',
                  fontSize: '11px', fontWeight: 600, cursor: 'pointer', opacity: !newTitle.trim() ? 0.5 : 1,
                }}>{saving ? '...' : 'Add'}</button>
              <button onClick={() => setShowAddTask(false)}
                style={{ padding: '5px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '11px', cursor: 'pointer' }}>
                ✕
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowAddTask(true)}
            style={{
              width: '100%', padding: '6px', borderRadius: '6px', border: 'none',
              background: 'transparent', color: 'var(--theme-text-secondary)',
              fontSize: '11px', cursor: 'pointer', textAlign: 'left',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
            onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}>
            + Add task
          </button>
        )}
      </div>
    </div>
  )
}
