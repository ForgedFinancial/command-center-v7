import { useState } from 'react'

const inputStyle = {
  width: '100%', padding: '8px 12px', borderRadius: '8px',
  border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
  color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)',
  marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px',
}

/**
 * Shows which fields are needed for a stage transition
 * and provides inline editing for missing fields
 */
export default function RequiredFieldsGate({ missingFields, lead, onFieldsComplete, compact = false }) {
  const [values, setValues] = useState(() => {
    const init = {}
    missingFields.forEach(f => { init[f.key] = lead?.[f.key] || '' })
    return init
  })

  const allFilled = missingFields.every(f => {
    const val = values[f.key]
    return val !== undefined && val !== null && val !== ''
  })

  const handleChange = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }))
  }

  const handleSubmit = () => {
    if (allFilled) onFieldsComplete(values)
  }

  if (compact) {
    return (
      <div style={{ fontSize: '11px', color: '#f59e0b' }}>
        ⚠️ Missing: {missingFields.map(f => f.label || f.key).join(', ')}
      </div>
    )
  }

  return (
    <div style={{
      padding: '16px', borderRadius: '10px',
      background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)',
    }}>
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b', marginBottom: '12px' }}>
        ⚠️ Required fields must be filled before moving to this stage
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: missingFields.length > 2 ? '1fr 1fr' : '1fr', gap: '12px' }}>
        {missingFields.map(field => (
          <div key={field.key}>
            <label style={labelStyle}>{field.label || field.key} *</label>
            {field.type === 'select' && field.options ? (
              <select
                style={inputStyle}
                value={values[field.key] || ''}
                onChange={e => handleChange(field.key, e.target.value)}
              >
                <option value="">— Select —</option>
                {field.options.map(o => <option key={o} value={o}>{o}</option>)}
              </select>
            ) : (
              <input
                style={{
                  ...inputStyle,
                  borderColor: values[field.key] ? 'var(--theme-success)' : 'rgba(245,158,11,0.4)',
                }}
                type={field.type === 'number' || field.type === 'currency' ? 'number' : 'text'}
                placeholder={field.placeholder || `Enter ${field.label || field.key}`}
                value={values[field.key] || ''}
                onChange={e => handleChange(field.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        disabled={!allFilled}
        style={{
          marginTop: '12px', padding: '8px 20px', borderRadius: '8px',
          border: 'none', fontSize: '12px', fontWeight: 600, cursor: allFilled ? 'pointer' : 'default',
          background: allFilled ? 'var(--theme-accent)' : 'rgba(255,255,255,0.06)',
          color: allFilled ? 'var(--theme-accent-text)' : '#52525b',
        }}
      >
        ✓ Fields Complete — Continue
      </button>
    </div>
  )
}
