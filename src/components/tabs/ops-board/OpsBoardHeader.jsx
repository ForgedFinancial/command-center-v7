import { OPS_CLASSIFICATIONS, OPS_PRIORITIES, OPS_STAGE_ORDER } from '../../../config/opsBoard'

function FilterSelect({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value || ''}
      onChange={event => onChange(event.target.value)}
      style={{
        height: '32px',
        borderRadius: '8px',
        border: '1px solid var(--theme-border)',
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text-primary)',
        fontSize: '12px',
        padding: '0 10px',
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  )
}

export default function OpsBoardHeader({ tasks = [], filters, onFiltersChange, onOpenCreate, syncing, wsConnected }) {
  const agentOptions = [...new Set(tasks.map(task => task.assignedAgent).filter(Boolean))]

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', color: 'var(--theme-text-primary)' }}>Ops Board</h2>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
            {tasks.length} active tasks · WebSocket {wsConnected ? 'connected' : 'offline'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {syncing && <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>Syncing...</span>}
          <button
            onClick={onOpenCreate}
            style={{
              height: '34px',
              padding: '0 14px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: 'var(--theme-accent)',
              color: '#fff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + New Task
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <FilterSelect
          value={filters.stage}
          onChange={value => onFiltersChange({ stage: value })}
          placeholder="All Stages"
          options={OPS_STAGE_ORDER.map(stage => ({ value: stage, label: stage }))}
        />

        <FilterSelect
          value={filters.agent}
          onChange={value => onFiltersChange({ agent: value })}
          placeholder="All Agents"
          options={agentOptions.map(agent => ({ value: agent, label: agent }))}
        />

        <FilterSelect
          value={filters.classification}
          onChange={value => onFiltersChange({ classification: value })}
          placeholder="All Classes"
          options={OPS_CLASSIFICATIONS.map(item => ({ value: item.id, label: item.label }))}
        />

        <FilterSelect
          value={filters.priority}
          onChange={value => onFiltersChange({ priority: value })}
          placeholder="All Priorities"
          options={OPS_PRIORITIES.map(item => ({ value: item.id, label: item.label }))}
        />

        <input
          value={filters.search || ''}
          onChange={event => onFiltersChange({ search: event.target.value })}
          placeholder="Search title or description"
          style={{
            height: '32px',
            borderRadius: '8px',
            border: '1px solid var(--theme-border)',
            backgroundColor: 'var(--theme-bg)',
            color: 'var(--theme-text-primary)',
            fontSize: '12px',
            padding: '0 10px',
            minWidth: '220px',
          }}
        />
      </div>
    </section>
  )
}


