import { useMemo, useState } from 'react'
import { useCRM } from '../../../../context/CRMContext'
import EmptyState from '../../../shared/EmptyState'

const TAG_COLORS = {
  'VIP Client': { color: '#4ade80', bg: 'rgba(74,222,128,0.15)' },
  'Lead': { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' },
  'Client': { color: '#00d4ff', bg: 'rgba(0,212,255,0.15)' },
  'Prospect': { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
}

const AVATAR_COLORS = ['#3b82f6', '#ef4444', '#4ade80', '#f59e0b', '#a855f7', '#ec4899', '#f97316', '#00d4ff']

function getAvatarColor(name) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length]
}

function getInitials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export default function ContactsView() {
  const { state, actions } = useCRM()
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const filteredLeads = useMemo(() => {
    let leads = [...state.leads]
    if (search) {
      const q = search.toLowerCase()
      leads = leads.filter(l =>
        l.name?.toLowerCase().includes(q) ||
        l.email?.toLowerCase().includes(q) ||
        l.phone?.includes(q)
      )
    }
    if (tagFilter) {
      leads = leads.filter(l => l.tags?.includes(tagFilter))
    }
    return leads.sort((a, b) => new Date(b.lastContact || b.createdAt) - new Date(a.lastContact || a.createdAt))
  }, [state.leads, search, tagFilter])

  const allTags = useMemo(() => {
    const tags = new Set()
    state.leads.forEach(l => l.tags?.forEach(t => tags.add(t)))
    return Array.from(tags)
  }, [state.leads])

  const page = state.currentPage
  const pageSize = state.pageSize
  const totalPages = Math.max(1, Math.ceil(filteredLeads.length / pageSize))
  const paginatedLeads = filteredLeads.slice((page - 1) * pageSize, page * pageSize)

  const selectStyle = {
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)',
    background: 'rgba(255,255,255,0.04)',
    color: '#a1a1aa',
    fontSize: '12px',
    outline: 'none',
    cursor: 'pointer',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#e4e4e7' }}>Contacts</h2>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search contacts..."
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e4e4e7',
              fontSize: '12px',
              outline: 'none',
              width: '180px',
            }}
          />
          <select value={tagFilter} onChange={(e) => setTagFilter(e.target.value)} style={selectStyle}>
            <option value="">All Tags</option>
            {allTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          <button
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              border: '1px solid rgba(0,212,255,0.3)',
              background: 'rgba(0,212,255,0.1)',
              color: '#00d4ff',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Add Contact
          </button>
        </div>
      </div>

      {/* Table */}
      {state.leads.length === 0 ? (
        <EmptyState icon="👥" title="No Contacts Yet" message="Add contacts to manage your relationships." />
      ) : filteredLeads.length === 0 ? (
        <EmptyState icon="🔍" title="No Results" message="No contacts match your search." />
      ) : (
        <>
          <div style={{
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
            overflow: 'hidden',
            flex: 1,
          }}>
            {/* Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 80px',
              padding: '10px 16px',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: '#52525b',
              fontWeight: 600,
            }}>
              <span>Name</span>
              <span>Company</span>
              <span>Email</span>
              <span>Phone</span>
              <span>Tags</span>
              <span>Last Contact</span>
            </div>

            {/* Rows */}
            {paginatedLeads.map(lead => {
              const tagStyle = lead.tags?.[0] ? TAG_COLORS[lead.tags[0]] || { color: '#71717a', bg: 'rgba(113,113,122,0.15)' } : null
              return (
                <div
                  key={lead.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '2fr 1.5fr 1.5fr 1fr 1fr 80px',
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.03)',
                    cursor: 'pointer',
                    transition: 'background 0.15s',
                    alignItems: 'center',
                  }}
                  onMouseOver={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseOut={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  {/* Name + Avatar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: getAvatarColor(lead.name || ''),
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '10px',
                      fontWeight: 700,
                      color: '#fff',
                      flexShrink: 0,
                    }}>
                      {getInitials(lead.name || '?')}
                    </div>
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#e4e4e7' }}>
                      {lead.name}
                    </span>
                  </div>
                  <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{lead.carrier || '—'}</span>
                  <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{lead.email || '—'}</span>
                  <span style={{ fontSize: '12px', color: '#a1a1aa' }}>{lead.phone || '—'}</span>
                  <span>
                    {lead.tags?.[0] && tagStyle ? (
                      <span style={{
                        fontSize: '10px',
                        padding: '3px 10px',
                        borderRadius: '4px',
                        fontWeight: 600,
                        color: tagStyle.color,
                        background: tagStyle.bg,
                      }}>
                        {lead.tags[0]}
                      </span>
                    ) : '—'}
                  </span>
                  <span style={{ fontSize: '11px', color: '#52525b' }}>
                    {lead.lastContact
                      ? formatDate(lead.lastContact)
                      : lead.createdAt ? formatDate(lead.createdAt) : '—'}
                  </span>
                </div>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '8px',
              padding: '16px 0',
            }}>
              <button
                onClick={() => actions.setPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: page <= 1 ? '#52525b' : '#a1a1aa',
                  fontSize: '11px',
                  cursor: page <= 1 ? 'default' : 'pointer',
                }}
              >
                ← Prev
              </button>
              <span style={{ fontSize: '11px', color: '#71717a' }}>
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => actions.setPage(Math.min(totalPages, page + 1))}
                disabled={page >= totalPages}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.1)',
                  background: 'transparent',
                  color: page >= totalPages ? '#52525b' : '#a1a1aa',
                  fontSize: '11px',
                  cursor: page >= totalPages ? 'default' : 'pointer',
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const now = new Date()
  const diff = now - d
  if (diff < 86400000) return 'Today'
  if (diff < 172800000) return 'Yesterday'
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
