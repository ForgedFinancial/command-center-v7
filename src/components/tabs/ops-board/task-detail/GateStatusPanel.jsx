export default function GateStatusPanel({
  task,
  stageGateConfig = {},
  loading,
  onValidate,
  onSetGate,
}) {
  const gateEntries = Object.entries(stageGateConfig || {})

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--theme-text-primary)' }}>Gate Criteria</h4>
        <button
          onClick={onValidate}
          disabled={loading}
          style={{
            height: '30px',
            padding: '0 10px',
            borderRadius: '7px',
            border: '1px solid var(--theme-border)',
            backgroundColor: 'var(--theme-bg)',
            color: 'var(--theme-text-primary)',
            fontSize: '11px',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          Run Validation
        </button>
      </div>

      {gateEntries.length === 0 && (
        <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>No gates configured for this stage.</div>
      )}

      {gateEntries.map(([gateName, gateConfig]) => {
        const passed = task.gates?.[gateName] === true

        return (
          <div
            key={gateName}
            style={{
              border: `1px solid ${passed ? 'rgba(16,185,129,0.45)' : 'rgba(255,255,255,0.12)'}`,
              backgroundColor: passed ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.02)',
              borderRadius: '9px',
              padding: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
              <strong style={{ fontSize: '12px', color: 'var(--theme-text-primary)' }}>{gateName}</strong>
              <span style={{ fontSize: '11px', color: passed ? '#10b981' : '#f59e0b', fontWeight: 700 }}>
                {passed ? 'PASS' : 'PENDING'}
              </span>
            </div>

            <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>{gateConfig.description}</span>

            {gateConfig.command && (
              <code style={{ fontSize: '10px', color: 'var(--theme-accent)' }}>{gateConfig.command}</code>
            )}

            {gateConfig.type === 'manual' && (
              <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => onSetGate(gateName, true)}
                  style={{
                    height: '28px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'rgba(16,185,129,0.2)',
                    color: '#10b981',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Approve
                </button>
                <button
                  onClick={() => onSetGate(gateName, false)}
                  style={{
                    height: '28px',
                    padding: '0 8px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: 'rgba(239,68,68,0.2)',
                    color: '#ef4444',
                    fontSize: '10px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Reject
                </button>
              </div>
            )}
          </div>
        )
      })}
    </section>
  )
}
