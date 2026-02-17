import Modal from './Modal'

export default function ConfirmDialog({ isOpen, onClose, onConfirm, title = 'Confirm', message, confirmLabel = 'Delete', confirmColor = '#ef4444' }) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      width={420}
      footer={
        <>
          <button
            onClick={onClose}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'transparent',
              color: '#a1a1aa',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => { onConfirm(); onClose() }}
            style={{
              padding: '8px 16px',
              fontSize: '12px',
              borderRadius: '8px',
              border: `1px solid ${confirmColor}40`,
              background: `${confirmColor}18`,
              color: confirmColor,
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p style={{ margin: 0, fontSize: '14px', color: '#a1a1aa', lineHeight: 1.6 }}>
        {message}
      </p>
    </Modal>
  )
}
