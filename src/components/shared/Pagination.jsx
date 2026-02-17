export default function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', padding: '16px 0' }}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          color: currentPage <= 1 ? '#71717a' : '#e4e4e7',
          cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
        }}
      >
        ← Prev
      </button>
      <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
        {currentPage} of {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        style={{
          padding: '6px 12px',
          fontSize: '12px',
          borderRadius: '6px',
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.03)',
          color: currentPage >= totalPages ? '#71717a' : '#e4e4e7',
          cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
        }}
      >
        Next →
      </button>
    </div>
  )
}
