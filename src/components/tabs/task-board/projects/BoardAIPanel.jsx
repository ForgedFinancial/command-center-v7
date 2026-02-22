import { useEffect, useState } from 'react'
import { BOARD_THEME } from './boardConstants'

export default function BoardAIPanel({ open, onClose, onGenerate, initialPrompt = '', initialMode = 'text' }) {
  const [prompt, setPrompt] = useState(initialPrompt)
  const [mode, setMode] = useState(initialMode)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setPrompt(initialPrompt || '')
    setMode(initialMode || 'text')
  }, [open, initialPrompt, initialMode])

  if (!open) return null

  return (
    <div style={{ position: 'fixed', right: 290, top: 24, width: 320, background: BOARD_THEME.panelBg, border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, zIndex: 120, fontFamily: BOARD_THEME.uiFont }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><strong>✦ AI Assist</strong><button onClick={onClose}>✕</button></div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe what to create…" style={{ width: '100%', minHeight: 90 }} />
      <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: '100%', marginTop: 8 }}>
        <option value="text">Text block</option>
        <option value="sticky_cluster">Sticky cluster</option>
        <option value="task_cards">Task cards</option>
      </select>
      <button
        disabled={loading || !prompt.trim()}
        onClick={async () => {
          setLoading(true)
          try {
            await onGenerate?.({ prompt: prompt.trim(), mode })
          } finally {
            setLoading(false)
          }
        }}
        style={{ marginTop: 8, width: '100%' }}
      >
        {loading ? 'Generating…' : 'Generate'}
      </button>
    </div>
  )
}
