import AgentBadge from '../shared/AgentBadge'
import { CATEGORY_CONFIG, SEVERITY_COLORS } from './knowledgeConstants'

export default function KnowledgeEntry({ entry, onClick }) {
  const catConfig = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.OTHER
  const sevColor = SEVERITY_COLORS[entry.severity] || SEVERITY_COLORS.MEDIUM

  return (
    <div
      onClick={onClick}
      style={{
        padding: '12px 16px', borderRadius: '8px', cursor: 'pointer',
        backgroundColor: 'var(--theme-surface, rgba(255,255,255,0.02))',
        border: '1px solid var(--theme-border, rgba(255,255,255,0.06))',
        transition: 'all 0.2s ease',
      }}
      onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--theme-accent)'; e.currentTarget.style.transform = 'translateY(-1px)' }}
      onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--theme-border, rgba(255,255,255,0.06))'; e.currentTarget.style.transform = 'none' }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--theme-text-primary)', flex: 1 }}>
          {entry.title}
        </span>
      </div>

      {/* Badges row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
        {/* Category badge */}
        <span style={{
          fontSize: '10px', fontWeight: 600, padding: '2px 8px', borderRadius: '4px',
          backgroundColor: 'rgba(139,92,246,0.1)', color: 'var(--theme-accent)',
        }}>
          {catConfig.icon} {catConfig.label}
        </span>

        {/* Severity badge */}
        <span style={{
          fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '4px',
          backgroundColor: sevColor + '20', color: sevColor,
        }}>
          {entry.severity}
        </span>

        <AgentBadge agent={entry.discoveredBy} />

        <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginLeft: 'auto' }}>
          {new Date(entry.createdAt).toLocaleDateString()}
        </span>

        {entry.hitCount > 0 && (
          <span style={{ fontSize: '10px', color: 'var(--theme-text-secondary)' }}>
            👁 {entry.hitCount}
          </span>
        )}
      </div>
    </div>
  )
}
