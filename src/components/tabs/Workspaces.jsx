import { useState, useEffect, useCallback } from 'react'
import { useApp } from '../../context/AppContext'
import { AGENT_HIERARCHY } from '../../config/constants'
import { syncClient } from '../../api/syncClient'
import FileViewer from '../shared/FileViewer'

const SIDEBAR_GROUPS = [
  {
    label: 'Leadership',
    agents: ['ceo', 'clawd'],
  },
  {
    label: 'Operations',
    agents: [
      { id: 'architect', children: ['scout', 'cartographer'] },
      { id: 'mason', children: ['coder', 'wirer', 'scribe'] },
      { id: 'sentinel', children: ['probe', 'auditor'] },
    ],
  },
]

function renderPreviewLine(line, i) {
  if (!line) return <div key={i} style={{ height: '4px' }} />

  if (line.startsWith('#')) {
    const text = line.replace(/^#+\s*/, '')
    return (
      <div key={i} style={{ color: '#00d4ff', fontWeight: '700', fontSize: '10px', lineHeight: '1.5' }}>
        {text}
      </div>
    )
  }

  const parts = line.split(/(\*\*[^*]+\*\*)/)
  return (
    <div key={i} style={{ fontSize: '10px', lineHeight: '1.5', color: 'var(--text-muted)' }}>
      {parts.map((part, j) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <span key={j} style={{ color: 'var(--text-secondary)', fontWeight: '600' }}>{part.slice(2, -2)}</span>
        }
        return <span key={j}>{part}</span>
      })}
    </div>
  )
}

function FilePreviewCard({ filename, content, loading, onClick }) {
  return (
    <div
      className="glass-card"
      onClick={onClick}
      style={{
        padding: '14px 16px',
        cursor: 'pointer',
        minHeight: '160px',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.15s, background 0.15s',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-color)' }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = '' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
        <span style={{ fontSize: '16px' }}>📄</span>
        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '600' }}>{filename}</span>
      </div>
      {loading ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
          Loading…
        </div>
      ) : content ? (
        <div style={{
          flex: 1,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '10px',
          overflow: 'hidden',
          position: 'relative',
        }}>
          {content.split('\n').slice(0, 8).map((line, i) => renderPreviewLine(line, i))}
          <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: '40px',
            background: 'linear-gradient(transparent, var(--bg-secondary, rgba(30,30,30,1)))',
            pointerEvents: 'none',
          }} />
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '11px' }}>
          No preview available
        </div>
      )}
    </div>
  )
}

const STATUS_COLORS = {
  completed: '#4ade80',
  'in-progress': '#3b82f6',
  success: '#4ade80',
  error: '#ef4444',
  info: '#3b82f6',
  failed: '#ef4444',
}

function ActivityTimeline({ agentId }) {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!agentId) return
    setLoading(true)
    syncClient.request(`/api/agents/${agentId}/activity`)
      .then(data => setEvents(data?.activity || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false))
  }, [agentId])

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '20px 24px', marginTop: '16px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--text-primary)' }}>Activity Timeline</h3>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    )
  }

  if (!events || events.length === 0) {
    return (
      <div className="glass-panel" style={{ padding: '20px 24px', marginTop: '16px' }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--text-primary)' }}>Activity Timeline</h3>
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>No activity recorded yet</p>
      </div>
    )
  }

  return (
    <div className="glass-panel" style={{ padding: '20px 24px', marginTop: '16px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--text-primary)' }}>
        Activity Timeline
      </h3>
      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        <div style={{
          position: 'absolute',
          left: '7px',
          top: '4px',
          bottom: '4px',
          width: '2px',
          background: 'var(--border-color, rgba(255,255,255,0.1))',
        }} />
        {events.map((event, i) => {
          const color = STATUS_COLORS[event?.data?.type || event?.type] || '#666'
          const action = event?.data?.txt || event?.data?.action || event?.action || '—'
          const time = event?.data?.ts || event?.ts
          return (
            <div key={event?.id || i} style={{ position: 'relative', marginBottom: i < events.length - 1 ? '12px' : 0 }}>
              <div style={{
                position: 'absolute',
                left: '-20px',
                top: '12px',
                width: '12px',
                height: '12px',
                borderRadius: '50%',
                background: color,
                boxShadow: `0 0 8px ${color}66`,
                border: '2px solid var(--bg-primary, #1a1a1a)',
              }} />
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                  }}>
                    {time ? new Date(time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {action}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DailyLogs({ agentId, onViewLog }) {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!agentId) return
    setLoading(true)
    syncClient.request(`/api/agents/${agentId}/logs`)
      .then(data => setLogs(data?.logs || []))
      .catch(() => setLogs([]))
      .finally(() => setLoading(false))
  }, [agentId])

  return (
    <div className="glass-panel" style={{ padding: '20px 24px' }}>
      <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--text-primary)' }}>
        Daily Logs
      </h3>
      {loading ? (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>Loading…</p>
      ) : logs.length === 0 ? (
        <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>No logs available yet</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {logs.map((log) => (
            <div
              key={log.filename}
              onClick={() => onViewLog(log.filename)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                borderRadius: '6px',
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid var(--border-color, rgba(255,255,255,0.06))',
                transition: 'border-color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent-color)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '14px' }}>📋</span>
                <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: '500' }}>{log.filename}</span>
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
                {log.size ? `${(log.size / 1024).toFixed(1)}KB` : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Workspaces() {
  const { state, actions } = useApp()
  const selectedId = state.workspaceAgent || 'clawd'
  const [viewingFile, setViewingFile] = useState(null)
  const [viewingLog, setViewingLog] = useState(null)
  const [fileList, setFileList] = useState([])
  const [previews, setPreviews] = useState({})
  const [loadingFiles, setLoadingFiles] = useState(false)

  const agent = AGENT_HIERARCHY[selectedId]

  const selectAgent = (id) => {
    actions.setWorkspaceAgent(id)
    setViewingFile(null)
    setViewingLog(null)
  }

  // Fetch file list when agent changes
  useEffect(() => {
    if (!selectedId) return
    setLoadingFiles(true)
    setPreviews({})
    syncClient.getWorkspace(selectedId)
      .then(data => {
        const files = data?.files || []
        setFileList(files)
        // Fetch preview content for each file (first 8 lines)
        files.forEach(f => {
          syncClient.getWorkspaceFile(selectedId, f.filename)
            .then(fileData => {
              setPreviews(prev => ({ ...prev, [f.filename]: fileData?.content || null }))
            })
            .catch(() => {
              setPreviews(prev => ({ ...prev, [f.filename]: null }))
            })
        })
      })
      .catch(() => setFileList([]))
      .finally(() => setLoadingFiles(false))
  }, [selectedId])

  return (
    <div style={{ display: 'flex', gap: '16px', height: '100%' }}>
      {/* Left Sidebar */}
      <div
        className="glass-panel"
        style={{
          width: '240px',
          minWidth: '240px',
          padding: '16px 12px',
          overflowY: 'auto',
        }}
      >
        {SIDEBAR_GROUPS.map((group) => (
          <div key={group.label} style={{ marginBottom: '16px' }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--text-muted)',
                marginBottom: '8px',
                padding: '0 8px',
              }}
            >
              {group.label}
            </div>
            {group.agents.map((entry) => {
              if (typeof entry === 'string') {
                return (
                  <AgentRow
                    key={entry}
                    id={entry}
                    selected={selectedId === entry}
                    onSelect={selectAgent}
                  />
                )
              }
              return (
                <div key={entry.id}>
                  <AgentRow
                    id={entry.id}
                    selected={selectedId === entry.id}
                    onSelect={selectAgent}
                  />
                  {entry.children.map((childId) => (
                    <AgentRow
                      key={childId}
                      id={childId}
                      selected={selectedId === childId}
                      onSelect={selectAgent}
                      indent
                    />
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Right Panel */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {agent && (
          <>
            {/* Agent Header */}
            <div
              className="glass-panel"
              style={{ padding: '20px 24px', marginBottom: '16px' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <h2 style={{ margin: 0, fontSize: '20px', color: 'var(--text-primary)' }}>
                  {agent.name}
                </h2>
                <span
                  style={{
                    fontSize: '12px',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--accent-color)',
                    color: 'var(--bg-primary)',
                    fontWeight: '600',
                  }}
                >
                  {agent.role}
                </span>
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                {agent.designation && <span style={{ marginRight: '12px' }}>⚙ {agent.designation}</span>}
                {agent.model && <span>🤖 {agent.model}</span>}
              </div>
              <p style={{ margin: '8px 0 0', fontSize: '14px', color: 'var(--text-secondary)' }}>
                {agent.description}
              </p>
            </div>

            {/* File Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              {loadingFiles ? (
                <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Loading workspace files…
                </div>
              ) : fileList.length === 0 ? (
                <div style={{ gridColumn: '1 / -1', padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  No workspace files found
                </div>
              ) : (
                fileList.map((file) => (
                  <FilePreviewCard
                    key={file.filename}
                    filename={file.filename}
                    content={previews[file.filename]}
                    loading={previews[file.filename] === undefined}
                    onClick={() => setViewingFile(file.filename)}
                  />
                ))
              )}
            </div>

            {/* Daily Logs */}
            <DailyLogs
              agentId={selectedId}
              onViewLog={(filename) => setViewingLog(filename)}
            />

            {/* Activity Timeline */}
            <ActivityTimeline agentId={selectedId} />
          </>
        )}
      </div>

      {/* File Viewer Modal */}
      {viewingFile && (
        <FileViewer
          agentId={selectedId}
          filename={viewingFile}
          onClose={() => setViewingFile(null)}
        />
      )}
      {viewingLog && (
        <FileViewer
          agentId={selectedId}
          filename={viewingLog}
          isLog
          onClose={() => setViewingLog(null)}
        />
      )}
    </div>
  )
}

function AgentRow({ id, selected, onSelect, indent }) {
  const agent = AGENT_HIERARCHY[id]
  if (!agent) return null

  return (
    <div
      onClick={() => onSelect(id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 8px',
        marginLeft: indent ? '16px' : 0,
        borderRadius: '6px',
        cursor: 'pointer',
        background: selected ? 'rgba(var(--accent-rgb, 255,160,0), 0.12)' : 'transparent',
        borderLeft: selected ? '2px solid var(--accent-color)' : '2px solid transparent',
        transition: 'background 0.15s',
      }}
      onMouseEnter={(e) => {
        if (!selected) e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
      }}
      onMouseLeave={(e) => {
        if (!selected) e.currentTarget.style.background = 'transparent'
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: agent.isHuman ? 'var(--accent-color)' : '#4ade80',
          flexShrink: 0,
        }}
      />
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: '13px',
            fontWeight: '500',
            color: selected ? 'var(--text-primary)' : 'var(--text-secondary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {agent.name}
        </div>
        <div
          style={{
            fontSize: '11px',
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {agent.role}
        </div>
      </div>
    </div>
  )
}
