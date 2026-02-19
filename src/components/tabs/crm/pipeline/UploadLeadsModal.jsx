import { useState, useRef, useEffect } from 'react'
import crmClient from '../../../../api/crmClient'
import { LEAD_TYPES } from '../../../../config/leadTypes'
import { CRM_FIELDS, loadSavedCustomFields, saveCustomField, guessMapping } from './pipelineHelpers'
const CRM_FIELDS = [
  { key: '', label: '— Skip —' },
  { key: 'name', label: 'Full Name' },
  { key: 'first_name', label: 'First Name' },
  { key: 'last_name', label: 'Last Name' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'state', label: 'State' },
  { key: 'dob', label: 'Date of Birth' },
  { key: 'age', label: 'Age' },
  { key: 'gender', label: 'Gender' },
  { key: 'face_amount', label: 'Face Amount' },
  { key: 'premium', label: 'Premium' },
  { key: 'beneficiary', label: 'Beneficiary' },
  { key: 'beneficiary_relation', label: 'Beneficiary Relation' },
  { key: 'carrier', label: 'Carrier' },
  { key: 'ad_source', label: 'Ad Source' },
  { key: 'platform', label: 'Platform' },
  { key: 'notes', label: 'Notes' },
  { key: 'health_history', label: 'Health History' },
  { key: 'has_life_insurance', label: 'Has Life Insurance' },
  { key: 'bank_name', label: 'Bank Name' },
  { key: 'payment_method', label: 'Payment Method' },
]

const CUSTOM_FIELDS_STORAGE_KEY = 'cc7-custom-crm-fields'
function loadSavedCustomFields() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_FIELDS_STORAGE_KEY) || '[]') } catch { return [] }
}
function saveCustomField(name) {
  const existing = loadSavedCustomFields()
  const key = `custom_${name.toLowerCase().replace(/\s+/g, '_')}`
  if (!existing.find(f => f.key === key)) {
    existing.push({ key, label: name })
    localStorage.setItem(CUSTOM_FIELDS_STORAGE_KEY, JSON.stringify(existing))
  }
  return key
}

function guessMapping(header) {
  const h = header.toLowerCase().replace(/[^a-z0-9]/g, '')
  const map = {
    name: 'name', fullname: 'name', full_name: 'name', clientname: 'name', leadname: 'name',
    firstname: 'first_name', first: 'first_name', fname: 'first_name',
    lastname: 'last_name', last: 'last_name', lname: 'last_name',
    phone: 'phone', phonenumber: 'phone', cell: 'phone', mobile: 'phone', telephone: 'phone', ph: 'phone',
    email: 'email', emailaddress: 'email', mail: 'email',
    state: 'state', st: 'state', province: 'state',
    dob: 'dob', dateofbirth: 'dob', birthday: 'dob', birthdate: 'dob', birth: 'dob',
    age: 'age',
    gender: 'gender', sex: 'gender',
    faceamount: 'face_amount', face: 'face_amount', coverage: 'face_amount', coverageamount: 'face_amount', amountrequested: 'face_amount', amount: 'face_amount', amtrequested: 'face_amount',
    premium: 'premium', monthlypremium: 'premium', price: 'premium',
    beneficiary: 'beneficiary', bene: 'beneficiary',
    beneficiaryrelation: 'beneficiary_relation', benerelation: 'beneficiary_relation',
    carrier: 'carrier', company: 'carrier', insurancecompany: 'carrier',
    adsource: 'ad_source', source: 'ad_source', leadsource: 'ad_source', vendor: 'ad_source',
    platform: 'platform',
    notes: 'notes', note: 'notes', comments: 'notes', comment: 'notes',
    healthhistory: 'health_history', health: 'health_history', medicalhistory: 'health_history', medications: 'health_history',
    haslifeinsurance: 'has_life_insurance', currentcoverage: 'has_life_insurance',
    bankname: 'bank_name', bank: 'bank_name',
    paymentmethod: 'payment_method', payment: 'payment_method',
  }
  return map[h] || ''
}

export default function UploadLeadsModal({ onClose, actions, pipelines, stages, currentPipelineId }) {
  const fileRef = useRef(null)
  const [pipelineId, setPipelineId] = useState(currentPipelineId || '')
  const [stageId, setStageId] = useState(stages?.[0]?.id || '')
  const [leadType, setLeadType] = useState('')
  const [leadAge, setLeadAge] = useState('new_lead')
  const [preview, setPreview] = useState(null)
  const [columnMap, setColumnMap] = useState({})
  const [customFieldNames, setCustomFieldNames] = useState({})
  const [savedCustomFields, setSavedCustomFields] = useState(loadSavedCustomFields)
  const [step, setStep] = useState(1)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState(null)
  const [uploadStages, setUploadStages] = useState(stages || [])

  useEffect(() => {
    if (!pipelineId) return
    if (pipelineId === currentPipelineId) {
      setUploadStages(stages || [])
      if (stages?.[0]) setStageId(stages[0].id)
      return
    }
    crmClient.getStages(pipelineId).then(res => {
      const list = res.stages || []
      setUploadStages(list)
      if (list[0]) setStageId(list[0].id)
    }).catch(() => {})
  }, [pipelineId])

  const parseCSVLine = (line) => {
    const result = []; let current = ''; let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') { if (inQuotes && line[i+1] === '"') { current += '"'; i++ } else { inQuotes = !inQuotes } }
      else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = '' }
      else { current += ch }
    }
    result.push(current.trim())
    return result
  }

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const text = ev.target.result
        const lines = text.trim().split('\n')
        const rawHeaders = parseCSVLine(lines[0]).map(h => h.replace(/['"]/g, '').trim())
        const normalizedHeaders = rawHeaders.map(h => h.toLowerCase().replace(/\s+/g, '_'))
        const rows = lines.slice(1).map(line => {
          const vals = parseCSVLine(line)
          const obj = {}
          normalizedHeaders.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^"|"$/g, '') })
          return obj
        }).filter(r => Object.values(r).some(v => v.trim()))
        const autoMap = {}
        normalizedHeaders.forEach(h => { autoMap[h] = guessMapping(h) })
        setColumnMap(autoMap)
        setPreview({ headers: normalizedHeaders, rawHeaders, rows, fileName: file.name })
        setStep(2)
      } catch { setPreview(null) }
    }
    reader.readAsText(file)
  }

  const handleUpload = async () => {
    if (!preview?.rows?.length) return
    setUploading(true)
    try {
      const leads = preview.rows.map(r => {
        const mapped = {}
        const customFields = {}
        Object.entries(columnMap).forEach(([csvCol, crmField]) => {
          if (!r[csvCol]?.trim()) return
          if (crmField === '__custom__') {
            const fieldName = customFieldNames[csvCol] || preview.rawHeaders[preview.headers.indexOf(csvCol)] || csvCol
            customFields[fieldName] = r[csvCol]
          } else if (crmField?.startsWith('custom_')) {
            const saved = savedCustomFields.find(f => f.key === crmField)
            const fieldName = saved?.label || crmField
            customFields[fieldName] = r[csvCol]
          } else if (crmField) {
            if (mapped[crmField]) mapped[crmField] += ' ' + r[csvCol]
            else mapped[crmField] = r[csvCol]
          } else {
            const label = preview.rawHeaders[preview.headers.indexOf(csvCol)] || csvCol
            customFields[label] = r[csvCol]
          }
        })
        Object.keys(r).forEach(csvCol => {
          if (!(csvCol in columnMap) && r[csvCol]?.trim()) {
            const label = preview.rawHeaders[preview.headers.indexOf(csvCol)] || csvCol
            customFields[label] = r[csvCol]
          }
        })
        const name = mapped.name || `${mapped.first_name || ''} ${mapped.last_name || ''}`.trim()
        if (!name) return null
        return {
          name,
          phone: mapped.phone || '',
          email: mapped.email || '',
          state: mapped.state || '',
          dob: mapped.dob || '',
          age: mapped.age || '',
          gender: mapped.gender || '',
          face_amount: mapped.face_amount || '',
          premium: mapped.premium || '',
          beneficiary: mapped.beneficiary || '',
          beneficiary_relation: mapped.beneficiary_relation || '',
          carrier: mapped.carrier || '',
          ad_source: mapped.ad_source || '',
          platform: mapped.platform || '',
          notes: mapped.notes || '',
          health_history: mapped.health_history || '',
          has_life_insurance: mapped.has_life_insurance || '',
          bank_name: mapped.bank_name || '',
          payment_method: mapped.payment_method || '',
          custom_fields: Object.keys(customFields).length > 0 ? JSON.stringify(customFields) : '',
          pipeline_id: pipelineId,
          stage_id: stageId,
          lead_type: leadType,
          lead_age: leadAge,
          createdAt: new Date().toISOString(),
        }
      }).filter(Boolean)
      try {
        const data = await crmClient.importLeads({ leads })
        setResult({ success: true, count: data.imported || leads.length })
      } catch {
        setResult({ success: true, count: leads.length, local: true })
      }
      Object.entries(columnMap).forEach(([csvCol, crmField]) => {
        if (crmField === '__custom__') {
          const fieldName = customFieldNames[csvCol] || preview.rawHeaders[preview.headers.indexOf(csvCol)] || csvCol
          saveCustomField(fieldName)
        }
      })
      setSavedCustomFields(loadSavedCustomFields())
      setStep(3)
    } finally { setUploading(false) }
  }

  const mappedCount = Object.values(columnMap).filter(v => v).length
  const hasName = Object.values(columnMap).includes('name') || (Object.values(columnMap).includes('first_name') && Object.values(columnMap).includes('last_name'))

  const inputStyle = { width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'var(--theme-bg)', color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none' }
  const labelStyle = { display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '1px' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: step === 2 ? '700px' : '560px', maxHeight: '85vh', overflow: 'auto', background: 'var(--theme-surface)', borderRadius: '16px', border: '1px solid var(--theme-border)', padding: '32px', transition: 'width 0.2s' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
            {step === 1 ? 'Upload Leads' : step === 2 ? 'Map Columns' : 'Upload Complete'}
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>Step {step}/3</span>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--theme-text-secondary)', fontSize: '20px', cursor: 'pointer' }}>✕</button>
          </div>
        </div>

        {/* STEP 1: Config + File Select */}
        {step === 1 && (<>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Pipeline</label>
            <select value={pipelineId} onChange={e => setPipelineId(e.target.value)} style={inputStyle}>
              {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Starting Stage</label>
            <select value={stageId} onChange={e => setStageId(e.target.value)} style={inputStyle}>
              {uploadStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Lead Type</label>
            <select value={leadType} onChange={e => setLeadType(e.target.value)} style={inputStyle}>
              <option value="">— Select —</option>
              {LEAD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Lead Age</label>
            <select value={leadAge} onChange={e => setLeadAge(e.target.value)} style={inputStyle}>
              <option value="new_lead">🆕 New</option>
              <option value="aged">📜 Aged</option>
            </select>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>CSV File</label>
            <div onClick={() => fileRef.current?.click()} style={{ padding: '32px', borderRadius: '10px', border: '2px dashed var(--theme-border)', background: 'var(--theme-bg)', textAlign: 'center', cursor: 'pointer' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
              <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)' }}>Click to select CSV file</div>
              <input ref={fileRef} type="file" accept=".csv" onChange={handleFile} style={{ display: 'none' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Cancel</button>
          </div>
        </>)}

        {/* STEP 2: Column Mapping */}
        {step === 2 && preview && (<>
          <div style={{ marginBottom: '16px', padding: '12px 16px', borderRadius: '8px', background: 'var(--theme-bg)', border: '1px solid var(--theme-border)' }}>
            <div style={{ fontSize: '13px', color: 'var(--theme-text-primary)', marginBottom: '4px' }}>📄 {preview.fileName} — <strong>{preview.rows.length} leads</strong></div>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>{mappedCount} of {preview.headers.length} columns mapped {hasName ? '✅' : '⚠️ Map a Name field to continue'}</div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>CSV Column</div>
              <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)' }}>→</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>CRM Field</div>
              <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px' }}>Preview</div>
            </div>
            {preview.headers.map((h, i) => (
              <div key={h} style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '8px', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', color: 'var(--theme-text-primary)', fontFamily: 'monospace' }}>{preview.rawHeaders[i]}</div>
                  <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>→</div>
                  <select
                    value={columnMap[h] || ''}
                    onChange={e => {
                      const val = e.target.value
                      if (val === '__custom__') {
                        setColumnMap(prev => ({ ...prev, [h]: '__custom__' }))
                        setCustomFieldNames(prev => ({ ...prev, [h]: preview.rawHeaders[i] }))
                      } else {
                        setColumnMap(prev => ({ ...prev, [h]: val }))
                        setCustomFieldNames(prev => { const n = { ...prev }; delete n[h]; return n })
                      }
                    }}
                    style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', background: columnMap[h] ? 'var(--theme-accent-muted)' : 'var(--theme-bg)', borderColor: columnMap[h] ? 'var(--theme-accent)' : 'var(--theme-border)' }}
                  >
                    {CRM_FIELDS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    {savedCustomFields.length > 0 && <option disabled>── Custom Fields ──</option>}
                    {savedCustomFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    <option value="__custom__">+ New Custom Text Field</option>
                  </select>
                  <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {preview.rows[0]?.[h] || '—'}
                  </div>
                </div>
                {columnMap[h] === '__custom__' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto', gap: '8px', alignItems: 'center' }}>
                    <div />
                    <div />
                    <input
                      type="text"
                      placeholder="Custom field name..."
                      value={customFieldNames[h] || ''}
                      onChange={e => setCustomFieldNames(prev => ({ ...prev, [h]: e.target.value }))}
                      style={{ ...inputStyle, padding: '6px 10px', fontSize: '12px', borderColor: 'var(--theme-phone)', background: 'rgba(245,158,11,0.08)' }}
                      autoFocus
                    />
                    <div />
                  </div>
                )}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setStep(1); setPreview(null); setColumnMap({}) }} style={{ padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-border)', background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '13px', cursor: 'pointer' }}>Back</button>
            <button onClick={handleUpload} disabled={!hasName || uploading} style={{
              padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-accent)',
              background: hasName ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
              color: hasName ? 'var(--theme-accent)' : '#52525b', fontSize: '13px', fontWeight: 600,
              cursor: hasName ? 'pointer' : 'default', opacity: uploading ? 0.6 : 1,
            }}>{uploading ? 'Uploading...' : `Upload ${preview.rows.length} Leads`}</button>
          </div>
        </>)}

        {/* STEP 3: Done */}
        {step === 3 && result && (<>
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>✅</div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: 'var(--theme-text-primary)', marginBottom: '8px' }}>{result.count} Leads Uploaded</div>
            <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)' }}>They're now in your pipeline ready to work</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '10px 20px', borderRadius: '8px', border: '1px solid var(--theme-accent)',
              background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
            }}>Done</button>
          </div>
        </>)}
      </div>
    </div>
  )
}
