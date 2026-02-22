export default function LiveLogViewer({ lines = [] }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <h4 style={{ margin: 0, fontSize: '13px', color: 'var(--theme-text-primary)' }}>Live Log</h4>
      <div
        style={{
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: '8px',
          backgroundColor: '#0d1117',
          color: '#c9d1d9',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
          fontSize: '11px',
          lineHeight: 1.5,
          padding: '10px',
          maxHeight: '180px',
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
        }}
      >
        {lines.length === 0 ? (
          <span style={{ color: '#8b949e' }}>No log events yet.</span>
        ) : (
          lines.map((entry, index) => (
            <div key={`${entry.timestamp || ''}-${index}`}>
              [{entry.agent || 'system'}] {entry.line || entry.message || JSON.stringify(entry)}
            </div>
          ))
        )}
      </div>
    </section>
  )
}
