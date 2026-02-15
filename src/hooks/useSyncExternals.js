// ========================================
// FEATURE: useSyncExternalStore shim
// Added: 2026-02-15 by Mason (FF-BLD-001)
// ========================================

import { useSyncExternalStore } from 'react'

export function useSyncExternals(subscribe, getSnapshot) {
  return useSyncExternalStore(subscribe, getSnapshot)
}
