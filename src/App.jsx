import { useState, useEffect, useCallback } from 'react'
import AuthGate from './components/layout/AuthGate'
import Shell from './components/layout/Shell'
import { TaskBoardProvider } from './context/TaskBoardContext'
import { CRMProvider } from './context/CRMContext'
import { ThemeProvider } from './context/ThemeContext'
import { PhoneProvider } from './context/PhoneContext'
import FloatingCallBar from './components/shared/FloatingCallBar'
import { IncomingCallBanner } from './components/tabs/crm/phone/RingingSystem'
import CallScriptPanel from './components/tabs/crm/phone/CallScriptPanel'
import DialerModal from './components/shared/DialerModal'

const UI_SCALE_KEY = 'cc7-ui-scale'
const DEFAULT_SCALE = 100
const MIN_SCALE = 75
const MAX_SCALE = 150
const STEP = 5

function clampScale(v) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(v / STEP) * STEP))
}

function applyZoom(pct) {
  document.documentElement.style.zoom = `${pct}%`
}

// Global getter so Settings can read current scale
export function getUIScale() {
  const stored = parseInt(localStorage.getItem(UI_SCALE_KEY), 10)
  return isNaN(stored) ? DEFAULT_SCALE : clampScale(stored)
}

export function setUIScale(pct) {
  const clamped = clampScale(pct)
  localStorage.setItem(UI_SCALE_KEY, String(clamped))
  applyZoom(clamped)
  window.dispatchEvent(new CustomEvent('cc7-ui-scale-change', { detail: clamped }))
}

function App() {
  const authenticated = sessionStorage.getItem('forged-os-session') === 'true'

  // Apply zoom on mount
  useEffect(() => {
    applyZoom(getUIScale())
  }, [])

  // Keyboard shortcuts: Ctrl+Plus, Ctrl+Minus, Ctrl+0
  useEffect(() => {
    function handleKey(e) {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        setUIScale(getUIScale() + STEP)
      } else if (e.key === '-') {
        e.preventDefault()
        setUIScale(getUIScale() - STEP)
      } else if (e.key === '0') {
        e.preventDefault()
        setUIScale(DEFAULT_SCALE)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  if (!authenticated) {
    return <AuthGate onAuth={() => window.location.reload()} />
  }

  return (
    <ThemeProvider>
      <PhoneProvider>
        <TaskBoardProvider>
          <CRMProvider>
            <Shell />
            <FloatingCallBar />
            <IncomingCallBanner />
            <DialerModal />
            <CallScriptPanel isVisible={true} />
          </CRMProvider>
        </TaskBoardProvider>
      </PhoneProvider>
    </ThemeProvider>
  )
}

export default App
