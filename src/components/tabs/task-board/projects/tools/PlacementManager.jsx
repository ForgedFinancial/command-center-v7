import { useEffect } from 'react'

export default function PlacementManager({ active, onEsc }) {
  useEffect(() => {
    if (!active) return
    const onKey = (e) => {
      if (e.key === 'Escape') onEsc?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onEsc])

  return null
}
