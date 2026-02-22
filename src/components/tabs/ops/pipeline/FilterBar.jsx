import { STAGES, STAGE_CONFIG, AGENTS, PRIORITIES } from './pipelineConstants'

const selectStyle = {
  padding: '6px 10px',
  fontSize: '12px',
  fontWeight: 500,
  background: '#07090F',
  color: '#E2E8F0',
  border: '1px solid rgba(148,163,184,0.24)',
  borderRadius: '6px',
  cursor: 'pointer',
  outline: 'none',
}

const focusRing = {
  boxShadow: '0 0 0 2px rgba(0,212,255,0.55), inset 0 0 0 1px rgba(7,9,15,0.9)',
}

export default function FilterBar({ filters, onChange }) {
  const set = (key, val) => onChange({ ...filters, [key]: val })

  return (
    <div style={{
      display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap',
      padding: '8px 12px', borderRadius: '10px',
      background: '#0E1320',
      border: '1px solid rgba(148,163,184,0.24)',
    }}>
      <label style={{ fontSize: '11px', color: '#94A3B8', fontWeight: 600 }}>Filters:</label>

      <select value={filters.assignee} onChange={e => set('assignee', e.target.value)} style={selectStyle} onFocus={e => Object.assign(e.currentTarget.style, focusRing)} onBlur={e => (e.currentTarget.style.boxShadow = 'none')}>
        <option value="all">All Agents</option>
        {Object.entries(AGENTS).map(([id, a]) => (
          <option key={id} value={id}>{a.icon} {a.label}</option>
        ))}
      </select>

      <select value={filters.priority} onChange={e => set('priority', e.target.value)} style={selectStyle} onFocus={e => Object.assign(e.currentTarget.style, focusRing)} onBlur={e => (e.currentTarget.style.boxShadow = 'none')}>
        <option value="all">All Priorities</option>
        {PRIORITIES.map(p => (
          <option key={p.value} value={p.value}>{p.label}</option>
        ))}
      </select>

      <select value={filters.stage} onChange={e => set('stage', e.target.value)} style={selectStyle} onFocus={e => Object.assign(e.currentTarget.style, focusRing)} onBlur={e => (e.currentTarget.style.boxShadow = 'none')}>
        <option value="all">All Stages</option>
        {STAGES.map(s => (
          <option key={s} value={s}>{STAGE_CONFIG[s].icon} {STAGE_CONFIG[s].label}</option>
        ))}
      </select>

      <select value={filters.scope || 'all'} onChange={e => set('scope', e.target.value)} style={selectStyle} onFocus={e => Object.assign(e.currentTarget.style, focusRing)} onBlur={e => (e.currentTarget.style.boxShadow = 'none')}>
        <option value="all">Scope: All</option>
        <option value="active">Scope: Active</option>
        <option value="backlog">Scope: Backlog</option>
      </select>

      <input
        type="text"
        value={filters.search}
        onChange={e => set('search', e.target.value)}
        placeholder="Search tasks…"
        style={{ ...selectStyle, minWidth: '160px', flex: 1 }}
        onFocus={e => Object.assign(e.currentTarget.style, focusRing)}
        onBlur={e => (e.currentTarget.style.boxShadow = 'none')}
      />

      {(filters.assignee !== 'all' || filters.priority !== 'all' || filters.stage !== 'all' || (filters.scope || 'all') !== 'all' || filters.search) && (
        <button
          onClick={() => onChange({ assignee: 'all', priority: 'all', stage: 'all', scope: 'all', search: '' })}
          style={{
            padding: '5px 10px', fontSize: '11px', fontWeight: 600,
            backgroundColor: 'rgba(239,68,68,0.1)', color: '#ef4444',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
          }}
        >
          Clear
        </button>
      )}
    </div>
  )
}
