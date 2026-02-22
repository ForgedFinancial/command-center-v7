const SECTIONS = ['spec', 'planning', 'build', 'validate', 'deploy', 'monitor', 'retrospective']

export default function ManifestTabs({
  activeSection,
  onSectionChange,
  sectionContent,
  onChange,
  onSave,
  loading,
}) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
        {SECTIONS.map(section => {
          const active = activeSection === section
          return (
            <button
              key={section}
              onClick={() => onSectionChange(section)}
              style={{
                padding: '6px 10px',
                borderRadius: '8px',
                border: active ? '1px solid var(--theme-accent)' : '1px solid var(--theme-border)',
                backgroundColor: active ? 'var(--theme-accent-muted)' : 'var(--theme-bg)',
                color: active ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                cursor: 'pointer',
              }}
            >
              {section}
            </button>
          )
        })}
      </div>

      <textarea
        value={sectionContent}
        onChange={event => onChange(event.target.value)}
        style={{
          width: '100%',
          minHeight: '180px',
          borderRadius: '8px',
          border: '1px solid var(--theme-border)',
          backgroundColor: 'rgba(255,255,255,0.02)',
          color: 'var(--theme-text-primary)',
          fontFamily: 'var(--font-mono, monospace)',
          fontSize: '12px',
          lineHeight: 1.5,
          padding: '10px',
          resize: 'vertical',
        }}
      />

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={onSave}
          disabled={loading}
          style={{
            height: '32px',
            padding: '0 14px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--theme-accent)',
            color: '#fff',
            fontSize: '12px',
            fontWeight: 600,
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? 'Saving...' : 'Save Section'}
        </button>
      </div>
    </section>
  )
}
