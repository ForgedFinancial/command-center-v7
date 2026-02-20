import { STAGES, STAGE_CONFIG, AGENTS, PRIORITIES } from './pipelineConstants'

const selectStyle = {
  padding: '6px 10px', fontSize: '12px', fontWeight: 500,
  backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--theme-text-primary)',
  border: '1px solid var(--theme-border, rgba(255,255,255,0.08))',
  borderRadius: '6px', cursor: 'pointer', outline: 'none',
  transition: 'border-color 0.15s',
}

export default function FilterBar({ filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val })

  return (
    <div style={{
      display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap',
      padding: '8px 12px', borderRadius: '8px',
      backgroundColor: 'var(--theme-surface, rgba(255,255,255,0.02))',
      border: '1px solid var(--theme-border, rgba(255,255,255,0.06))',
    }}>
      <label style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', fontWeight: 600 }}>Filters:</label>

      <select value={filters.assignee} onChange={e => set('assignee', e.target.value)} style={selectStyle}>
        <option value="all">All Agents</option>
        {Object.entries(AGENTS).map(([id, a]) => (
          <option key={id} value={id}>{a.icon} {a.label}</option>
        ))}
      </select>

      <select value={filters.priority} onChange={e => set('priority', e.target.value)} style={selectStyle}>
        <option value="all">All Priorities</option>
        {PRIORITIES.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      <select value={filters.stage} onChange={e => set('stage', e.target.value)} style={selectStyle}>
        <option value="all">All Stages</option>
        {STAGES.map(s => (
          <option key={s} value={s}>{STAGE_CONFIG[s].icon} {STAGE_CONFIG[s].label}</option>
        ))}
      </select>

      <input
        type="text"
        value={filters.search}
        onChange={e => set('search', e.target.value)}
        placeholder="🔍 Search tasks…"
        style={{ ...selectStyle, minWidth: '160px', flex: 1 }}
      />

      {(filters.assignee !== 'all' || filters.priority !== 'all' || filters.stage !== 'all' || filters.search) && (
        <button
          onClick={() => onChange({ assignee: 'all', priority: 'all', stage: 'all', search: '' })}
          style={{
            padding: '5px 10px', fontSize: '11px', fontWeight: 600,
            backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
          }}
        >
          ✕ Clear
        </button>
      )}
    </div>
  )
}
