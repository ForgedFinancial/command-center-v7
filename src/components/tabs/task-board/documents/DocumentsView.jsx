import { useMemo, useState } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { DOC_CATEGORY_CONFIG } from '../../../../config/taskboard'
import EmptyState from '../../../shared/EmptyState'

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'report', label: 'Reports' },
  { id: 'brief', label: 'Specs' },
  { id: 'research', label: 'Research' },
  { id: 'attachment', label: 'Templates' },
]

const DOC_ICONS = {
  report: '📊',
  brief: '📝',
  research: '🔍',
  attachment: '📎',
}

const MIME_ICONS = {
  'application/pdf': '🔒',
  'image/svg+xml': '🎨',
}

export default function DocumentsView() {
  const { state } = useTaskBoard()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')

  const filteredDocs = useMemo(() => {
    let docs = [...state.documents]
    if (search) {
      const q = search.toLowerCase()
      docs = docs.filter(d => d.name.toLowerCase().includes(q))
    }
    if (categoryFilter !== 'all') {
      docs = docs.filter(d => d.category === categoryFilter)
    }
    return docs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }, [state.documents, search, categoryFilter])

  // Stats
  const totalFiles = state.documents.length
  const specCount = state.documents.filter(d => d.category === 'brief').length
  const reportCount = state.documents.filter(d => d.category === 'report').length
  const templateCount = state.documents.filter(d => d.category === 'attachment').length

  const statCards = [
    { label: 'Total Files', value: totalFiles, color: '#00d4ff' },
    { label: 'Specs', value: specCount, color: '#a855f7' },
    { label: 'Reports', value: reportCount, color: '#f59e0b' },
    { label: 'Templates', value: templateCount, color: '#4ade80' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Documents</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e4e4e7',
              fontSize: '12px',
              outline: 'none',
              width: '180px',
            }}
          />
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(0,212,255,0.3)',
              background: 'rgba(0,212,255,0.1)',
              color: '#00d4ff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Upload
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {statCards.map(card => (
          <div key={card.label} style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '11px', color: '#71717a', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Category filter chips - visible but not as separate toggle */}

      {/* Document list */}
      {filteredDocs.length === 0 ? (
        <EmptyState
          icon="📄"
          title="No Documents"
          message={search || categoryFilter !== 'all' ? 'No documents match your filters.' : 'Upload or create documents to organize your project files.'}
        />
      ) : (
        <div>
          {filteredDocs.map(doc => {
            const catConf = DOC_CATEGORY_CONFIG[doc.category] || {}
            const icon = MIME_ICONS[doc.mimeType] || DOC_ICONS[doc.category] || '📄'

            return (
              <div
                key={doc.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '14px 18px',
                  borderRadius: '10px',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid rgba(255,255,255,0.04)',
                  marginBottom: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                }}
                onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                onMouseOut={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
              >
                <span style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '8px',
                  background: catConf.bg || 'rgba(113,113,122,0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  marginRight: '14px',
                  flexShrink: 0,
                }}>
                  {icon}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>{doc.name}</div>
                  <div style={{ fontSize: '11px', color: '#52525b', marginTop: '2px' }}>
                    {doc.mimeType || 'Markdown'}
                    {doc.size ? ` • ${formatSize(doc.size)}` : ''}
                    {doc.createdAt && ` • Updated ${timeAgo(doc.createdAt)}`}
                  </div>
                </div>
                {doc.category && (
                  <span style={{
                    fontSize: '10px',
                    padding: '4px 12px',
                    borderRadius: '4px',
                    fontWeight: 600,
                    color: catConf.color || '#71717a',
                    background: catConf.bg || 'rgba(113,113,122,0.12)',
                    textTransform: 'capitalize',
                  }}>
                    {catConf.label || doc.category}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
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
