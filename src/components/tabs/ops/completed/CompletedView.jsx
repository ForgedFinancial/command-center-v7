import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { WORKER_PROXY_URL, getSyncHeaders, ENDPOINTS } from '../../../../config/api'
import TimeAgo from '../shared/TimeAgo'
import ReportModal from './ReportModal'

const AGENT_COLORS = {
  soren: '#a855f7',
  mason: '#f59e0b',
  sentinel: '#06b6d4',
  clawd: '#3b82f6',
  kyle: '#f97316',
  dano: '#f59e0b',
}

const PRIORITY_STYLES = {
  CRITICAL: { color: '#FFD7A8', bg: 'rgba(127,29,29,0.55)', border: 'rgba(245,158,11,0.6)' },
  HIGH: { color: '#FDE68A', bg: 'rgba(120,53,15,0.45)', border: 'rgba(245,158,11,0.45)' },
  MEDIUM: { color: '#E2E8F0', bg: 'rgba(51,65,85,0.45)', border: 'rgba(148,163,184,0.35)' },
  LOW: { color: '#C7D2FE', bg: 'rgba(49,46,129,0.35)', border: 'rgba(129,140,248,0.35)' },
}

const getPriority = (task) => {
  const value = String(task.priority || task.severity || task.urgency || 'MEDIUM').toUpperCase()
  return PRIORITY_STYLES[value] ? value : 'MEDIUM'
}

const getWorkstream = (task) => {
  const source = `${task.workstream || task.stream || task.type || ''}`.toLowerCase()
  if (source.includes('fe') || source.includes('front')) return 'FE'
  if (source.includes('be') || source.includes('back')) return 'BE'
  return 'OPS'
}

const workstreamStyles = {
  FE: { color: '#c4b5fd', bg: 'rgba(196,181,253,0.16)', border: 'rgba(196,181,253,0.45)' },
  BE: { color: '#67e8f9', bg: 'rgba(103,232,249,0.14)', border: 'rgba(103,232,249,0.45)' },
  OPS: { color: '#cbd5e1', bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.35)' },
}

export default function CompletedView() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const [loadingReportId, setLoadingReportId] = useState(null)
  const listRef = useRef(null)
  const [reportModal, setReportModal] = useState({ open: false, taskId: null, taskName: '', content: '' })

  const fetchReport = useCallback(async (taskId) => {
    try {
      const res = await fetch(`${WORKER_PROXY_URL}${ENDPOINTS.opsPipelineTask(taskId)}`, {
        headers: getSyncHeaders(),
      })
      if (!res.ok) return 'No report available yet.'

      const task = await res.json()
      const reportComment = (task.comments || []).find(c => c.message?.startsWith('REPORT:') || c.message?.includes('report.md'))
      const reportLog = (task.pipeline_log || []).find(l => l.notes?.includes('report') || l.notes?.includes('Files Changed'))

      return reportComment?.message || reportLog?.notes || task.description || 'No report available yet.'
    } catch {
      return 'No report available yet.'
    }
  }, [])

  const openReport = useCallback(async (task) => {
    setLoadingReportId(task.id)
    const content = await fetchReport(task.id)
    setLoadingReportId(null)
    setReportModal({ open: true, taskId: task.id, taskName: task.title || task.name || 'Task', content })
  }, [fetchReport])

  const closeReport = useCallback(() => {
    setReportModal({ open: false, taskId: null, taskName: '', content: '' })
  }, [])

  const fetchCompleted = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_PROXY_URL}${ENDPOINTS.opsPipelineArchive}`, { headers: getSyncHeaders() })
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.tasks || [])
        const all = items.map(t => ({
          id: t.id,
          title: t.name || t.title || 'Untitled',
          status: (t.stage === 'DONE') ? 'complete' : 'failed',
          assigned_to: String(t.assignee || t.assigned_to || 'unassigned').toLowerCase(),
          created_by: t.createdBy,
          created_at: t.createdAt,
          completed_at: t.stageEnteredAt || t.completedAt || t.createdAt,
          result_summary: t.description,
          result: t.result || null,
          error: t.error || null,
          comments: t.comments || [],
          ops_task_id: t.id,
          priority: t.priority,
          workstream: t.workstream,
          type: t.type,
        })).sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at))
        setTasks(all)
      }
    } catch {
      // silent
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchCompleted() }, [fetchCompleted])

  useEffect(() => {
    const id = setInterval(fetchCompleted, 30000)
    return () => clearInterval(id)
  }, [fetchCompleted])

  const agents = ['soren', 'mason', 'sentinel']
  const filteredTasks = useMemo(() => (filter === 'all' ? tasks : tasks.filter(t => t.assigned_to === filter)), [tasks, filter])

  const total = filteredTasks.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const end = start + pageSize
  const paged = filteredTasks.slice(start, end)
  const from = total === 0 ? 0 : start + 1
  const to = total === 0 ? 0 : Math.min(end, total)

  useEffect(() => {
    setPage(1)
    listRef.current?.scrollTo({ top: 0 })
  }, [filter, pageSize])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const handlePageChange = (nextPage) => {
    setPage(nextPage)
    setExpanded(null)
    listRef.current?.scrollTo({ top: 0 })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '10px 0' }}>
        {[...Array(5)].map((_, i) => (
          <div key={i} style={{
            minHeight: '78px',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.08)',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.03), rgba(255,255,255,0.01))',
          }} />
        ))}
        <div style={{ textAlign: 'center', color: 'rgba(245,231,196,0.72)', fontSize: '12px' }}>Loading completed tasks…</div>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0, background: '#07090F' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 700, lineHeight: 1.2, color: '#F5E7C4' }}>Completed Tasks</h2>
          <p style={{ margin: '2px 0 0', fontSize: '11px', fontWeight: 500, color: 'rgba(245,231,196,0.72)' }}>
            {total} task{total !== 1 ? 's' : ''} — what the team has shipped
          </p>
        </div>

        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {['all', ...agents].map(a => {
            const activeColor = AGENT_COLORS[a] || '#C9D1E5'
            const active = filter === a
            return (
              <button
                key={a}
                onClick={() => setFilter(a)}
                style={{
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  borderRadius: '999px',
                  border: `1px solid ${active ? `${activeColor}66` : 'rgba(255,255,255,0.10)'}`,
                  background: active ? `${activeColor}22` : 'rgba(255,255,255,0.04)',
                  color: active ? activeColor : '#C9D1E5',
                  cursor: 'pointer',
                  boxShadow: active ? `0 0 14px ${activeColor}22` : 'none',
                }}
              >
                {a === 'all' ? 'All' : a.charAt(0).toUpperCase() + a.slice(1)}
              </button>
            )
          })}

          <button
            onClick={fetchCompleted}
            title='Refresh'
            style={{
              padding: '6px 12px',
              fontSize: '11px',
              fontWeight: 600,
              borderRadius: '999px',
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)',
              color: '#67e8f9',
              cursor: 'pointer',
            }}
          >
            ↻
          </button>
        </div>
      </div>

      <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {paged.length === 0 && (
          <div style={{
            marginTop: '22px',
            textAlign: 'center',
            borderRadius: '12px',
            border: '1px solid rgba(245,231,196,0.20)',
            background: 'linear-gradient(160deg, rgba(19,24,38,0.92) 0%, rgba(10,13,22,0.94) 100%)',
            padding: '24px 16px',
          }}>
            <div style={{ fontSize: '22px', color: 'rgba(245,231,196,0.45)', marginBottom: '6px' }}>◯✓</div>
            <div style={{ color: '#F8FAFC', fontWeight: 700, fontSize: '14px' }}>
              {filter === 'all' ? 'No completed tasks yet.' : `No completed tasks for ${filter.charAt(0).toUpperCase() + filter.slice(1)}.`}
            </div>
            <div style={{ color: 'rgba(201,209,229,0.82)', fontSize: '12px', marginTop: '4px' }}>
              Shipped work will appear here once tasks reach DONE.
            </div>
          </div>
        )}

        {paged.map(task => {
          const isOpen = expanded === task.id
          const summary = task.result_summary || task.error || '—'
          const priority = getPriority(task)
          const priorityStyle = PRIORITY_STYLES[priority]
          const workstream = getWorkstream(task)
          const workstreamStyle = workstreamStyles[workstream]
          const completedAt = task.completed_at || task.created_at
          const agent = task.assigned_to || 'unassigned'

          return (
            <div
              key={task.id}
              onClick={() => setExpanded(isOpen ? null : task.id)}
              style={{
                borderRadius: '12px',
                cursor: 'pointer',
                background: 'linear-gradient(160deg, rgba(19,24,38,0.92) 0%, rgba(10,13,22,0.94) 100%)',
                border: '1px solid rgba(245,231,196,0.20)',
                boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
                overflow: 'hidden',
                minHeight: '78px',
                transition: 'all 180ms cubic-bezier(0.22, 1, 0.36, 1)',
              }}
            >
              <div style={{ padding: '12px 14px', display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 700,
                    lineHeight: 1.3,
                    color: '#F8FAFC',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: isOpen ? 'normal' : 'nowrap',
                  }}>
                    {task.title}
                  </div>

                  <span style={{
                    height: '22px',
                    borderRadius: '999px',
                    padding: '0 10px',
                    fontSize: '10px',
                    fontWeight: 800,
                    letterSpacing: '0.6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    color: priorityStyle.color,
                    border: `1px solid ${priorityStyle.border}`,
                    background: priorityStyle.bg,
                    flexShrink: 0,
                  }}>
                    {priority}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(201,209,229,0.82)' }}>ASSIGNED</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: `1px solid ${(AGENT_COLORS[agent] || '#64748b')}66`,
                    background: `${AGENT_COLORS[agent] || '#64748b'}33`,
                    color: '#F8FAFC',
                  }}>
                    {agent}
                  </span>

                  <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.06em', color: 'rgba(201,209,229,0.82)' }}>COMPLETED</span>
                  <span title={completedAt ? new Date(completedAt).toLocaleString() : '—'} style={{ fontSize: '11px', color: '#F5E7C4' }}>
                    <TimeAgo date={completedAt} />
                  </span>

                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    borderRadius: '999px',
                    padding: '2px 8px',
                    border: `1px solid ${workstreamStyle.border}`,
                    background: workstreamStyle.bg,
                    color: workstreamStyle.color,
                  }}>
                    {workstream}
                  </span>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!loadingReportId) openReport(task)
                    }}
                    disabled={loadingReportId === task.id}
                    style={{
                      marginLeft: 'auto',
                      height: '30px',
                      padding: '0 12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(0,212,255,0.55)',
                      background: 'linear-gradient(135deg, rgba(0,212,255,0.20), rgba(0,212,255,0.10))',
                      color: '#9BEFFF',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: loadingReportId === task.id ? 'wait' : 'pointer',
                      opacity: loadingReportId === task.id ? 0.75 : 1,
                    }}
                  >
                    {loadingReportId === task.id ? 'Loading…' : 'View Report'}
                  </button>
                </div>
              </div>

              <div style={{
                maxHeight: isOpen ? '520px' : '0px',
                opacity: isOpen ? 1 : 0,
                transition: 'max-height 220ms cubic-bezier(0.22, 1, 0.36, 1), opacity 220ms cubic-bezier(0.22, 1, 0.36, 1)',
                overflow: 'hidden',
                borderTop: isOpen ? '1px solid rgba(245,231,196,0.14)' : '1px solid transparent',
                background: '#172033',
              }}>
                <div style={{ padding: '12px 14px 14px' }}>
                  <div style={{ fontSize: '10px', color: '#C9D1E5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '5px' }}>
                    Summary
                  </div>
                  <div style={{ fontSize: '12px', lineHeight: 1.6, color: '#E2E8F0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                    {summary}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '10px',
        flexWrap: 'wrap',
        padding: '10px 12px',
        borderRadius: '12px',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))',
        border: '1px solid rgba(245,231,196,0.16)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {[25, 50, 100].map(size => {
            const active = pageSize === size
            return (
              <button
                key={size}
                onClick={() => setPageSize(size)}
                style={{
                  padding: '4px 12px',
                  fontSize: '11px',
                  fontWeight: 700,
                  borderRadius: '999px',
                  border: active ? '1px solid rgba(245,231,196,0.60)' : '1px solid rgba(255,255,255,0.12)',
                  background: active ? 'rgba(245,231,196,0.20)' : 'rgba(255,255,255,0.02)',
                  color: active ? '#F5E7C4' : '#C9D1E5',
                  cursor: 'pointer',
                  boxShadow: active ? '0 0 12px rgba(245,231,196,0.18)' : 'none',
                }}
              >
                {size}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: '11px', color: '#C9D1E5' }}>Showing {from}–{to} of {total} tasks</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handlePageChange(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border: '1px solid rgba(0,212,255,0.35)',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,212,255,0.05))',
              color: '#9BEFFF',
              opacity: safePage === 1 ? 0.42 : 1,
              cursor: safePage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Prev
          </button>

          <span style={{ fontSize: '11px', color: '#C9D1E5' }}>Page {safePage} / {totalPages}</span>

          <button
            onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border: '1px solid rgba(0,212,255,0.35)',
              background: 'linear-gradient(135deg, rgba(0,212,255,0.12), rgba(0,212,255,0.05))',
              color: '#9BEFFF',
              opacity: safePage === totalPages ? 0.42 : 1,
              cursor: safePage === totalPages ? 'not-allowed' : 'pointer',
            }}
          >
            Next
          </button>
        </div>
      </div>

      {reportModal.open && (
        <ReportModal
          taskId={reportModal.taskId}
          taskName={reportModal.taskName}
          content={reportModal.content}
          onClose={closeReport}
        />
      )}
    </div>
  )
}
