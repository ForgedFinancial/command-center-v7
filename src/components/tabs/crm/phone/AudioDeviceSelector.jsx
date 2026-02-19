// ========================================
// Audio Device Selector — Mic, Speaker, Ringtone device management
// Phase 8 Phone & Dialer System
// ========================================
import { useState, useEffect, useCallback, useRef } from 'react'

const LS_KEY = 'forgedos_audio_devices'

function loadSaved() {
  try { return JSON.parse(localStorage.getItem(LS_KEY)) || {} } catch { return {} }
}

function savePref(prefs) {
  localStorage.setItem(LS_KEY, JSON.stringify(prefs))
}

export default function AudioDeviceSelector() {
  const [devices, setDevices] = useState({ inputs: [], outputs: [] })
  const [selected, setSelected] = useState(loadSaved)
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)
  const audioCtxRef = useRef(null)

  const enumerate = useCallback(async () => {
    try {
      // Need permission first
      await navigator.mediaDevices.getUserMedia({ audio: true }).then(s => s.getTracks().forEach(t => t.stop()))
      const all = await navigator.mediaDevices.enumerateDevices()
      setDevices({
        inputs: all.filter(d => d.kind === 'audioinput'),
        outputs: all.filter(d => d.kind === 'audiooutput'),
      })
    } catch (err) {
      console.error('[AUDIO] Enumerate failed:', err)
    }
  }, [])

  useEffect(() => { enumerate() }, [enumerate])

  useEffect(() => {
    navigator.mediaDevices?.addEventListener('devicechange', enumerate)
    return () => navigator.mediaDevices?.removeEventListener('devicechange', enumerate)
  }, [enumerate])

  const handleChange = (key, value) => {
    const next = { ...selected, [key]: value }
    setSelected(next)
    savePref(next)
  }

  const playTestTone = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const ctx = new AudioContext()
      audioCtxRef.current = ctx
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = 440
      gain.gain.value = 0.3
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      setTimeout(() => { osc.stop(); ctx.close(); setTestResult('✓ Test tone played'); setTesting(false) }, 1500)
    } catch {
      setTestResult('✗ Audio test failed')
      setTesting(false)
    }
  }, [])

  const recordTest = useCallback(async () => {
    setTesting(true)
    setTestResult(null)
    try {
      const constraints = { audio: selected.input ? { deviceId: { exact: selected.input } } : true }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      const recorder = new MediaRecorder(stream)
      const chunks = []
      recorder.ondataavailable = (e) => chunks.push(e.data)
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunks, { type: 'audio/webm' })
        const url = URL.createObjectURL(blob)
        const audio = new Audio(url)
        audio.play()
        setTestResult(`✓ Recorded ${(blob.size / 1024).toFixed(1)}KB — playing back`)
        setTesting(false)
      }
      recorder.start()
      setTimeout(() => recorder.stop(), 3000)
    } catch (err) {
      setTestResult(`✗ Mic test failed: ${err.message}`)
      setTesting(false)
    }
  }, [selected.input])

  const selectStyle = {
    width: '100%', padding: '8px 10px', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.04)',
    color: '#e4e4e7', fontSize: '12px', outline: 'none',
  }

  const labelStyle = { fontSize: '11px', fontWeight: 600, color: '#a1a1aa', marginBottom: '4px', display: 'block' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h4 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: '#e4e4e7' }}>🎧 Audio Devices</h4>

      {/* Input */}
      <div>
        <label style={labelStyle}>🎤 Microphone</label>
        <select style={selectStyle} value={selected.input || ''} onChange={e => handleChange('input', e.target.value)}>
          <option value="">System Default</option>
          {devices.inputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0,8)}`}</option>)}
        </select>
      </div>

      {/* Output */}
      <div>
        <label style={labelStyle}>🔊 Speaker</label>
        <select style={selectStyle} value={selected.output || ''} onChange={e => handleChange('output', e.target.value)}>
          <option value="">System Default</option>
          {devices.outputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0,8)}`}</option>)}
        </select>
      </div>

      {/* Ringtone device */}
      <div>
        <label style={labelStyle}>🔔 Ringtone Device</label>
        <select style={selectStyle} value={selected.ringtone || ''} onChange={e => handleChange('ringtone', e.target.value)}>
          <option value="">Same as Speaker</option>
          {devices.outputs.map(d => <option key={d.deviceId} value={d.deviceId}>{d.label || `Speaker ${d.deviceId.slice(0,8)}`}</option>)}
        </select>
      </div>

      {/* Test buttons */}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button onClick={playTestTone} disabled={testing} style={{
          flex: 1, padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
          border: '1px solid rgba(0,212,255,0.3)', background: 'rgba(0,212,255,0.08)',
          color: '#00d4ff', cursor: testing ? 'default' : 'pointer', opacity: testing ? 0.6 : 1,
        }}>
          🔊 Test Tone
        </button>
        <button onClick={recordTest} disabled={testing} style={{
          flex: 1, padding: '8px', borderRadius: '8px', fontSize: '11px', fontWeight: 600,
          border: '1px solid rgba(74,222,128,0.3)', background: 'rgba(74,222,128,0.08)',
          color: '#4ade80', cursor: testing ? 'default' : 'pointer', opacity: testing ? 0.6 : 1,
        }}>
          🎤 Test Mic (3s)
        </button>
      </div>

      {testResult && (
        <div style={{
          padding: '8px 12px', borderRadius: '8px', fontSize: '11px',
          background: testResult.startsWith('✓') ? 'rgba(74,222,128,0.08)' : 'rgba(239,68,68,0.08)',
          border: `1px solid ${testResult.startsWith('✓') ? 'rgba(74,222,128,0.2)' : 'rgba(239,68,68,0.2)'}`,
          color: testResult.startsWith('✓') ? '#4ade80' : '#ef4444',
        }}>
          {testResult}
        </div>
      )}
    </div>
  )
}
