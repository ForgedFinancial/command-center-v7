export function screenToCanvas(screenX, screenY, viewport) {
  return {
    x: (screenX - viewport.x) / viewport.zoom,
    y: (screenY - viewport.y) / viewport.zoom,
  }
}

export function canvasToScreen(canvasX, canvasY, viewport) {
  return {
    x: canvasX * viewport.zoom + viewport.x,
    y: canvasY * viewport.zoom + viewport.y,
  }
}

export function centerViewport(canvasX, canvasY, viewportW, viewportH, zoom) {
  return {
    x: viewportW / 2 - canvasX * zoom,
    y: viewportH / 2 - canvasY * zoom,
    zoom,
  }
}
