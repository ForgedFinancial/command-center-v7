import { useState } from 'react'

export default function BoardAIPanel({ open, onClose, onGenerate }) {
  const [prompt, setPrompt] = useState('')
  const [mode, setMode] = useState('text')
  if (!open) return null

  return (
    <div style={{ position: 'fixed', right: 290, top: 24, width: 320, background: '#111827', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, padding: 12, zIndex: 120 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}><strong>✦ AI Assist</strong><button onClick={onClose}>✕</button></div>
      <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe what to create…" style={{ width: '100%', minHeight: 90 }} />
      <select value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: '100%', marginTop: 8 }}>
        <option value="text">Text block</option>
        <option value="sticky_cluster">Sticky cluster</option>
        <option value="task_cards">Task cards</option>
      </select>
      <button onClick={() => onGenerate({ prompt, mode })} style={{ marginTop: 8, width: '100%' }}>Generate</button>
    </div>
  )
}
