import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { AGENT_HIERARCHY, AGENT_FILES, FILE_PREVIEWS, ACTIVITY_TIMELINE } from '../../config/constants'
import FileViewer from '../shared/FileViewer'

const SIDEBAR_GROUPS = [
  {
    label: 'Leadership',
    agents: ['ceo', 'clawd'],
  },
  {
    label: 'Build Crew',
    agents: [
      { id: 'architect', children: ['scout', 'cartographer'] },
      { id: 'mason', children: ['coder', 'wirer', 'scribe'] },
      { id: 'sentinel', children: ['probe', 'auditor'] },
    ],
  },
  {
    label: 'Operations',
    agents: ['atlas', 'ads', 'vanguard', 'postwatch', 'curator'],
  },
]

function renderPreviewLine(line, i) {
  if (!line) return <div key={i} style={{ height: '4px' }} />

  // Header lines
  if (line.startsWith('#')) {
    const text = line.replace(/^#+\s*/, '')
    return (
      <div key={i} style={{ color: '#00d4ff', fontWeight: '700', fontSize: '10px', lineHeight: '1.5' }}>
        {text}
      </div>
    )
  }

  // Lines with bold markers
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

function FilePreviewCard({ filename, agentId, onClick }) {
  const previews = FILE_PREVIEWS[agentId]
  const content = previews && previews[filename]

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
      {content && (
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
      )}
    </div>
  )
}

const STATUS_COLORS = {
  completed: '#4ade80',
  'in-progress': '#3b82f6',
  failed: '#ef4444',
}

function ActivityTimeline({ agentId }) {
  const events = ACTIVITY_TIMELINE[agentId]
  if (!events || events.length === 0) return null

  return (
    <div className="glass-panel" style={{ padding: '20px 24px', marginTop: '16px' }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: 'var(--text-primary)' }}>
        Activity Timeline
      </h3>
      <div style={{ position: 'relative', paddingLeft: '24px' }}>
        {/* Vertical line */}
        <div style={{
          position: 'absolute',
          left: '7px',
          top: '4px',
          bottom: '4px',
          width: '2px',
          background: 'var(--border-color, rgba(255,255,255,0.1))',
        }} />
        {events.map((event, i) => {
          const color = STATUS_COLORS[event.status] || '#666'
          return (
            <div key={i} style={{ position: 'relative', marginBottom: i < events.length - 1 ? '12px' : 0 }}>
              {/* Dot */}
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
              {/* Event card */}
              <div className="glass-card" style={{ padding: '10px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <span style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: '11px',
                    color: 'var(--text-muted)',
                  }}>
                    {event.time}
                  </span>
                  <span style={{
                    fontSize: '9px',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    padding: '2px 6px',
                    borderRadius: '3px',
                    background: `${color}22`,
                    color: color,
                  }}>
                    {event.status}
                  </span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  {event.action}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function Workspaces() {
  const { state, actions } = useApp()
  const selectedId = state.workspaceAgent || 'clawd'
  const [viewingFile, setViewingFile] = useState(null)

  const agent = AGENT_HIERARCHY[selectedId]

  const selectAgent = (id) => {
    actions.setWorkspaceAgent(id)
  }

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
              {AGENT_FILES.map((filename) => (
                <FilePreviewCard
                  key={filename}
                  filename={filename}
                  agentId={selectedId}
                  onClick={() => setViewingFile(filename)}
                />
              ))}
            </div>

            {/* Daily Logs */}
            <div className="glass-panel" style={{ padding: '20px 24px' }}>
              <h3 style={{ margin: '0 0 12px', fontSize: '16px', color: 'var(--text-primary)' }}>
                Daily Logs
              </h3>
              <p style={{ margin: 0, fontSize: '14px', color: 'var(--text-muted)' }}>
                No logs available yet
              </p>
            </div>

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
