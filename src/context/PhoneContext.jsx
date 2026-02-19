// ========================================
// Phone Context — Twilio WebRTC + Smart Number Routing
// Phase 1 Power Dialer Foundation
// ========================================
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
// Lazy-loaded to prevent app crash if SDK fails
let _Device = null
const getDevice = async () => {
  if (!_Device) {
    try {
      const mod = await import('@twilio/voice-sdk')
      _Device = mod.Device
    } catch (e) {
      console.warn('[PHONE] Twilio Voice SDK not available:', e.message)
    }
  }
  return _Device
}
import twilioClient from '../services/twilioClient'
import { WORKER_PROXY_URL, getSyncHeaders } from '../config/api'

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

  // Phase 2: Multi-Line & AMD
  const [multiLineMode, setMultiLineMode] = useState(false)
  const [activeCalls, setActiveCalls] = useState([]) // Array of concurrent calls
  const [amdEnabled, setAmdEnabled] = useState(true)

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

  // ── Voice SDK Device Initialization ──
  const initDevice = useCallback(async () => {
    try {
      const res = await fetch(`${WORKER_PROXY_URL}/api/twilio/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getSyncHeaders() },
        body: JSON.stringify({ identity: 'boss' }),
      })
      const data = await res.json()
      if (!data.token) { console.warn('[PHONE] No token received'); return }

      if (deviceRef.current) deviceRef.current.destroy()

      const DeviceClass = await getDevice()
      if (!DeviceClass) { console.warn('[PHONE] Voice SDK unavailable'); return }
      const device = new DeviceClass(data.token, {
        codecPreferences: ['opus', 'pcmu'],
        enableRingingState: true,
        logLevel: 1,
      })

      device.on('registered', () => console.log('[PHONE] Device registered — ready for calls'))
      device.on('error', (err) => console.error('[PHONE] Device error:', err.message))

      device.on('incoming', (call) => {
        console.log('[PHONE] Incoming call from:', call.parameters.From)
        setActiveCall(call)
        setCallState('ringing')
        setCallMeta({
          leadId: null,
          leadName: call.parameters.From || 'Unknown',
          phone: call.parameters.From,
          fromNumber: call.parameters.To,
          fromDisplay: null,
          callSid: call.parameters.CallSid,
          startTime: null,
        })

        call.on('accept', () => {
          setCallState('active')
          setCallMeta(prev => ({ ...prev, startTime: Date.now() }))
        })
        call.on('disconnect', () => {
          setCallState('ended')
          setShowDisposition(true)
        })
        call.on('cancel', () => {
          setCallState('idle')
          setCallMeta(null)
          setActiveCall(null)
        })
      })

      device.on('tokenWillExpire', async () => {
        console.log('[PHONE] Token expiring — refreshing...')
        try {
          const r = await fetch(`${WORKER_PROXY_URL}/api/twilio/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...getSyncHeaders() },
            body: JSON.stringify({ identity: 'boss' }),
          })
          const d = await r.json()
          if (d.token) device.updateToken(d.token)
        } catch (e) { console.error('[PHONE] Token refresh failed:', e.message) }
      })

      await device.register()
      deviceRef.current = device
      console.log('[PHONE] Voice SDK Device initialized')
    } catch (err) {
      console.error('[PHONE] Device init failed:', err.message)
    }
  }, [])

  useEffect(() => {
    if (twilioConfigured) initDevice()
    return () => { if (deviceRef.current) deviceRef.current.destroy() }
  }, [twilioConfigured, initDevice])

  // Accept incoming call
  const acceptCall = useCallback(() => {
    if (activeCall?.accept) activeCall.accept()
  }, [activeCall])

  // Reject incoming call
  const rejectCall = useCallback(() => {
    if (activeCall?.reject) activeCall.reject()
    setCallState('idle')
    setCallMeta(null)
    setActiveCall(null)
  }, [activeCall])

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

  // Make multiple simultaneous calls (2-3 leads)
  const makeMultiLineCalls = useCallback(async (leads, { forceTwilio = false } = {}) => {
    if (!leads || leads.length === 0) return

    // Limit to 3 simultaneous calls max
    const callLeads = leads.slice(0, 3)
    
    setCallState('connecting')
    setActiveCalls([])
    setCallMeta({
      leadId: null,
      leadName: `Multi-line (${callLeads.length} numbers)`,
      phone: callLeads.map(l => l.phone).join(', '),
      fromNumber: activeLine?.number || null,
      fromDisplay: activeLine?.label || null,
      callSid: null,
      startTime: null,
    })

    try {
      const callPromises = callLeads.map(async (lead, index) => {
        const fromNumber = activeLine?.number || null
        
        if (deviceRef.current) {
          const connectParams = {
            To: lead.phone,
            LeadState: lead.state || '',
            MachineDetection: amdEnabled ? 'DetectMessageEnd' : 'off',
          }
          if (fromNumber) connectParams.CallerIdNumber = fromNumber

          const call = await deviceRef.current.connect({ params: connectParams })
          
          const callData = {
            id: `multi-${Date.now()}-${index}`,
            call: call,
            lead: lead,
            status: 'connecting',
            connected: false,
          }

          call.on('ringing', () => {
            setActiveCalls(prev => prev.map(c => 
              c.id === callData.id ? { ...c, status: 'ringing' } : c
            ))
          })

          call.on('accept', () => {
            // First call to answer gets priority
            setActiveCalls(prev => {
              const updated = prev.map(c => 
                c.id === callData.id ? { ...c, status: 'connected', connected: true } : c
              )
              
              // If this is the first to connect, disconnect others
              const connectedCalls = updated.filter(c => c.connected)
              if (connectedCalls.length === 1) {
                updated.forEach(c => {
                  if (!c.connected && c.call.disconnect) {
                    c.call.disconnect()
                  }
                })
                
                // Set this as the primary call
                setCallState('active')
                setCallMeta(prev => ({
                  ...prev,
                  leadId: lead.id,
                  leadName: lead.name || 'Unknown',
                  phone: lead.phone,
                  callSid: call.parameters?.CallSid,
                  startTime: Date.now(),
                }))
                setActiveCall(call)
              }
              
              return updated
            })
          })

          call.on('disconnect', () => {
            setActiveCalls(prev => {
              const updated = prev.filter(c => c.id !== callData.id)
              if (updated.length === 0) {
                setCallState('ended')
                setShowDisposition(true)
              }
              return updated
            })
          })

          call.on('error', (err) => {
            console.error(`[PHONE] Multi-line call ${index} error:`, err.message)
            setActiveCalls(prev => prev.filter(c => c.id !== callData.id))
          })

          return callData
        }
        return null
      })

      const calls = (await Promise.all(callPromises)).filter(Boolean)
      setActiveCalls(calls)

      return { method: 'twilio-multiline', calls: calls.length }
    } catch (err) {
      console.error('[PHONE] Multi-line calls failed:', err.message)
      setCallState('idle')
      setCallMeta(null)
      setActiveCalls([])
      throw err
    }
  }, [amdEnabled, activeLine, deviceRef])

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

    // Twilio WebRTC call via Voice SDK (browser audio)
    const fromNumber = activeLine?.number || null
    setCallState('connecting')
    setCallMeta({
      leadId: lead.id || null,
      leadName: lead.name || 'Unknown',
      phone: lead.phone,
      fromNumber: fromNumber,
      fromDisplay: activeLine?.label || null,
      callSid: null,
      startTime: null,
    })
    setShowDisposition(false)
    setIsOnHold(false)
    setIsMuted(false)

    try {
      if (!deviceRef.current) {
        await initDevice()
      }

      if (deviceRef.current) {
        // Use Voice SDK — audio goes through browser
        const connectParams = {
          To: lead.phone,
          LeadState: lead.state || '',
          MachineDetection: amdEnabled ? 'DetectMessageEnd' : 'off',
        }
        if (fromNumber) connectParams.CallerIdNumber = fromNumber

        const call = await deviceRef.current.connect({ params: connectParams })

        call.on('ringing', () => setCallState('ringing'))
        call.on('accept', () => {
          setCallState('active')
          setCallMeta(prev => ({ ...prev, startTime: Date.now(), callSid: call.parameters?.CallSid }))
        })
        call.on('disconnect', () => {
          setCallState('ended')
          setShowDisposition(true)
        })
        call.on('error', (err) => {
          console.error('[PHONE] Call error:', err.message)
          setCallState('idle')
          setCallMeta(null)
        })

        setActiveCall(call)
        setCallMeta(prev => ({ ...prev, callSid: call.parameters?.CallSid }))

        return { method: 'twilio-webrtc', callSid: call.parameters?.CallSid }
      } else {
        // Fallback: REST API (no browser audio — server-side only)
        const data = await twilioClient.makeCall(lead.phone, lead.id, lead.name, lead.state, fromNumber)
        setCallMeta(prev => ({
          ...prev,
          fromNumber: data.fromNumber,
          fromDisplay: data.fromDisplay,
          callSid: data.callSid,
          startTime: Date.now(),
        }))
        setCallState('active')
        return { method: 'twilio-rest', callSid: data.callSid }
      }
    } catch (err) {
      console.error('[PHONE] Call failed:', err.message)
      setCallState('idle')
      setCallMeta(null)
      throw err
    }
  }, [autoFailover, checkMacNode, activeLine, initDevice])

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
    // Phase 2: Multi-Line & AMD
    multiLineMode, setMultiLineMode,
    activeCalls, setActiveCalls,
    amdEnabled, setAmdEnabled,
    makeCall, makeMultiLineCalls, endCall, toggleMute, toggleHold,
    acceptCall, rejectCall,
    applyDisposition, dismissCall,
    switchPrimaryLine, loadLines, initDevice,
    DISPOSITIONS,
  }

  return <PhoneContext.Provider value={value}>{children}</PhoneContext.Provider>
}

export function usePhone() {
  const ctx = useContext(PhoneContext)
  if (!ctx) throw new Error('usePhone must be used within PhoneProvider')
  return ctx
}
