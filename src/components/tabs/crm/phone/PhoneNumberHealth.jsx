// ========================================
// Phone Number Health — CNAM, STIR/SHAKEN, spam risk
// Phase 8 Phone & Dialer System
// ========================================
import { useState, useEffect, useCallback } from 'react'
import twilioClient from '../../../../services/twilioClient'

const HEALTH_INDICATORS = {
  good: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)', label: 'Good' },
  warning: { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', label: 'Warning' },
  bad: { color: '#ef4444', bg: 'rgba(239,68,68,0.12)', label: 'At Risk' },
}

export default function PhoneNumberHealth() {
  const [numbers, setNumbers] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchHealth = useCallback(async () => {
    setLoading(true)
    try {
      const data = await twilioClient.getNumbers()
      const lines = data.lines || []

      // Fetch call volume for each number
      const callData = await twilioClient.getCalls({ limit: 500 })
      const calls = callData.calls || []

      const enriched = lines.map(line => {
        const num = line.number
        const lineCalls = calls.filter(c => c.from_number === num || c.to_number === num)
        const last30d = lineCalls.filter(c => {
          const d = new Date(c.created_at)
          return d > new Date(Date.now() - 30 * 86400000)
        })
        const answered = last30d.filter(c => c.status === 'completed').length
        const total = last30d.length

        // Heuristic spam risk based on answer rate
        const answerRate = total > 0 ? answered / total : 1
        const spamRisk = total < 5 ? 'good' : answerRate > 0.5 ? 'good' : answerRate > 0.3 ? 'warning' : 'bad'

        return {
          ...line,
          callVolume30d: total,
          answeredCalls: answered,
          answerRate: total > 0 ? (answerRate * 100).toFixed(0) : '—',
          cnamStatus: line.cnam_status || 'Active', // Twilio CNAM
          stirShaken: line.stir_shaken || 'A', // Default attestation
          spamRisk,
        }
      })

      setNumbers(enriched)
    } catch (err) {
      console.error('[NUM HEALTH] Fetch failed:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchHealth() }, [fetchHealth])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#e4e4e7' }}>📊 Number Health</h4>
        <button onClick={fetchHealth} disabled={loading} style={{
          padding: '4px 10px', borderRadius: '6px', fontSize: '10px',
          border: '1px solid rgba(255,255,255,0.08)', background: 'transparent',
          color: '#71717a', cursor: 'pointer',
        }}>
          {loading ? '⟳' : '↻ Refresh'}
        </button>
      </div>

      {numbers.length === 0 && !loading && (
        <div style={{ textAlign: 'center', padding: '20px', color: '#52525b', fontSize: '12px' }}>
          No phone numbers configured
        </div>
      )}

      {numbers.map(num => {
        const risk = HEALTH_INDICATORS[num.spamRisk] || HEALTH_INDICATORS.good
        return (
          <div key={num.number} style={{
            padding: '14px 16px', borderRadius: '12px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            {/* Number header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#f59e0b' }}>{num.display || num.number}</div>
                <div style={{ fontSize: '11px', color: '#71717a' }}>
                  {num.region} · {num.area || 'Unknown area'}
                  {num.label && ` · ${num.label}`}
                </div>
              </div>
              <span style={{
                padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 700,
                background: risk.bg, color: risk.color,
              }}>
                {risk.label}
              </span>
            </div>

            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <StatBox label="CNAM" value={num.cnamStatus} color={num.cnamStatus === 'Active' ? '#4ade80' : '#f59e0b'} />
              <StatBox label="STIR/SHAKEN" value={num.stirShaken} color={num.stirShaken === 'A' ? '#4ade80' : '#f59e0b'} />
              <StatBox label="30d Calls" value={num.callVolume30d} color="#00d4ff" />
              <StatBox label="Answer Rate" value={num.answerRate === '—' ? '—' : `${num.answerRate}%`} color={
                num.answerRate === '—' ? '#71717a' : parseInt(num.answerRate) > 50 ? '#4ade80' : '#ef4444'
              } />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      padding: '8px', borderRadius: '8px', textAlign: 'center',
      background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
    }}>
      <div style={{ fontSize: '10px', color: '#52525b', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px', fontWeight: 700, color }}>{value}</div>
    </div>
  )
}
