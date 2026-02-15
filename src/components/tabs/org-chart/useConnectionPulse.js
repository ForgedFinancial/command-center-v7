// ========================================
// useConnectionPulse — Single rAF loop managing all pulse dots
// Max 3 simultaneous pulses
// ========================================

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { CONNECTION, ANIMATION, PULSE_COLORS } from './radialConstants'

function randomBetween(min, max) {
  return min + Math.random() * (max - min)
}

export default function useConnectionPulse(connections, agentStatuses, reducedMotion) {
  const [pulses, setPulses] = useState({}) // { connectionKey: { progress, color } }
  const rafRef = useRef(null)
  const pulsesRef = useRef({})
  const timersRef = useRef({})
  const activePulseCount = useRef(0)
  const scheduleRef = useRef(null)
  const prevPulseKeysRef = useRef('')

  // Determine pulse frequency for a connection based on agent status
  const getFrequency = useCallback((fromId, toId) => {
    const fromStatus = agentStatuses?.[fromId]?.status
    const toStatus = agentStatuses?.[toId]?.status
    if (toStatus === 'offline') return null // offline agents never receive pulses
    if (fromStatus === 'offline') return null // no pulse from offline agents
    if (fromStatus === 'online' || fromStatus === 'active' || fromStatus === 'busy' ||
        toStatus === 'online' || toStatus === 'active' || toStatus === 'busy') {
      return CONNECTION.frequencyActive
    }
    return CONNECTION.frequencyIdle
  }, [agentStatuses])

  // Pick pulse color based on connection type
  const getPulseColor = useCallback((fromId, toId) => {
    if (fromId === 'sentinel' || toId === 'sentinel' ||
        fromId === 'probe' || fromId === 'auditor') {
      return PULSE_COLORS.inspection
    }
    return PULSE_COLORS.delegation
  }, [])

  // Start a pulse on a connection
  const startPulse = useCallback((key, fromId, toId) => {
    if (activePulseCount.current >= ANIMATION.maxSimultaneousPulses) return
    activePulseCount.current++
    const startTime = performance.now()
    const color = getPulseColor(fromId, toId)
    pulsesRef.current[key] = { startTime, color, fromId, toId }
  }, [getPulseColor])

  // Schedule next pulse for a connection
  const scheduleNextPulse = useCallback((key, fromId, toId) => {
    const freq = getFrequency(fromId, toId)
    if (!freq || reducedMotion) return
    const delay = randomBetween(freq[0], freq[1])
    timersRef.current[key] = setTimeout(() => {
      startPulse(key, fromId, toId)
      scheduleRef.current?.(key, fromId, toId)
    }, delay)
  }, [getFrequency, startPulse, reducedMotion])

  // Keep ref updated to avoid stale closure
  scheduleRef.current = scheduleNextPulse

  // Animation loop
  useEffect(() => {
    if (reducedMotion) return

    const animate = () => {
      const now = performance.now()
      const newPulses = {}
      let changed = false

      Object.entries(pulsesRef.current).forEach(([key, pulse]) => {
        const elapsed = now - pulse.startTime
        const progress = elapsed / CONNECTION.travelDuration

        if (progress <= 1) {
          // Ease in-out
          const eased = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2
          newPulses[key] = { progress: eased, color: pulse.color }
        } else {
          // Pulse completed
          activePulseCount.current = Math.max(0, activePulseCount.current - 1)
          changed = true
        }
      })

      // Update ref with only active pulses
      const activeKeys = Object.keys(newPulses)
      const prevKeys = Object.keys(pulsesRef.current)
      if (activeKeys.length !== prevKeys.length) {
        changed = true
      }

      // Keep only active pulses in ref
      const newRef = {}
      activeKeys.forEach(key => {
        newRef[key] = pulsesRef.current[key]
      })
      pulsesRef.current = newRef

      const newKeysStr = activeKeys.join(',')
      if (newKeysStr !== prevPulseKeysRef.current || activeKeys.length > 0) {
        prevPulseKeysRef.current = newKeysStr
        setPulses({ ...newPulses })
      }
      rafRef.current = requestAnimationFrame(animate)
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [reducedMotion])

  // Schedule pulses for all connections
  useEffect(() => {
    if (reducedMotion) return

    // Clear existing timers
    Object.values(timersRef.current).forEach(clearTimeout)
    timersRef.current = {}

    connections.forEach(conn => {
      const key = `${conn.from}-${conn.to}`
      // Stagger initial pulses
      const initialDelay = randomBetween(1000, 4000)
      timersRef.current[key] = setTimeout(() => {
        startPulse(key, conn.from, conn.to)
        scheduleNextPulse(key, conn.from, conn.to)
      }, initialDelay)
    })

    return () => {
      Object.values(timersRef.current).forEach(clearTimeout)
      timersRef.current = {}
    }
  }, [connections, scheduleNextPulse, startPulse, reducedMotion])

  return pulses
}
