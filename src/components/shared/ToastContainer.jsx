import { useApp } from '../../context/AppContext'
import { Toast } from './Toast'

/**
 * Fixed position container for toast notifications
 * Shows up to 3 toasts, stacked vertically
 */
export function ToastContainer() {
  const { state, actions } = useApp()
  const { toasts } = state

  // Only show last 3 toasts
  const visibleToasts = toasts.slice(-3)

  if (visibleToasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
      }}
    >
      {visibleToasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          message={toast.message}
          onClose={actions.removeToast}
        />
      ))}
    </div>
  )
}

export default ToastContainer
