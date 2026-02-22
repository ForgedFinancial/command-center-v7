import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DEFAULT_VIEWPORT, MAX_ZOOM, MIN_ZOOM } from '../boardConstants'
import { centerViewport, screenToCanvas } from '../boardUtils'

export default function useViewport(containerRef) {
  const [viewport, setViewport] = useState(DEFAULT_VIEWPORT)
  const [isSpaceHeld, setIsSpaceHeld] = useState(false)
  const isPanning = useRef(false)
  const panStart = useRef({ x: 0, y: 0 })
  const rafRef = useRef(null)

  const beginPan = useCallback((event) => {
    const isMiddle = event.button === 1
    const isSpacePan = isSpaceHeld && event.button === 0
    if (!isMiddle && !isSpacePan) return false
    isPanning.current = true
    panStart.current = { x: event.clientX - viewport.x, y: event.clientY - viewport.y }
    return true
  }, [isSpaceHeld, viewport.x, viewport.y])

  const endPan = useCallback(() => {
    isPanning.current = false
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  const onPointerMove = useCallback((event) => {
    if (!isPanning.current) return
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      setViewport((v) => ({ ...v, x: event.clientX - panStart.current.x, y: event.clientY - panStart.current.y }))
    })
  }, [])

  const onWheel = useCallback((event) => {
    event.preventDefault()
    const zoomDelta = event.deltaY > 0 ? 0.9 : 1.1
    setViewport((v) => {
      const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * zoomDelta))
      const mouseCanvas = screenToCanvas(event.clientX, event.clientY, v)
      return {
        zoom: newZoom,
        x: event.clientX - mouseCanvas.x * newZoom,
        y: event.clientY - mouseCanvas.y * newZoom,
      }
    })
  }, [])

  const centerOnOrigin = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    setViewport(centerViewport(0, 0, rect.width, rect.height, 1))
  }, [containerRef])

  const zoomIn = useCallback(() => setViewport((v) => ({ ...v, zoom: Math.min(MAX_ZOOM, v.zoom * 1.1) })), [])
  const zoomOut = useCallback(() => setViewport((v) => ({ ...v, zoom: Math.max(MIN_ZOOM, v.zoom * 0.9) })), [])

  useEffect(() => {
    centerOnOrigin()
  }, [centerOnOrigin])

  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.code === 'Space') setIsSpaceHeld(true)
    }
    const onKeyUp = (event) => {
      if (event.code === 'Space') setIsSpaceHeld(false)
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  const api = useMemo(() => ({
    viewport,
    setViewport,
    beginPan,
    onPointerMove,
    endPan,
    onWheel,
    centerOnOrigin,
    zoomIn,
    zoomOut,
    isSpaceHeld,
    isPanning,
  }), [viewport, beginPan, onPointerMove, endPan, onWheel, centerOnOrigin, zoomIn, zoomOut, isSpaceHeld])

  return api
}
