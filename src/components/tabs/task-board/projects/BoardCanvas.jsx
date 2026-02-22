import { BOARD_THEME, GRID_BASE_SIZE } from './boardConstants'
import BoardItem from './BoardItem'
import SelectionBox from './SelectionBox'
import ConnectorLayer from './ConnectorLayer'

function Handle({ style, cursor, onPointerDown }) {
  return <div onPointerDown={onPointerDown} style={{ position: 'absolute', width: 8, height: 8, borderRadius: 2, background: '#fff', border: `2px solid ${BOARD_THEME.activeBorder}`, cursor, ...style }} />
}

export default function BoardCanvas({ viewport, onPointerDown, onPointerMove, onPointerUp, onWheel, items, connectors, selectedIds, selectedConnectorId, onSelectConnector, onItemPointerDown, onHandlePointerDown, onRotatePointerDown, onItemContentChange, selectionBox }) {
  const gridSize = GRID_BASE_SIZE * viewport.zoom
  const firstSelected = items.find((item) => selectedIds.has(item.id))

  return (
    <div onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerLeave={onPointerUp} onWheel={onWheel} style={{ position: 'absolute', inset: 0, overflow: 'hidden', backgroundColor: BOARD_THEME.canvasBg, backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.12) 1px, transparent 1px)', backgroundSize: `${gridSize}px ${gridSize}px`, backgroundPosition: `${viewport.x}px ${viewport.y}px` }}>
      <div className="board-canvas" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`, transformOrigin: '0 0', willChange: 'transform', position: 'absolute', inset: 0 }}>
        <ConnectorLayer items={items} connectors={connectors} selectedId={selectedConnectorId} onSelect={onSelectConnector} />
        {[...items].sort((a, b) => (a.type === 'frame' ? -1 : 0) - (b.type === 'frame' ? -1 : 0)).map((item) => (
          <BoardItem key={item.id} item={item} isSelected={selectedIds.has(item.id)} onPointerDown={(event) => onItemPointerDown(event, item.id)} onContentChange={(content) => onItemContentChange(item.id, content)} />
        ))}

        {firstSelected && selectedIds.size === 1 && (
          <div style={{ position: 'absolute', left: firstSelected.x, top: firstSelected.y, width: firstSelected.width, height: firstSelected.height, transform: `rotate(${firstSelected.rotation || 0}deg)`, pointerEvents: 'none' }}>
            <div onPointerDown={(e) => onRotatePointerDown(e, firstSelected.id)} style={{ pointerEvents: 'auto', position: 'absolute', left: '50%', top: -20, marginLeft: -5, width: 10, height: 10, borderRadius: 999, background: BOARD_THEME.activeBorder, cursor: 'crosshair' }} />
            <Handle onPointerDown={(e) => onHandlePointerDown(e, firstSelected.id, 'se')} cursor="nwse-resize" style={{ right: -4, bottom: -4, pointerEvents: 'auto' }} />
          </div>
        )}

        <SelectionBox box={selectionBox} />
      </div>
    </div>
  )
}
