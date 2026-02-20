import { useState, useEffect, useCallback } from 'react'
import { WORKER_PROXY_URL, getSyncHeaders, ENDPOINTS } from '../../../../config/api'
import AgentBadge from '../shared/AgentBadge'
import TimeAgo from '../shared/TimeAgo'

const AGENT_COLORS = {
  soren:    '#a855f7',
  mason:    '#f59e0b',
  sentinel: '#06b6d4',
  clawd:    '#3b82f6',
  kyle:     '#f97316',
  dano:     '#f59e0b',
}

export default function CompletedView() {
  const [tasks, setTasks]       = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')   // all | soren | mason | sentinel
  const [expanded, setExpanded] = useState(null)

  const fetchCompleted = useCallback(async () => {
    try {
      const res = await fetch(
        `${WORKER_PROXY_URL}${ENDPOINTS.opsPipelineArchive}`,
        { headers: getSyncHeaders() }
      )
      if (res.ok) {
        const data = await res.json()
        // Archive returns { tasks: [...] } or array directly
        const items = Array.isArray(data) ? data : (data.tasks || [])
        // Map ops archive shape → CompletedView shape
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
          type: t.type || 'ops',
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

  // Refresh every 30s
  useEffect(() => {
    const id = setInterval(fetchCompleted, 30000)
    return () => clearInterval(id)
  }, [fetchCompleted])

  const visible = filter === 'all' ? tasks : tasks.filter(t => t.assigned_to === filter)
  const agents  = ['soren', 'mason', 'sentinel']

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', flex:1, color:'var(--theme-text-secondary)', fontSize:'13px' }}>
      Loading completed tasks…
    </div>
  )

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:'16px', flex:1, minHeight:0 }}>

      {/* Header + filter */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
        <div>
          <h2 style={{ margin:0, fontSize:'16px', fontWeight:600, color:'var(--theme-text-primary)' }}>
            Completed Tasks
          </h2>
          <p style={{ margin:'2px 0 0', fontSize:'11px', color:'var(--theme-text-secondary)' }}>
            {visible.length} task{visible.length !== 1 ? 's' : ''} — what the team has shipped
          </p>
        </div>
        {/* Agent filter */}
        <div style={{ display:'flex', gap:'4px' }}>
          {['all', ...agents].map(a => (
            <button key={a} onClick={() => setFilter(a)} style={{
              padding:'5px 12px', fontSize:'11px', fontWeight: filter === a ? 700 : 400,
              borderRadius:'6px', border:'none', cursor:'pointer',
              backgroundColor: filter === a
                ? (AGENT_COLORS[a] || 'var(--theme-accent)') + '25'
                : 'rgba(255,255,255,0.04)',
              color: filter === a
                ? (AGENT_COLORS[a] || 'var(--theme-accent)')
                : 'var(--theme-text-secondary)',
              transition:'all 0.15s',
            }}>
              {a === 'all' ? 'All' : a.charAt(0).toUpperCase() + a.slice(1)}
            </button>
          ))}
          <button onClick={fetchCompleted} style={{
            padding:'5px 10px', fontSize:'11px', borderRadius:'6px', border:'none',
            cursor:'pointer', backgroundColor:'rgba(255,255,255,0.04)',
            color:'var(--theme-text-secondary)', marginLeft:'4px',
          }} title="Refresh">↻</button>
        </div>
      </div>

      {/* Task list */}
      <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:'6px' }}>
        {visible.length === 0 && (
          <div style={{ textAlign:'center', color:'var(--theme-text-secondary)', fontSize:'13px', marginTop:'40px', fontStyle:'italic' }}>
            No completed tasks yet
          </div>
        )}
        {visible.map(task => {
          const done    = task.status === 'complete'
          const isOpen  = expanded === task.id
          const color   = AGENT_COLORS[task.assigned_to] || '#6b7280'
          const summary = task.result_summary || task.error || '—'

          return (
            <div key={task.id}
              onClick={() => setExpanded(isOpen ? null : task.id)}
              style={{
                borderRadius:'8px', cursor:'pointer',
                backgroundColor:'var(--theme-bg, #0a0a0f)',
                border:`1px solid ${done ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.25)'}`,
                borderLeft:`3px solid ${done ? color : '#ef4444'}`,
                overflow:'hidden', transition:'all 0.15s',
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = done ? color + '60' : '#ef444460'}
              onMouseOut={e  => e.currentTarget.style.borderColor = done ? 'rgba(255,255,255,0.06)' : 'rgba(239,68,68,0.25)'}
            >
              {/* Row */}
              <div style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:'10px' }}>
                {/* Status icon */}
                <span style={{ fontSize:'14px', flexShrink:0 }}>{done ? '✅' : '❌'}</span>

                {/* Agent badge */}
                <div style={{
                  fontSize:'10px', fontWeight:700, color, letterSpacing:'0.5px',
                  backgroundColor: color + '18', padding:'2px 8px', borderRadius:'4px',
                  textTransform:'uppercase', flexShrink:0,
                }}>
                  {task.assigned_to}
                </div>

                {/* Title */}
                <div style={{ flex:1, fontSize:'12px', fontWeight:600, color:'var(--theme-text-primary)', lineHeight:1.3 }}>
                  {task.title}
                </div>

                {/* Time */}
                <div style={{ fontSize:'10px', color:'var(--theme-text-secondary)', flexShrink:0 }}>
                  <TimeAgo date={task.completed_at || task.created_at} />
                </div>

                {/* Expand chevron */}
                <span style={{ fontSize:'10px', color:'var(--theme-text-secondary)', flexShrink:0, transition:'transform 0.15s', transform: isOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
              </div>

              {/* Expanded result */}
              {isOpen && (
                <div style={{
                  padding:'0 14px 14px',
                  borderTop:'1px solid rgba(255,255,255,0.04)',
                }}>

                  {/* ERROR block — always shown if failed */}
                  {!done && task.error && (
                    <div style={{ marginTop:'12px' }}>
                      <div style={{ fontSize:'10px', fontWeight:700, color:'#ef4444', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>
                        ❌ Error
                      </div>
                      <div style={{
                        fontSize:'12px', color:'#ef4444', lineHeight:1.6,
                        whiteSpace:'pre-wrap', wordBreak:'break-word',
                        maxHeight:'150px', overflowY:'auto',
                        backgroundColor:'rgba(239,68,68,0.06)', borderRadius:'6px',
                        padding:'8px 10px', border:'1px solid rgba(239,68,68,0.2)',
                      }}>
                        {task.error}
                      </div>
                    </div>
                  )}

                  {/* RESULT SUMMARY */}
                  {task.result_summary && (
                    <div style={{ marginTop:'12px' }}>
                      <div style={{ fontSize:'10px', color:'var(--theme-text-secondary)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>
                        📋 Summary
                      </div>
                      <div style={{
                        fontSize:'12px', color:'var(--theme-text-primary)', lineHeight:1.6,
                        whiteSpace:'pre-wrap', wordBreak:'break-word',
                        maxHeight:'180px', overflowY:'auto',
                        backgroundColor:'rgba(255,255,255,0.02)', borderRadius:'6px',
                        padding:'8px 10px',
                      }}>
                        {task.result_summary}
                      </div>
                    </div>
                  )}

                  {/* FULL RESULT — agent notes, comments, suggestions */}
                  {task.result && task.result !== task.result_summary && (
                    <div style={{ marginTop:'12px' }}>
                      <div style={{ fontSize:'10px', color:'var(--theme-text-secondary)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'4px' }}>
                        💬 Full Agent Output (notes, suggestions, issues)
                      </div>
                      <div style={{
                        fontSize:'11px', color:'rgba(255,255,255,0.6)', lineHeight:1.7,
                        whiteSpace:'pre-wrap', wordBreak:'break-word',
                        maxHeight:'300px', overflowY:'auto',
                        backgroundColor:'rgba(255,255,255,0.02)', borderRadius:'6px',
                        padding:'8px 10px',
                      }}>
                        {task.result}
                      </div>
                    </div>
                  )}

                  {/* COMMENTS — from v2 schema if present */}
                  {task.comments && task.comments.length > 0 && (
                    <div style={{ marginTop:'12px' }}>
                      <div style={{ fontSize:'10px', color:'var(--theme-text-secondary)', textTransform:'uppercase', letterSpacing:'1px', marginBottom:'6px' }}>
                        💬 Agent Comments ({task.comments.length})
                      </div>
                      <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                        {task.comments.map((c, i) => (
                          <div key={i} style={{
                            padding:'6px 10px', borderRadius:'6px',
                            backgroundColor:'rgba(255,255,255,0.03)',
                            border:'1px solid rgba(255,255,255,0.06)',
                          }}>
                            <div style={{ display:'flex', gap:'8px', alignItems:'center', marginBottom:'3px' }}>
                              <span style={{ fontSize:'10px', fontWeight:700, color: AGENT_COLORS[c.agentId] || '#6b7280', textTransform:'uppercase' }}>{c.agentId}</span>
                              <span style={{ fontSize:'10px', color:'var(--theme-text-secondary)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                            </div>
                            <div style={{ fontSize:'12px', color:'var(--theme-text-primary)', lineHeight:1.5 }}>{c.message}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* META */}
                  <div style={{ display:'flex', gap:'16px', marginTop:'12px', fontSize:'10px', color:'var(--theme-text-secondary)', flexWrap:'wrap' }}>
                    <span>ID: <span style={{ color:'var(--theme-text-primary)' }}>{task.id}</span></span>
                    <span>Type: <span style={{ color:'var(--theme-text-primary)' }}>{task.type}</span></span>
                    <span>By: <span style={{ color:'var(--theme-text-primary)' }}>{task.created_by}</span></span>
                    <span>Completed: <span style={{ color:'var(--theme-text-primary)' }}>{task.completed_at ? new Date(task.completed_at).toLocaleString() : '—'}</span></span>
                    {task.ops_task_id && (
                      <span>Ops: <span style={{ color:'var(--theme-accent)' }}>{task.ops_task_id}</span></span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
