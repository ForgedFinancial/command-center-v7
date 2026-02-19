// ========================================
// Call Recording Player — Inline audio with speed control
// Phase 8 Phone & Dialer System
// ========================================
import { useState, useRef, useEffect, useCallback } from 'react'

const SPEEDS = [1, 1.5, 2]

export default function CallRecordingPlayer({ recordingUrl, compact = false }) {
  const audioRef = useRef(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const formatTime = (s) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const togglePlay = useCallback(() => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
    } else {
      setLoading(true)
      audioRef.current.play().catch(() => setError('Failed to play')).finally(() => setLoading(false))
    }
    setPlaying(!playing)
  }, [playing])

  const cycleSpeed = useCallback(() => {
    const idx = SPEEDS.indexOf(speed)
    const next = SPEEDS[(idx + 1) % SPEEDS.length]
    setSpeed(next)
    if (audioRef.current) audioRef.current.playbackRate = next
  }, [speed])

  const handleScrub = useCallback((e) => {
    if (!audioRef.current || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = pct * duration
  }, [duration])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onTime = () => setCurrentTime(audio.currentTime)
    const onMeta = () => setDuration(audio.duration)
    const onEnd = () => setPlaying(false)
    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('ended', onEnd)
    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('ended', onEnd)
    }
  }, [])

  if (!recordingUrl) return null

  const progress = duration ? (currentTime / duration) * 100 : 0

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      padding: compact ? '4px 8px' : '8px 12px',
      borderRadius: '8px', background: 'rgba(168,85,247,0.08)',
      border: '1px solid rgba(168,85,247,0.2)',
    }}>
      <audio ref={audioRef} src={recordingUrl} preload="metadata" />

      {/* Play/Pause */}
      <button onClick={togglePlay} style={{
        width: '28px', height: '28px', borderRadius: '50%',
        border: '1px solid rgba(168,85,247,0.4)', background: 'rgba(168,85,247,0.15)',
        color: '#a855f7', fontSize: '12px', cursor: 'pointer', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        {loading ? '⟳' : playing ? '⏸' : '▶'}
      </button>

      {/* Time */}
      <span style={{ fontSize: '10px', color: '#a1a1aa', fontVariantNumeric: 'tabular-nums', width: '32px', flexShrink: 0 }}>
        {formatTime(currentTime)}
      </span>

      {/* Scrub bar */}
      <div
        onClick={handleScrub}
        style={{
          flex: 1, height: '4px', borderRadius: '2px',
          background: 'rgba(255,255,255,0.1)', cursor: 'pointer', position: 'relative',
        }}
      >
        <div style={{
          width: `${progress}%`, height: '100%', borderRadius: '2px',
          background: '#a855f7', transition: 'width 0.1s',
        }} />
      </div>

      {/* Duration */}
      <span style={{ fontSize: '10px', color: '#71717a', fontVariantNumeric: 'tabular-nums', width: '32px', flexShrink: 0 }}>
        {formatTime(duration)}
      </span>

      {/* Speed */}
      <button onClick={cycleSpeed} style={{
        padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 700,
        border: '1px solid rgba(168,85,247,0.3)', background: 'rgba(168,85,247,0.1)',
        color: '#a855f7', cursor: 'pointer', flexShrink: 0,
      }}>
        {speed}x
      </button>

      {error && <span style={{ fontSize: '10px', color: '#ef4444' }}>⚠</span>}
    </div>
  )
}
