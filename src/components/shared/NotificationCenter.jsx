// ========================================
// FEATURE: Notification Center + Hover-to-Read
// Added: 2026-02-18 by Mason (FF-BLD-001)
// Bell icon with dropdown, hover 1.5s to mark read
// ========================================

import { useState, useEffect, useRef, useCallback } from 'react'
import { WORKER_PROXY_URL, ENDPOINTS } from '../../config/api'

const POLL_INTERVAL = 120000 // 2 min (was 30s)

function getToken() {
  return sessionStorage.getItem('cc_auth_token') || ''
}

async function apiFetch(endpoint, options = {}) {
  const res = await fetch(`${WORKER_PROXY_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getToken()}`,
      ...options.headers,
    },
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

const TYPE_ICONS = {
  task: '📋',
  agent: '🤖',
  build: '🔨',
  success: '✅',
  warning: '⚠️',
  error: '❌',
  info: 'ℹ️',
}

function NotificationItem({ notif, onMarkRead }) {
  const timerRef = useRef(null)
  const [isRead, setIsRead] = useState(notif.read)
  const [fading, setFading] = useState(false)

  const handleMouseEnter = () => {
    if (isRead) return
    timerRef.current = setTimeout(() => {
      setFading(true)
      setTimeout(() => setIsRead(true), 300)
      onMarkRead(notif.id)
    }, 1500)
  }

  const handleMouseLeave = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const icon = TYPE_ICONS[notif.type] || TYPE_ICONS.info
  const timeAgo = formatTimeAgo(notif.createdAt)

  return (
    <div
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        background: isRead ? 'transparent' : 'var(--theme-accent-muted)',
        opacity: fading ? 0.6 : 1,
        transition: 'all 0.3s ease',
        cursor: 'default',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '14px', flexShrink: 0, marginTop: '1px' }}>{icon}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '12px',
            fontWeight: isRead ? 400 : 600,
            color: isRead ? '#a1a1aa' : '#e4e4e7',
            transition: 'all 0.3s ease',
          }}>
            {notif.title}
          </div>
          {notif.description && (
            <div style={{
              fontSize: '11px',
              color: isRead ? '#52525b' : '#71717a',
              marginTop: '2px',
              transition: 'color 0.3s ease',
            }}>
              {notif.description}
            </div>
          )}
          <div style={{ fontSize: '10px', color: 'var(--theme-text-secondary)', marginTop: '4px' }}>
            {timeAgo}
          </div>
        </div>
        {!isRead && (
          <div style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: 'var(--theme-accent)', flexShrink: 0, marginTop: '6px',
            transition: 'opacity 0.3s ease',
            opacity: fading ? 0 : 1,
          }} />
        )}
      </div>
    </div>
  )
}

export default function NotificationCenter() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const panelRef = useRef(null)
  const intervalRef = useRef(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const data = await apiFetch(ENDPOINTS.notifications)
      if (data.ok) {
        setNotifications(data.data || [])
        setUnreadCount(data.unreadCount || 0)
      }
    } catch {
      // Silently fail — don't break the header
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
    intervalRef.current = setInterval(fetchNotifications, POLL_INTERVAL)
    return () => clearInterval(intervalRef.current)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const handleMarkRead = async (id) => {
    try {
      await apiFetch(ENDPOINTS.notificationRead(id), { method: 'PUT' })
      setUnreadCount(prev => Math.max(0, prev - 1))
    } catch {
      // fail silently
    }
  }

  return (
    <div ref={panelRef} style={{ position: 'relative' }}>
      {/* Bell Button */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '4px 8px',
          color: 'var(--theme-text-secondary)',
          transition: 'color 0.15s',
        }}
        onMouseOver={(e) => e.currentTarget.style.color = 'var(--theme-text-primary)'}
        onMouseOut={(e) => e.currentTarget.style.color = 'var(--theme-text-secondary)'}
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0px',
            right: '2px',
            minWidth: '16px',
            height: '16px',
            borderRadius: '8px',
            background: '#ef4444',
            color: '#fff',
            fontSize: '9px',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 4px',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          width: '360px',
          maxHeight: '480px',
          borderRadius: '12px',
          border: '1px solid var(--theme-border)',
          background: 'rgba(15,15,26,0.98)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          overflow: 'hidden',
          zIndex: 1000,
          animation: 'notifSlideIn 0.15s ease-out',
        }}>
          {/* Header */}
          <div style={{
            padding: '14px 16px',
            borderBottom: '1px solid var(--theme-border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--theme-text-primary)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span style={{
                fontSize: '10px', color: 'var(--theme-text-secondary)',
                padding: '2px 8px', borderRadius: '4px',
                background: 'var(--theme-bg)',
              }}>
                {unreadCount} unread
              </span>
            )}
          </div>

          {/* Notification List */}
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '40px 16px',
                textAlign: 'center',
                color: 'var(--theme-text-secondary)',
                fontSize: '12px',
              }}>
                No notifications yet
              </div>
            ) : (
              notifications.map(n => (
                <NotificationItem
                  key={n.id}
                  notif={n}
                  onMarkRead={handleMarkRead}
                />
              ))
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes notifSlideIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function formatTimeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
  return `${Math.floor(diff / 86400000)}d ago`
}
