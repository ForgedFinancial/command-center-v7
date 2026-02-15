import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { AGENT_HIERARCHY, AGENT_FILES } from '../../config/constants'
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
              // Nested group
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
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: '12px',
                marginBottom: '24px',
              }}
            >
              {AGENT_FILES.map((filename) => (
                <div
                  key={filename}
                  className="glass-card"
                  onClick={() => setViewingFile(filename)}
                  style={{
                    padding: '16px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'border-color 0.15s, background 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-color)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = ''
                  }}
                >
                  <span style={{ fontSize: '20px' }}>📄</span>
                  <span style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: '500' }}>
                    {filename}
                  </span>
                </div>
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
