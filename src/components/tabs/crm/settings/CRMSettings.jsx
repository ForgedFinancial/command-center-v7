import { useState, useEffect, useCallback } from 'react'
import { WORKER_PROXY_URL, ENDPOINTS } from '../../../../config/api'

const LEAD_TYPES = ['FEX', 'VETERANS', 'MORTGAGE PROTECTION', 'TRUCKERS', 'IUL']

const STAGE_CONFIG = [
  { stage: 'new_lead', label: 'New Leads', color: '#3b82f6', note: 'Auto-assign enabled' },
  { stage: 'contact', label: 'Contacted', color: '#a855f7', note: '3-day follow-up' },
  { stage: 'engaged', label: 'Qualified', color: '#00d4ff', note: 'Manual review' },
  { stage: 'qualified', label: 'Proposal Sent', color: '#f59e0b', note: '7-day expiry' },
  { stage: 'application', label: 'Negotiation', color: '#f97316', note: 'Alert on stale' },
  { stage: 'sold', label: 'Won', color: '#4ade80', note: 'Triggers onboarding' },
]

const cardStyle = {
  padding: '24px',
  borderRadius: '12px',
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.06)',
  marginBottom: '16px',
}

const sectionTitle = {
  margin: '0 0 16px',
  fontSize: '15px',
  fontWeight: 600,
  color: '#e4e4e7',
}

const inputStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#e4e4e7',
  fontSize: '12px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer',
}

const btnPrimary = {
  padding: '8px 16px',
  borderRadius: '8px',
  border: '1px solid rgba(0,212,255,0.3)',
  background: 'rgba(0,212,255,0.1)',
  color: '#00d4ff',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
}

const btnDanger = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid rgba(239,68,68,0.3)',
  background: 'rgba(239,68,68,0.1)',
  color: '#ef4444',
  fontSize: '11px',
  cursor: 'pointer',
}

function getAuthHeaders() {
  const token = localStorage.getItem('forgedos_crm_token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export default function CRMSettings() {
  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>CRM Settings</h2>
      <p style={{ margin: '0 0 24px', fontSize: '13px', color: '#71717a' }}>Configure your CRM preferences</p>

      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ flex: 1 }}>
          {/* Pipeline Stages */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Pipeline Stages</h3>
            {STAGE_CONFIG.map(s => (
              <div key={s.stage} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'rgba(255,255,255,0.02)',
                marginBottom: '6px',
              }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: s.color, marginRight: '12px', flexShrink: 0,
                }} />
                <span style={{ flex: 1, fontSize: '13px', color: '#e4e4e7' }}>{s.label}</span>
                <span style={{ fontSize: '11px', color: '#71717a', marginRight: '12px' }}>{s.note}</span>
                <span style={{ fontSize: '14px', color: '#52525b', cursor: 'pointer' }}>⚙️</span>
              </div>
            ))}
          </div>

          {/* Lead Sources — Google Sheets Integration */}
          <LeadSourcesSection />

          {/* Notifications */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Notifications</h3>
            <NotificationToggle label="New lead alerts" defaultOn />
            <NotificationToggle label="Deal stage changes" defaultOn />
            <NotificationToggle label="Stale deal warnings" defaultOn />
            <NotificationToggle label="Weekly pipeline digest" defaultOn={false} />
            <NotificationToggle label="Send task updates to Telegram" defaultOn storageKey="telegramNotifications" />
          </div>
        </div>
      </div>
    </div>
  )
}

function LeadSourcesSection() {
  const [sources, setSources] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)

  const fetchSources = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${WORKER_PROXY_URL}${ENDPOINTS.leadSources}`, {
        headers: getAuthHeaders(),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.ok) setSources(data.data || [])
      }
    } catch {
      setError('Failed to load lead sources')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSources() }, [fetchSources])

  const saveSources = async (updated) => {
    setSaving(true)
    setError(null)
    setSuccess(null)
    try {
      const res = await fetch(`${WORKER_PROXY_URL}${ENDPOINTS.leadSources}`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ sources: updated }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data.ok) {
          setSources(data.data)
          setSuccess('Lead sources saved')
          setTimeout(() => setSuccess(null), 3000)
        }
      } else {
        setError('Failed to save')
      }
    } catch {
      setError('Failed to save lead sources')
    } finally {
      setSaving(false)
    }
  }

  const addSource = () => {
    const updated = [...sources, {
      id: `ls_${Date.now().toString(36)}`,
      name: '',
      sheetUrl: '',
      leadType: '',
      active: true,
      createdAt: new Date().toISOString(),
    }]
    setSources(updated)
  }

  const updateSource = (index, field, value) => {
    const updated = sources.map((s, i) => i === index ? { ...s, [field]: value } : s)
    setSources(updated)
  }

  const deleteSource = (index) => {
    const updated = sources.filter((_, i) => i !== index)
    setSources(updated)
    saveSources(updated)
  }

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ ...sectionTitle, margin: 0 }}>📊 Lead Sources</h3>
        <button onClick={addSource} style={btnPrimary}>+ Add Lead Source</button>
      </div>
      <p style={{ margin: '0 0 16px', fontSize: '12px', color: '#71717a' }}>
        Connect Google Sheets to automatically import leads from vendors. Set each sheet to &quot;Anyone with the link&quot; (Viewer access).
      </p>

      {loading && <div style={{ fontSize: '12px', color: '#71717a', padding: '12px 0' }}>Loading...</div>}

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
          background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
          color: '#ef4444', fontSize: '12px',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
          background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.2)',
          color: '#4ade80', fontSize: '12px',
        }}>
          ✅ {success}
        </div>
      )}

      {sources.length === 0 && !loading && (
        <div style={{
          padding: '24px', textAlign: 'center', borderRadius: '8px',
          border: '1px dashed rgba(255,255,255,0.08)', color: '#52525b', fontSize: '12px',
        }}>
          No lead sources configured. Click &quot;Add Lead Source&quot; to connect a Google Sheet.
        </div>
      )}

      {sources.map((source, index) => (
        <div key={source.id} style={{
          padding: '16px',
          borderRadius: '10px',
          background: 'rgba(255,255,255,0.02)',
          border: `1px solid ${source.active ? 'rgba(0,212,255,0.15)' : 'rgba(255,255,255,0.06)'}`,
          marginBottom: '10px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: '#71717a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Vendor Name
              </label>
              <input
                type="text"
                value={source.name}
                onChange={(e) => updateSource(index, 'name', e.target.value)}
                placeholder="e.g. LeadStar, QuoteWizard"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: '#71717a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
                Lead Type
              </label>
              <select
                value={source.leadType}
                onChange={(e) => updateSource(index, 'leadType', e.target.value)}
                style={selectStyle}
              >
                <option value="">— Select Type —</option>
                {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div style={{ marginBottom: '10px' }}>
            <label style={{ display: 'block', fontSize: '10px', color: '#71717a', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              Google Sheet URL
            </label>
            <input
              type="url"
              value={source.sheetUrl}
              onChange={(e) => updateSource(index, 'sheetUrl', e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              style={inputStyle}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <StatusToggle
                active={source.active}
                onChange={(val) => updateSource(index, 'active', val)}
              />
              <span style={{ fontSize: '11px', color: source.active ? '#4ade80' : '#71717a' }}>
                {source.active ? 'Active' : 'Inactive'}
              </span>
            </div>
            <button onClick={() => deleteSource(index)} style={btnDanger}>🗑️ Remove</button>
          </div>
        </div>
      ))}

      {sources.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '12px' }}>
          <button
            onClick={() => saveSources(sources)}
            disabled={saving}
            style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}
          >
            {saving ? 'Saving...' : '💾 Save Lead Sources'}
          </button>
        </div>
      )}
    </div>
  )
}

function StatusToggle({ active, onChange }) {
  return (
    <div
      onClick={() => onChange(!active)}
      style={{
        width: '36px', height: '20px', borderRadius: '10px',
        background: active ? '#4ade80' : 'rgba(255,255,255,0.1)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%',
        background: active ? '#fff' : '#71717a',
        position: 'absolute', top: '2px',
        left: active ? '18px' : '2px',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

function NotificationToggle({ label, defaultOn = true, storageKey = null }) {
  const [on, setOn] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey)
      if (stored !== null) return stored !== 'false'
    }
    return defaultOn
  })
  const toggle = () => {
    const next = !on
    setOn(next)
    if (storageKey) localStorage.setItem(storageKey, String(next))
  }
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      marginBottom: '12px',
    }}>
      <span style={{ fontSize: '13px', color: '#e4e4e7' }}>{label}</span>
      <div
        onClick={toggle}
        style={{
          width: '36px', height: '20px', borderRadius: '10px',
          background: on ? '#00d4ff' : 'rgba(255,255,255,0.1)',
          cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: on ? '#fff' : '#71717a',
          position: 'absolute', top: '2px',
          left: on ? '18px' : '2px',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  )
}
