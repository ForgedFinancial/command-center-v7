import LeadCard from './LeadCard'

export default function StageColumn({ col, dragOverStage, onDragOver, onDragLeave, onDrop, cardFields, onDragStart, onLeadClick, onDeleteLead, onPhoneCall, onVideoCall, onMessage, onTransfer, seenLeads, onMarkSeen, selectedLeadIds, onToggleSelect, stages, currentPipelineId, actions, appActions }) {
  return (
    <div
      onDragOver={(e) => onDragOver(e, col.stage)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, col.stage)}
      style={{
        minWidth: '260px', maxWidth: '260px', flexShrink: 0,
        display: 'flex', flexDirection: 'column',
        transition: 'box-shadow 0.15s',
        boxShadow: dragOverStage === col.stage ? `inset 0 0 0 2px ${col.color}60` : 'none',
        borderRadius: '10px',
      }}
    >
      {/* Column header */}
      <div style={{
        padding: '12px 14px', borderRadius: '10px 10px 0 0',
        background: 'var(--theme-surface)',
        borderBottom: `2px solid ${col.color}30`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>{col.label}</span>
          {col.leads.length > 0 && (
            <span style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
              background: `${col.color}20`, color: col.color, fontWeight: 600,
            }}>{col.leads.length}</span>
          )}
        </div>
        {col.totalValue > 0 && (
          <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', marginTop: '4px' }}>
            ${col.totalValue.toLocaleString()}
          </div>
        )}
      </div>

      {/* Cards */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '8px',
        background: dragOverStage === col.stage ? `${col.color}08` : 'rgba(255,255,255,0.015)',
        borderRadius: '0 0 10px 10px', transition: 'background 0.15s',
      }}>
        {col.leads.length === 0 && (
          <div style={{ padding: '24px 12px', textAlign: 'center' }}>
            <div style={{ fontSize: '28px', marginBottom: '8px', opacity: 0.4 }}>📭</div>
            <div style={{ fontSize: '11px', color: 'var(--theme-text-secondary)', opacity: 0.6 }}>No leads in this stage yet</div>
          </div>
        )}
        {col.leads.map(lead => (
          <LeadCard
            key={lead.id}
            lead={lead}
            color={col.color}
            cardFields={cardFields}
            onDragStart={onDragStart}
            onClick={() => onLeadClick(lead)}
            onDelete={onDeleteLead}
            onPhoneCall={onPhoneCall}
            onVideoCall={onVideoCall}
            onMessage={onMessage}
            onTransfer={onTransfer}
            isNew={!seenLeads.has(lead.id)}
            onMarkSeen={onMarkSeen}
            isSelected={selectedLeadIds.has(lead.id)}
            onToggleSelect={onToggleSelect}
            stages={stages}
            currentPipelineId={currentPipelineId}
            actions={actions}
            appActions={appActions}
          />
        ))}
      </div>
    </div>
  )
}
