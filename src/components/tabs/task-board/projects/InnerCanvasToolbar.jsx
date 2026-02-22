import { useRef } from 'react'

const TOOLS = [
  { id: 'line', label: 'Lines', icon: '🔗' },
  { id: 'shape', label: 'Shapes', icon: '⬛' },
  { id: 'text', label: 'Text Boxes', icon: '🔤' },
  { id: 'image', label: 'Images', icon: '🖼️' },
  { id: 'file', label: 'Files', icon: '📎' },
  { id: 'note', label: 'Notes', icon: '🗒️' },
  { id: 'metric', label: 'Metrics', icon: '📊' },
  { id: 'taskCard', label: 'Task Cards', icon: '✅' },
  { id: 'checklist', label: 'Checklists', icon: '☑️' },
]

export default function InnerCanvasToolbar({ activeTool, onSelectTool, onUploadImage, onUploadFile, onAgentChat, onNewSubProject }) {
  const imageInputRef = useRef(null)
  const fileInputRef = useRef(null)

  return (
    <div style={{
      width: '74px',
      borderRight: '1px solid rgba(255,255,255,0.08)',
      background: 'rgba(10,10,15,0.96)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px',
      padding: '12px 8px',
      flexShrink: 0,
    }}>
      {TOOLS.map(tool => {
        const isActive = activeTool === tool.id
        return (
          <button
            key={tool.id}
            onClick={() => {
              if (tool.id === 'image') return imageInputRef.current?.click()
              if (tool.id === 'file') return fileInputRef.current?.click()
              onSelectTool(tool.id)
            }}
            title={tool.label}
            style={{
              width: '52px', height: '52px', borderRadius: '10px',
              border: isActive ? '1px solid var(--theme-accent)' : '1px solid rgba(255,255,255,0.1)',
              background: isActive ? 'var(--theme-accent-muted)' : 'rgba(255,255,255,0.03)',
              color: isActive ? 'var(--theme-accent)' : 'var(--theme-text-secondary)',
              fontSize: '20px', cursor: 'pointer',
            }}
          >{tool.icon}</button>
        )
      })}

      <div style={{ width: '40px', height: '1px', background: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

      <button onClick={onNewSubProject} title="New sub-project" style={{ width: '52px', height: '40px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)', color: 'var(--theme-text-primary)', cursor: 'pointer' }}>📁+</button>
      <button onClick={onAgentChat} title="Agent brainstorm" style={{ width: '52px', height: '40px', borderRadius: '10px', border: '1px solid rgba(0,212,255,0.3)', background: 'var(--theme-accent-muted)', color: 'var(--theme-accent)', cursor: 'pointer' }}>🤖</button>

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUploadImage(file)
          e.target.value = ''
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUploadFile(file)
          e.target.value = ''
        }}
      />
    </div>
  )
}
