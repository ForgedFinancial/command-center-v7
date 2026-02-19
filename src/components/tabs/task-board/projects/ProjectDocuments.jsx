import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { DOC_CATEGORY_CONFIG } from '../../../../config/taskboard'
import EmptyState from '../../../shared/EmptyState'

export default function ProjectDocuments({ project }) {
  const { state } = useTaskBoard()
  const docs = state.documents.filter(d => d.projectId === project.id)

  if (docs.length === 0) {
    return <EmptyState icon="📄" title="No Documents" message="No documents are linked to this project yet." />
  }

  return (
    <div>
      {docs.map(doc => {
        const catConf = DOC_CATEGORY_CONFIG[doc.category] || {}
        return (
          <div
            key={doc.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '14px 18px',
              borderRadius: '10px',
              background: 'var(--theme-bg)',
              border: '1px solid rgba(255,255,255,0.04)',
              marginBottom: '6px',
            }}
          >
            <span style={{ fontSize: '24px', marginRight: '14px' }}>
              {doc.category === 'report' ? '📊' : doc.category === 'brief' ? '📝' : doc.category === 'research' ? '🔍' : '📎'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>{doc.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginTop: '2px' }}>
                {doc.mimeType || 'Document'}{doc.size ? ` • ${formatSize(doc.size)}` : ''}
                {doc.createdAt && ` • ${timeAgo(doc.createdAt)}`}
              </div>
            </div>
            {doc.category && (
              <span style={{
                fontSize: '9px',
                padding: '3px 10px',
                borderRadius: '4px',
                textTransform: 'uppercase',
                fontWeight: 600,
                color: catConf.color || '#71717a',
                background: catConf.bg || 'rgba(113,113,122,0.12)',
              }}>
                {catConf.label || doc.category}
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}
