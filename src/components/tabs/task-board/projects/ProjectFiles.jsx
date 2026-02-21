import { useState, useRef, useCallback } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import { useApp } from '../../../../context/AppContext'
import taskboardClient from '../../../../api/taskboardClient'
import { WORKER_PROXY_URL } from '../../../../config/api'
import EmptyState from '../../../shared/EmptyState'

const FILE_CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'report', label: 'Reports' },
  { value: 'brief', label: 'Briefs' },
  { value: 'research', label: 'Research' },
  { value: 'attachment', label: 'Attachments' },
  { value: 'deliverable', label: 'Deliverables' },
]

const ICON_MAP = {
  report: '📊', brief: '📝', research: '🔍', attachment: '📎', deliverable: '📦',
}

function formatSize(bytes) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return `${Math.floor(days / 7)}w ago`
}

export default function ProjectFiles({ project }) {
  const { state, actions } = useTaskBoard()
  const { actions: appActions } = useApp()
  const [categoryFilter, setCategoryFilter] = useState('')
  const [viewMode, setViewMode] = useState('list') // list | grid
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const fileInputRef = useRef(null)

  const docs = state.documents.filter(d => d.projectId === project.id)
  const filtered = categoryFilter ? docs.filter(d => d.category === categoryFilter) : docs

  const handleUpload = useCallback(async (files) => {
    if (!files || files.length === 0) return
    setUploading(true)
    try {
      for (const file of files) {
        const result = await taskboardClient.uploadFile(file, project.id)
        if (result.success && result.document) {
          actions.addDocument(result.document)
        }
      }
      appActions.addToast({ type: 'success', message: `${files.length} file(s) uploaded` })
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Upload failed: ${err.message}` })
    } finally {
      setUploading(false)
    }
  }, [project.id, actions, appActions])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    handleUpload(e.dataTransfer.files)
  }, [handleUpload])

  const handleDelete = async (doc) => {
    try {
      await taskboardClient.deleteDocument(doc.id)
      actions.removeDocument(doc.id)
      appActions.addToast({ type: 'success', message: 'File deleted' })
      setDeleteConfirm(null)
    } catch (err) {
      appActions.addToast({ type: 'error', message: `Delete failed: ${err.message}` })
    }
  }

  const handleDownload = (doc) => {
    window.open(`${WORKER_PROXY_URL}/api/taskboard/documents/download/${doc.id}`, '_blank')
  }

  const tabStyle = (active) => ({
    padding: '6px 14px', borderRadius: '6px', fontSize: '11px', fontWeight: active ? 600 : 400,
    border: 'none', cursor: 'pointer',
    background: active ? 'var(--theme-accent-muted)' : 'transparent',
    color: active ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
    transition: 'all 0.15s',
  })

  return (
    <div>
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        style={{
          padding: '32px', borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
          border: `2px dashed ${dragging ? 'var(--theme-accent)' : 'rgba(255,255,255,0.1)'}`,
          background: dragging ? 'rgba(0,212,255,0.05)' : 'rgba(255,255,255,0.02)',
          marginBottom: '20px', transition: 'all 0.2s',
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => { handleUpload(e.target.files); e.target.value = '' }}
        />
        <div style={{ fontSize: '28px', marginBottom: '8px' }}>{uploading ? '⏳' : '📁'}</div>
        <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)' }}>
          {uploading ? 'Uploading...' : 'Drag & drop files here, or click to browse'}
        </div>
      </div>

      {/* Filter tabs + view toggle */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '4px' }}>
          {FILE_CATEGORIES.map(c => (
            <button key={c.value} onClick={() => setCategoryFilter(c.value)} style={tabStyle(categoryFilter === c.value)}>
              {c.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button onClick={() => setViewMode('list')} style={tabStyle(viewMode === 'list')}>☰</button>
          <button onClick={() => setViewMode('grid')} style={tabStyle(viewMode === 'grid')}>⊞</button>
        </div>
      </div>

      {/* Files */}
      {filtered.length === 0 ? (
        <EmptyState icon="📄" title="No Files" message={categoryFilter ? 'No files in this category.' : 'Upload files to get started.'} />
      ) : viewMode === 'list' ? (
        <div>
          {filtered.map(doc => (
            <div key={doc.id} style={{
              display: 'flex', alignItems: 'center', padding: '12px 16px', borderRadius: '8px',
              background: 'var(--theme-bg)', border: '1px solid rgba(255,255,255,0.04)',
              marginBottom: '6px', transition: 'all 0.15s',
            }}>
              <span style={{ fontSize: '20px', marginRight: '12px' }}>
                {ICON_MAP[doc.category] || '📎'}
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--theme-text-primary)' }}>
                  {doc.filename || doc.name || 'Untitled'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginTop: '2px' }}>
                  {doc.mimeType || 'File'}{doc.size ? ` • ${formatSize(doc.size)}` : ''}
                  {(doc.uploadedAt || doc.createdAt) && ` • ${timeAgo(doc.uploadedAt || doc.createdAt)}`}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button onClick={(e) => { e.stopPropagation(); handleDownload(doc) }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                  title="Download">⬇️</button>
                {deleteConfirm === doc.id ? (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(doc) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: '#ef4444', padding: '4px' }}>
                      Confirm
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(null) }}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--theme-text-secondary)', padding: '4px' }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(doc.id) }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                    title="Delete">🗑️</button>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Grid view */
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
          {filtered.map(doc => (
            <div key={doc.id} style={{
              padding: '16px', borderRadius: '10px', background: 'var(--theme-bg)',
              border: '1px solid rgba(255,255,255,0.04)', textAlign: 'center',
            }}>
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>{ICON_MAP[doc.category] || '📎'}</div>
              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--theme-text-primary)', marginBottom: '4px',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {doc.filename || doc.name || 'Untitled'}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginBottom: '10px' }}>
                {formatSize(doc.size)}
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
                <button onClick={() => handleDownload(doc)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>⬇️</button>
                <button onClick={() => deleteConfirm === doc.id ? handleDelete(doc) : setDeleteConfirm(doc.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px' }}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
