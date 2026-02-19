// ========================================
// Phone Context — Twilio WebRTC + Smart Number Routing
// Phase 1 Power Dialer Foundation
// ========================================
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import twilioClient from '../services/twilioClient'
import { WORKER_PROXY_URL } from '../config/api'

const PhoneContext = createContext(null)

// 13 Dispositions
const DISPOSITIONS = [
  { id: 'called', label: 'Called', icon: '📞' },
  { id: 'follow_up', label: 'Follow-Up', icon: '📅' },
  { id: 'appt_booked', label: 'Appt Booked', icon: '📋' },
  { id: 'appt_no_show', label: 'No-Show', icon: '🚫' },
  { id: 'pitched', label: 'Pitched', icon: '🎯' },
  { id: 'sold', label: 'Sold', icon: '🎉' },
  { id: 'not_interested', label: 'Not Int.', icon: '❌' },
  { id: 'bad_number', label: 'Bad Number', icon: '📵' },
  { id: 'nurture', label: 'Nurture', icon: '🌱' },
  { id: 'req_replacement', label: 'Req Replace', icon: '🔄' },
  { id: 'replace_submitted', label: 'Replace Sub', icon: '📨' },
  { id: 'dnc', label: 'DNC', icon: '🛑' },
  { id: 'new_lead', label: 'New Lead', icon: '🆕' },
]

export function PhoneProvider({ children }) {
  const [lines, setLines] = useState([])
  const [primaryLine, setPrimaryLine] = useState(null)
  const [twilioConfigured, setTwilioConfigured] = useState(false)
  const [activeLine, setActiveLine] = useState(null)

  // Call state
  const [callState, setCallState] = useState('idle') // idle | connecting | ringing | active | ended
  const [activeCall, setActiveCall] = useState(null)
  const [callMeta, setCallMeta] = useState(null) // { leadId, leadName, phone, fromNumber, fromDisplay, callSid, startTime }
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isOnHold, setIsOnHold] = useState(false)
  const [autoFailover, setAutoFailover] = useState(true)
  const [showDisposition, setShowDisposition] = useState(false)

  const timerRef = useRef(null)
  const deviceRef = useRef(null)

  // Load phone lines on mount
  const loadLines = useCallback(async () => {
    try {
      const data = await twilioClient.getNumbers()
      setLines(data.lines || [])
      setPrimaryLine(data.primaryLine || null)
      setTwilioConfigured(data.configured || false)
      if (!activeLine && data.primaryLine) setActiveLine(data.primaryLine)
    } catch {}
  }, [activeLine])

  useEffect(() => {
    loadLines()
    const interval = setInterval(loadLines, 120000)
    return () => clearInterval(interval)
  }, [loadLines])

  // Duration timer
  useEffect(() => {
    if (callState === 'active' && callMeta?.startTime) {
      timerRef.current = setInterval(() => {
        setCallDuration(Math.floor((Date.now() - callMeta.startTime) / 1000))
      }, 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (callState === 'idle') setCallDuration(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [callState, callMeta?.startTime])

  // Check Mac node connectivity
  const checkMacNode = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_PROXY_URL}/api/phone/ping`, {
        signal: AbortSignal.timeout(3000)
      })
      const data = await res.json()
      return data.online === true
    } catch {
      return false
    }
  }, [])

  // Make call — iPhone primary, Twilio fallback
  const makeCall = useCallback(async (lead, { forceTwilio = false } = {}) => {
    if (!lead?.phone) return

    // If not forcing Twilio, try iPhone first
    if (!forceTwilio && autoFailover) {
      try {
        const macOnline = await checkMacNode()
        if (macOnline) {
          // Use existing iPhone call path
          await fetch(`${WORKER_PROXY_URL}/api/phone/call`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: lead.phone }),
          })
          // iPhone calls don't show floating bar — they go through the phone
          return { method: 'iphone' }
        }
      } catch {}
    }

    // Twilio WebRTC call
    setCallState('connecting')
    setCallMeta({
      leadId: lead.id || null,
      leadName: lead.name || 'Unknown',
      phone: lead.phone,
      fromNumber: null,
      fromDisplay: null,
      callSid: null,
      startTime: null,
    })
    setShowDisposition(false)
    setIsOnHold(false)
    setIsMuted(false)

    try {
      const data = await twilioClient.makeCall(lead.phone, lead.id, lead.name, lead.state)

      setCallMeta(prev => ({
        ...prev,
        fromNumber: data.fromNumber,
        fromDisplay: data.fromDisplay,
        callSid: data.callSid,
        startTime: Date.now(),
      }))
      setCallState('active')

      return { method: 'twilio', callSid: data.callSid }
    } catch (err) {
      console.error('[PHONE] Call failed:', err.message)
      setCallState('idle')
      setCallMeta(null)
      throw err
    }
  }, [autoFailover, checkMacNode])

  // End call
  const endCall = useCallback(async () => {
    if (callMeta?.callSid) {
      try {
        await twilioClient.endCall(callMeta.callSid)
      } catch (err) {
        console.error('[PHONE] End call error:', err.message)
      }
    }
    if (activeCall?.disconnect) activeCall.disconnect()
    setCallState('ended')
    setShowDisposition(true)
  }, [callMeta, activeCall])

  // Mute toggle
  const toggleMute = useCallback(() => {
    if (activeCall?.mute) activeCall.mute(!isMuted)
    setIsMuted(prev => !prev)
  }, [activeCall, isMuted])

  // Hold toggle
  const toggleHold = useCallback(async () => {
    if (!callMeta?.callSid) return
    try {
      if (isOnHold) {
        await twilioClient.unholdCall(callMeta.callSid)
      } else {
        await twilioClient.holdCall(callMeta.callSid)
      }
      setIsOnHold(prev => !prev)
    } catch (err) {
      console.error('[PHONE] Hold toggle error:', err.message)
    }
  }, [callMeta, isOnHold])

  // Apply disposition
  const applyDisposition = useCallback(async (dispositionId, notes = '') => {
    if (callMeta?.callSid) {
      try {
        const token = localStorage.getItem('forgedos_crm_token')
        await fetch(`${WORKER_PROXY_URL}/api/twilio/call/${callMeta.callSid}/disposition`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ disposition: dispositionId, notes }),
        })
      } catch (err) {
        console.error('[PHONE] Disposition error:', err.message)
      }
    }
    setShowDisposition(false)
    setCallState('idle')
    setCallMeta(null)
    setActiveCall(null)
  }, [callMeta])

  // Dismiss disposition (skip)
  const dismissCall = useCallback(() => {
    setShowDisposition(false)
    setCallState('idle')
    setCallMeta(null)
    setActiveCall(null)
  }, [])

  // Switch primary line
  const switchPrimaryLine = useCallback(async (lineId) => {
    try {
      const data = await twilioClient.setPrimaryLine(lineId)
      setPrimaryLine(data.primaryLine)
      setActiveLine(data.primaryLine)
      if (data.lines) setLines(data.lines)
      return data
    } catch (err) {
      throw err
    }
  }, [])

  const isUsingTwilio = activeLine?.type === 'twilio'

  const value = {
    lines, primaryLine, activeLine, setActiveLine,
    twilioConfigured, callState, setCallState,
    activeCall, setActiveCall,
    callMeta, callDuration,
    isMuted, setIsMuted, isOnHold,
    autoFailover, setAutoFailover, isUsingTwilio,
    showDisposition, setShowDisposition,
    makeCall, endCall, toggleMute, toggleHold,
    applyDisposition, dismissCall,
    switchPrimaryLine, loadLines,
    DISPOSITIONS,
  }

  return <PhoneContext.Provider value={value}>{children}</PhoneContext.Provider>
}

export function usePhone() {
  const ctx = useContext(PhoneContext)
  if (!ctx) throw new Error('usePhone must be used within PhoneProvider')
  return ctx
}
