// ========================================
// HOOK: useDataSource
// Added: 2026-02-18 by Mason (FF-BLD-001)
// Shared state for Personal/Business/All toggle
// Syncs across Contacts, Phone, Messages views
// ========================================

import { useSyncExternalStore, useCallback } from 'react'

let _source = 'all'
const _listeners = new Set()

function subscribe(cb) {
  _listeners.add(cb)
  return () => _listeners.delete(cb)
}

function getSnapshot() {
  return _source
}

function notify() {
  _listeners.forEach(cb => cb())
}

export function setDataSource(val) {
  if (_source !== val) {
    _source = val
    notify()
  }
}

export function useDataSource() {
  const source = useSyncExternalStore(subscribe, getSnapshot)
  const setSource = useCallback((val) => setDataSource(val), [])
  return { source, setSource }
}
