import { useState } from 'react'

const RANGES = [
  { key: 'today', label: 'Today' },
  { key: 'week', label: 'This Week' },
  { key: 'month', label: 'This Month' },
  { key: 'quarter', label: 'This Quarter' },
  { key: 'ytd', label: 'YTD' },
  { key: 'all', label: 'All Time' },
  { key: 'custom', label: 'Custom' },
]

export default function TimeFilter({ value, onChange, customStart, customEnd, onCustomChange }) {
  const [showCustom, setShowCustom] = useState(false)

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {RANGES.map(r => (
        <button
          key={r.key}
          onClick={() => {
            if (r.key === 'custom') {
              setShowCustom(!showCustom)
            }
            onChange(r.key)
          }}
          className={`text-xs px-2.5 py-1.5 rounded-md transition-all ${
            value === r.key
              ? 'bg-blue-600 text-white'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300'
          }`}
        >
          {r.label}
        </button>
      ))}

      {value === 'custom' && (
        <div className="flex items-center gap-2 ml-2">
          <input
            type="date"
            value={customStart || ''}
            onChange={e => onCustomChange?.('start', e.target.value)}
            className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-600 rounded px-2 py-1"
          />
          <span className="text-zinc-500 text-xs">to</span>
          <input
            type="date"
            value={customEnd || ''}
            onChange={e => onCustomChange?.('end', e.target.value)}
            className="text-xs bg-zinc-800 text-zinc-300 border border-zinc-600 rounded px-2 py-1"
          />
        </div>
      )}
    </div>
  )
}
