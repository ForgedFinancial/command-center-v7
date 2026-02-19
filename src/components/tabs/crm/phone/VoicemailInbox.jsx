// ========================================
// Voicemail Inbox — Inbound voicemails with playback
// Phase 8 Phone & Dialer System
// ========================================
import { useState, useEffect, useCallback } from 'react'
import twilioClient from '../../../../services/twilioClient'
import CallRecordingPlayer from './CallRecordingPlayer'

export default function VoicemailInbox({ onBadgeCount }) {
  const [voicemails, setVoicemails] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('unhandled') // unhandled | all

  const fetchVoicemails = useCallback(async () => {
    setLoading(true)
    try {
      const data = await twilioClient.getCalls({ status: 'voicemail', limit: 100 })
      const vms = (data.calls || []).map(c => ({
        id: c.id,
        callSid: c.twilio_sid,
        from: c.from_number,
        to: c.to_number,
        leadId: c.lead_id,
        leadName: c.lead_name || c.from_number,
        recordingUrl: c.recording_url,
        duration: c.duration,
        createdAt: c.created_at,
        handled: c.disposition === 'handled',
      }))
      setVoicemails(vms)
      const unhandled = vms.filter(v => !v.handled).length
      onBadgeCount?.(unhandled)
    } catch (err) {
      console.error('[VM INBOX] Fetch failed:', err)
    }
    setLoading(false)
  }, [onBadgeCount])

  useEffect(() => { fetchVoicemails() }, [fetchVoicemails])

  const markHandled = async (vm) => {
    try {
      await twilioClient.dispositionCall(vm.callSid, 'handled', 'Voicemail reviewed')
      setVoicemails(prev => prev.map(v => v.id === vm.id ? { ...v, handled: true } : v))
      const remaining = voicemails.filter(v => !v.handled && v.id !== vm.id).length
      onBadgeCount?.(remaining)
    } catch (err) {
      console.error('[VM INBOX] Mark handled failed:', err)
    }
  }

  const deleteVm = async (vm) => {
    // Mark as deleted disposition
    try {
      await twilioClient.dispositionCall(vm.callSid, 'deleted', 'Voicemail deleted')
      setVoicemails(prev => prev.filter(v => v.id !== vm.id))
    } catch {}
  }

  const filtered = filter === 'unhandled' ? voicemails.filter(v => !v.handled) : voicemails

  const formatDuration = (s) => s ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : '—'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#e4e4e7' }}>📬 Voicemail</h3>
          {voicemails.filter(v => !v.handled).length > 0 && (
            <span style={{
              padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700,
              background: 'rgba(239,68,68,0.2)', color: '#ef4444',
            }}>
              {voicemails.filter(v => !v.handled).length} new
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: '4px' }}>
          {['unhandled', 'all'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: '5px 12px', borderRadius: '6px', fontSize: '11px', fontWeight: filter === f ? 600 : 400,
              border: `1px solid ${filter === f ? 'rgba(0,212,255,0.3)' : 'transparent'}`,
              background: filter === f ? 'rgba(0,212,255,0.08)' : 'transparent',
              color: filter === f ? '#00d4ff' : '#71717a', cursor: 'pointer', textTransform: 'capitalize',
            }}>
              {f}
            </button>
          ))}
          <button onClick={fetchVoicemails} disabled={loading} style={{
            padding: '5px 12px', borderRadius: '6px', fontSize: '11px',
            border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
            color: '#71717a', cursor: 'pointer',
          }}>
            {loading ? '⟳' : '↻'}
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#52525b' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            <div style={{ fontSize: '13px' }}>{filter === 'unhandled' ? 'No new voicemails' : 'No voicemails yet'}</div>
          </div>
        ) : (
          filtered.map(vm => (
            <div key={vm.id} style={{
              padding: '14px 16px', borderRadius: '10px', marginBottom: '8px',
              background: vm.handled ? 'rgba(255,255,255,0.02)' : 'rgba(0,212,255,0.04)',
              border: `1px solid ${vm.handled ? 'rgba(255,255,255,0.04)' : 'rgba(0,212,255,0.15)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>
                    {vm.leadName}
                  </span>
                  {!vm.handled && (
                    <span style={{
                      marginLeft: '8px', width: '6px', height: '6px', borderRadius: '50%',
                      background: '#00d4ff', display: 'inline-block',
                    }} />
                  )}
                  <div style={{ fontSize: '11px', color: '#a1a1aa' }}>
                    {vm.from} → {vm.to}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', color: '#71717a' }}>
                    {vm.createdAt ? new Date(vm.createdAt).toLocaleString() : '—'}
                  </div>
                  <div style={{ fontSize: '10px', color: '#52525b' }}>
                    {formatDuration(vm.duration)}
                  </div>
                </div>
              </div>

              {vm.recordingUrl && <CallRecordingPlayer recordingUrl={vm.recordingUrl} />}

              <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                {!vm.handled && (
                  <button onClick={() => markHandled(vm)} style={{
                    padding: '5px 12px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                    border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)',
                    color: '#4ade80', cursor: 'pointer',
                  }}>
                    ✓ Mark Handled
                  </button>
                )}
                <button onClick={() => deleteVm(vm)} style={{
                  padding: '5px 10px', borderRadius: '6px', fontSize: '10px',
                  border: '1px solid rgba(239,68,68,0.2)', background: 'transparent',
                  color: '#ef4444', cursor: 'pointer',
                }}>
                  🗑 Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
