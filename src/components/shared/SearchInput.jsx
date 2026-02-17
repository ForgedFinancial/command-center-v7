export default function SearchInput({ value, onChange, placeholder = 'Search...', width = '220px' }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width,
        padding: '6px 12px',
        fontSize: '13px',
        backgroundColor: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        color: '#e4e4e7',
        outline: 'none',
      }}
      onFocus={(e) => { e.target.style.borderColor = 'rgba(0,212,255,0.3)' }}
      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }}
    />
  )
}
