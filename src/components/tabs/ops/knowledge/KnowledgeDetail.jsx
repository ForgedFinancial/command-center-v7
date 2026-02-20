import { useState } from 'react'
import AgentBadge from '../shared/AgentBadge'
import { CATEGORY_CONFIG, SEVERITY_COLORS } from './knowledgeConstants'

export default function KnowledgeDetail({ entry, onClose, onUpdate, onDelete }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const catConfig = CATEGORY_CONFIG[entry.category] || CATEGORY_CONFIG.OTHER
  const sevColor = SEVERITY_COLORS[entry.severity] || SEVERITY_COLORS.MEDIUM

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '560px', maxHeight: '80vh', overflow: 'auto',
        backgroundColor: 'var(--theme-bg, #0f0f1a)',
        border: '1px solid var(--theme-border)', borderRadius: '12px', padding: '24px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--theme-text-primary)', flex: 1 }}>
            {entry.title}
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', color: 'var(--theme-text-secondary)',
            fontSize: '18px', cursor: 'pointer', padding: '0 4px',
          }}>×</button>
        </div>

        {/* Badges */}
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap' }}>
          <span style={{
            padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
            backgroundColor: 'rgba(139,92,246,0.1)', color: 'var(--theme-accent)',
          }}>
            {catConfig.icon} {catConfig.label}
          </span>
          <span style={{
            padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 700,
            backgroundColor: sevColor + '20', color: sevColor,
          }}>
            {entry.severity}
          </span>
          <AgentBadge agent={entry.discoveredBy} size="md" />
          {entry.hitCount > 0 && (
            <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>👁 {entry.hitCount} hits</span>
          )}
        </div>

        {/* Description */}
        <div style={{
          marginBottom: '16px', padding: '12px', borderRadius: '8px',
          backgroundColor: 'rgba(255,255,255,0.02)', border: '1px solid var(--theme-border)',
        }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--theme-text-primary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {entry.description}
          </p>
        </div>

        {/* Tags */}
        {entry.tags && entry.tags.length > 0 && (
          <div style={{ marginBottom: '16px', display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {entry.tags.map((tag, i) => (
              <span key={i} style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '4px',
                backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-text-secondary)',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta */}
        <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '16px' }}>
          Created: {new Date(entry.createdAt).toLocaleString()} · Updated: {new Date(entry.updatedAt).toLocaleString()}
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--theme-border)' }}>
          {confirmDelete ? (
            <>
              <span style={{ fontSize: '12px', color: '#ef4444', alignSelf: 'center' }}>Delete permanently?</span>
              <button onClick={() => setConfirmDelete(false)} style={btnStyle('ghost')}>No</button>
              <button onClick={() => onDelete(entry.id)} style={btnStyle('danger')}>Yes, Delete</button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} style={btnStyle('danger')}>Delete</button>
          )}
        </div>
      </div>
    </div>
  )
}

function btnStyle(variant) {
  const base = {
    padding: '6px 14px', fontSize: '12px', fontWeight: 500, borderRadius: '6px',
    cursor: 'pointer', border: 'none', transition: 'all 0.15s',
  }
  if (variant === 'danger') return { ...base, backgroundColor: 'rgba(239,68,68,0.15)', color: '#ef4444' }
  return { ...base, backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--theme-text-secondary)' }
}
