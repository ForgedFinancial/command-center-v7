import { CATEGORIES, CATEGORY_CONFIG } from './knowledgeConstants'

export default function CategoryFilter({ active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
      <button
        onClick={() => onChange(null)}
        style={{
          padding: '4px 12px', fontSize: '11px', fontWeight: active === null ? 600 : 400,
          color: active === null ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
          backgroundColor: active === null ? 'var(--theme-accent-muted, rgba(139,92,246,0.15))' : 'transparent',
          border: active === null ? '1px solid var(--theme-accent)' : '1px solid transparent',
          borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        All
      </button>
      {CATEGORIES.map(cat => {
        const isActive = active === cat
        const config = CATEGORY_CONFIG[cat]
        return (
          <button
            key={cat}
            onClick={() => onChange(isActive ? null : cat)}
            style={{
              padding: '4px 12px', fontSize: '11px', fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
              backgroundColor: isActive ? 'var(--theme-accent-muted, rgba(139,92,246,0.15))' : 'transparent',
              border: isActive ? '1px solid var(--theme-accent)' : '1px solid transparent',
              borderRadius: '6px', cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {config.icon} {config.label}
          </button>
        )
      })}
    </div>
  )
}
