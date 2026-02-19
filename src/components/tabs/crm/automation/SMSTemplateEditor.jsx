import { useState, useEffect, useCallback } from 'react'
import crmClient from '../../../../api/crmClient'

const SAMPLE_LEAD = {
  name: 'John Smith', first_name: 'John', last_name: 'Smith',
  agent_name: 'Dano', agent_phone: '(555) 555-0100',
  carrier: 'Mutual of Omaha', face_amount: '$250,000',
  policy_number: 'LF-2024-0847', phone: '(555) 123-4567',
  premium: '$85/mo', draft_date: '15th',
}

const DEFAULT_TEMPLATES = [
  { id: 1, pipeline: 'P1', stage: 'New Lead', timing: 'On entry', recipient: 'Client', name: 'Speed-to-Lead Intro', content: 'Hi {{name}}! This is {{agent_name}} with Forged Financial. I saw you were interested in life insurance — I\'d love to help! When\'s a good time to chat?', requiredVars: ['name', 'agent_name'] },
  { id: 2, pipeline: 'P1', stage: 'Contact', timing: '4-day exit', recipient: 'Client', name: 'Farewell SMS', content: 'Hi {{name}}, we haven\'t been able to connect. If you ever need help with life insurance, don\'t hesitate to reach out to {{agent_name}} at {{agent_phone}}. Take care!', requiredVars: ['name', 'agent_name'] },
  { id: 3, pipeline: 'P1', stage: 'Engaged', timing: 'On entry', recipient: 'Client', name: 'Interest Gauge', content: 'Hi {{name}}, thanks for your interest! I\'d love to learn more about what you\'re looking for. Do you have a few minutes to chat this week?', requiredVars: ['name'] },
  { id: 4, pipeline: 'P1', stage: 'Qualified', timing: '48h no activity', recipient: 'Client', name: 'Qualified Check-in', content: 'Hey {{name}}, just checking in! We\'re making great progress on finding the right coverage for you. Any questions I can answer?', requiredVars: ['name'] },
  { id: 5, pipeline: 'P1', stage: 'App Process', timing: '24h no activity', recipient: 'Client', name: 'App Process Check-in', content: 'Hi {{name}}, your application is in progress! Just need a couple more details to keep things moving. Can you give me a call when you have a moment?', requiredVars: ['name'] },
  { id: 6, pipeline: 'P1', stage: 'Closed Won', timing: 'On entry', recipient: 'Client', name: 'Submission Reminder', content: 'Hi {{name}}, great news — your application has been submitted to {{carrier}}! Your agent {{agent_name}} ({{agent_phone}}) will keep you updated.', requiredVars: ['name', 'carrier', 'agent_name'] },
  { id: 7, pipeline: 'P1', stage: 'Closed Won', timing: '+5 min', recipient: 'Client', name: 'Congratulations', content: 'Congratulations {{name}}! 🎉 Your {{face_amount}} policy with {{carrier}} is submitted. We\'ll let you know as soon as it\'s approved!', requiredVars: ['name', 'carrier'] },
  { id: 8, pipeline: 'P3', stage: 'Approved', timing: 'On entry', recipient: 'Client', name: 'Approval Congrats', content: 'Great news {{name}}! Your application with {{carrier}} has been APPROVED! 🎉 {{agent_name}} will reach out with next steps.', requiredVars: ['name', 'carrier', 'agent_name'] },
  { id: 9, pipeline: 'P3', stage: 'Draft Cleared', timing: 'On entry', recipient: 'Client', name: 'Payment Confirmed', content: 'Hi {{name}}, your first payment for your {{carrier}} policy has cleared successfully! Your coverage is now active. Welcome aboard! 🎉', requiredVars: ['name', 'carrier'] },
  { id: 10, pipeline: 'P4', stage: 'New Exception', timing: 'On entry', recipient: 'Agent', name: 'Exception Alert', content: '🚨 EXCEPTION ALERT: Policy {{policy_number}} for {{name}} has an issue. Check P4 immediately.', requiredVars: ['name', 'policy_number'] },
  { id: 11, pipeline: 'P4', stage: 'New Exception', timing: '+4h', recipient: 'Agent', name: 'Second Exception Alert', content: '⚠️ REMINDER: Exception for {{name}} ({{policy_number}}) still unresolved after 4 hours. Please take action.', requiredVars: ['name', 'policy_number'] },
  { id: 12, pipeline: 'P4', stage: 'Active Recovery', timing: 'On entry', recipient: 'Client', name: 'Issue Notification', content: 'Hi {{name}}, we noticed an issue with your {{carrier}} policy. Please contact {{agent_name}} at {{agent_phone}} to resolve this quickly.', requiredVars: ['name', 'carrier', 'agent_name'] },
  { id: 13, pipeline: 'P4', stage: 'Resolved', timing: 'On resolution', recipient: 'Client + Agent', name: 'Resolution Confirmation', content: 'Good news {{name}}! The issue with your {{carrier}} policy has been resolved. Your coverage is active and in good standing. ✅', requiredVars: ['name', 'carrier'] },
  { id: 14, pipeline: 'P4', stage: 'Daily', timing: '8AM', recipient: 'Agent', name: 'RE Pipeline Summary', content: 'Good morning! Your RE pipeline summary: {{summary}}. Check your dashboard for details.', requiredVars: [] },
  { id: 15, pipeline: 'P5', stage: 'Recycle', timing: 'Day 1', recipient: 'Agent', name: 'Recycle Day 1', content: '📋 Re-contact reminder: {{name}} entered Recycle. Consider reaching out to explore rewrite options.', requiredVars: ['name'] },
  { id: 16, pipeline: 'P5', stage: 'Recycle', timing: 'Day 15', recipient: 'Agent', name: 'Recycle Day 15', content: '📋 Mid-cycle reminder: {{name}} has been in Recycle for 15 days. Time for a follow-up attempt.', requiredVars: ['name'] },
  { id: 17, pipeline: 'P5', stage: 'Recycle', timing: 'Day 30', recipient: 'Agent', name: 'Recycle Day 30', content: '📋 Final attempt: {{name}} has been in Recycle for 30 days. Last chance before moving to Uninsurable.', requiredVars: ['name'] },
  { id: 18, pipeline: 'P6', stage: 'Month 1', timing: 'On entry', recipient: 'Client', name: 'Month 1 Gift', content: 'Hi {{name}}! It\'s been 1 month since your policy started. Thank you for trusting us with your coverage! 🎁', requiredVars: ['name'] },
  { id: 19, pipeline: 'P6', stage: 'Month 3', timing: 'On entry', recipient: 'Client', name: 'Month 3 Thank You', content: 'Hi {{name}}, 3 months in! Just wanted to say thank you for being a valued client. Everything going well with your {{carrier}} policy?', requiredVars: ['name', 'carrier'] },
  { id: 20, pipeline: 'P6', stage: 'Month 6', timing: 'On entry', recipient: 'Client', name: 'Month 6 Beneficiary Check', content: 'Hi {{name}}, it\'s been 6 months! Quick reminder — have there been any life changes that might affect your beneficiary designations?', requiredVars: ['name'] },
  { id: 21, pipeline: 'P6', stage: 'Month 12', timing: 'On entry', recipient: 'Client', name: 'Anniversary', content: 'Happy policy anniversary {{name}}! 🎉 It\'s been a full year. If you need any changes or have questions, {{agent_name}} is here for you.', requiredVars: ['name', 'agent_name'] },
  { id: 22, pipeline: 'P7', stage: 'Nurture', timing: 'Day 7', recipient: 'Client', name: 'Nurture Day 7', content: 'Hey {{name}}, life gets busy — totally understand! Just wanted you to know I\'m still here whenever you\'re ready to chat about coverage options. — {{agent_name}}', requiredVars: ['name', 'agent_name'] },
  { id: 23, pipeline: 'P7', stage: 'Nurture', timing: 'Day 45', recipient: 'Client', name: 'Nurture Day 45', content: 'Hi {{name}}, carriers have adjusted their rates recently. Might be worth taking another look! Let me know if you\'d like an updated quote. — {{agent_name}}', requiredVars: ['name', 'agent_name'] },
  { id: 24, pipeline: 'P7', stage: 'Nurture', timing: 'Day 60', recipient: 'Client', name: 'Nurture Day 60', content: 'Thinking of you {{name}}! Coverage is one of those things that\'s always better to have sooner rather than later. I\'m here when you\'re ready. — {{agent_name}}', requiredVars: ['name', 'agent_name'] },
  { id: 25, pipeline: 'P7', stage: 'Nurture', timing: 'Day 90', recipient: 'Client', name: 'Nurture Day 90', content: 'Hi {{name}}, still looking for the right life insurance? I have some new options that might be a great fit. Want to take a look? — {{agent_name}}', requiredVars: ['name', 'agent_name'] },
  { id: 26, pipeline: 'P7', stage: 'Nurture', timing: 'Day 135', recipient: 'Client', name: 'Nurture Day 135', content: 'Hey {{name}}, just a mid-cycle check-in. Things change — if your situation is different now, I\'d love to help find the right coverage. — {{agent_name}}', requiredVars: ['name', 'agent_name'] },
  { id: 27, pipeline: 'P7', stage: 'Nurture', timing: 'Day 180', recipient: 'Client', name: 'Nurture Day 180', content: 'Hi {{name}}, it\'s been a while! I\'m still here if you ever need help with life insurance. No pressure — just know the door is always open. — {{agent_name}}', requiredVars: ['name', 'agent_name'] },
]

export default function SMSTemplateEditor() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editContent, setEditContent] = useState('')
  const [showPreview, setShowPreview] = useState(null)
  const [filterPipeline, setFilterPipeline] = useState('all')
  const [saveStatus, setSaveStatus] = useState({})

  useEffect(() => {
    (async () => {
      try {
        const res = await crmClient.request('/sms-templates')
        const data = Array.isArray(res) ? res : res.templates || res.data || []
        setTemplates(data.length > 0 ? data : DEFAULT_TEMPLATES)
      } catch {
        setTemplates(DEFAULT_TEMPLATES)
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
    try {
      await crmClient.request(`/sms-templates/${t.id}`, {
        method: 'PUT',
        body: JSON.stringify({ content: editContent }),
      })
    } catch {}
    setTemplates(prev => prev.map(tp => tp.id === t.id ? { ...tp, content: editContent } : tp))
    setSaveStatus({ [t.id]: { type: 'success', msg: 'Saved!' } })
    setEditingId(null)
    setTimeout(() => setSaveStatus({}), 2000)
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

  const pipelines = ['all', ...new Set(templates.map(t => t.pipeline))]
  const filtered = filterPipeline === 'all' ? templates : templates.filter(t => t.pipeline === filterPipeline)

  if (loading) return <div style={{ padding: 24, color: '#94a3b8' }}>Loading templates...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'rgba(59,130,246,0.15)', color: '#3b82f6', fontWeight: 600 }}>{t.pipeline}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>{t.name}</span>
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
