import { useState, useEffect, useRef } from 'react'
import syncClient from '../../api/syncClient'

// ========================================
// FEATURE: AuthGate — Cinematic Boot Sequence
// Added: 2026-02-14, Updated: 2026-02-15
// Session 4: Auth Overhaul — Server-side auth
// 3-phase: Boot → Auth → Welcome
// + Server-side rate limiting, session cookies
// ========================================

// Exported so StatusBar can call it
export function lockSession() {
  syncClient.auth.logout().catch(() => {})
  window.location.reload()
}

const BOOT_MESSAGES = [
  { text: 'Connecting to Gateway...', ok: true },
  { text: 'Loading Agent Network...', ok: true },
  { text: 'Syncing Build Crew...', ok: true },
  { text: 'Verifying Identity...', ok: false },
]

const TITLE = 'INITIALIZING CC v7...'

function BootSequence({ onComplete }) {
  const [lineExpanded, setLineExpanded] = useState(false)
  const [typedChars, setTypedChars] = useState(0)
  const [messages, setMessages] = useState([])
  const titleDone = typedChars >= TITLE.length

  useEffect(() => {
    const t = setTimeout(() => setLineExpanded(true), 100)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
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
      <div style={{
        width: lineExpanded ? '60%' : '0%',
        height: '2px',
        backgroundColor: 'var(--theme-accent)',
        boxShadow: '0 0 15px #00d4ff, 0 0 30px rgba(0,212,255,0.4), 0 0 60px rgba(0,212,255,0.2)',
        transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
        marginBottom: '40px',
      }} />

      <div style={{
        fontSize: '18px',
        color: 'var(--theme-accent)',
        letterSpacing: '2px',
        marginBottom: '32px',
        minHeight: '28px',
        textShadow: '0 0 10px rgba(0,212,255,0.5)',
      }}>
        {TITLE.slice(0, typedChars)}
        {!titleDone && <span style={{ animation: 'blink 0.6s step-end infinite' }}>▊</span>}
      </div>

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
              <span style={{ color: 'var(--theme-success)', marginLeft: '8px', fontWeight: 600 }}>OK</span>
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
        color: 'var(--theme-accent)',
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
  const [accessCode, setAccessCode] = useState('')
  const [showAccessCode, setShowAccessCode] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [shake, setShake] = useState(false)
  const [lockoutRemaining, setLockoutRemaining] = useState(0)
  const [phase, setPhase] = useState('boot')
  const lockoutTimer = useRef(null)

  useEffect(() => {
    checkExistingAuth()
  }, [])

  // Lockout countdown
  useEffect(() => {
    if (lockoutRemaining <= 0) return
    lockoutTimer.current = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(lockoutTimer.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(lockoutTimer.current)
  }, [lockoutRemaining > 0])

  async function checkExistingAuth() {
    try {
      const result = await syncClient.auth.check()
      if (result?.authenticated) {
        sessionStorage.setItem('forged-os-session', 'true')
        setPhase('welcome')
        setIsLoading(false)
        return
      }
    } catch (err) {
      console.warn('Could not check auth state:', err)
    }
    setIsLoading(false)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (lockoutRemaining > 0) return
    if (!accessCode.trim() || !username.trim() || !password.trim()) {
      setError('All fields are required')
      return
    }

    try {
      await syncClient.auth.login(accessCode, username, password)
      sessionStorage.setItem('forged-os-session', 'true')
      setPhase('welcome')
    } catch (err) {
      const status = err?.status
      if (status === 429) {
        const retryAfter = err?.body?.retryAfter || 60
        setLockoutRemaining(retryAfter)
        setError('')
      } else if (status === 401) {
        setError('Invalid credentials')
      } else {
        setError('Connection error - server unreachable')
      }
      setShake(true)
      setTimeout(() => setShake(false), 500)
    }
  }

  if (phase === 'boot') {
    return <BootSequence onComplete={() => setPhase('auth')} />
  }

  if (phase === 'welcome') {
    return <WelcomeScreen onComplete={onAuth} />
  }

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
          borderTopColor: 'var(--theme-accent)',
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
            color: 'var(--theme-accent)',
            marginTop: '16px',
            marginBottom: '4px',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '2px',
          }}>
            CC v7
          </h1>
          <p style={{
            fontSize: '14px',
            color: 'rgba(255,255,255,0.5)',
          }}>
            Authorized personnel only
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px', position: 'relative' }}>
            <input
              type={showAccessCode ? 'text' : 'password'}
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Access Code"
              autoFocus
              disabled={lockoutRemaining > 0}
              autoComplete="off"
              style={{
                width: '100%',
                padding: '14px 18px',
                paddingRight: '48px',
                fontSize: '16px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '10px',
                color: '#ffffff',
                outline: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: shake ? 'shake 0.5s' : 'none',
                opacity: lockoutRemaining > 0 ? 0.5 : 1,
              }}
            />
            <button type="button" onClick={() => setShowAccessCode(!showAccessCode)} style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', padding: '4px',
            }}>{showAccessCode ? '🙈' : '👁️'}</button>
          </div>
          <div style={{ marginBottom: '12px' }}>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              disabled={lockoutRemaining > 0}
              autoComplete="username"
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
                opacity: lockoutRemaining > 0 ? 0.5 : 1,
              }}
            />
          </div>
          <div style={{ marginBottom: '16px', position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              disabled={lockoutRemaining > 0}
              autoComplete="current-password"
              style={{
                width: '100%',
                padding: '14px 18px',
                paddingRight: '48px',
                fontSize: '16px',
                backgroundColor: 'rgba(255,255,255,0.05)',
                border: `1px solid ${error ? '#ef4444' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: '10px',
                color: '#ffffff',
                outline: 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                animation: shake ? 'shake 0.5s' : 'none',
                opacity: lockoutRemaining > 0 ? 0.5 : 1,
              }}
            />
            <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
              position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px', padding: '4px',
            }}>{showPassword ? '🙈' : '👁️'}</button>
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

          {lockoutRemaining > 0 && (
            <p style={{
              fontSize: '14px',
              color: '#f59e0b',
              marginBottom: '16px',
              textAlign: 'center',
            }}>
              Too many attempts. Try again in {lockoutRemaining}s
            </p>
          )}

          {error && lockoutRemaining <= 0 && (
            <p style={{
              fontSize: '14px',
              color: 'var(--theme-error)',
              marginBottom: '16px',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={lockoutRemaining > 0}
            style={{
              width: '100%',
              padding: '14px 18px',
              fontSize: '16px',
              fontWeight: '500',
              backgroundColor: lockoutRemaining > 0 ? 'var(--theme-surface)' : 'var(--theme-accent)',
              color: '#0a0a0f',
              border: 'none',
              borderRadius: '10px',
              cursor: lockoutRemaining > 0 ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '1px',
            }}
            onMouseOver={(e) => { if (lockoutRemaining <= 0) e.target.style.backgroundColor = '#33ddff' }}
            onMouseOut={(e) => { if (lockoutRemaining <= 0) e.target.style.backgroundColor = 'var(--theme-accent)' }}
          >
            AUTHENTICATE
          </button>
        </form>
      </div>
    </div>
  )
}
