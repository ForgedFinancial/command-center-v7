export default function BatchActions({ selectedCount, stages, onSelectAll, onDeselectAll, onBatchMoveStage, onBatchExport, onBatchDelete }) {
  if (selectedCount === 0) return null

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 16px',
      background: 'var(--theme-accent-muted)', border: '1px solid var(--theme-accent)',
      borderRadius: '10px', marginBottom: '12px', animation: 'cc7-slideDown 0.15s ease-out',
    }}>
      <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-accent)' }}>
        {selectedCount} selected
      </span>
      <button onClick={onSelectAll} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)', fontSize: '11px', cursor: 'pointer' }}>Select All</button>
      <button onClick={onDeselectAll} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)', fontSize: '11px', cursor: 'pointer' }}>Deselect All</button>
      <div style={{ width: '1px', height: '20px', background: 'var(--theme-border)' }} />
      <select onChange={e => { if (e.target.value) onBatchMoveStage(e.target.value); e.target.value = '' }} style={{ padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)', fontSize: '11px', cursor: 'pointer' }}>
        <option value="">Move Stage…</option>
        {stages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
      </select>
      <button onClick={onBatchExport} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--theme-border)', background: 'var(--theme-surface)', color: 'var(--theme-text-secondary)', fontSize: '11px', cursor: 'pointer' }}>📥 Export CSV</button>
      <button onClick={onBatchDelete} style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: '11px', cursor: 'pointer' }}>🗑️ Delete</button>
      <style>{`@keyframes cc7-slideDown { from { opacity: 0; transform: translateY(-8px) } to { opacity: 1; transform: translateY(0) } }`}</style>
    </div>
  )
}
