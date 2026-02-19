import { useState } from 'react'

const sections = [
  {
    title: '🚀 Getting Started',
    content: `Welcome to the CRM! This system manages your insurance leads through 7 pipelines, each representing a stage in the sales lifecycle.

• **Pipeline view** is your default "selling mode" — focused on leads and actions
• **Dashboard, Intelligence, and Manager** views are "review mode" for metrics and analytics
• Use the sidebar to navigate between views
• Each lead card shows key info at a glance with one-click actions`
  },
  {
    title: '🔀 Pipeline Guide',
    content: `**1. Lead Management** — New leads land here. Work them through contact → engaged → qualified → proposal → sold.

**2. Approval Process** — Leads with submitted applications waiting for carrier approval.

**3. Policy Lifecycle** — Approved policies being tracked through issue → delivery → active.

**4. Retention Exceptions** — Policies flagged for retention issues (lapses, cancellations, NSF).

**5. Rewrite | Rejected** — Declined or rejected applications that need to be rewritten with a different carrier.

**6. Active | Inforce** — Policies that are active and in-force. Monitor for retention.

**7. Nurture | Long Term** — Leads not ready to buy now. Long-term follow-up and drip campaigns.`
  },
  {
    title: '📋 Common Tasks',
    content: `**Move a lead to a new stage:** Drag the lead card to the target stage column, or use the Quick Disposition dropdown on the card.

**Make a call:** Click the 📞 button on any lead card. Calls route through your configured phone system.

**Schedule a follow-up:** Open a lead → click 📅 Schedule Call → pick date/time → confirm.

**Add a quick note:** Click the ✏️ button on any lead card to add a note without opening the full modal.

**Transfer to another pipeline:** Click the 🔄 button on a lead card, or use the transfer icon in the card actions.

**Batch operations:** Use checkboxes on lead cards to select multiple leads, then use the batch action bar for bulk moves, transfers, or exports.`
  },
  {
    title: '⌨️ Keyboard Shortcuts',
    content: `**1–7** — Switch between pipelines (when not typing in an input)
**N** — Create a new lead
**Esc** — Close any open modal
**/** — Focus the search bar
**?** — Show this keyboard shortcuts reference

These shortcuts are disabled when you're typing in any input field, textarea, or select.`
  },
  {
    title: '⚙️ Customization Guide',
    content: `**Pipelines & Stages:** Go to Settings → Pipeline Manager to add, rename, reorder, or delete pipelines and their stages.

**Stage Colors:** Each stage can have a custom color. Set it in the Stage Manager.

**Card Fields:** Click the ⚙️ gear icon in the Pipeline view header to choose which fields appear on lead cards and their order.

**Lead Types:** Configured in Settings. These categorize your leads (FEX, MP, etc.).

**Templates:** SMS templates for quick messaging are managed in Settings → Automations.

**Theme:** The app respects the system theme. Custom themes can be set in the Theme settings.`
  },
]

function AccordionItem({ title, content, isOpen, onToggle }) {
  return (
    <div style={{
      borderRadius: '10px',
      border: '1px solid var(--theme-border)',
      background: isOpen ? 'var(--theme-surface)' : 'var(--theme-bg)',
      marginBottom: '8px',
      transition: 'all 0.2s',
    }}>
      <button
        onClick={onToggle}
        style={{
          width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', background: 'none', border: 'none',
          color: isOpen ? 'var(--theme-accent)' : 'var(--theme-text-primary)',
          fontSize: '14px', fontWeight: 600, cursor: 'pointer', textAlign: 'left',
        }}
      >
        <span>{title}</span>
        <span style={{ fontSize: '12px', transition: 'transform 0.2s', transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
      </button>
      {isOpen && (
        <div style={{
          padding: '0 18px 16px', fontSize: '13px', lineHeight: 1.7,
          color: 'var(--theme-text-secondary)', whiteSpace: 'pre-line',
        }}>
          {content.split('**').map((part, i) =>
            i % 2 === 1
              ? <strong key={i} style={{ color: 'var(--theme-text-primary)' }}>{part}</strong>
              : <span key={i}>{part}</span>
          )}
        </div>
      )}
    </div>
  )
}

export default function HelpView() {
  const [openIdx, setOpenIdx] = useState(0)

  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
          ❓ Help & User Guide
        </h2>
        <p style={{ margin: 0, fontSize: '13px', color: 'var(--theme-text-secondary)' }}>
          Everything you need to know about using the CRM.
        </p>
      </div>
      {sections.map((s, i) => (
        <AccordionItem
          key={i}
          title={s.title}
          content={s.content}
          isOpen={openIdx === i}
          onToggle={() => setOpenIdx(openIdx === i ? -1 : i)}
        />
      ))}
    </div>
  )
}
