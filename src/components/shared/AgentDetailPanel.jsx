import { useApp } from '../../context/AppContext'
import { AGENT_HIERARCHY, TABS } from '../../config/constants'

export default function AgentDetailPanel() {
  const { state, actions } = useApp()
  const agent = state.selectedAgent ? AGENT_HIERARCHY[state.selectedAgent] : null

  if (!agent) return null

  const close = () => actions.setSelectedAgent(null)

  const openWorkspace = () => {
    actions.setTab(TABS.WORKSPACES)
    actions.setWorkspaceAgent(agent.id)
    actions.setSelectedAgent(null)
  }

  const borderColor = agent.isHuman
    ? '#3b82f6'
    : ['architect', 'mason', 'sentinel'].includes(agent.id)
    ? '#f59e0b'
    : '#10b981'

  return (
    <>
      {/* Overlay */}
      <div
        onClick={close}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 998,
          animation: 'fadeIn 0.2s ease',
        }}
      />

      {/* Panel */}
      <div
        className="glass-panel"
        style={{
          position: 'fixed',
          right: 0,
          top: 0,
          height: '100vh',
          width: '380px',
          maxWidth: '90vw',
          zIndex: 999,
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          borderRadius: '12px 0 0 12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          animation: 'slideIn 0.25s ease',
          overflowY: 'auto',
        }}
      >
        {/* Close */}
        <button
          onClick={close}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'none',
            border: 'none',
            color: 'var(--text-secondary)',
            fontSize: '20px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
          }}
        >
          ✕
        </button>

        {/* Status + Name */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
            <span
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                background: '#4ade80',
                boxShadow: '0 0 8px #4ade80',
              }}
            />
            <span style={{ fontSize: '11px', color: '#4ade80', fontWeight: 600 }}>Online</span>
          </div>
          <h2 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: 'var(--text-primary)' }}>
            {agent.name}
          </h2>
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <DetailRow label="Role" value={agent.role} color={borderColor} />
          {agent.designation && <DetailRow label="Designation" value={agent.designation} mono />}
          {agent.model && <DetailRow label="Model" value={agent.model} mono />}
          <DetailRow label="Description" value={agent.description} />
          {agent.parent && (
            <DetailRow label="Reports to" value={AGENT_HIERARCHY[agent.parent]?.name || agent.parent} />
          )}
        </div>

        {/* Sub-agents */}
        {(() => {
          const subs = Object.values(AGENT_HIERARCHY).filter(a => a.parent === agent.id)
          if (subs.length === 0) return null
          return (
            <div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 700 }}>
                Direct Reports
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {subs.map(s => (
                  <span
                    key={s.id}
                    onClick={() => actions.setSelectedAgent(s.id)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '6px',
                      background: 'var(--bg-tertiary)',
                      color: 'var(--text-secondary)',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Workspace button */}
        {!agent.isHuman && (
          <button
            onClick={openWorkspace}
            style={{
              marginTop: 'auto',
              padding: '12px 20px',
              borderRadius: '8px',
              border: '1px solid var(--accent)',
              background: 'transparent',
              color: 'var(--accent)',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            Open Workspace →
          </button>
        )}
      </div>

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}

function DetailRow({ label, value, color, mono }) {
  return (
    <div>
      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div
        style={{
          fontSize: '14px',
          color: color || 'var(--text-primary)',
          fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
          fontWeight: color ? 600 : 400,
        }}
      >
        {value}
      </div>
    </div>
  )
}
