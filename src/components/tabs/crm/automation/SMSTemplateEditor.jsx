import { useState, useEffect, useCallback } from 'react'
import crmClient from '../../../../api/crmClient'
import { DEFAULT_TEMPLATES } from '../../../../config/automationDefaults'
import toast from 'react-hot-toast'

const SAMPLE_LEAD = {
  name: 'John Smith', first_name: 'John', last_name: 'Smith',
  agent_name: 'Dano', agent_phone: '(555) 555-0100',
  carrier: 'Mutual of Omaha', face_amount: '$250,000',
  policy_number: 'LF-2024-0847', phone: '(555) 123-4567',
  premium: '$85/mo', draft_date: '15th',
}

export default function SMSTemplateEditor() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [showPreview, setShowPreview] = useState(null)
  const [filterPipeline, setFilterPipeline] = useState('all')
  const [saveStatus, setSaveStatus] = useState({})
  const [loadError, setLoadError] = useState(false)
  const [enabledMap, setEnabledMap] = useState(() => {
    try { return JSON.parse(localStorage.getItem('cc7-sms-template-toggles') || '{}') } catch { return {} }
  })

  useEffect(() => {
    (async () => {
      try {
        const res = await crmClient.request('/sms-templates')
        const data = Array.isArray(res) ? res : res.templates || res.data || []
        if (data.length > 0) {
          setTemplates(data)
        } else {
          setTemplates(DEFAULT_TEMPLATES)
          setLoadError(true)
        }
      } catch {
        setTemplates(DEFAULT_TEMPLATES)
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const startEdit = (t) => { setEditingId(t.id); setEditContent(t.content) }

  const cancelEdit = () => { setEditingId(null); setEditContent('') }

  const saveEdit = async (t) => {
    // Validate required vars
    const missing = (t.requiredVars || []).filter(v => !editContent.includes(`{{${v}}}`))
    if (missing.length > 0) {
      setSaveStatus({ [t.id]: { type: 'warn', msg: `Missing required variables: ${missing.map(v => `{{${v}}}`).join(', ')}` } })
      return
    }

    crmClient.request(`/sms-templates/${t.id}`, {
      method: 'PUT',
      body: JSON.stringify({ content: editContent }),
    })
      .then(() => {
        toast.success('Template saved successfully')
        setTemplates(prev => prev.map(tp => tp.id === t.id ? { ...tp, content: editContent } : tp))
        setSaveStatus({ [t.id]: { type: 'success', msg: 'Saved!' } })
        setEditingId(null)
        setTimeout(() => setSaveStatus({}), 2000)
      })
      .catch(err => {
        console.error(err)
        toast.error('Failed to save template. Please try again.')
      })
  }

  const resetTemplate = async (t) => {
    const def = DEFAULT_TEMPLATES.find(d => d.id === t.id)
    if (!def) return
    try {
      await crmClient.request(`/sms-templates/${t.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: def.content }),
      })
    } catch {}
    setTemplates(prev => prev.map(tp => tp.id === t.id ? { ...tp, content: def.content } : tp))
    if (editingId === t.id) setEditContent(def.content)
    setSaveStatus({ [t.id]: { type: 'success', msg: 'Reset to default!' } })
    setTimeout(() => setSaveStatus({}), 2000)
  }

  const renderPreview = (content) => {
    return content.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return SAMPLE_LEAD[key] || `[${key}]`
    })
  }

  const isEnabled = (id) => enabledMap[id] !== false // default ON
  const toggleEnabled = (id) => {
    setEnabledMap(prev => {
      const next = { ...prev, [id]: !isEnabled(id) }
      localStorage.setItem('cc7-sms-template-toggles', JSON.stringify(next))
      // Also persist to server
      crmClient.request(`/sms-templates/${id}`, { method: 'PUT', body: JSON.stringify({ enabled: next[id] !== false }) }).catch(() => {})
      return next
    })
  }

  const pipelines = ['all', ...new Set(templates.map(t => t.pipeline))]
  const filtered = filterPipeline === 'all' ? templates : templates.filter(t => t.pipeline === filterPipeline)

  if (loading) return <div style={{ padding: 24, color: '#94a3b8' }}>Loading templates...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Error banner */}
      {loadError && (
        <div style={{ padding: '10px 14px', background: 'rgba(245,158,11,0.12)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)', color: '#f59e0b', fontSize: 13 }}>
          ⚠️ Failed to load from server — showing defaults. Edits won't persist until the server is available.
        </div>
      )}
      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {pipelines.map(p => (
          <button key={p} onClick={() => setFilterPipeline(p)} style={{
            padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 500,
            background: filterPipeline === p ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.06)',
            color: filterPipeline === p ? '#3b82f6' : '#94a3b8',
          }}>{p === 'all' ? 'All' : p}</button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: 12, color: '#64748b' }}>{filtered.length} templates</span>
      </div>

      {/* Templates */}
      {filtered.map(t => {
        const isEditing = editingId === t.id
        const status = saveStatus[t.id]
        return (
          <div key={t.id} style={{
            background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden', opacity: isEnabled(t.id) ? 1 : 0.5, transition: 'opacity 0.2s',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
              <div
                onClick={() => toggleEnabled(t.id)}
                title={isEnabled(t.id) ? 'Click to disable' : 'Click to enable'}
                style={{
                  width: 36, height: 20, borderRadius: 10, cursor: 'pointer', transition: 'background 0.2s', flexShrink: 0,
                  background: isEnabled(t.id) ? '#4ade80' : 'rgba(255,255,255,0.12)',
                  position: 'relative',
                }}
              >
                <div style={{
                  width: 16, height: 16, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2,
                  left: isEnabled(t.id) ? 18 : 2, transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }} />
              </div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 600 }}>{t.pipeline}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: isEnabled(t.id) ? '#e2e8f0' : '#52525b' }}>{t.name}</span>
              <span style={{ fontSize: 11, color: '#64748b' }}>{t.stage} • {t.timing} • → {t.recipient}</span>
              {status && <span style={{ fontSize: 11, marginLeft: 'auto', color: status.type === 'success' ? '#4ade80' : '#f59e0b' }}>{status.msg}</span>}
            </div>

            {/* Content */}
            <div style={{ padding: 14 }}>
              {isEditing ? (
                <>
                  <textarea value={editContent} onChange={e => setEditContent(e.target.value)} style={{
                    width: '100%', minHeight: 80, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(59,130,246,0.3)',
                    borderRadius: 6, color: '#e2e8f0', padding: 10, fontSize: 13, resize: 'vertical', fontFamily: 'inherit',
                  }} />
                  {t.requiredVars?.length > 0 && (
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                      Required: {t.requiredVars.map(v => `{{${v}}}`).join(', ')}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => saveEdit(t)} style={{ padding: '5px 14px', borderRadius: 6, border: 'none', background: '#4ade80', color: '#000', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                    <button onClick={cancelEdit} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#94a3b8', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                    <button onClick={() => setShowPreview(showPreview === t.id ? null : t.id)} style={{ padding: '5px 14px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#3b82f6', fontSize: 12, cursor: 'pointer' }}>
                      {showPreview === t.id ? 'Hide Preview' : 'Preview'}
                    </button>
                  </div>
                  {showPreview === t.id && (
                    <div style={{ marginTop: 8, padding: 10, background: 'rgba(74,222,128,0.08)', borderRadius: 6, border: '1px solid rgba(74,222,128,0.2)', fontSize: 13, color: '#cbd5e1' }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>PREVIEW (sample data):</div>
                      {renderPreview(editContent)}
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{t.content}</div>
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <button onClick={() => startEdit(t)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>✏️ Edit</button>
                    <button onClick={() => setShowPreview(showPreview === t.id ? null : t.id)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>👁 Preview</button>
                    <button onClick={() => resetTemplate(t)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>↺ Reset</button>
                  </div>
                  {showPreview === t.id && (
                    <div style={{ marginTop: 8, padding: 10, background: 'rgba(74,222,128,0.08)', borderRadius: 6, border: '1px solid rgba(74,222,128,0.2)', fontSize: 13, color: '#cbd5e1' }}>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>PREVIEW (sample data):</div>
                      {renderPreview(t.content)}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
