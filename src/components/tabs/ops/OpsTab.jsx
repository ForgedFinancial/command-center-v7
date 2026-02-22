import { useState, useEffect, useCallback, useRef } from 'react'
import { useApp } from '../../../context/AppContext'
import { TABS } from '../../../config/constants'
import { ENDPOINTS, getSyncHeaders } from '../../../config/api'
import PipelineBoard from './pipeline/PipelineBoard'
import KnowledgePanel from './knowledge/KnowledgePanel'
import CompletedView from './completed/CompletedView'

const SUB_VIEWS = { PIPELINE: 'pipeline', KNOWLEDGE: 'knowledge', COMPLETED: 'completed' }

export default function OpsTab() {
  const { state, actions } = useApp()
  const [subView, setSubView] = useState(SUB_VIEWS.PIPELINE)

  // Pipeline state
  const [tasks, setTasks] = useState([])
  const [tasksLoading, setTasksLoading] = useState(true)
  const [filters, setFilters] = useState({ assignee: 'all', priority: 'all', stage: 'all', scope: 'all', search: '' })

  // Knowledge state
  const [entries, setEntries] = useState([])
  const [entriesLoading, setEntriesLoading] = useState(true)

  // Connection error tracking
  const failCountRef = useRef(0)
  const [connectionLost, setConnectionLost] = useState(false)

  // Toast helper
  const toast = useCallback((msg, type = 'error') => {
    actions.addToast({ message: msg, type, duration: 4000 })
  }, [actions])

  // Fetch pipeline tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.opsPipelineTasks, { headers: getSyncHeaders() })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setTasks(data.tasks || [])
      setTasksLoading(false)
      failCountRef.current = 0
      setConnectionLost(false)
    } catch {
      failCountRef.current++
      if (failCountRef.current >= 3) setConnectionLost(true)
      setTasksLoading(false)
    }
  }, [])

  // Fetch knowledge entries
  const fetchEntries = useCallback(async () => {
    try {
      const res = await fetch(ENDPOINTS.opsKnowledgeEntries, { headers: getSyncHeaders() })
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      setEntries(data.entries || [])
      setEntriesLoading(false)
      failCountRef.current = 0
      setConnectionLost(false)
    } catch {
      failCountRef.current++
      if (failCountRef.current >= 3) setConnectionLost(true)
      setEntriesLoading(false)
    }
  }, [])

  // Initial fetch
  useEffect(() => {
    fetchTasks()
    fetchEntries()
  }, [fetchTasks, fetchEntries])

  // Polling — 15s pipeline, 30s knowledge (only when Ops tab active)
  useEffect(() => {
    if (state.activeTab !== TABS.OPS) return
    const pipelineId = setInterval(fetchTasks, 15000)
    const knowledgeId = setInterval(fetchEntries, 30000)
    return () => { clearInterval(pipelineId); clearInterval(knowledgeId) }
  }, [state.activeTab, fetchTasks, fetchEntries])

  // === Mutation helpers (optimistic) ===

  const createTask = useCallback(async (taskData) => {
    try {
      const res = await fetch(ENDPOINTS.opsPipelineTasks, {
        method: 'POST', headers: getSyncHeaders(), body: JSON.stringify(taskData),
      })
      if (!res.ok) throw new Error('Create failed')
      const created = await res.json()
      setTasks(prev => [...prev, created])
      return created
    } catch (err) {
      toast('Create task failed — reverted')
      throw err
    }
  }, [toast])

  const updateTask = useCallback(async (id, patch) => {
    const prev = tasks
    // Optimistic update
    setTasks(ts => ts.map(t => t.id === id ? { ...t, ...patch } : t))
    try {
      const res = await fetch(ENDPOINTS.opsPipelineTask(id), {
        method: 'PATCH', headers: getSyncHeaders(), body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Update failed')
      const updated = await res.json()
      setTasks(ts => ts.map(t => t.id === id ? updated : t))
      return updated
    } catch (err) {
      setTasks(prev)
      toast('Update task failed — reverted')
      throw err
    }
  }, [tasks, toast])

  const deleteTask = useCallback(async (id) => {
    const prev = tasks
    setTasks(ts => ts.filter(t => t.id !== id))
    try {
      const res = await fetch(ENDPOINTS.opsPipelineTask(id), {
        method: 'DELETE', headers: getSyncHeaders(),
      })
      if (!res.ok) throw new Error('Delete failed')
    } catch (err) {
      setTasks(prev)
      toast('Delete task failed — reverted')
    }
  }, [tasks, toast])

  const createEntry = useCallback(async (entryData) => {
    try {
      const res = await fetch(ENDPOINTS.opsKnowledgeEntries, {
        method: 'POST', headers: getSyncHeaders(), body: JSON.stringify(entryData),
      })
      if (!res.ok) throw new Error('Create failed')
      const created = await res.json()
      setEntries(prev => [...prev, created])
      return created
    } catch (err) {
      toast('Create entry failed — reverted')
      throw err
    }
  }, [toast])

  const updateEntry = useCallback(async (id, patch) => {
    const prev = entries
    setEntries(es => es.map(e => e.id === id ? { ...e, ...patch } : e))
    try {
      const res = await fetch(ENDPOINTS.opsKnowledgeEntry(id), {
        method: 'PATCH', headers: getSyncHeaders(), body: JSON.stringify(patch),
      })
      if (!res.ok) throw new Error('Update failed')
      const updated = await res.json()
      setEntries(es => es.map(e => e.id === id ? updated : e))
    } catch (err) {
      setEntries(prev)
      toast('Update entry failed — reverted')
    }
  }, [entries, toast])

  const deleteEntry = useCallback(async (id) => {
    const prev = entries
    setEntries(es => es.filter(e => e.id !== id))
    try {
      const res = await fetch(ENDPOINTS.opsKnowledgeEntry(id), {
        method: 'DELETE', headers: getSyncHeaders(),
      })
      if (!res.ok) throw new Error('Delete failed')
    } catch (err) {
      setEntries(prev)
      toast('Delete entry failed — reverted')
    }
  }, [entries, toast])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Connection lost banner */}
      {connectionLost && (
        <div style={{
          padding: '8px 16px', borderRadius: '8px',
          backgroundColor: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
          color: '#ef4444', fontSize: '12px', fontWeight: 500, textAlign: 'center',
        }}>
          Connection lost — retrying…
        </div>
      )}

      {/* Sub-nav toggle */}
      <SubNav active={subView} onChange={setSubView} />

      {/* Content */}
      {subView === SUB_VIEWS.PIPELINE ? (
        <PipelineBoard
          tasks={tasks}
          loading={tasksLoading}
          filters={filters}
          onFiltersChange={setFilters}
          onCreateTask={createTask}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
        />
      ) : subView === SUB_VIEWS.COMPLETED ? (
        <CompletedView />
      ) : (
        <KnowledgePanel
          entries={entries}
          loading={entriesLoading}
          onCreateEntry={createEntry}
          onUpdateEntry={updateEntry}
          onDeleteEntry={deleteEntry}
        />
      )}
    </div>
  )
}

function SubNav({ active, onChange }) {
  const options = [
    { id: 'pipeline',  label: '🔨 Pipeline',  icon: '' },
    { id: 'completed', label: '✅ Completed', icon: '' },
    { id: 'knowledge', label: '📚 Knowledge', icon: '' },
  ]

  return (
    <div style={{
      display: 'flex', gap: '4px', padding: '4px',
      backgroundColor: 'var(--theme-surface, rgba(255,255,255,0.03))',
      borderRadius: '10px', width: 'fit-content',
    }}>
      {options.map(opt => {
        const isActive = active === opt.id
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            style={{
              padding: '8px 20px', fontSize: '13px', fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--theme-text-primary)' : 'var(--theme-text-secondary)',
              backgroundColor: isActive ? 'var(--theme-accent-muted, rgba(139,92,246,0.15))' : 'transparent',
              border: 'none', borderRadius: '8px', cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
