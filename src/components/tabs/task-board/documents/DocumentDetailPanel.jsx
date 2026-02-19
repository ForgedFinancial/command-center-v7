import { useMemo } from 'react'

/**
 * DocumentDetailPanel — split-pane detail view for documents.
 * Renders markdown content with pipeline badges for deliverable reports.
 */
export default function DocumentDetailPanel({ doc, onClose }) {
  const pm = doc.pipelineMetadata
  const renderedContent = useMemo(() => renderMd(doc.content || ''), [doc.content])

  return (
    <div style={{
      flex: '0 0 55%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--theme-surface)',
      borderRadius: '12px',
      border: '1px solid var(--theme-border-subtle)',
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 18px',
        borderBottom: '1px solid var(--theme-border-subtle)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--theme-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {doc.name}
          </div>
          {doc.createdAt && (
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginTop: '2px' }}>
              Created {new Date(doc.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </div>
          )}
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--theme-text-secondary)',
            fontSize: '18px',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            lineHeight: 1,
          }}
          onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          onMouseOut={e => e.currentTarget.style.background = 'none'}
        >
          ✕
        </button>
      </div>

      {/* Pipeline metadata badges */}
      {pm && (
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '10px 18px',
          borderBottom: '1px solid var(--theme-border-subtle)',
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <Badge
            color={pm.verdict === 'APPROVED' ? '#10b981' : '#ef4444'}
            bg={pm.verdict === 'APPROVED' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)'}
            label={`${pm.verdict === 'APPROVED' ? '✅' : '❌'} ${pm.verdict}`}
          />
          {pm.acResults && (
            <Badge
              color="#3b82f6"
              bg="rgba(59,130,246,0.12)"
              label={`${pm.acResults.passed}/${pm.acResults.total} AC passed`}
            />
          )}
          {pm.complexity && (
            <Badge
              color="#f59e0b"
              bg="rgba(245,158,11,0.12)"
              label={pm.complexity}
            />
          )}
          {pm.filesChanged != null && (
            <Badge
              color="#a855f7"
              bg="rgba(168,85,247,0.12)"
              label={`${pm.filesChanged} files`}
            />
          )}
          {pm.builder && (
            <Badge
              color="#9ca3af"
              bg="rgba(107,114,128,0.12)"
              label={`Builder: ${pm.builder}`}
            />
          )}
          {pm.inspector && (
            <Badge
              color="#9ca3af"
              bg="rgba(107,114,128,0.12)"
              label={`Inspector: ${pm.inspector}`}
            />
          )}
        </div>
      )}

      {/* Content area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '20px',
      }}>
        {doc.content ? (
          <div
            className="md-content"
            style={{
              fontSize: '13px',
              lineHeight: 1.7,
              color: 'var(--theme-text-primary)',
            }}
            dangerouslySetInnerHTML={{ __html: renderedContent }}
          />
        ) : (
          <div style={{ color: 'var(--theme-text-secondary)', fontSize: '13px', fontStyle: 'italic', textAlign: 'center', marginTop: '40px' }}>
            No content available for this document.
          </div>
        )}
      </div>

      {/* Inline styles for markdown rendering */}
      <style>{`
        .md-content h1 { font-size: 20px; font-weight: 700; margin: 20px 0 10px; border-bottom: 1px solid var(--theme-border-subtle); padding-bottom: 8px; }
        .md-content h2 { font-size: 16px; font-weight: 600; margin: 18px 0 8px; color: var(--theme-accent, #00d4ff); }
        .md-content h3 { font-size: 14px; font-weight: 600; margin: 14px 0 6px; }
        .md-content p { margin: 8px 0; }
        .md-content ul, .md-content ol { margin: 8px 0; padding-left: 20px; }
        .md-content li { margin: 4px 0; }
        .md-content code { background: rgba(255,255,255,0.06); padding: 2px 5px; border-radius: 3px; font-size: 12px; font-family: 'JetBrains Mono', monospace; }
        .md-content pre { background: rgba(0,0,0,0.3); padding: 12px; border-radius: 8px; overflow-x: auto; margin: 10px 0; }
        .md-content pre code { background: none; padding: 0; }
        .md-content table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
        .md-content th { text-align: left; padding: 8px 10px; border-bottom: 2px solid var(--theme-border); font-weight: 600; color: var(--theme-text-secondary); }
        .md-content td { padding: 6px 10px; border-bottom: 1px solid var(--theme-border-subtle); }
        .md-content tr:hover td { background: rgba(255,255,255,0.02); }
        .md-content blockquote { border-left: 3px solid var(--theme-accent); margin: 10px 0; padding: 4px 12px; color: var(--theme-text-secondary); }
        .md-content hr { border: none; border-top: 1px solid var(--theme-border-subtle); margin: 16px 0; }
        .md-content strong { color: var(--theme-text-primary); font-weight: 600; }
        .md-content a { color: var(--theme-accent); text-decoration: none; }
      `}</style>
    </div>
  )
}

function Badge({ color, bg, label }) {
  return (
    <span style={{
      fontSize: '10px',
      padding: '3px 10px',
      borderRadius: '4px',
      fontWeight: 600,
      color,
      background: bg,
      textTransform: 'capitalize',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}

/**
 * Lightweight markdown → HTML renderer.
 * Handles headers, bold, italic, code, tables, lists, blockquotes, links, hr.
 */
function renderMd(md) {
  if (!md) return ''
  let html = md
    // Escape HTML
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

  // Code blocks (``` ... ```)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
    `<pre><code>${code.trim()}</code></pre>`
  )

  // Tables
  html = html.replace(/((?:\|[^\n]+\|\n)+)/g, (block) => {
    const rows = block.trim().split('\n').filter(r => r.trim())
    if (rows.length < 2) return block
    // Check if row 2 is separator
    const isSep = /^\|[\s\-:|]+\|$/.test(rows[1].trim())
    if (!isSep) return block
    const headerCells = rows[0].split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('')
    const bodyRows = rows.slice(2).map(row => {
      const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('')
      return `<tr>${cells}</tr>`
    }).join('')
    return `<table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>`
  })

  // Process line by line for headers, lists, blockquotes, hr
  const lines = html.split('\n')
  const out = []
  let inList = false
  let listType = ''

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Skip if inside pre block
    if (line.includes('<pre>') || line.includes('</pre>') || line.includes('<table') || line.includes('</table>')) {
      out.push(line)
      continue
    }

    // HR
    if (/^---+$/.test(line.trim())) { out.push('<hr />'); continue }

    // Headers
    const hMatch = line.match(/^(#{1,6})\s+(.+)/)
    if (hMatch) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false }
      const level = hMatch[1].length
      out.push(`<h${level}>${hMatch[2]}</h${level}>`)
      continue
    }

    // Blockquote
    if (line.startsWith('&gt; ') || line.startsWith('&gt;')) {
      if (inList) { out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false }
      out.push(`<blockquote>${line.replace(/^&gt;\s?/, '')}</blockquote>`)
      continue
    }

    // Unordered list
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)/)
    if (ulMatch) {
      if (!inList || listType !== 'ul') {
        if (inList) out.push(listType === 'ul' ? '</ul>' : '</ol>')
        out.push('<ul>'); inList = true; listType = 'ul'
      }
      out.push(`<li>${ulMatch[2]}</li>`)
      continue
    }

    // Ordered list
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)/)
    if (olMatch) {
      if (!inList || listType !== 'ol') {
        if (inList) out.push(listType === 'ul' ? '</ul>' : '</ol>')
        out.push('<ol>'); inList = true; listType = 'ol'
      }
      out.push(`<li>${olMatch[2]}</li>`)
      continue
    }

    // Close list if we're in one and this isn't a list item
    if (inList && line.trim() === '') {
      out.push(listType === 'ul' ? '</ul>' : '</ol>'); inList = false
    }

    // Regular paragraph
    if (line.trim()) {
      out.push(`<p>${line}</p>`)
    }
  }
  if (inList) out.push(listType === 'ul' ? '</ul>' : '</ol>')

  html = out.join('\n')

  // Inline formatting
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
  // Checkbox
  html = html.replace(/\[ \]/g, '☐').replace(/\[x\]/g, '☑')

  return html
}
