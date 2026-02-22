import { useState, useEffect, useCallback } from 'react'
import AuthGate from './components/layout/AuthGate'
import Shell from './components/layout/Shell'
import { TaskBoardProvider } from './context/TaskBoardContext'
import { OpsBoardProvider } from './context/OpsBoardContext'
import { CRMProvider } from './context/CRMContext'
import { ThemeProvider } from './context/ThemeContext'
import { PhoneProvider } from './context/PhoneContext'
import FloatingCallBar from './components/shared/FloatingCallBar'
import { IncomingCallBanner } from './components/tabs/crm/phone/RingingSystem'
import CallScriptPanel from './components/tabs/crm/phone/CallScriptPanel'
import DialerModal from './components/shared/DialerModal'
import { Toaster } from 'react-hot-toast'

const UI_SCALE_KEY = 'cc7-ui-scale'
const DEFAULT_SCALE = 100
const MIN_SCALE = 75
const MAX_SCALE = 150
const KB_STEP = 5

function clampScale(v) {
  return Math.min(MAX_SCALE, Math.max(MIN_SCALE, Math.round(v)))
}

function applyScale(pct) {
  const decimal = pct / 100
  document.documentElement.style.setProperty('--ui-scale', decimal)
}

// Global getter so Settings can read current scale
export function getUIScale() {
  const stored = parseInt(localStorage.getItem(UI_SCALE_KEY), 10)
  return isNaN(stored) ? DEFAULT_SCALE : clampScale(stored)
}

export function setUIScale(pct) {
  const clamped = clampScale(pct)
  localStorage.setItem(UI_SCALE_KEY, String(clamped))
  applyScale(clamped)
  window.dispatchEvent(new CustomEvent('cc7-ui-scale-change', { detail: clamped }))
}

function App() {
  const authenticated = sessionStorage.getItem('forged-os-session') === 'true'

  // Apply scale on mount
  useEffect(() => {
    applyScale(getUIScale())
  }, [])

  // Keyboard shortcuts: Ctrl+Plus, Ctrl+Minus, Ctrl+0
  useEffect(() => {
    function handleKey(e) {
      if (!e.ctrlKey && !e.metaKey) return
      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        setUIScale(getUIScale() + KB_STEP)
      } else if (e.key === '-') {
        e.preventDefault()
        setUIScale(getUIScale() - KB_STEP)
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
      <div className="app-scale-wrapper">
        <PhoneProvider>
          <OpsBoardProvider>
            <TaskBoardProvider>
              <CRMProvider>
                <Toaster position="top-right" />`n                <Shell />
                <FloatingCallBar />
                <IncomingCallBanner />
                <DialerModal />
                <CallScriptPanel isVisible={true} />
              </CRMProvider>
            </TaskBoardProvider>
          </OpsBoardProvider>
        </PhoneProvider>
      </div>
    </ThemeProvider>
  )
}

export default App

