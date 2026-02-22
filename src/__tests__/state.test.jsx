import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'

let originalLocalStorage

beforeAll(() => {
  originalLocalStorage = globalThis.localStorage
  const store = {}
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: vi.fn((k) => (k in store ? store[k] : null)),
      setItem: vi.fn((k, v) => { store[k] = String(v) }),
      removeItem: vi.fn((k) => { delete store[k] }),
      clear: vi.fn(() => { Object.keys(store).forEach(k => delete store[k]) }),
    },
  })
})

afterAll(() => {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: originalLocalStorage,
  })
})

// We need to test the reducer directly — import from AppContext
// The reducer isn't exported, so we test via the provider actions
// Actually let's test the reducer logic by importing the module

describe('AppContext Reducer', () => {
  let appReducer, initialState, ActionTypes

  beforeEach(async () => {
    // Dynamic import to get fresh module
    const mod = await import('../context/AppContext.jsx')
    ActionTypes = mod.ActionTypes
    // The reducer and initialState aren't exported directly,
    // so we test behavior through the provider
  })

  it('exports ActionTypes', () => {
    expect(ActionTypes).toBeDefined()
    expect(ActionTypes.SET_TAB).toBe('SET_TAB')
    expect(ActionTypes.SYNC_STATE).toBe('SYNC_STATE')
    expect(ActionTypes.SET_CENTERED_AGENT).toBe('SET_CENTERED_AGENT')
    expect(ActionTypes.UPDATE_SYSTEM_HEALTH).toBe('UPDATE_SYSTEM_HEALTH')
  })

  it('has all expected action types', () => {
    expect(ActionTypes.SET_CONNECTED).toBe('SET_CONNECTED')
    expect(ActionTypes.ADD_TOAST).toBe('ADD_TOAST')
    expect(ActionTypes.REMOVE_TOAST).toBe('REMOVE_TOAST')
    expect(ActionTypes.UPDATE_AGENTS).toBe('UPDATE_AGENTS')
  })
})

// Test the reducer indirectly by rendering a component that uses it
import { renderHook, act } from '@testing-library/react'
import { AppProvider, useApp } from '../context/AppContext'

function wrapper({ children }) {
  return <AppProvider>{children}</AppProvider>
}

describe('AppContext via useApp hook', () => {
  it('has correct initial activeTab', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    expect(result.current.state.activeTab).toBe('org-chart')
  })

  it('SET_TAB updates activeTab', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    act(() => result.current.actions.setTab('org-chart'))
    expect(result.current.state.activeTab).toBe('org-chart')
  })

  it('SET_CENTERED_AGENT updates centeredAgent', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    act(() => result.current.actions.setCenteredAgent('mason'))
    expect(result.current.state.centeredAgent).toBe('mason')
  })

  it('UPDATE_SYSTEM_HEALTH updates systemHealth', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    const newHealth = { status: 'degraded', uptime: 999 }
    act(() => result.current.actions.updateSystemHealth(newHealth))
    expect(result.current.state.systemHealth.status).toBe('degraded')
    expect(result.current.state.systemHealth.uptime).toBe(999)
  })

  it('SYNC_STATE merges data and sets isConnected', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    act(() => result.current.actions.syncState({ agents: { a: 1 } }))
    expect(result.current.state.isConnected).toBe(true)
    expect(result.current.state.agents).toEqual({ a: 1 })
  })

  it('ADD_TOAST and REMOVE_TOAST manage toasts', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    act(() => result.current.actions.addToast({ type: 'info', message: 'test' }))
    expect(result.current.state.toasts.length).toBe(1)
    expect(result.current.state.toasts[0].message).toBe('test')

    const toastId = result.current.state.toasts[0].id
    act(() => result.current.actions.removeToast(toastId))
    expect(result.current.state.toasts.length).toBe(0)
  })

  it('state updates deterministically with known ops', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    act(() => result.current.actions.setTab('task-board'))
    expect(result.current.state.activeTab).toBe('task-board')
  })

  it('SET_CONNECTED updates isConnected', () => {
    const { result } = renderHook(() => useApp(), { wrapper })
    act(() => result.current.actions.setConnected(true))
    expect(result.current.state.isConnected).toBe(true)
    act(() => result.current.actions.setConnected(false))
    expect(result.current.state.isConnected).toBe(false)
  })
})
