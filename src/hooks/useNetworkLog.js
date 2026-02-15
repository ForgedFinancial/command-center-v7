// ========================================
// FEATURE: useNetworkLog
// Added: 2026-02-15 by Mason (FF-BLD-001)
// Hook to access the network log from syncClient
// ========================================

import { useSyncExternals } from './useSyncExternals'
import { networkLog, networkLogSubscribe } from '../api/syncClient'

export function useNetworkLog() {
  return useSyncExternals(networkLogSubscribe, () => networkLog.slice())
}
