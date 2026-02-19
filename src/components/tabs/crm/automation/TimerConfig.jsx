import { useState, useEffect } from 'react'
import crmClient from '../../../../api/crmClient'

const DEFAULT_TIMERS = [
  { id: 'p1-new-lead', pipeline: 'P1 - Sales', stage: 'New Lead', duration: 3, unit: 'days', min: 1, max: 7, enabled: true, destination: 'Contact' },
  { id: 'p1-contact', pipeline: 'P1 - Sales', stage: 'Contact', duration: 4, unit: 'days', min: 1, max: 10, enabled: true, destination: 'Nurture (P7)' },
  { id: 'p1-engaged', pipeline: 'P1 - Sales', stage: 'Engaged Interest', duration: 14, unit: 'days', min: 3, max: 30, enabled: true, destination: 'Nurture (P7)' },
  { id: 'p1-qualified', pipeline: 'P1 - Sales', stage: 'Qualified Interest', duration: 7, unit: 'days', min: 2, max: 14, enabled: true, destination: 'Nurture (P7)' },
  { id: 'p1-app', pipeline: 'P1 - Sales', stage: 'Application Process', duration: 11, unit: 'days', min: 3, max: 21, enabled: true, destination: 'Nurture (P7)' },
  { id: 'p4-recovery', pipeline: 'P4 - Retention', stage: 'Active Recovery', duration: 30, unit: 'days', min: 7, max: 60, enabled: true, destination: 'Terminated' },
  { id: 'p7-nurture', pipeline: 'P7 - Nurture', stage: 'Nurture', duration: 180, unit: 'days', min: 30, max: 365, enabled: true, destination: 'Recycle (P5)' },
  { id: 'p5-recycle', pipeline: 'P5 - Recycle', stage: 'Recycle', duration: 45, unit: 'days', min: 14, max: 90, enabled: true, destination: 'Uninsurable' },
  { id: 'p5-rewrite', pipeline: 'P5 - Recycle', stage: 'Rewrite', duration: 7, unit: 'days', min: 3, max: 14, enabled: true, destination: 'Recycle' },
]

export default function TimerConfig() {
  const [timers, setTimers] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [saveMsg, setSaveMsg] = useState({})

  useEffect(() => {
    (async () => {
      try {
        const res = await crmClient.request('/timer-configs')
        const data = Array.isArray(res) ? res : res.timers || res.data || []
        setTimers(data.length > 0 ? data : DEFAULT_TIMERS)
      } catch {
        setTimers(DEFAULT_TIMERS)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const startEdit = (t) => { setEditingId(t.id); setEditValue(String(t.duration)) }

  const saveEdit = async (t) => {
    const val = parseInt(editValue, 10)
    if (isNaN(val) || val < t.min || val > t.max) {
      setSaveMsg({ [t.id]: `Must be between ${t.min} and ${t.max}` })
      setTimeout(() => setSaveMsg({}), 3000)
      return
    }
    try {
      await crmClient.request('/timer-configs', {
        method: 'PATCH',
        body: JSON.stringify({ id: t.id, duration: val }),
      })
    } catch {}
    setTimers(prev => prev.map(tp => tp.id === t.id ? { ...tp, duration: val } : tp))
    setEditingId(null)
    setSaveMsg({ [t.id]: 'Saved!' })
    setTimeout(() => setSaveMsg({}), 2000)
  }

  const toggleEnabled = async (t) => {
    const newVal = !t.enabled
    try {
      await crmClient.request('/timer-configs', {
        method: 'PATCH',
        body: JSON.stringify({ id: t.id, enabled: newVal }),
      })
    } catch {}
    setTimers(prev => prev.map(tp => tp.id === t.id ? { ...tp, enabled: newVal } : tp))
  }

  // Group by pipeline
  const grouped = timers.reduce((acc, t) => {
    if (!acc[t.pipeline]) acc[t.pipeline] = []
    acc[t.pipeline].push(t)
    return acc
  }, {})

  if (loading) return <div style={{ padding: 24, color: '#94a3b8' }}>Loading timer configs...</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ fontSize: 12, color: '#64748b', padding: '0 4px' }}>
        ⏱ Timer durations control auto-move deadlines. Leads exceeding the timer are flagged as overdue.
        <br />⚠️ Timer changes require manager role.
      </div>

      {Object.entries(grouped).map(([pipeline, pTimers]) => (
        <div key={pipeline}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#3b82f6', marginBottom: 8, padding: '0 4px' }}>{pipeline}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {pTimers.map(t => (
              <div key={t.id} style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                background: 'rgba(255,255,255,0.03)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.06)',
                opacity: t.enabled ? 1 : 0.5,
              }}>
                {/* Toggle */}
                <button onClick={() => toggleEnabled(t)} style={{
                  width: 36, height: 20, borderRadius: 10, border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0,
                  background: t.enabled ? '#4ade80' : 'rgba(255,255,255,0.15)', transition: 'background 0.2s',
                }}>
                  <div style={{
                    width: 14, height: 14, borderRadius: '50%', background: '#fff', position: 'absolute', top: 3,
                    left: t.enabled ? 19 : 3, transition: 'left 0.2s',
                  }} />
                </button>

                {/* Stage info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e8f0' }}>{t.stage}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>→ {t.destination}</div>
                </div>

                {/* Duration */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  {editingId === t.id ? (
                    <>
                      <input type="number" value={editValue} onChange={e => setEditValue(e.target.value)}
                        min={t.min} max={t.max}
                        onKeyDown={e => e.key === 'Enter' && saveEdit(t)}
                        style={{
                          width: 60, padding: '4px 8px', borderRadius: 4, border: '1px solid rgba(59,130,246,0.5)',
                          background: 'rgba(0,0,0,0.3)', color: '#e2e8f0', fontSize: 13, textAlign: 'center',
                        }} />
                      <span style={{ fontSize: 11, color: '#64748b' }}>{t.unit} ({t.min}-{t.max})</span>
                      <button onClick={() => saveEdit(t)} style={{ padding: '3px 10px', borderRadius: 4, border: 'none', background: '#4ade80', color: '#000', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Save</button>
                      <button onClick={() => setEditingId(null)} style={{ padding: '3px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.2)', background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer' }}>✕</button>
                    </>
                  ) : (
                    <>
                      <span style={{ fontSize: 15, fontWeight: 600, color: '#e2e8f0', fontVariantNumeric: 'tabular-nums' }}>{t.duration}</span>
                      <span style={{ fontSize: 11, color: '#64748b' }}>{t.unit}</span>
                      <button onClick={() => startEdit(t)} style={{
                        padding: '3px 10px', borderRadius: 4, border: '1px solid rgba(255,255,255,0.1)',
                        background: 'transparent', color: '#94a3b8', fontSize: 11, cursor: 'pointer', marginLeft: 4,
                      }}>Edit</button>
                    </>
                  )}
                  {saveMsg[t.id] && <span style={{ fontSize: 11, color: saveMsg[t.id] === 'Saved!' ? '#4ade80' : '#f59e0b' }}>{saveMsg[t.id]}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
