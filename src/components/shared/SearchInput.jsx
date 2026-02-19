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
        border: '1px solid var(--theme-border)',
        borderRadius: '8px',
        color: 'var(--theme-text-primary)',
        outline: 'none',
      }}
      onFocus={(e) => { e.target.style.borderColor = 'var(--theme-accent)' }}
      onBlur={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.08)' }}
    />
  )
}
