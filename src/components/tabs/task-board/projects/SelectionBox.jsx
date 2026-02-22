export default function SelectionBox({ box }) {
  if (!box) return null
  const left = Math.min(box.x1, box.x2)
  const top = Math.min(box.y1, box.y2)
  const width = Math.abs(box.x2 - box.x1)
  const height = Math.abs(box.y2 - box.y1)

  return (
    <div
      style={{
        position: 'absolute',
        left,
        top,
        width,
        height,
        border: '1px dashed #3b82f6',
        background: 'rgba(59,130,246,0.08)',
        pointerEvents: 'none',
      }}
    />
  )
}
