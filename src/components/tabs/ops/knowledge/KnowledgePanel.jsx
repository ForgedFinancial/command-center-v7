import { useState, useMemo } from 'react'
import { CATEGORIES, CATEGORY_CONFIG } from './knowledgeConstants'
import KnowledgeEntry from './KnowledgeEntry'
import KnowledgeDetail from './KnowledgeDetail'
import NewEntryForm from './NewEntryForm'
import CategoryFilter from './CategoryFilter'

export default function KnowledgePanel({ entries, loading, onCreateEntry, onUpdateEntry, onDeleteEntry }) {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)

  const filtered = useMemo(() => {
    let result = entries
    if (category) result = result.filter(e => e.category === category)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(e =>
        (e.title && e.title.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (Array.isArray(e.tags) && e.tags.some(t => t.toLowerCase().includes(q)))
      )
    }
    return result
  }, [entries, category, search])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--theme-text-secondary)', fontSize: '13px' }}>
        Loading knowledge base…
      </div>
    )
  }

  const isEmpty = entries.length === 0

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
          Knowledge Base
        </h2>
        <button
          onClick={() => setShowNewForm(true)}
          style={{
            padding: '6px 14px', fontSize: '12px', fontWeight: 600,
            backgroundColor: 'var(--theme-accent)', color: '#fff',
            border: 'none', borderRadius: '6px', cursor: 'pointer',
            transition: 'opacity 0.15s',
          }}
          onMouseOver={e => e.currentTarget.style.opacity = '0.85'}
          onMouseOut={e => e.currentTarget.style.opacity = '1'}
        >
          + New Entry
        </button>
      </div>

      {isEmpty ? (
        <div style={{
          flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--theme-text-secondary)', fontSize: '14px', fontStyle: 'italic',
        }}>
          No knowledge entries yet. Document your first build pattern or gotcha.
        </div>
      ) : (
        <>
          {/* Search + filter bar */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px', maxWidth: '320px' }}>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search entries…"
                style={{
                  width: '100%', fontSize: '13px', color: 'var(--theme-text-primary)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--theme-border, rgba(255,255,255,0.08))',
                  borderRadius: '8px', padding: '8px 12px', fontFamily: 'inherit',
                }}
              />
            </div>
            <CategoryFilter active={category} onChange={setCategory} />
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <div style={{
              flex: 1, display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center', gap: '8px',
              color: 'var(--theme-text-secondary)', fontSize: '13px',
            }}>
              <span>{search ? 'No entries match your search.' : 'No entries in this category.'}</span>
              {search && (
                <button
                  onClick={() => setSearch('')}
                  style={{
                    padding: '4px 12px', fontSize: '12px', color: 'var(--theme-accent)',
                    backgroundColor: 'transparent', border: '1px solid var(--theme-accent)',
                    borderRadius: '6px', cursor: 'pointer',
                  }}
                >
                  Clear search
                </button>
              )}
            </div>
          ) : (
            <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filtered.map(entry => (
                <KnowledgeEntry
                  key={entry.id}
                  entry={entry}
                  onClick={() => setSelectedEntry(entry)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {selectedEntry && (
        <KnowledgeDetail
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onUpdate={(id, patch) => { onUpdateEntry(id, patch); setSelectedEntry(prev => prev ? { ...prev, ...patch } : null) }}
          onDelete={(id) => { onDeleteEntry(id); setSelectedEntry(null) }}
        />
      )}

      {showNewForm && (
        <NewEntryForm
          onClose={() => setShowNewForm(false)}
          onCreate={async (data) => { await onCreateEntry(data); setShowNewForm(false) }}
        />
      )}
    </div>
  )
}
