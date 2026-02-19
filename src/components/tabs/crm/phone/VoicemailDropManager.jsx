// ========================================
// Voicemail Drop Manager — Record, manage, one-click drop
// Phase 8 Phone & Dialer System
// ========================================
import { useState, useRef, useCallback, useEffect } from 'react'
import CallRecordingPlayer from './CallRecordingPlayer'

const LS_KEY = 'forgedos_vm_drops'

function loadDrops() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || [] } catch { return [] }
}
function saveDrops(drops) {
  localStorage.setItem(LS_KEY, JSON.stringify(drops))
}

export default function VoicemailDropManager({ onDrop }) {
  const [drops, setDrops] = useState(loadDrops)
  const [recording, setRecording] = useState(false)
  const [newName, setNewName] = useState('')
  const [showRecorder, setShowRecorder] = useState(false)
  const recorderRef = useRef(null)
  const chunksRef = useRef([])
  const streamRef = useRef(null)

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
      chunksRef.current = []
      recorder.ondataavailable = (e) => chunksRef.current.push(e.data)
      recorder.start()
      recorderRef.current = recorder
      setRecording(true)
    } catch (err) {
      console.error('[VM DROP] Record failed:', err)
    }
  }, [])

  const stopRecording = useCallback(() => {
    if (!recorderRef.current) return
    recorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
      const url = URL.createObjectURL(blob)
      // Convert to base64 for localStorage persistence
      const reader = new FileReader()
      reader.onloadend = () => {
        const name = newName || `Drop ${drops.length + 1}`
        const newDrop = {
          id: Date.now().toString(),
          name,
          dataUrl: reader.result,
          blobUrl: url,
          size: blob.size,
          createdAt: new Date().toISOString(),
        }
        const next = [...drops, newDrop]
        setDrops(next)
        saveDrops(next.map(d => ({ ...d, blobUrl: undefined })))
        setNewName('')
        setShowRecorder(false)
      }
      reader.readAsDataURL(blob)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
    recorderRef.current.stop()
    setRecording(false)
  }, [drops, newName])

  const deleteDrop = (id) => {
    const next = drops.filter(d => d.id !== id)
    setDrops(next)
    saveDrops(next.map(d => ({ ...d, blobUrl: undefined })))
  }

  // Restore blob URLs from dataUrls
  useEffect(() => {
    setDrops(prev => prev.map(d => {
      if (!d.blobUrl && d.dataUrl) {
        try {
          const arr = d.dataUrl.split(',')
          const mime = arr[0].match(/:(.*?);/)?.[1] || 'audio/webm'
          const bstr = atob(arr[1])
          const u8 = new Uint8Array(bstr.length)
          for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i)
          const blob = new Blob([u8], { type: mime })
          return { ...d, blobUrl: URL.createObjectURL(blob) }
        } catch { return d }
      }
      return d
    }))
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#e4e4e7' }}>📼 Voicemail Drops</h4>
        <button onClick={() => setShowRecorder(!showRecorder)} style={{
          padding: '6px 12px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
          border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.08)',
          color: '#00d4ff', cursor: 'pointer',
        }}>
          {showRecorder ? '✕ Cancel' : '+ Record New'}
        </button>
      </div>

      {/* Recorder */}
      {showRecorder && (
        <div style={{
          padding: '16px', borderRadius: '12px',
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)',
        }}>
          <input
            value={newName} onChange={e => setNewName(e.target.value)}
            placeholder="Voicemail name (e.g. 'Intro Drop')"
            style={{
              width: '100%', padding: '8px 10px', borderRadius: '8px', marginBottom: '10px',
              border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
              color: '#e4e4e7', fontSize: '12px', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            {!recording ? (
              <button onClick={startRecording} style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                border: '1px solid rgba(239,68,68,0.4)', background: 'rgba(239,68,68,0.15)',
                color: '#ef4444', cursor: 'pointer',
              }}>
                🔴 Start Recording
              </button>
            ) : (
              <button onClick={stopRecording} style={{
                flex: 1, padding: '10px', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                border: '1px solid rgba(74,222,128,0.4)', background: 'rgba(74,222,128,0.15)',
                color: '#4ade80', cursor: 'pointer', animation: 'pulse 1s infinite',
              }}>
                ⏹ Stop & Save
              </button>
            )}
          </div>
          {recording && (
            <div style={{ fontSize: '11px', color: '#ef4444', marginTop: '8px', textAlign: 'center' }}>
              ● Recording...
            </div>
          )}
        </div>
      )}

      {/* Drop list */}
      {drops.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '24px', color: '#52525b', fontSize: '12px' }}>
          No voicemail drops recorded yet
        </div>
      ) : (
        drops.map(d => (
          <div key={d.id} style={{
            padding: '12px', borderRadius: '10px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#e4e4e7' }}>{d.name}</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {onDrop && (
                  <button onClick={() => onDrop(d)} style={{
                    padding: '4px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                    border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.1)',
                    color: '#a855f7', cursor: 'pointer',
                  }}>
                    📤 Drop
                  </button>
                )}
                <button onClick={() => deleteDrop(d.id)} style={{
                  padding: '4px 8px', borderRadius: '6px', fontSize: '10px',
                  border: '1px solid rgba(239,68,68,0.2)', background: 'transparent',
                  color: '#ef4444', cursor: 'pointer',
                }}>
                  🗑
                </button>
              </div>
            </div>
            {d.blobUrl && <CallRecordingPlayer recordingUrl={d.blobUrl} compact />}
            <div style={{ fontSize: '10px', color: '#52525b', marginTop: '4px' }}>
              {new Date(d.createdAt).toLocaleDateString()} · {(d.size / 1024).toFixed(0)}KB
            </div>
          </div>
        ))
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }`}</style>
    </div>
  )
}
