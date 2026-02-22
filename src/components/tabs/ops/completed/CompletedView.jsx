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

const API_KEY = '8891188897518856408ba17e532456fea5cfb4a4d0de80d1ecbbc8f1aa14e6d0'

export default function CompletedView() {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | soren | mason | sentinel
  const [expanded, setExpanded] = useState(null)
  const [pageSize, setPageSize] = useState(50)
  const [page, setPage] = useState(1)
  const listRef = useRef(null)
  const [reportModal, setReportModal] = useState({ open: false, taskId: null, taskName: '', content: '' })

  const fetchReport = useCallback(async (taskId) => {
    try {
      const res = await fetch(`https://api.forgedfinancial.us/api/ops/pipeline/tasks/${taskId}`, {
        headers: { 'x-api-key': API_KEY },
      })
      if (!res.ok) {
        return 'No report available yet.'
      }

      const task = await res.json()
      const reportComment = (task.comments || []).find(c =>
        c.message?.startsWith('REPORT:') || c.message?.includes('report.md')
      )
      const reportLog = (task.pipeline_log || []).find(l =>
        l.notes?.includes('report') || l.notes?.includes('Files Changed')
      )

      return reportComment?.message || reportLog?.notes || task.description || 'No report available yet.'
    } catch {
      return 'No report available yet.'
    }
  }, [])

  const openReport = useCallback(async (task) => {
    const content = await fetchReport(task.id)
    setReportModal({ open: true, taskId: task.id, taskName: task.title || task.name || 'Task', content })
  }, [fetchReport])

  const closeReport = useCallback(() => {
    setReportModal({ open: false, taskId: null, taskName: '', content: '' })
  }, [])

  const fetchCompleted = useCallback(async () => {
    try {
      const res = await fetch(
        `${WORKER_PROXY_URL}${ENDPOINTS.opsPipelineArchive}`,
        { headers: getSyncHeaders() }
      )
      if (res.ok) {
        const data = await res.json()
        const items = Array.isArray(data) ? data : (data.tasks || [])
        const all = items.map(t => ({
          id: t.id,
          title: t.name || t.title || 'Untitled',
          status: (t.stage === 'DONE') ? 'complete' : 'failed',
          assigned_to: t.assignee,
          created_by: t.createdBy,
          created_at: t.createdAt,
          completed_at: t.stageEnteredAt || t.completedAt || t.createdAt,
          result_summary: t.description,
          result: t.result || null,
          error: t.error || null,
          comments: t.comments || [],
          ops_task_id: t.id,
        })).sort((a, b) =>
          new Date(b.completed_at || b.created_at) - new Date(a.completed_at || a.created_at)
        )
        setTasks(all)
      }
    } catch { /* silent */ }
    setLoading(false)
  }, [])

  useEffect(() => { fetchCompleted() }, [fetchCompleted])

  useEffect(() => {
    const id = setInterval(fetchCompleted, 30000)
    return () => clearInterval(id)
  }, [fetchCompleted])

  const agents = ['soren', 'mason', 'sentinel']
  const filteredTasks = useMemo(
    () => (filter === 'all' ? tasks : tasks.filter(t => t.assigned_to === filter)),
    [tasks, filter]
  )

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
    if (page > totalPages) {
      setPage(totalPages)
    }
  }, [page, totalPages])

  const handlePageChange = (nextPage) => {
    setPage(nextPage)
    setExpanded(null)
    listRef.current?.scrollTo({ top: 0 })
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--theme-text-secondary)', fontSize: '13px' }}>
      Loading completed tasks…
    </div>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
            Completed Tasks
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
            {total} task{total !== 1 ? 's' : ''} — what the team has shipped
          </p>
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['all', ...agents].map(a => (
            <button key={a} onClick={() => setFilter(a)} style={{
              padding: '5px 12px', fontSize: '11px', fontWeight: filter === a ? 700 : 400,
              borderRadius: '6px', border: 'none', cursor: 'pointer',
              backgroundColor: filter === a
                ? (AGENT_COLORS[a] || 'var(--theme-accent)') + '25'
                : 'rgba(255,255,255,0.04)',
              color: filter === a
                ? (AGENT_COLORS[a] || 'var(--theme-accent)')
                : 'var(--theme-text-secondary)',
              transition: 'all 0.15s',
            }}>
              {a === 'all' ? 'All' : a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
          <button onClick={fetchCompleted} style={{
            padding: '5px 10px', fontSize: '11px', borderRadius: '6px', border: 'none',
            cursor: 'pointer', backgroundColor: 'rgba(255,255,255,0.04)',
            color: 'var(--theme-text-secondary)', marginLeft: '4px',
          }} title="Refresh">↻</button>
        </div>
      </div>

      <div ref={listRef} style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {paged.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--theme-text-secondary)', fontSize: '13px', marginTop: '40px', fontStyle: 'italic' }}>
            No completed tasks yet
          </div>
        )}

        {paged.map(task => {
          const done = task.status === 'complete'
          const isOpen = expanded === task.id
          const summary = task.result_summary || task.error || '—'

          return (
            <div key={task.id}
              onClick={() => setExpanded(isOpen ? null : task.id)}
              style={{
                borderRadius: '8px', cursor: 'pointer',
                backgroundColor: 'var(--theme-bg, #0a0a0f)',
                border: `1px solid ${done ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.25)'}`,
                overflow: 'hidden', transition: 'all 0.15s',
                flexShrink: 0, minHeight: '52px', boxSizing: 'border-box',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = done ? 'rgba(255,255,255,0.2)' : '#ef444460'}
              onMouseOut={e => e.currentTarget.style.borderColor = done ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.25)'}
            >
              <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, boxSizing: 'border-box' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>{done ? '✅' : '❌'}</span>

                <div style={{
                  flex: 1,
                  minWidth: 0,
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--theme-text-primary)',
                  lineHeight: 1.3,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {task.title}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    openReport(task)
                  }}
                  style={{
                    padding: '3px 10px', fontSize: '11px', borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(255,255,255,0.05)',
                    color: '#00d4ff', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  }}
                >
                  📄 View Report
                </button>

                <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', flexShrink: 0 }}>
                  <TimeAgo date={task.completed_at || task.created_at} />
                </div>

                <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', flexShrink: 0, transition: 'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
              </div>

              {isOpen && (
                <div style={{
                  padding: '0 14px 14px',
                  borderTop: '1px solid rgba(255,255,255,0.04)',
                  boxSizing: 'border-box',
                }}>
                  {!done && task.error && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        ❌ Error
                      </div>
                      <div style={{
                        fontSize: '12px', color: '#ef4444', lineHeight: 1.6,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        maxHeight: '150px', overflowY: 'auto',
                        backgroundColor: 'rgba(239,68,68,0.06)', borderRadius: '6px',
                        padding: '8px 10px', border: '1px solid rgba(239,68,68,0.2)',
                        boxSizing: 'border-box',
                      }}>
                        {task.error}
                      </div>
                    </div>
                  )}

                  {task.result_summary && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        📋 Summary
                      </div>
                      <div style={{
                        fontSize: '12px', color: 'var(--theme-text-primary)', lineHeight: 1.6,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        maxHeight: '180px', overflowY: 'auto',
                        backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px',
                        padding: '8px 10px', boxSizing: 'border-box',
                      }}>
                        {summary}
                      </div>
                    </div>
                  )}

                  {task.result && task.result !== task.result_summary && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
                        💬 Full Agent Output (notes, suggestions, issues)
                      </div>
                      <div style={{
                        fontSize: '11px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.7,
                        whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                        maxHeight: '300px', overflowY: 'auto',
                        backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: '6px',
                        padding: '8px 10px', boxSizing: 'border-box',
                      }}>
                        {task.result}
                      </div>
                    </div>
                  )}

                  {task.comments && task.comments.length > 0 && (
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                        💬 Agent Comments ({task.comments.length})
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {task.comments.map((c, i) => (
                          <div key={i} style={{
                            padding: '6px 10px', borderRadius: '6px',
                            backgroundColor: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.06)',
                            boxSizing: 'border-box',
                          }}>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '3px' }}>
                              <span style={{ fontSize: '10px', fontWeight: 700, color: AGENT_COLORS[c.agentId] || '#6b7280', textTransform: 'uppercase' }}>{c.agentId}</span>
                              <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                            </div>
                            <div style={{ fontSize: '12px', color: 'var(--theme-text-primary)', lineHeight: 1.5 }}>{c.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '10px', color: 'var(--theme-text-secondary)', flexWrap: 'wrap' }}>
                    <span>ID: <span style={{ color: 'var(--theme-text-primary)' }}>{task.id}</span></span>
                    <span>By: <span style={{ color: 'var(--theme-text-primary)' }}>{task.created_by}</span></span>
                    <span>Completed: <span style={{ color: 'var(--theme-text-primary)' }}>{task.completed_at ? new Date(task.completed_at).toLocaleString() : '—'}</span></span>
                    {task.ops_task_id && (
                      <span>Ops: <span style={{ color: 'var(--theme-accent)' }}>{task.ops_task_id}</span></span>
                    )}
                  </div>
                </div>
              )}
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
        borderRadius: '8px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
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
                  border: active ? '1px solid var(--theme-accent, #8b5cf6)' : '1px solid rgba(255,255,255,0.12)',
                  background: active ? 'var(--theme-accent, #8b5cf6)' : 'rgba(255,255,255,0.02)',
                  color: active ? '#fff' : 'var(--theme-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                {size}
              </button>
            )
          })}
        </div>

        <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
          Showing {from}–{to} of {total} tasks
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => handlePageChange(Math.max(1, safePage - 1))}
            disabled={safePage === 1}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--theme-text-primary)',
              opacity: safePage === 1 ? 0.45 : 1,
              cursor: safePage === 1 ? 'not-allowed' : 'pointer',
            }}
          >
            Prev
          </button>

          <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>
            Page {safePage} / {totalPages}
          </span>

          <button
            onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
            disabled={safePage === totalPages}
            style={{
              padding: '5px 10px',
              fontSize: '11px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--theme-text-primary)',
              opacity: safePage === totalPages ? 0.45 : 1,
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
