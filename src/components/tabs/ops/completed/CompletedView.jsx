import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import toast from 'react-hot-toast'
import { WORKER_PROXY_URL, getSyncHeaders, ENDPOINTS } from '../../../../config/api'
import TimeAgo from '../shared/TimeAgo'
import ReportModal from './ReportModal'

const AGENTS = ['soren', 'mason', 'sentinel']

const AGENT_COLORS = {
  soren: '#A855F7',
  mason: '#F59E0B',
  sentinel: '#06B6D4',
  clawd: '#3B82F6',
  system: '#64748B',
  unassigned: '#64748B',
}

const PRIORITY_STYLES = {
  CRITICAL: { color: '#FFD7A8', bg: 'rgba(127,29,29,0.55)', border: 'rgba(245,158,11,0.60)' },
  HIGH: { color: '#FDE68A', bg: 'rgba(120,53,15,0.45)', border: 'rgba(245,158,11,0.45)' },
  MEDIUM: { color: '#E2E8F0', bg: 'rgba(51,65,85,0.45)', border: 'rgba(148,163,184,0.35)' },
  LOW: { color: '#C7D2FE', bg: 'rgba(49,46,129,0.35)', border: 'rgba(129,140,248,0.35)' },
}

const WORKSTREAM_STYLES = {
  FE: { color: '#C4B5FD', bg: 'rgba(196,181,253,0.16)', border: 'rgba(196,181,253,0.45)' },
  BE: { color: '#67E8F9', bg: 'rgba(103,232,249,0.14)', border: 'rgba(103,232,249,0.45)' },
  OPS: { color: '#CBD5E1', bg: 'rgba(148,163,184,0.14)', border: 'rgba(148,163,184,0.35)' },
}

const normalizePriority = (task) => {
  const value = String(task.priority || task.severity || task.urgency || 'MEDIUM').toLowerCase()
  if (value.includes('crit')) return 'CRITICAL'
  if (value.includes('high')) return 'HIGH'
  if (value.includes('med') || value.includes('normal')) return 'MEDIUM'
  if (value.includes('low')) return 'LOW'
  return 'MEDIUM'
}

const normalizeWorkstream = (task) => {
  const source = `${task.workstream || task.stream || task.type || ''}`.toLowerCase()
  if (source.includes('fe') || source.includes('front')) return 'FE'
  if (source.includes('be') || source.includes('back')) return 'BE'
  return 'OPS'
}

const normalizeTask = (t) => ({
  id: t.id,
  title: t.name || t.title || 'Untitled',
  status: t.stage === 'DONE' ? 'complete' : 'failed',
  assigned_to: String(t.assignee || t.assigned_to || 'unassigned').toLowerCase(),
  created_at: t.createdAt || t.created_at,
  completed_at: t.stageEnteredAt || t.completedAt || t.completed_at || t.createdAt || t.created_at,
  result_summary: t.result_summary || t.description || '',
  result: t.result || null,
  error: t.error || null,
  comments: Array.isArray(t.comments) ? t.comments : [],
  ops_task_id: t.id,
  priority: t.priority,
  workstream: t.workstream,
  type: t.type,
  commit_hash: t.commitHash || t.commit_hash || null,
})

export default function CompletedView() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')
  const [expanded, setExpanded] = useState(null)
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const [loadingReportId, setLoadingReportId] = useState(null)
  const [reportModal, setReportModal] = useState({ open: false, taskId: null, taskName: '', content: '' })
  const listRef = useRef(null)

  const fetchCompleted = useCallback(async () => {
    try {
      setError(null)
      const res = await fetch(`${WORKER_PROXY_URL}${ENDPOINTS.opsPipelineArchive}`, { headers: getSyncHeaders() })
      if (!res.ok) throw new Error(`Archive fetch failed: ${res.status}`)

      const data = await res.json()
      const items = Array.isArray(data) ? data : (data.tasks || [])
      const normalized = items
        .map(normalizeTask)
        .sort((a, b) => new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at))

      setTasks(normalized)
    } catch (err) {
      setError(err?.message || 'Failed to load completed tasks.')
      toast.error('Failed to load completed tasks. Please retry.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCompleted()
  }, [fetchCompleted])

  useEffect(() => {
    const intervalId = setInterval(fetchCompleted, 30000)
    return () => clearInterval(intervalId)
  }, [fetchCompleted])

  useEffect(() => {
    setPage(1)
    setExpanded(null)
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }, [filter, pageSize])

  const filteredTasks = useMemo(() => {
    if (filter === 'all') return tasks
    return tasks.filter((task) => task.assigned_to === filter)
  }, [tasks, filter])

  const total = filteredTasks.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const end = start + pageSize
  const paged = useMemo(() => filteredTasks.slice(start, end), [filteredTasks, start, end])
  const from = total === 0 ? 0 : start + 1
  const to = total === 0 ? 0 : Math.min(end, total)

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
  }, [page, totalPages])

  const closeReport = useCallback(() => {
    setReportModal({ open: false, taskId: null, taskName: '', content: '' })
  }, [])

  const fetchReport = useCallback(async (taskId) => {
    try {
      const res = await fetch(`${WORKER_PROXY_URL}${ENDPOINTS.opsPipelineTask(taskId)}`, {
        headers: getSyncHeaders(),
      })
      if (!res.ok) throw new Error('Report fetch failed')

      const task = await res.json()
      const reportComment = (task.comments || []).find((c) => c.message?.startsWith('REPORT:'))
      const reportLog = (task.comments || []).find((c) => /report\.md|report notes/i.test(c.message || ''))

      return reportComment?.message || reportLog?.message || task.description || 'No report available yet.'
    } catch {
      toast.error('Could not load report. Showing fallback content.')
      return 'No report available yet.'
    }
  }, [])

  const openReport = useCallback(async (task) => {
    setLoadingReportId(task.id)
    const content = await fetchReport(task.id)
    setLoadingReportId(null)
    setReportModal({ open: true, taskId: task.id, taskName: task.name || task.title || 'Task', content })
  }, [fetchReport])

  const handlePageChange = (nextPage) => {
    setPage(nextPage)
    setExpanded(null)
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      flex: 1,
      minHeight: 0,
      padding: '12px',
      color: '#E2E8F0',
      background: 'radial-gradient(1200px 680px at 90% -10%, rgba(212,165,116,0.07), transparent 55%), #07090F',
    }}>
      <div style={{ borderBottom: '1px solid rgba(212,165,116,0.14)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: '#E2E8F0' }}>Completed Tasks</h2>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#A8B3C7' }}>
              {total} delivered task{total === 1 ? '' : 's'} in archive
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{
              display: 'flex',
              gap: '6px',
              padding: '4px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(212,165,116,0.18)',
            }}>
              {['all', ...AGENTS].map((agent) => {
                const active = filter === agent
                return (
                  <button
                    key={agent}
                    onClick={() => setFilter(agent)}
                    style={{
                      height: '32px',
                      borderRadius: '999px',
                      padding: '0 12px',
                      fontSize: '11px',
                      fontWeight: 700,
                      border: active ? '1px solid rgba(212,165,116,0.26)' : '1px solid transparent',
                      color: active ? '#E2E8F0' : '#A8B3C7',
                      background: active
                        ? 'linear-gradient(180deg, rgba(212,165,116,0.22), rgba(201,149,107,0.16))'
                        : 'transparent',
                      boxShadow: active ? '0 0 0 1px rgba(212,165,116,0.26), 0 6px 16px rgba(212,165,116,0.16)' : 'none',
                      cursor: 'pointer',
                      transition: 'all 240ms cubic-bezier(0.22,1,0.36,1)',
                    }}
                  >
                    {agent === 'all' ? 'All' : agent[0].toUpperCase() + agent.slice(1)}
                  </button>
                )
              })}
            </div>

            <button
              onClick={fetchCompleted}
              style={{
                height: '32px',
                borderRadius: '8px',
                border: '1px solid rgba(212,165,116,0.35)',
                background: 'rgba(255,255,255,0.02)',
                color: '#D4A574',
                fontWeight: 700,
                padding: '0 12px',
                cursor: 'pointer',
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div ref={listRef} style={{ display: 'flex', flexDirection: 'column', gap: '10px', overflowY: 'auto', minHeight: 0, flex: 1 }}>
        {loading && (
          <>
            {[...Array(5)].map((_, i) => (
              <div key={i} style={{
                minHeight: '92px',
                borderRadius: '12px',
                border: '1px solid rgba(212,165,116,0.22)',
                background: 'linear-gradient(165deg, rgba(20,24,34,0.94) 0%, rgba(10,13,20,0.96) 100%)',
                boxShadow: '0 10px 24px rgba(0,0,0,0.38), 0 2px 6px rgba(0,0,0,0.22)',
              }} />
            ))}
            <div style={{ textAlign: 'center', color: '#A8B3C7', fontSize: '12px' }}>Loading completed tasks…</div>
          </>
        )}

        {!loading && error && (
          <div style={{
            borderRadius: '12px',
            border: '1px solid rgba(212,165,116,0.30)',
            borderTop: '3px solid rgba(212,165,116,0.65)',
            background: 'linear-gradient(165deg, rgba(20,24,34,0.94) 0%, rgba(10,13,20,0.96) 100%)',
            padding: '16px',
          }}>
            <div style={{ fontWeight: 700, color: '#E2E8F0' }}>Couldn’t load completed tasks.</div>
            <div style={{ color: '#A8B3C7', marginTop: '6px', fontSize: '13px' }}>Please retry. We&apos;ll keep this archive stable.</div>
            <button onClick={fetchCompleted} style={{ marginTop: '10px', height: '30px', padding: '0 12px', borderRadius: '8px', border: '1px solid rgba(212,165,116,0.52)', background: 'linear-gradient(135deg, rgba(212,165,116,0.22), rgba(201,149,107,0.16))', color: '#F3D7B9', fontWeight: 700, cursor: 'pointer' }}>Retry</button>
          </div>
        )}

        {!loading && !error && paged.length === 0 && (
          <div style={{ borderRadius: '12px', border: '1px solid rgba(212,165,116,0.22)', background: 'linear-gradient(165deg, rgba(20,24,34,0.94) 0%, rgba(10,13,20,0.96) 100%)', padding: '24px', textAlign: 'center' }}>
            <div style={{ color: '#E2E8F0', fontWeight: 700, fontSize: '16px' }}>No completed tasks yet.</div>
            <div style={{ color: '#A8B3C7', marginTop: '6px', fontSize: '13px' }}>Shipped work will appear here once tasks reach DONE.</div>
          </div>
        )}

        {!loading && !error && paged.map((task, index) => {
          const isOpen = expanded === task.id
          const priority = normalizePriority(task)
          const priorityStyle = PRIORITY_STYLES[priority]
          const workstream = normalizeWorkstream(task)
          const workstreamStyle = WORKSTREAM_STYLES[workstream]
          const agent = task.assigned_to || 'unassigned'
          const completedAt = task.completed_at || task.created_at

          return (
            <div
              key={task.id}
              onClick={() => setExpanded(isOpen ? null : task.id)}
              style={{
                borderRadius: '12px',
                border: '1px solid rgba(212,165,116,0.22)',
                background: 'linear-gradient(165deg, rgba(20,24,34,0.94) 0%, rgba(10,13,20,0.96) 100%)',
                boxShadow: '0 10px 24px rgba(0,0,0,0.38), 0 2px 6px rgba(0,0,0,0.22)',
                cursor: 'pointer',
                overflow: 'hidden',
                opacity: 1,
                transform: 'translateY(0)',
                transition: 'transform 220ms cubic-bezier(0.22,1,0.36,1), box-shadow 260ms cubic-bezier(0.22,1,0.36,1), border-color 220ms cubic-bezier(0.22,1,0.36,1)',
                animation: 'none',
                transitionDelay: `${Math.min(index, 10) * 22}ms`,
              }}
            >
              <div style={{ padding: '16px', display: 'grid', gap: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
                  <div style={{ color: '#E2E8F0', fontWeight: 700, fontSize: '16px', lineHeight: 1.35 }}>{task.name || task.title}</div>
                  <span style={{ color: priorityStyle.color, background: priorityStyle.bg, border: `1px solid ${priorityStyle.border}`, borderRadius: '999px', height: '22px', padding: '0 10px', fontSize: '10px', fontWeight: 800, letterSpacing: '0.06em', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                    {priority}
                  </span>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                  <span style={{ fontSize: '10px', letterSpacing: '0.06em', color: '#7C8698', fontWeight: 700 }}>ASSIGNED</span>
                  <span style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    padding: '2px 8px',
                    borderRadius: '999px',
                    border: `1px solid ${(AGENT_COLORS[agent] || '#64748B')}66`,
                    background: `${AGENT_COLORS[agent] || '#64748B'}2a`,
                    color: '#E2E8F0',
                  }}>{agent}</span>

                  <span style={{ fontSize: '10px', letterSpacing: '0.06em', color: '#7C8698', fontWeight: 700 }}>COMPLETED</span>
                  <span title={completedAt ? new Date(completedAt).toLocaleString() : '—'} style={{ color: '#D4A574', fontSize: '11px', padding: '2px 8px', borderRadius: '6px', boxShadow: 'inset 2px 0 0 rgba(212,165,116,0.48), 0 0 10px rgba(212,165,116,0.12)' }}>
                    <TimeAgo date={completedAt} />
                  </span>

                  <span style={{ color: workstreamStyle.color, background: workstreamStyle.bg, border: `1px solid ${workstreamStyle.border}`, borderRadius: '999px', padding: '2px 8px', fontSize: '10px', fontWeight: 700 }}>
                    {workstream}
                  </span>

                  {task.commit_hash && (
                    <span style={{ color: '#A8B3C7', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '6px', padding: '2px 6px', fontSize: '10px', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                      {task.commit_hash.slice(0, 10)}
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!loadingReportId) openReport(task)
                    }}
                    disabled={loadingReportId === task.id}
                    style={{
                      marginLeft: 'auto',
                      height: '30px',
                      minWidth: '108px',
                      borderRadius: '8px',
                      border: '1px solid rgba(212,165,116,0.52)',
                      background: 'linear-gradient(135deg, rgba(212,165,116,0.22), rgba(201,149,107,0.16))',
                      color: '#F3D7B9',
                      fontSize: '11px',
                      fontWeight: 700,
                      cursor: loadingReportId === task.id ? 'wait' : 'pointer',
                    }}
                  >
                    {loadingReportId === task.id ? 'Loading…' : 'View Report'}
                  </button>
                </div>
              </div>

              <div style={{
                maxHeight: isOpen ? '520px' : '0px',
                opacity: isOpen ? 1 : 0,
                overflow: 'hidden',
                transition: 'max-height 300ms cubic-bezier(0.22,1,0.36,1), opacity 240ms ease-out',
                borderTop: isOpen ? '1px solid rgba(212,165,116,0.18)' : '1px solid transparent',
              }}>
                <div style={{ padding: '12px 16px 16px' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.06em', fontWeight: 700, color: '#7C8698', marginBottom: '6px' }}>SUMMARY</div>
                  <div style={{ color: '#D6DEEB', fontSize: '13px', lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word', maxWidth: '72ch' }}>
                    {task.result_summary || task.error || 'No summary available.'}
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{
        position: 'sticky',
        bottom: 0,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '10px',
        padding: '10px 12px',
        borderRadius: '12px',
        border: '1px solid rgba(212,165,116,0.22)',
        background: 'linear-gradient(165deg, rgba(20,24,34,0.94) 0%, rgba(10,13,20,0.96) 100%)',
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[25, 50, 100].map((size) => {
            const active = pageSize === size
            return (
              <button
                key={size}
                onClick={() => setPageSize(size)}
                style={{
                  height: '30px',
                  minWidth: '42px',
                  borderRadius: '999px',
                  border: active ? '1px solid rgba(212,165,116,0.52)' : '1px solid rgba(255,255,255,0.12)',
                  background: active ? 'linear-gradient(180deg, rgba(212,165,116,0.22), rgba(201,149,107,0.16))' : 'rgba(255,255,255,0.02)',
                  color: active ? '#F3D7B9' : '#A8B3C7',
                  fontWeight: 700,
                  fontSize: '11px',
                  cursor: 'pointer',
                  transition: 'all 220ms ease-out',
                }}
              >
                {size}
              </button>
            )
          })}
        </div>

        <div style={{ color: '#A8B3C7', fontSize: '12px' }}>Showing {from}–{to} of {total}</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handlePageChange(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            style={{ height: '30px', borderRadius: '8px', border: '1px solid rgba(212,165,116,0.35)', background: 'rgba(255,255,255,0.02)', color: '#D4A574', padding: '0 10px', opacity: safePage === 1 ? 0.45 : 1, cursor: safePage === 1 ? 'not-allowed' : 'pointer' }}
          >
            Prev
          </button>
          <span style={{ color: '#A8B3C7', fontSize: '11px' }}>Page {safePage} / {totalPages}</span>
          <button
            onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            style={{ height: '30px', borderRadius: '8px', border: '1px solid rgba(212,165,116,0.35)', background: 'rgba(255,255,255,0.02)', color: '#D4A574', padding: '0 10px', opacity: safePage === totalPages ? 0.45 : 1, cursor: safePage === totalPages ? 'not-allowed' : 'pointer' }}
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
