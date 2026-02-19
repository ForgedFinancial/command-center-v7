// ========================================
// Scheduled Callback Queue — Phase 4A
// Date/time picker, iCloud calendar integration, notifications
// One-click dial from callback queue
// ========================================
import { useState, useEffect, useCallback } from 'react'
import { WORKER_PROXY_URL, getSyncHeaders } from '../../../../config/api'
import { usePhone } from '../../../../context/PhoneContext'

function formatDateTime(isoString) {
  if (!isoString) return 'Not scheduled'
  const date = new Date(isoString)
  const today = new Date()
  const tomorrow = new Date(today.getTime() + 86400000)
  
  if (date.toDateString() === today.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return `Tomorrow at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  } else {
    return date.toLocaleString([], { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
}

function formatPhone(phone) {
  if (!phone) return ''
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
  }
  return phone
}

function isOverdue(callbackTime) {
  if (!callbackTime) return false
  return new Date(callbackTime).getTime() < Date.now()
}

function isUpcoming(callbackTime) {
  if (!callbackTime) return false
  const timeUntil = new Date(callbackTime).getTime() - Date.now()
  return timeUntil > 0 && timeUntil <= 300000 // Within 5 minutes
}

export default function CallbackQueue() {
  const { makeCall } = usePhone()
  const [callbacks, setCallbacks] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [showScheduler, setShowScheduler] = useState(false)
  const [newCallback, setNewCallback] = useState({
    name: '',
    phone: '',
    datetime: '',
    notes: '',
  })

  const fetchCallbacks = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Mock data for now - in real app this would fetch from database
      const mockCallbacks = [
        {
          id: 'cb_1',
          name: 'John Smith',
          phone: '+17739239449',
          callbackTime: new Date(Date.now() + 180000).toISOString(), // 3 min from now
          notes: 'Follow up on life insurance quote',
          created_at: new Date(Date.now() - 3600000).toISOString(),
          status: 'scheduled',
        },
        {
          id: 'cb_2',
          name: 'Sarah Johnson', 
          phone: '+16304896325',
          callbackTime: new Date(Date.now() - 1800000).toISOString(), // 30 min ago (overdue)
          notes: 'Discuss final expense options',
          created_at: new Date(Date.now() - 7200000).toISOString(),
          status: 'overdue',
        },
        {
          id: 'cb_3',
          name: 'Mike Davis',
          phone: '+14692754702', 
          callbackTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
          notes: 'Present term life proposal',
          created_at: new Date(Date.now() - 1800000).toISOString(),
          status: 'scheduled',
        },
      ]
      
      // Sort by callback time
      const sortedCallbacks = mockCallbacks.sort((a, b) => 
        new Date(a.callbackTime).getTime() - new Date(b.callbackTime).getTime()
      )
      
      setCallbacks(sortedCallbacks)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCallbacks()
    
    // Check for upcoming callbacks every minute
    const interval = setInterval(() => {
      const upcomingCallbacks = callbacks.filter(cb => isUpcoming(cb.callbackTime))
      
      if (upcomingCallbacks.length > 0) {
        upcomingCallbacks.forEach(cb => {
          // Show browser notification
          if (Notification.permission === 'granted') {
            new Notification(`Callback Due: ${cb.name}`, {
              body: `Scheduled callback with ${cb.name} is due in 5 minutes`,
              icon: '/favicon.ico',
              tag: `callback-${cb.id}`,
            })
          }
        })
      }
      
      fetchCallbacks() // Refresh data
    }, 60000)

    return () => clearInterval(interval)
  }, [fetchCallbacks, callbacks])

  // Request notification permission on mount
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const handleScheduleCallback = useCallback(async () => {
    if (!newCallback.name || !newCallback.phone || !newCallback.datetime) {
      setError('Name, phone, and datetime are required')
      return
    }

    try {
      const callbackData = {
        name: newCallback.name,
        phone: newCallback.phone,
        callbackTime: new Date(newCallback.datetime).toISOString(),
        notes: newCallback.notes,
      }

      // Create calendar event via VPS CalDAV endpoint
      await fetch(`${WORKER_PROXY_URL}/api/calendar/events`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getSyncHeaders() },
        body: JSON.stringify({
          title: `Callback: ${callbackData.name}`,
          start: callbackData.callbackTime,
          description: `Phone: ${callbackData.phone}\nNotes: ${callbackData.notes}`,
          alarm: 5, // 5-minute reminder
        }),
      })

      // Reset form
      setNewCallback({ name: '', phone: '', datetime: '', notes: '' })
      setShowScheduler(false)
      
      // Refresh callbacks
      fetchCallbacks()
    } catch (err) {
      setError(err.message)
    }
  }, [newCallback, fetchCallbacks])

  const handleDialCallback = useCallback(async (callback) => {
    try {
      await makeCall({
        phone: callback.phone,
        name: callback.name,
        id: callback.id,
      })
      
      // Mark as called (in real app, this would update database)
      setCallbacks(prev => 
        prev.map(cb => 
          cb.id === callback.id 
            ? { ...cb, status: 'called', calledAt: new Date().toISOString() }
            : cb
        )
      )
    } catch (err) {
      setError(err.message)
    }
  }, [makeCall])

  const overdueCallbacks = callbacks.filter(cb => isOverdue(cb.callbackTime))
  const upcomingCallbacks = callbacks.filter(cb => !isOverdue(cb.callbackTime))

  return (
    <div style={{
      padding: '20px',
      borderRadius: '12px',
      background: 'rgba(255,255,255,0.03)',
      border: '1px solid rgba(255,255,255,0.06)',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#e4e4e7' }}>
          📅 Callback Queue
        </h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={fetchCallbacks}
            disabled={loading}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#a1a1aa',
              fontSize: '11px',
              cursor: loading ? 'default' : 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? '⟳ Loading...' : '⟳ Refresh'}
          </button>
          <button
            onClick={() => setShowScheduler(!showScheduler)}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(74,222,128,0.3)',
              background: 'rgba(74,222,128,0.1)',
              color: '#4ade80',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            + Schedule
          </button>
        </div>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          borderRadius: '8px',
          background: 'rgba(239,68,68,0.1)',
          border: '1px solid rgba(239,68,68,0.3)',
          color: '#ef4444',
          fontSize: '12px',
          marginBottom: '16px',
        }}>
          {error}
        </div>
      )}

      {/* Schedule New Callback */}
      {showScheduler && (
        <div style={{
          padding: '16px',
          borderRadius: '8px',
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.06)',
          marginBottom: '16px',
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600, color: '#e4e4e7' }}>
            Schedule New Callback
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <input
              type="text"
              placeholder="Lead name"
              value={newCallback.name}
              onChange={e => setNewCallback(prev => ({ ...prev, name: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e4e4e7',
                fontSize: '12px',
                outline: 'none',
              }}
            />
            <input
              type="tel"
              placeholder="Phone number"
              value={newCallback.phone}
              onChange={e => setNewCallback(prev => ({ ...prev, phone: e.target.value }))}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.04)',
                color: '#e4e4e7',
                fontSize: '12px',
                outline: 'none',
              }}
            />
          </div>
          <input
            type="datetime-local"
            value={newCallback.datetime}
            onChange={e => setNewCallback(prev => ({ ...prev, datetime: e.target.value }))}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e4e4e7',
              fontSize: '12px',
              outline: 'none',
              marginBottom: '8px',
            }}
          />
          <textarea
            placeholder="Notes (optional)"
            value={newCallback.notes}
            onChange={e => setNewCallback(prev => ({ ...prev, notes: e.target.value }))}
            style={{
              width: '100%',
              height: '60px',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.04)',
              color: '#e4e4e7',
              fontSize: '12px',
              outline: 'none',
              resize: 'none',
              marginBottom: '12px',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={handleScheduleCallback}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(74,222,128,0.3)',
                background: 'rgba(74,222,128,0.1)',
                color: '#4ade80',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Schedule Callback
            </button>
            <button
              onClick={() => setShowScheduler(false)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: '1px solid rgba(255,255,255,0.1)',
                background: 'rgba(255,255,255,0.05)',
                color: '#a1a1aa',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Overdue Callbacks */}
      {overdueCallbacks.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ 
            margin: '0 0 8px 0', 
            fontSize: '13px', 
            fontWeight: 600, 
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}>
            🚨 Overdue ({overdueCallbacks.length})
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {overdueCallbacks.map(callback => (
              <CallbackItem 
                key={callback.id}
                callback={callback}
                isOverdue={true}
                onDial={handleDialCallback}
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Callbacks */}
      <div>
        <h4 style={{ 
          margin: '0 0 8px 0', 
          fontSize: '13px', 
          fontWeight: 600, 
          color: '#a1a1aa',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          ⏰ Upcoming ({upcomingCallbacks.length})
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {upcomingCallbacks.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '20px', 
              color: '#71717a', 
              fontSize: '12px' 
            }}>
              No upcoming callbacks
            </div>
          ) : (
            upcomingCallbacks.map(callback => (
              <CallbackItem 
                key={callback.id}
                callback={callback}
                isOverdue={false}
                onDial={handleDialCallback}
              />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function CallbackItem({ callback, isOverdue, onDial }) {
  const isUpcomingSoon = isUpcoming(callback.callbackTime)
  
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 16px',
      borderRadius: '8px',
      background: isOverdue 
        ? 'rgba(239,68,68,0.08)' 
        : isUpcomingSoon 
        ? 'rgba(245,158,11,0.08)' 
        : 'rgba(255,255,255,0.02)',
      border: isOverdue 
        ? '1px solid rgba(239,68,68,0.2)' 
        : isUpcomingSoon
        ? '1px solid rgba(245,158,11,0.2)'
        : '1px solid rgba(255,255,255,0.04)',
    }}>
      {/* Callback Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>
            {callback.name}
          </span>
          {isOverdue && (
            <span style={{
              fontSize: '9px',
              fontWeight: 600,
              color: '#ef4444',
              background: 'rgba(239,68,68,0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>
              OVERDUE
            </span>
          )}
          {isUpcomingSoon && (
            <span style={{
              fontSize: '9px',
              fontWeight: 600,
              color: '#f59e0b',
              background: 'rgba(245,158,11,0.15)',
              padding: '2px 6px',
              borderRadius: '4px',
            }}>
              DUE SOON
            </span>
          )}
        </div>
        <div style={{ fontSize: '11px', color: '#71717a', marginBottom: '2px' }}>
          {formatPhone(callback.phone)} · {formatDateTime(callback.callbackTime)}
        </div>
        {callback.notes && (
          <div style={{ fontSize: '10px', color: '#a1a1aa', fontStyle: 'italic' }}>
            {callback.notes}
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={() => onDial(callback)}
        style={{
          padding: '6px 12px',
          borderRadius: '6px',
          border: isOverdue 
            ? '1px solid rgba(239,68,68,0.3)' 
            : '1px solid rgba(74,222,128,0.3)',
          background: isOverdue 
            ? 'rgba(239,68,68,0.1)' 
            : 'rgba(74,222,128,0.1)',
          color: isOverdue ? '#ef4444' : '#4ade80',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        📞 Call Now
      </button>
    </div>
  )
}