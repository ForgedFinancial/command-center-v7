import { useState, useEffect, useRef } from 'react'
import syncClient from '../../api/syncClient'

// ========================================
// FEATURE: AuthGate — Cinematic Boot Sequence
// Added: 2026-02-14, Updated: 2026-02-15
// 3-phase: Boot → Auth → Welcome
// ========================================

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

const BOOT_MESSAGES = [
  { text: 'Connecting to Gateway...', ok: true },
  { text: 'Loading Agent Network...', ok: true },
  { text: 'Syncing Build Crew...', ok: true },
  { text: 'Verifying Identity...', ok: false },
]

const TITLE = 'INITIALIZING FORGED-OS V7...'

function BootSequence({ onComplete }) {
  const [lineExpanded, setLineExpanded] = useState(false)
  const [typedChars, setTypedChars] = useState(0)
  const [messages, setMessages] = useState([]) // array of { text, showOk }
  const titleDone = typedChars >= TITLE.length

  useEffect(() => {
    // Start line expansion immediately
    const t = setTimeout(() => setLineExpanded(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // Start typing after line expands (600ms)
    if (!lineExpanded) return
    const startDelay = setTimeout(() => {
      let i = 0
      const iv = setInterval(() => {
        i++
        setTypedChars(i)
        if (i >= TITLE.length) clearInterval(iv)
      }, 50)
      return () => clearInterval(iv)
    }, 400)
    return () => clearTimeout(startDelay)
  }, [lineExpanded])

  useEffect(() => {
    if (!titleDone) return
    let cancelled = false
    let delay = 300

    async function showMessages() {
      for (let i = 0; i < BOOT_MESSAGES.length; i++) {
        await new Promise((r) => setTimeout(r, delay))
        if (cancelled) return
        setMessages((prev) => [...prev, { text: BOOT_MESSAGES[i].text, showOk: false }])
        delay = 400 + Math.random() * 200

        if (BOOT_MESSAGES[i].ok) {
          await new Promise((r) => setTimeout(r, 300))
          if (cancelled) return
          setMessages((prev) =>
            prev.map((m, idx) => (idx === i ? { ...m, showOk: true } : m))
          )
        }
      }
      // Boot done
      await new Promise((r) => setTimeout(r, 600))
      if (!cancelled) onComplete()
    }

    showMessages()
    return () => { cancelled = true }
  }, [titleDone])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      overflow: 'hidden',
    }}>
      {/* Glowing horizontal line */}
      <div style={{
        width: lineExpanded ? '60%' : '0%',
        height: '2px',
        backgroundColor: '#00d4ff',
        boxShadow: '0 0 15px #00d4ff, 0 0 30px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.2)',
        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        marginBottom: '40px',
      }} />

      {/* Typing title */}
      <div style={{
        fontSize: '18px',
        color: '#00d4ff',
        letterSpacing: '2px',
        marginBottom: '32px',
        minHeight: '28px',
        textShadow: '0 0 10px rgba(0,212,255,0.5)',
      }}>
        {TITLE.slice(0, typedChars)}
        {!titleDone && <span style={{ animation: 'blink 0.6s step-end infinite' }}>▊</span>}
      </div>

      {/* Boot messages */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '14px',
        minHeight: '120px',
        width: '340px',
      }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ color: 'rgba(255,255,255,0.5)' }}>
            {msg.text}
            {msg.showOk && (
              <span style={{ color: '#4ade80', marginLeft: '8px', fontWeight: 600 }}>OK</span>
            )}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function WelcomeScreen({ onComplete }) {
  useEffect(() => {
    const t = setTimeout(onComplete, 2200)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0f',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      animation: 'fadeIn 0.8s ease',
    }}>
      <div style={{
        fontSize: '28px',
        fontWeight: 700,
        color: '#00d4ff',
        letterSpacing: '3px',
        textShadow: '0 0 20px rgba(0,212,255,0.6), 0 0 40px rgba(0,212,255,0.3)',
        marginBottom: '16px',
      }}>
        IDENTITY VERIFIED
      </div>
      <div style={{
        fontSize: '16px',
        color: 'rgba(255,255,255,0.5)',
        letterSpacing: '2px',
      }}>
        WELCOME BACK, COMMANDER
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </div>
  )
}

export default function AuthGate({ onAuth }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [shake, setShake] = useState(false)

  // Phase: 'boot' | 'auth' | 'welcome'
  const [phase, setPhase] = useState('boot')

  useEffect(() => {
    checkExistingAuth()
  }, [])

  async function checkExistingAuth() {
    const storedHash = localStorage.getItem('forged-os-auth')

    if (storedHash) {
      setIsCreating(false)
      setIsLoading(false)
      return
    }

    try {
      const state = await syncClient.getState()
      if (state?.auth?.hash) {
        localStorage.setItem('forged-os-auth', state.auth.hash)
        setIsCreating(false)
      } else {
        setIsCreating(true)
      }
    } catch (err) {
      console.warn('Could not fetch auth state:', err)
      setIsCreating(true)
    }

    setIsLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!password.trim()) {
      setError('Please enter a password')
      return
    }

    const inputHash = await hashPassword(password)

    if (isCreating) {
      try {
        localStorage.setItem('forged-os-auth', inputHash)
        sessionStorage.setItem('forged-os-session', 'true')

        await syncClient.push({
          type: 'auth',
          action: 'set',
          data: { hash: inputHash },
        })

        setPhase('welcome')
      } catch (err) {
        console.error('Failed to save auth:', err)
        setPhase('welcome')
      }
    } else {
      const storedHash = localStorage.getItem('forged-os-auth')

      if (inputHash === storedHash) {
        sessionStorage.setItem('forged-os-session', 'true')
        setPhase('welcome')
      } else {
        setError('Incorrect password')
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
    }
  }

  // Phase 1: Boot
  if (phase === 'boot') {
    return <BootSequence onComplete={() => setPhase('auth')} />
  }

  // Phase 3: Welcome
  if (phase === 'welcome') {
    return <WelcomeScreen onComplete={onAuth} />
  }

  // Phase 2: Auth Form
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0a0a0f',
      }}>
        <div style={{
          width: '24px',
          height: '24px',
          border: '2px solid rgba(255,255,255,0.1)',
          borderTopColor: '#00d4ff',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#0a0a0f',
      padding: '16px',
      animation: 'fadeIn 0.8s ease',
    }}>
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '32px',
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '600',
            color: '#00d4ff',
            marginTop: '16px',
            marginBottom: '4px',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '2px',
          }}>
            FORGED-OS
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
          }}>
            {isCreating ? 'Create your password' : 'Enter your password'}
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus
              style={{
                width: '100%',
                padding: '14px 18px',
                fontSize: '16px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '10px',
                color: '#ffffff',
                outline: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: shake ? 'shake 0.5s' : 'none',
              }}
            />
            <style>{`
              @keyframes shake {
                0%, 100% { transform: translateX(0); }
                25% { transform: translateX(-8px); }
                50% { transform: translateX(8px); }
                75% { transform: translateX(-8px); }
              }
              @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
              }
              input::placeholder {
                color: rgba(255,255,255,0.3);
              }
              input:focus {
                border-color: #00d4ff;
                box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1), 0 0 12px rgba(0, 212, 255, 0.06);
              }
            `}</style>
          </div>

          {error && (
            <p style={{
              fontSize: '14px',
              color: '#ef4444',
              marginBottom: '16px',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '16px',
              fontWeight: '500',
              backgroundColor: '#00d4ff',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '1px',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = '#33ddff')}
            onMouseOut={(e) => (e.target.style.backgroundColor = '#00d4ff')}
          >
            {isCreating ? 'CREATE PASSWORD' : 'ENTER'}
          </button>
        </form>
      </div>
    </div>
  )
}
