import { useState, useEffect } from 'react'
import syncClient from '../../api/syncClient'
import Logo from '../shared/Logo'

// ========================================
// FEATURE: AuthGate
// Added: 2026-02-14 by Claude Code
// Password gate - renders BEFORE everything else
// ========================================

async function hashPassword(password) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export default function AuthGate({ onAuth }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [shake, setShake] = useState(false)

  useEffect(() => {
    checkExistingAuth()
  }, [])

  async function checkExistingAuth() {
    const storedHash = localStorage.getItem('forged-os-auth')

    if (storedHash) {
      // Hash exists locally - show enter password mode
      setIsCreating(false)
      setIsLoading(false)
      return
    }

    // No local hash - try to fetch from VPS
    try {
      const state = await syncClient.getState()
      if (state?.auth?.hash) {
        // Found hash on VPS - restore it locally
        localStorage.setItem('forged-os-auth', state.auth.hash)
        setIsCreating(false)
      } else {
        // No hash anywhere - create new password
        setIsCreating(true)
      }
    } catch (err) {
      // API error - assume new setup
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
      // Creating new password
      try {
        localStorage.setItem('forged-os-auth', inputHash)
        sessionStorage.setItem('forged-os-session', 'true')

        // Backup to VPS
        await syncClient.push({
          type: 'auth',
          action: 'set',
          data: { hash: inputHash },
        })

        onAuth()
      } catch (err) {
        console.error('Failed to save auth:', err)
        // Still allow local auth even if VPS backup fails
        onAuth()
      }
    } else {
      // Verifying existing password
      const storedHash = localStorage.getItem('forged-os-auth')

      if (inputHash === storedHash) {
        sessionStorage.setItem('forged-os-session', 'true')
        onAuth()
      } else {
        setError('Incorrect password')
        setShake(true)
        setTimeout(() => setShake(false), 500)
      }
    }
  }

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            border: '2px solid var(--border-color)',
            borderTopColor: 'var(--accent)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-primary)',
        padding: '16px',
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '40px',
          boxShadow: 'var(--shadow, 0 4px 24px rgba(0,0,0,0.3))',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <Logo size={64} />
          <h1
            style={{
              fontSize: '24px',
              fontWeight: '600',
              color: 'var(--text-primary)',
              marginTop: '16px',
              marginBottom: '4px',
            }}
          >
            FORGED-OS
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
            }}
          >
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
                backgroundColor: 'var(--bg-glass, var(--bg-secondary))',
                border: `1px solid ${error ? 'var(--status-error)' : 'var(--border-color)'}`,
                borderRadius: '10px',
                color: 'var(--text-primary)',
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
              input::placeholder {
                color: var(--text-muted);
              }
              input:focus {
                border-color: var(--accent);
                box-shadow: 0 0 0 3px rgba(0, 212, 255, 0.1), 0 0 12px rgba(0, 212, 255, 0.06);
              }
            `}</style>
          </div>

          {error && (
            <p
              style={{
                fontSize: '14px',
                color: 'var(--status-error)',
                marginBottom: '16px',
              }}
            >
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
              backgroundColor: 'var(--accent)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '10px',
              cursor: 'pointer',
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            onMouseOver={(e) => (e.target.style.backgroundColor = 'var(--accent-hover)')}
            onMouseOut={(e) => (e.target.style.backgroundColor = 'var(--accent)')}
          >
            {isCreating ? 'Create Password' : 'Enter'}
          </button>
        </form>
      </div>
    </div>
  )
}
