// ========================================
// Phone Context — State management for phone lines, calls, Twilio
// ========================================
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import twilioClient from '../services/twilioClient'

const PhoneContext = createContext(null)

export function PhoneProvider({ children }) {
  const [lines, setLines] = useState([])
  const [primaryLine, setPrimaryLine] = useState(null)
  const [twilioConfigured, setTwilioConfigured] = useState(false)
  const [activeLine, setActiveLine] = useState(null) // currently selected line for calls/sms
  const [callState, setCallState] = useState('idle') // idle | dialing | ringing | active | ended
  const [activeCall, setActiveCall] = useState(null) // Twilio call object
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [autoFailover, setAutoFailover] = useState(true)
  const timerRef = useRef(null)

  // Load phone lines on mount
  const loadLines = useCallback(async () => {
    try {
      const data = await twilioClient.getNumbers()
      setLines(data.lines || [])
      setPrimaryLine(data.primaryLine || null)
      setTwilioConfigured(data.configured || false)
      // Set active line to primary if not already set
      if (!activeLine && data.primaryLine) {
        setActiveLine(data.primaryLine)
      }
    } catch {
      // Graceful — may not be configured yet
    }
  }, [activeLine])

  useEffect(() => {
    loadLines()
    const interval = setInterval(loadLines, 120000) // refresh every 2 min
    return () => clearInterval(interval)
  }, [loadLines])

  // Call timer
  useEffect(() => {
    if (callState === 'active') {
      timerRef.current = setInterval(() => setCallDuration(d => d + 1), 1000)
    } else {
      if (timerRef.current) clearInterval(timerRef.current)
      if (callState === 'idle') setCallDuration(0)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [callState])

  // Switch primary line
  const switchPrimaryLine = useCallback(async (lineId) => {
    try {
      const data = await twilioClient.setPrimaryLine(lineId)
      setPrimaryLine(data.primaryLine)
      setActiveLine(data.primaryLine)
      if (data.lines) setLines(data.lines)
      return data
    } catch (err) {
      console.error('Failed to switch primary line:', err)
      throw err
    }
  }, [])

  // Determine if current active line is Twilio
  const isUsingTwilio = activeLine?.type === 'twilio'

  const value = {
    lines,
    primaryLine,
    activeLine,
    setActiveLine,
    twilioConfigured,
    callState,
    setCallState,
    activeCall,
    setActiveCall,
    callDuration,
    isMuted,
    setIsMuted,
    autoFailover,
    setAutoFailover,
    isUsingTwilio,
    switchPrimaryLine,
    loadLines,
  }

  return <PhoneContext.Provider value={value}>{children}</PhoneContext.Provider>
}

export function usePhone() {
  const ctx = useContext(PhoneContext)
  if (!ctx) throw new Error('usePhone must be used within PhoneProvider')
  return ctx
}
