// ========================================
// Pipeline Helpers — Shared utilities & constants
// ========================================

export const DEFAULT_CARD_FIELDS = ['leadType', 'dob', 'phone', 'faceAmount', 'beneficiary', 'createdAt']
export const MAX_CUSTOM_FIELDS = 10

export const ALL_CARD_FIELDS = [
  { key: 'leadType', label: 'Lead Type Badge', icon: '🏷️' },
  { key: 'dob', label: 'DOB + Age', icon: '🎂' },
  { key: 'phone', label: 'Phone Number', icon: '📞' },
  { key: 'email', label: 'Email', icon: '✉️' },
  { key: 'state', label: 'State', icon: '📍' },
  { key: 'faceAmount', label: 'Coverage/Amount', icon: '💰' },
  { key: 'beneficiary', label: 'Beneficiary Name', icon: '👤' },
  { key: 'beneficiaryRelation', label: 'Beneficiary Relationship', icon: '🤝' },
  { key: 'gender', label: 'Gender', icon: '⚧' },
  { key: 'healthHistory', label: 'Health History', icon: '🏥' },
  { key: 'hasLifeInsurance', label: 'Has Life Insurance', icon: '🛡️' },
  { key: 'favoriteHobby', label: 'Favorite Hobby', icon: '🎯' },
  { key: 'adSource', label: 'Ad Source', icon: '📢' },
  { key: 'platform', label: 'Platform', icon: '📱' },
  { key: 'age', label: 'Age (standalone)', icon: '🎂' },
  { key: 'premium', label: 'Premium', icon: '💵' },
  { key: 'carrier', label: 'Carrier', icon: '🏢' },
  { key: 'policyNumber', label: 'Policy Number', icon: '📋' },
  { key: 'notes', label: 'Notes', icon: '📝' },
  { key: 'createdAt', label: 'Date/Time Requested', icon: '🕐' },
]

export const STAGE_COLOR_PALETTE = [
  '#3b82f6', '#a855f7', '#00d4ff', '#f59e0b', '#f97316',
  '#4ade80', '#ec4899', '#06b6d4', '#8b5cf6', '#ef4444',
]

export const CRM_FIELDS = [
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

export const CUSTOM_FIELDS_STORAGE_KEY = 'cc7-custom-crm-fields'

export function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11) return `${digits[0]}-${digits.slice(1,4)}-${digits.slice(4,7)}-${digits.slice(7)}`
  if (digits.length === 10) return `1-${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`
  return phone
}

export function formatLeadDate(dateStr) {
  if (!dateStr) return ''
  if (dateStr.match(/^\d{2}\/\d{2}\/\d{2}\s/)) return dateStr
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' }) + ' ' +
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
  } catch { return dateStr }
}

export function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

export function discoverCustomCardFields(leads) {
  const keys = new Set()
  leads.forEach(l => {
    const cf = l.customFields || l.custom_fields
    if (!cf) return
    try {
      const parsed = typeof cf === 'string' ? JSON.parse(cf) : cf
      Object.keys(parsed).forEach(k => keys.add(k))
    } catch {}
  })
  return Array.from(keys).map(key => ({
    key: `cf_${key.replace(/\s+/g, '_').toLowerCase()}`,
    label: key,
    icon: '📋',
    isCustom: true,
    customKey: key,
  }))
}

export function loadCardFields(mode = 'all') {
  try {
    const key = mode === 'all' ? 'cc7-card-fields' : `cc7-card-fields-${mode}`
    const saved = JSON.parse(localStorage.getItem(key))
    if (Array.isArray(saved) && saved.length > 0) return saved
  } catch {}
  try {
    const shared = JSON.parse(localStorage.getItem('cc7-card-fields'))
    if (Array.isArray(shared) && shared.length > 0) return shared
  } catch {}
  return DEFAULT_CARD_FIELDS
}

export function saveCardFields(fields, mode = 'all') {
  const key = mode === 'all' ? 'cc7-card-fields' : `cc7-card-fields-${mode}`
  localStorage.setItem(key, JSON.stringify(fields))
}

export function loadSavedCustomFields() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_FIELDS_STORAGE_KEY) || '[]') } catch { return [] }
}

export function saveCustomField(name) {
  const existing = loadSavedCustomFields()
  const key = `custom_${name.toLowerCase().replace(/\s+/g, '_')}`
  if (!existing.find(f => f.key === key)) {
    existing.push({ key, label: name })
    localStorage.setItem(CUSTOM_FIELDS_STORAGE_KEY, JSON.stringify(existing))
  }
  return key
}

export function guessMapping(header) {
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

export function renderCardField(key, lead) {
  const age = lead.dob ? Math.floor((Date.now() - new Date(lead.dob).getTime()) / 31557600000) : null
  const fieldStyle = { fontSize: '11px', color: 'var(--theme-text-secondary)', marginBottom: '2px' }

  switch (key) {
    case 'leadType':
      if (!lead.leadType && !lead.lead_type) return null
      return (
        <div key={key} style={fieldStyle}>
          <span style={{
            padding: '1px 5px', borderRadius: '4px', background: 'rgba(168,85,247,0.15)',
            color: '#a855f7', fontSize: '10px', fontWeight: 600,
          }}>{lead.leadType || lead.lead_type}</span>
        </div>
      )
    case 'dob':
      if (!lead.dob) return null
      return <div key={key} style={fieldStyle}>🎂 {lead.dob}{age != null ? ` (${age})` : ''}</div>
    case 'phone':
      if (!lead.phone) return null
      return <div key={key} style={{ fontSize: '12px', color: 'var(--theme-phone)', fontWeight: 700, marginBottom: '2px' }}>📞 {formatPhone(lead.phone)}</div>
    case 'email':
      if (!lead.email) return null
      return <div key={key} style={fieldStyle}>✉️ {lead.email}</div>
    case 'state':
      if (!lead.state) return null
      return <div key={key} style={fieldStyle}>📍 {lead.state}</div>
    case 'faceAmount':
      if (!lead.faceAmount && !lead.face_amount) return null
      return <div key={key} style={fieldStyle}>💰 {lead.faceAmount || lead.face_amount} coverage</div>
    case 'beneficiary':
      if (!lead.beneficiary) return null
      return <div key={key} style={fieldStyle}>👤 {lead.beneficiary}</div>
    case 'beneficiaryRelation':
      if (!lead.beneficiaryRelation && !lead.beneficiary_relation) return null
      return <div key={key} style={fieldStyle}>🤝 {lead.beneficiaryRelation || lead.beneficiary_relation}</div>
    case 'gender':
      if (!lead.gender) return null
      return <div key={key} style={fieldStyle}>⚧ {lead.gender}</div>
    case 'healthHistory':
      if (!lead.healthHistory && !lead.health_history) return null
      return <div key={key} style={fieldStyle}>🏥 {lead.healthHistory || lead.health_history}</div>
    case 'hasLifeInsurance':
      if (lead.hasLifeInsurance == null && lead.has_life_insurance == null) return null
      return <div key={key} style={fieldStyle}>🛡️ {(lead.hasLifeInsurance || lead.has_life_insurance) ? 'Yes' : 'No'}</div>
    case 'favoriteHobby':
      if (!lead.favoriteHobby && !lead.favorite_hobby) return null
      return <div key={key} style={fieldStyle}>🎯 {lead.favoriteHobby || lead.favorite_hobby}</div>
    case 'adSource':
      if (!lead.adSource && !lead.ad_source) return null
      return <div key={key} style={fieldStyle}>📢 {lead.adSource || lead.ad_source}</div>
    case 'platform':
      if (!lead.platform) return null
      return <div key={key} style={fieldStyle}>📱 {lead.platform}</div>
    case 'age':
      if (!lead.age && age == null) return null
      return <div key={key} style={fieldStyle}>🎂 {lead.age || age}</div>
    case 'premium':
      if (!lead.premium) return null
      return <div key={key} style={fieldStyle}>💵 ${Number(lead.premium).toLocaleString()}</div>
    case 'carrier':
      if (!lead.carrier) return null
      return <div key={key} style={fieldStyle}>🏢 {lead.carrier}</div>
    case 'policyNumber':
      if (!lead.policyNumber && !lead.policy_number) return null
      return <div key={key} style={fieldStyle}>📋 {lead.policyNumber || lead.policy_number}</div>
    case 'notes':
      if (!lead.notes) return null
      return <div key={key} style={fieldStyle}>📝 {lead.notes.length > 50 ? lead.notes.slice(0, 50) + '…' : lead.notes}</div>
    case 'createdAt':
      if (!lead.createdAt && !lead.created_at) return null
      return <div key={key} style={{ fontSize: '10px', color: 'var(--theme-phone)', marginBottom: '2px', fontWeight: 500 }}>🕐 {formatLeadDate(lead.createdAt || lead.created_at)}</div>
    default:
      if (key.startsWith('cf_')) {
        const cf = lead.customFields || lead.custom_fields
        if (!cf) return null
        try {
          const parsed = typeof cf === 'string' ? JSON.parse(cf) : cf
          const customKey = Object.keys(parsed).find(k => `cf_${k.replace(/\s+/g, '_').toLowerCase()}` === key)
          if (!customKey || !parsed[customKey]) return null
          return <div key={key} style={fieldStyle}>📋 <span style={{ color: 'var(--theme-phone)', fontWeight: 500 }}>{customKey}:</span> {parsed[customKey]}</div>
        } catch { return null }
      }
      return null
  }
}

// Skeleton components for loading state
export function SkeletonCard() {
  return (
    <div style={{
      padding: '12px', borderRadius: '8px', background: 'var(--theme-surface)',
      border: '1px solid var(--theme-border-subtle)', marginBottom: '8px',
      animation: 'cc7-shimmer 1.5s ease-in-out infinite',
    }}>
      <div style={{ height: '14px', width: '70%', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', marginBottom: '8px' }} />
      <div style={{ height: '10px', width: '50%', borderRadius: '4px', background: 'rgba(255,255,255,0.04)', marginBottom: '6px' }} />
      <div style={{ height: '10px', width: '60%', borderRadius: '4px', background: 'rgba(255,255,255,0.04)' }} />
    </div>
  )
}

export function SkeletonColumn() {
  return (
    <div style={{ minWidth: '260px', maxWidth: '260px', flexShrink: 0 }}>
      <div style={{ padding: '12px 14px', borderRadius: '10px 10px 0 0', background: 'var(--theme-surface)' }}>
        <div style={{ height: '12px', width: '60%', borderRadius: '4px', background: 'rgba(255,255,255,0.06)' }} />
      </div>
      <div style={{ padding: '8px', background: 'rgba(255,255,255,0.015)', borderRadius: '0 0 10px 10px' }}>
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <style>{`@keyframes cc7-shimmer { 0%,100% { opacity: 1 } 50% { opacity: 0.5 } }`}</style>
    </div>
  )
}
