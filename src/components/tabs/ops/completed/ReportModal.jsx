export default function ReportModal({ taskId, taskName, content, onClose }) {
  const githubUrl = `https://github.com/ForgedFinancial/command-center-v7/blob/main/reports/tasks/${taskId}-report.md`

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        style={{
          width: 'min(900px, 96vw)',
          maxHeight: '84vh',
          background: '#0b0f14',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '10px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 20px 50px rgba(0,0,0,0.45)',
        }}
      >
        <div
          style={{
            padding: '12px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--theme-text-primary, #fff)' }}>
            {taskName} — Deliverable Report
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--theme-text-primary, #fff)',
              cursor: 'pointer',
              fontSize: '15px',
              lineHeight: 1,
            }}
            aria-label="Close report modal"
            title="Close"
          >
            ✕
          </button>
        </div>

        <div style={{ padding: '12px 14px', overflowY: 'auto', flex: 1 }}>
          <div
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
              fontSize: '12px',
              lineHeight: 1.6,
              color: 'var(--theme-text-primary, #fff)',
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '8px',
              padding: '12px',
            }}
          >
            {content || 'No report available yet.'}
          </div>
        </div>

        <div
          style={{
            padding: '10px 14px 12px',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            display: 'flex',
            justifyContent: 'flex-end',
          }}
        >
          <a
            href={githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#60a5fa',
              fontSize: '12px',
              textDecoration: 'none',
              border: '1px solid rgba(96,165,250,0.35)',
              borderRadius: '6px',
              padding: '5px 10px',
              background: 'rgba(96,165,250,0.08)',
            }}
          >
            Open in GitHub
          </a>
        </div>
      </div>
    </div>
  )
}
