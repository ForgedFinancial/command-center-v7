import { useState, useEffect } from 'react'
import { validateTransition, getStageEntryTags, applyStageEntryTags, parseTags, getCrossPipelineTransitions, buildTransitionPayload, checkOverdue, formatTimeRemaining, getUrgencyColor } from '../../../../services/pipelineLogic'
import RequiredFieldsGate from './RequiredFieldsGate'

/**
 * Modal shown when moving a lead to a new stage
 * - Checks required fields
 * - Shows missing fields form if any
 * - Confirms transition
 * - Applies tags
 */
export default function StageTransitionModal({
  lead,
  fromStage,
  toStage,
  pipeline,
  onConfirm,
  onCancel,
}) {
  const [step, setStep] = useState('validate') // validate | fill | confirm
  const [fieldValues, setFieldValues] = useState({})
  const [validation, setValidation] = useState(null)

  useEffect(() => {
    if (!lead || !toStage) return
    const result = validateTransition(lead, toStage)
    setValidation(result)
    if (result.valid) {
      setStep('confirm')
    } else {
      setStep('fill')
    }
  }, [lead, toStage])

  if (!lead || !toStage) return null

  const newTags = getStageEntryTags(toStage)
  const currentTags = parseTags(lead.tags)
  const resultingTags = applyStageEntryTags(currentTags, newTags)
  const overdueInfo = checkOverdue(lead, fromStage)

  const handleFieldsComplete = (values) => {
    setFieldValues(values)
    setStep('confirm')
  }

  const handleConfirm = () => {
    const payload = buildTransitionPayload(lead, fromStage, toStage, pipeline?.id, `Manual: ${fromStage?.name || '?'} → ${toStage.name}`)
    onConfirm({
      ...payload,
      fieldUpdates: fieldValues,
      newTags: resultingTags,
    })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'var(--theme-modal-overlay)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
    }} onClick={onCancel}>
      <div onClick={e => e.stopPropagation()} style={{
        width: '480px', maxHeight: '80vh', overflow: 'auto',
        background: 'var(--theme-surface)', borderRadius: '16px',
        border: '1px solid var(--theme-border)', padding: '24px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--theme-text-primary)' }}>
            🔀 Stage Transition
          </h3>
          <button onClick={onCancel} style={{
            background: 'none', border: 'none', color: 'var(--theme-text-secondary)',
            fontSize: '18px', cursor: 'pointer',
          }}>✕</button>
        </div>

        {/* Lead info */}
        <div style={{
          padding: '12px', borderRadius: '8px', background: 'var(--theme-bg)',
          marginBottom: '16px', fontSize: '13px',
        }}>
          <div style={{ fontWeight: 600, color: 'var(--theme-text-primary)', marginBottom: '4px' }}>
            {lead.name || 'Unknown Lead'}
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: 'var(--theme-text-secondary)' }}>
            <span style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
              background: 'rgba(168,85,247,0.1)', color: '#a855f7',
            }}>{fromStage?.name || 'Current'}</span>
            <span>→</span>
            <span style={{
              padding: '2px 8px', borderRadius: '4px', fontSize: '11px',
              background: 'rgba(59,130,246,0.1)', color: '#3b82f6', fontWeight: 600,
            }}>{toStage.name}</span>
          </div>
          {overdueInfo.overdue && (
            <div style={{ marginTop: '6px', fontSize: '11px', color: '#ef4444' }}>
              ⏰ Overdue by {overdueInfo.daysInStage - overdueInfo.timerDays} days
            </div>
          )}
        </div>

        {/* Step: Fill required fields */}
        {step === 'fill' && validation && (
          <div style={{ marginBottom: '16px' }}>
            <RequiredFieldsGate
              missingFields={validation.missingFields}
              lead={lead}
              onFieldsComplete={handleFieldsComplete}
            />
          </div>
        )}

        {/* Step: Confirm */}
        {step === 'confirm' && (
          <>
            {/* Tags preview */}
            {newTags.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Tags to Apply
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {newTags.map(tag => (
                    <span key={tag} style={{
                      padding: '3px 8px', borderRadius: '4px', fontSize: '11px',
                      background: 'rgba(0,212,255,0.1)', color: '#00d4ff', fontWeight: 500,
                    }}>| {tag} |</span>
                  ))}
                </div>
              </div>
            )}

            {/* Field updates preview */}
            {Object.keys(fieldValues).length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', marginBottom: '6px', textTransform: 'uppercase' }}>
                  Field Updates
                </div>
                {Object.entries(fieldValues).map(([key, val]) => (
                  <div key={key} style={{ fontSize: '12px', color: 'var(--theme-text-secondary)', marginBottom: '2px' }}>
                    <span style={{ color: 'var(--theme-text-primary)' }}>{key}:</span> {val}
                  </div>
                ))}
              </div>
            )}

            {/* Confirm / Cancel */}
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button onClick={onCancel} style={{
                padding: '8px 16px', borderRadius: '8px', border: '1px solid var(--theme-border)',
                background: 'transparent', color: 'var(--theme-text-secondary)', fontSize: '12px', cursor: 'pointer',
              }}>Cancel</button>
              <button onClick={handleConfirm} style={{
                padding: '8px 20px', borderRadius: '8px', border: 'none',
                background: 'var(--theme-accent)', color: 'var(--theme-accent-text)',
                fontSize: '12px', fontWeight: 600, cursor: 'pointer',
              }}>✓ Confirm Transition</button>
            </div>
          </>
        )}

        {/* Loading state */}
        {step === 'validate' && (
          <div style={{ textAlign: 'center', padding: '20px', color: 'var(--theme-text-secondary)', fontSize: '13px' }}>
            Validating transition...
          </div>
        )}
      </div>
    </div>
  )
}
