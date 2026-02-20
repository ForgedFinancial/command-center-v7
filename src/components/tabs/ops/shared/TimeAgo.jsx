import { useState, useEffect } from 'react'
import { getTimeColor } from '../pipeline/pipelineConstants'

export default function TimeAgo({ date, showColor = false }) {
  const [, setTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 30000)
    return () => clearInterval(id)
  }, [])

  if (!date) return null

  const ms = Date.now() - new Date(date).getTime()
  const mins = Math.floor(ms / 60000)
  const hours = Math.floor(mins / 60)
  const days = Math.floor(hours / 24)

  let text
  if (days > 0) text = `${days}d ${hours % 24}h`
  else if (hours > 0) text = `${hours}h ${mins % 60}m`
  else text = `${mins}m`

  const color = showColor ? getTimeColor(date) : 'var(--theme-text-secondary)'

  return (
    <span style={{ fontSize: '11px', color, fontWeight: showColor ? 600 : 400 }}>
      {text}
    </span>
  )
}
