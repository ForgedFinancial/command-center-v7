import { useState, useEffect, useCallback, useRef } from 'react'
import { getUIScale, setUIScale } from '../../../../App'
import { WORKER_PROXY_URL, ENDPOINTS } from '../../../../config/api'
import { useThemeContext } from '../../../../context/ThemeContext'
import { THEME_DEFINITIONS, THEME_ORDER } from '../../../../hooks/useTheme'
import PhoneLinesSection from './PhoneLinesSection'
import PipelineManager from './PipelineManager'
import StageManager from './StageManager'
import { LEAD_TYPES } from '../../../../config/leadTypes'
import crmClient from '../../../../api/crmClient'
import SMSTemplateEditor from '../automation/SMSTemplateEditor'
import TimerConfig from '../automation/TimerConfig'
import NotificationPrefs from '../automation/NotificationPrefs'

function InlineUIScale() {
  const [scale, setScaleVal] = useState(() => {
    const s = parseInt(localStorage.getItem('cc7-ui-scale'), 10)
    return isNaN(s) ? 100 : Math.max(75, Math.min(150, s))
  })
  const apply = (v) => {
    const c = Math.max(75, Math.min(150, v))
    setScaleVal(c)
    localStorage.setItem('cc7-ui-scale', String(c))
    document.documentElement.style.setProperty('--ui-scale', c / 100)
    try { setUIScale(c) } catch {}
  }
  const presets = [75, 90, 100, 110, 125, 150]
  return (
    <div style={{ background: 'var(--theme-surface)', borderRadius: '12px', border: '1px solid var(--theme-border)', padding: '24px', marginBottom: '24px' }}>
      <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '16px' }}>🔍 Display Scale</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--theme-accent)', minWidth: '64px' }}>{scale}%</span>
        <input type="range" min={75} max={150} step={1} value={scale} onChange={e => apply(parseInt(e.target.value, 10))}
          style={{ minWidth: '300px', flex: 1, accentColor: 'var(--theme-accent)', cursor: 'pointer', height: '6px' }} />
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button key={p} onClick={() => apply(p)} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
            background: scale === p ? 'var(--theme-accent)' : 'var(--theme-bg)', color: scale === p ? '#fff' : 'var(--theme-text-secondary)',
            border: `1px solid ${scale === p ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
          }}>{p}%</button>
        ))}
      </div>
    </div>
  )
}

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

const SETTINGS_SECTIONS = [
  { id: 'appearance', label: '🎨 Appearance', icon: '🎨' },
  { id: 'pipelines', label: '🔧 Pipelines', icon: '🔧' },
  { id: 'stages', label: '📊 Stages', icon: '📊' },
  { id: 'sms', label: '💬 SMS Templates', icon: '💬' },
  { id: 'timers', label: '⏱ Timers', icon: '⏱' },
  { id: 'notifications', label: '🔔 Notifications', icon: '🔔' },
  { id: 'metrics', label: '📈 Metrics', icon: '📈' },
  { id: 'sources', label: '📊 Lead Sources', icon: '📊' },
  { id: 'phone', label: '📞 Phone Lines', icon: '📞' },
]

export default function CRMSettings() {
  const [section, setSection] = useState('appearance')
  const [pipelines, setPipelines] = useState([])

  const fetchPipelines = useCallback(async () => {
    try {
      const res = await crmClient.getPipelines()
      setPipelines(res.pipelines || res.data || res || [])
    } catch {}
  }, [])

  useEffect(() => { fetchPipelines() }, [fetchPipelines])

  return (
    <div>
      <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>CRM Settings</h2>
      <p style={{ margin: '0 0 20px', fontSize: '13px', color: 'var(--theme-text-secondary)' }}>Configure your CRM preferences</p>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: '4px', overflowX: 'auto', marginBottom: '24px', paddingBottom: '4px', scrollbarWidth: 'thin' }}>
        {SETTINGS_SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            style={{
              padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: section === s.id ? 600 : 400,
              border: `1px solid ${section === s.id ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
              background: section === s.id ? 'var(--theme-accent-muted)' : 'transparent',
              color: section === s.id ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
            }}
          >{s.label}</button>
        ))}
      </div>

      {/* Content */}
      {section === 'appearance' && <>
        <InlineUIScale />
        <ThemePicker />
      </>}
      {section === 'pipelines' && <PipelineManager onPipelinesChanged={fetchPipelines} />}
      {section === 'stages' && <StageManager pipelines={pipelines} />}
      {section === 'sms' && <SMSTemplateEditor />}
      {section === 'timers' && <TimerConfig />}
      {section === 'notifications' && (
        <>
          <NotificationPrefs />
          <div style={cardStyle}>
            <h3 style={sectionTitle}>Quick Toggles</h3>
            <NotificationToggle label="New lead alerts" defaultOn />
            <NotificationToggle label="Deal stage changes" defaultOn />
            <NotificationToggle label="Stale deal warnings" defaultOn />
            <NotificationToggle label="Weekly pipeline digest" defaultOn={false} />
            <NotificationToggle label="Send task updates to Telegram" defaultOn storageKey="telegramNotifications" />
          </div>
        </>
      )}
      {section === 'metrics' && (
        <div style={cardStyle}>
          <h3 style={sectionTitle}>📊 Dashboard Metrics</h3>
          <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
            Toggle which metrics appear on your dashboard.
          </p>
          <NotificationToggle label="Show AP (Annual Premium)" defaultOn storageKey="metric_ap" />
          <NotificationToggle label="Show Policy Count" defaultOn storageKey="metric_policies" />
          <NotificationToggle label="Show Contact Rate" defaultOn storageKey="metric_contactRate" />
          <NotificationToggle label="Show Pipeline Value" defaultOn storageKey="metric_pipelineValue" />
          <NotificationToggle label="Show Conversion Rate" defaultOn storageKey="metric_conversionRate" />
          <NotificationToggle label="Show Revenue Forecast" defaultOn storageKey="metric_forecast" />
        </div>
      )}
      {section === 'sources' && <LeadSourcesSection />}
      {section === 'phone' && <PhoneLinesSection />}
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
    { key: 'luxury', label: 'LUXURY', ids: THEME_ORDER.luxury },
    { key: 'unique', label: 'UNIQUE', ids: THEME_ORDER.unique },
    { key: 'dano', label: 'DANO COLLECTION', ids: THEME_ORDER.dano },
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
            <span style={{ fontSize: '10px', color: (def.category === 'light' || def.isLightTheme) ? '#fff' : c.bg, lineHeight: 1 }}>✓</span>
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

function SafeUIScale() {
  try {
    return <UIScaleControl />
  } catch (e) {
    return <div style={{ ...cardStyle, padding: '16px', color: 'var(--theme-error)' }}>Display Scale failed to load: {e.message}</div>
  }
}

function UIScaleControl() {
  const [scale, setScale] = useState(getUIScale)

  useEffect(() => {
    const handler = (e) => setScale(e.detail)
    window.addEventListener('cc7-ui-scale-change', handler)
    return () => window.removeEventListener('cc7-ui-scale-change', handler)
  }, [])

  const handleChange = (e) => {
    const v = parseInt(e.target.value, 10)
    setScale(v)
    setUIScale(v)
  }

  const applyPreset = (v) => { setScale(v); setUIScale(v) }

  const presets = [75, 90, 100, 110, 125, 150]

  return (
    <div style={{ ...cardStyle, padding: '24px' }}>
      <h3 style={sectionTitle}>🔍 Display Scale</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '16px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: 'var(--theme-accent)', minWidth: '64px' }}>
          {scale}%
        </span>
        <input
          type="range"
          min={75}
          max={150}
          step={1}
          value={scale}
          onChange={handleChange}
          style={{
            minWidth: '300px', flex: 1, accentColor: 'var(--theme-accent)', cursor: 'pointer', height: '6px',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {presets.map(p => (
          <button
            key={p}
            onClick={() => applyPreset(p)}
            style={{
              padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${scale === p ? 'var(--theme-accent)' : 'var(--theme-border)'}`,
              background: scale === p ? 'var(--theme-accent)' : 'transparent',
              color: scale === p ? '#fff' : 'var(--theme-text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            {p}%
          </button>
        ))}
      </div>
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
