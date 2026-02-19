import { useMemo, useState } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { DOC_CATEGORY_CONFIG } from '../../../../config/taskboard'
import EmptyState from '../../../shared/EmptyState'
import DocumentDetailPanel from './DocumentDetailPanel'

const CATEGORY_FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'report', label: 'Reports' },
  { id: 'brief', label: 'Specs' },
  { id: 'research', label: 'Research' },
  { id: 'attachment', label: 'Templates' },
  { id: 'deliverable', label: 'Deliverables' },
]

const DOC_ICONS = {
  report: '📊',
  brief: '📝',
  research: '🔍',
  attachment: '📎',
  deliverable: '📦',
}

const MIME_ICONS = {
  'application/pdf': '🔒',
  'image/svg+xml': '🎨',
}

export default function DocumentsView() {
  const { state } = useTaskBoard()
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [selectedDoc, setSelectedDoc] = useState(null)

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
  const deliverableCount = state.documents.filter(d => d.category === 'deliverable').length

  const statCards = [
    { label: 'Total Files', value: totalFiles, color: 'var(--theme-accent)' },
    { label: 'Specs', value: specCount, color: '#a855f7' },
    { label: 'Reports', value: reportCount, color: '#f59e0b' },
    { label: 'Templates', value: templateCount, color: 'var(--theme-success)' },
    { label: 'Deliverables', value: deliverableCount, color: '#10b981' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>Documents</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid var(--theme-border)',
              background: 'var(--theme-bg)',
              color: 'var(--theme-text-primary)',
              fontSize: '12px',
              outline: 'none',
              width: '180px',
            }}
          />
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid var(--theme-accent)',
              background: 'var(--theme-accent-muted)',
              color: 'var(--theme-accent)',
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
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '12px',
        marginBottom: '20px',
      }}>
        {statCards.map(card => (
          <div key={card.label} style={{
            padding: '16px 20px',
            borderRadius: '12px',
            background: 'var(--theme-surface)',
            border: '1px solid var(--theme-border-subtle)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', fontWeight: 700, color: card.color }}>{card.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginTop: '4px' }}>{card.label}</div>
          </div>
        ))}
      </div>

      {/* Category filter chips */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '16px', flexWrap: 'wrap' }}>
        {CATEGORY_FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setCategoryFilter(f.id)}
            style={{
              padding: '5px 14px',
              borderRadius: '16px',
              border: categoryFilter === f.id ? '1px solid var(--theme-accent)' : '1px solid var(--theme-border)',
              background: categoryFilter === f.id ? 'var(--theme-accent-muted)' : 'transparent',
              color: categoryFilter === f.id ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Split pane: list + detail */}
      <div style={{ display: 'flex', flex: 1, gap: '16px', minHeight: 0 }}>
        {/* Document list */}
        <div style={{ flex: selectedDoc ? '0 0 45%' : '1', overflowY: 'auto' }}>
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
                const isSelected = selectedDoc?.id === doc.id
                const pm = doc.pipelineMetadata

                return (
                  <div
                    key={doc.id}
                    onClick={() => setSelectedDoc(isSelected ? null : doc)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '14px 18px',
                      borderRadius: '10px',
                      background: isSelected ? 'rgba(16,185,129,0.08)' : 'var(--theme-bg)',
                      border: isSelected ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.04)',
                      marginBottom: '6px',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseOver={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
                    onMouseOut={(e) => { if (!isSelected) e.currentTarget.style.background = 'rgba(255,255,255,0.02)' }}
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--theme-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span>{doc.mimeType || 'Markdown'}</span>
                        {doc.size ? <span>• {formatSize(doc.size)}</span> : null}
                        {doc.createdAt && <span>• {timeAgo(doc.createdAt)}</span>}
                        {/* Pipeline badges for deliverables */}
                        {pm && (
                          <>
                            <span style={{
                              fontSize: '9px',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              fontWeight: 700,
                              color: pm.verdict === 'APPROVED' ? '#10b981' : '#ef4444',
                              background: pm.verdict === 'APPROVED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
                            }}>
                              {pm.verdict === 'APPROVED' ? '✅' : '❌'} {pm.verdict}
                            </span>
                            {pm.acResults && (
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                color: '#3b82f6',
                                background: 'rgba(59,130,246,0.12)',
                              }}>
                                {pm.acResults.passed}/{pm.acResults.total} AC
                              </span>
                            )}
                            {pm.complexity && (
                              <span style={{
                                fontSize: '9px',
                                padding: '1px 6px',
                                borderRadius: '3px',
                                fontWeight: 600,
                                color: '#f59e0b',
                                background: 'rgba(245,158,11,0.12)',
                                textTransform: 'capitalize',
                              }}>
                                {pm.complexity}
                              </span>
                            )}
                          </>
                        )}
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
                        flexShrink: 0,
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

        {/* Detail panel */}
        {selectedDoc && (
          <DocumentDetailPanel doc={selectedDoc} onClose={() => setSelectedDoc(null)} />
        )}
      </div>
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
