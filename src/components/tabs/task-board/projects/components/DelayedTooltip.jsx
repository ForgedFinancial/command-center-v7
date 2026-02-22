import { useEffect, useRef, useState } from 'react'

export default function DelayedTooltip({ label, children, delay = 150, placement = 'top' }) {
  const [visible, setVisible] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const show = () => {
    if (!label) return
    timerRef.current = setTimeout(() => setVisible(true), delay)
  }

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setVisible(false)
  }

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      {visible && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            ...(placement === 'right'
              ? { left: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }
              : placement === 'left'
                ? { right: 'calc(100% + 8px)', top: '50%', transform: 'translateY(-50%)' }
                : {
                  left: '50%',
                  transform: 'translateX(-50%)',
                  ...(placement === 'bottom' ? { top: 'calc(100% + 8px)' } : { bottom: 'calc(100% + 8px)' }),
                }),
            background: 'rgba(12,16,24,0.95)',
            border: '1px solid rgba(154,167,188,0.28)',
            color: '#E6EDF7',
            borderRadius: 8,
            padding: '6px 8px',
            fontSize: 11,
            fontWeight: 500,
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            zIndex: 90,
            pointerEvents: 'none',
          }}
        >
          {label}
        </span>
      )}
    </span>
  )
}
