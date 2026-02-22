import { useState, useEffect } from 'react'
import crmClient from '../../../../api/crmClient'

export default function TransferModal({ lead, pipelines, currentPipelineId, onTransfer, onClose }) {
  const [targetPipelineId, setTargetPipelineId] = useState('')
  const [targetStageId, setTargetStageId] = useState('')
  const [targetStages, setTargetStages] = useState([])
  const [loadingStages, setLoadingStages] = useState(false)

  const otherPipelines = pipelines.filter(p => p.id !== currentPipelineId)

  useEffect(() => {
    if (!targetPipelineId) { setTargetStages([]); setTargetStageId(''); return }
    let cancelled = false
    setLoadingStages(true)
    crmClient.getStages(targetPipelineId).then(res => {
      if (cancelled) return
      const list = res.stages || res.data || []
      setTargetStages(list)
      if (list.length > 0) setTargetStageId(list[0].id)
      setLoadingStages(false)
    }).catch(() => { if (!cancelled) setLoadingStages(false) })
    return () => { cancelled = true }
  }, [targetPipelineId])

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)', display: 'flex',
      alignItems: 'center', justifyContent: 'center', zIndex: 1000,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '420px', background: 'var(--theme-surface)', borderRadius: '16px',
        border: '1px solid var(--theme-border)', padding: '24px',
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
          🔄 Transfer Lead
        </h3>
        <div style={{ fontSize: '13px', color: 'var(--theme-text-secondary)', marginBottom: '16px' }}>
          Move <strong style={{ color: 'var(--theme-text-primary)' }}>{lead.name}</strong> to another pipeline
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Target Pipeline</label>
          <select
            value={targetPipelineId}
            onChange={e => setTargetPipelineId(e.target.value)}
            style={{
              width: '100%', padding: '10px 14px', borderRadius: '8px',
              border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
              color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none',
            }}
          >
            <option value="">— Select Pipeline —</option>
            {otherPipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>

        {targetPipelineId && (
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>Target Stage</label>
            {loadingStages ? (
              <div style={{ fontSize: '12px', color: 'var(--theme-text-secondary)' }}>Loading stages...</div>
            ) : (
              <select
                value={targetStageId}
                onChange={e => setTargetStageId(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px', borderRadius: '8px',
                  border: '1px solid var(--theme-border)', background: 'var(--theme-bg)',
                  color: 'var(--theme-text-primary)', fontSize: '13px', outline: 'none',
                }}
              >
                {targetStages.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{
            padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-border)',
            background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer',
          }}>Cancel</button>
          <button
            onClick={() => onTransfer(lead, targetPipelineId, targetStageId)}
            disabled={!targetPipelineId || !targetStageId}
            style={{
              padding: '8px 16px', borderRadius: '8px',
              border: '1px solid var(--theme-accent)',
              background: targetPipelineId && targetStageId ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.04)',
              color: targetPipelineId && targetStageId ? 'var(--theme-accent)' : '#52525b',
              fontSize: '12px', fontWeight: 600, cursor: targetPipelineId && targetStageId ? 'pointer' : 'default',
            }}
          >Transfer</button>
        </div>
      </div>
    </div>
  )
}
