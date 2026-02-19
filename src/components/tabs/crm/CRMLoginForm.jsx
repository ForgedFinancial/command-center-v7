import { useState } from 'react'
import { useCRM } from '../../../context/CRMContext'
import crmClient from '../../../api/crmClient'

export default function CRMLoginForm() {
  const { actions } = useCRM()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    setError('')
    try {
      const res = await crmClient.login(email, password)
      if (res.token) {
        actions.setToken(res.token)
        if (res.user) actions.setUser(res.user)
        actions.setAuthLoading(false)
      } else {
        setError('Invalid response from server')
      }
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '1px solid var(--theme-border)',
    background: 'var(--theme-bg)',
    color: 'var(--theme-text-primary)',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '60vh',
    }}>
      <form onSubmit={handleSubmit} style={{
        width: '380px',
        padding: '32px',
        borderRadius: '16px',
        background: 'var(--theme-surface)',
        border: '1px solid var(--theme-border-subtle)',
      }}>
        <h2 style={{ margin: '0 0 8px', fontSize: '20px', fontWeight: 700, color: 'var(--theme-text-primary)', textAlign: 'center' }}>
          CRM Login
        </h2>
        <p style={{ margin: '0 0 24px', fontSize: '13px', color: 'var(--theme-text-secondary)', textAlign: 'center' }}>
          Sign in to access your CRM data
        </p>

        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: '8px',
            background: 'transparent',
            border: '1px solid var(--theme-error)',
            color: 'var(--theme-error)',
            fontSize: '12px',
            marginBottom: '16px',
          }}>
            {error}
          </div>
        )}

        <div style={{ marginBottom: '14px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={inputStyle}
            autoFocus
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--theme-text-secondary)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            style={inputStyle}
          />
        </div>

        <button
          type="submit"
          disabled={loading || !email || !password}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '10px',
            border: '1px solid var(--theme-accent)',
            background: 'var(--theme-accent-muted)',
            color: 'var(--theme-accent)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  )
}
