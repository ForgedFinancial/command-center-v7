import { useState, useEffect, useCallback } from 'react'
import { WORKER_PROXY_URL, ENDPOINTS } from '../../../../config/api'
import { useThemeContext } from '../../../../context/ThemeContext'
import { THEME_DEFINITIONS, THEME_ORDER } from '../../../../hooks/useTheme'
import PhoneLinesSection from './PhoneLinesSection'
import { LEAD_TYPES } from '../../../../config/leadTypes'

const STAGE_CONFIG = [
  { stage: 'new_lead', label: 'New Leads', color: 'var(--theme-accent)', note: 'Auto-assign enabled' },
  { stage: 'contact', label: 'Contacted', color: '#a855f7', note: '3-day follow-up' },
  { stage: 'engaged', label: 'Qualified', color: 'var(--theme-accent)', note: 'Manual review' },
  { stage: 'qualified', label: 'Proposal Sent', color: 'var(--theme-phone)', note: '7-day expiry' },
  { stage: 'proposal', label: 'Proposal', color: '#f97316', note: 'Alert on stale' },
  { stage: 'sold', label: 'Won', color: 'var(--theme-success)', note: 'Triggers onboarding' },
]

const cardStyle = {
  padding: '24px',
  borderRadius: '12px',
  background: 'var(--theme-surface)',
  border: '1px solid var(--theme-border)',
  marginBottom: '16px',
}

const sectionTitle = {
  margin: '0 0 16px',
  fontSize: '15px',
  fontWeight: 600,
  color: 'var(--theme-text-primary)',
}

const inputStyle = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid var(--theme-border)',
  background: 'var(--theme-bg)',
  color: 'var(--theme-text-primary)',
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
  border: '1px solid var(--theme-accent)',
  background: 'var(--theme-accent-muted)',
  color: 'var(--theme-accent)',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer',
}

const btnDanger = {
  padding: '6px 10px',
  borderRadius: '6px',
  border: '1px solid var(--theme-error)',
  background: 'transparent',
  color: 'var(--theme-error)',
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
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>CRM Settings</h2>
      <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--theme-text-secondary)' }}>Configure your CRM preferences</p>

      <div style={{ display: 'flex', gap: '24px' }}>
        <div style={{ flex: 1 }}>
          {/* Phone Lines */}
          <PhoneLinesSection />

          {/* Appearance / Theme */}
          <ThemePicker />

          {/* Pipeline Stages */}
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Pipeline Stages</h3>
            {STAGE_CONFIG.map(s => (
              <div key={s.stage} style={{
                display: 'flex',
                alignItems: 'center',
                padding: '10px 16px',
                borderRadius: '8px',
                background: 'var(--theme-bg)',
                marginBottom: '6px',
              }}>
                <span style={{
                  width: '8px', height: '8px', borderRadius: '50%',
                  background: s.color, marginRight: '12px', flexShrink: 0,
                }} />
                <span style={{ flex: 1, fontSize: '13px', color: 'var(--theme-text-primary)' }}>{s.label}</span>
                <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginRight: '12px' }}>{s.note}</span>
                <span style={{ fontSize: '14px', color: 'var(--theme-text-secondary)', cursor: 'pointer' }}>⚙️</span>
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
      <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
        Connect Google Sheets to automatically import leads from vendors. Set each sheet to &quot;Anyone with the link&quot; (Viewer access).
      </p>

      {loading && <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', padding: '12px 0' }}>Loading...</div>}

      {error && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
          background: 'var(--theme-bg)', border: '1px solid var(--theme-error)',
          color: 'var(--theme-error)', fontSize: '12px',
        }}>
          {error}
        </div>
      )}

      {success && (
        <div style={{
          padding: '10px 14px', borderRadius: '8px', marginBottom: '12px',
          background: 'var(--theme-bg)', border: '1px solid var(--theme-success)',
          color: 'var(--theme-success)', fontSize: '12px',
        }}>
          ✅ {success}
        </div>
      )}

      {sources.length === 0 && !loading && (
        <div style={{
          padding: '24px', textAlign: 'center', borderRadius: '8px',
          border: '1px dashed var(--theme-border)', color: 'var(--theme-text-secondary)', fontSize: '12px',
        }}>
          No lead sources configured. Click &quot;Add Lead Source&quot; to connect a Google Sheet.
        </div>
      )}

      {sources.map((source, index) => (
        <div key={source.id} style={{
          padding: '16px',
          borderRadius: '10px',
          background: 'var(--theme-bg)',
          border: `1px solid ${source.active ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
          marginBottom: '10px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--theme-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
              <label style={{ display: 'block', fontSize: '10px', color: 'var(--theme-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
            <label style={{ display: 'block', fontSize: '10px', color: 'var(--theme-text-secondary)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>
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
              <span style={{ fontSize: '11px', color: source.active ? 'var(--theme-success)' : 'var(--theme-text-secondary)' }}>
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
        background: active ? 'var(--theme-success)' : 'var(--theme-border)',
        cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
      }}
    >
      <div style={{
        width: '16px', height: '16px', borderRadius: '50%',
        background: active ? '#fff' : 'var(--theme-text-secondary)',
        position: 'absolute', top: '2px',
        left: active ? '18px' : '2px',
        transition: 'left 0.2s',
      }} />
    </div>
  )
}

/* ============================================
   THEME PICKER — Mini-Dashboard Previews
   ============================================ */
function ThemePicker() {
  const { themeId, selectTheme } = useThemeContext()

  const categories = [
    { key: 'dark', label: 'DARK', ids: THEME_ORDER.dark },
    { key: 'rich', label: 'RICH', ids: THEME_ORDER.rich },
    { key: 'light', label: 'LIGHT', ids: THEME_ORDER.light },
  ]

  return (
    <div style={cardStyle}>
      <h3 style={sectionTitle}>🎨 Theme</h3>
      <p style={{ margin: '0 0 20px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
        Choose a theme for Command Center. Click to apply instantly.
      </p>

      {categories.map(cat => (
        <div key={cat.key} style={{ marginBottom: '20px' }}>
          <div style={{
            fontSize: '10px', fontWeight: 700, color: 'var(--theme-text-secondary)',
            textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px',
          }}>
            {cat.label}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {cat.ids.map(id => (
              <ThemeSwatch
                key={id}
                id={id}
                def={THEME_DEFINITIONS[id]}
                isActive={themeId === id}
                onSelect={() => selectTheme(id)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ThemeSwatch({ id, def, isActive, onSelect }) {
  const [hovered, setHovered] = useState(false)
  const c = def.colors

  return (
    <button
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      aria-label={`${def.name} theme: ${def.vibe} (${def.category})`}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
        transform: hovered ? 'scale(1.05)' : 'scale(1)',
        transition: 'transform 0.15s ease',
      }}
    >
      {/* Mini-dashboard preview */}
      <div style={{
        width: '120px', height: '80px', borderRadius: '8px', overflow: 'hidden',
        border: isActive
          ? `2px solid ${c.accent}`
          : '2px solid var(--theme-border)',
        boxShadow: isActive
          ? `0 0 12px ${c.accent}40`
          : hovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
        position: 'relative',
        display: 'flex',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        {/* Sidebar band */}
        <div style={{
          width: '18px', flexShrink: 0,
          background: c.sidebar,
          display: 'flex', flexDirection: 'column',
          padding: '6px 3px', gap: '3px',
        }}>
          {/* Nav dots */}
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: c.accent, margin: '0 auto' }} />
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: c.textSecondary, margin: '0 auto', opacity: 0.5 }} />
          <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: c.textSecondary, margin: '0 auto', opacity: 0.5 }} />
        </div>
        {/* Content area */}
        <div style={{
          flex: 1, background: c.bg, padding: '6px',
          display: 'flex', flexDirection: 'column', gap: '4px',
        }}>
          {/* Top bar simulation */}
          <div style={{ height: '3px', width: '60%', background: c.textSecondary, borderRadius: '2px', opacity: 0.3 }} />
          {/* Cards */}
          <div style={{ display: 'flex', gap: '4px', flex: 1 }}>
            <div style={{
              flex: 1, background: c.surface, borderRadius: '3px',
              borderLeft: `2px solid ${c.accent}`,
              padding: '3px',
              display: 'flex', flexDirection: 'column', gap: '2px',
            }}>
              <div style={{ height: '2px', width: '70%', background: c.textPrimary, borderRadius: '1px', opacity: 0.6 }} />
              <div style={{ height: '2px', width: '50%', background: c.textSecondary, borderRadius: '1px', opacity: 0.4 }} />
            </div>
            <div style={{
              flex: 1, background: c.surface, borderRadius: '3px',
              borderLeft: `2px solid ${c.accent}`,
              padding: '3px',
              display: 'flex', flexDirection: 'column', gap: '2px',
            }}>
              <div style={{ height: '2px', width: '60%', background: c.textPrimary, borderRadius: '1px', opacity: 0.6 }} />
              <div style={{ height: '2px', width: '40%', background: c.textSecondary, borderRadius: '1px', opacity: 0.4 }} />
            </div>
          </div>
          {/* Accent dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: c.accent }} />
            <div style={{ height: '2px', width: '20px', background: c.textSecondary, borderRadius: '1px', opacity: 0.3 }} />
          </div>
        </div>

        {/* Selected checkmark overlay */}
        {isActive && (
          <div style={{
            position: 'absolute', top: '4px', right: '4px',
            width: '16px', height: '16px', borderRadius: '50%',
            background: c.accent, display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '10px', color: def.category === 'light' ? '#fff' : c.bg, lineHeight: 1 }}>✓</span>
          </div>
        )}
      </div>

      {/* Theme name + vibe */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: '11px', fontWeight: isActive ? 600 : 500,
          color: isActive ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
        }}>
          {def.emoji} {def.name}
        </div>
        <div style={{ fontSize: '9px', color: 'var(--theme-text-secondary)', marginTop: '1px' }}>
          {def.vibe}
        </div>
      </div>
    </button>
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
      <span style={{ fontSize: '13px', color: 'var(--theme-text-primary)' }}>{label}</span>
      <div
        onClick={toggle}
        style={{
          width: '36px', height: '20px', borderRadius: '10px',
          background: on ? 'var(--theme-accent)' : 'var(--theme-border)',
          cursor: 'pointer', position: 'relative', transition: 'background 0.2s',
        }}
      >
        <div style={{
          width: '16px', height: '16px', borderRadius: '50%',
          background: on ? '#fff' : 'var(--theme-text-secondary)',
          position: 'absolute', top: '2px',
          left: on ? '18px' : '2px',
          transition: 'left 0.2s',
        }} />
      </div>
    </div>
  )
}
