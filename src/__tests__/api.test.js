import { describe, it, expect, beforeEach, vi } from 'vitest'

// We need to test the SyncClient class directly
// Reset fetch mock before each test
beforeEach(() => {
  globalThis.fetch.mockReset()
})

describe('SyncClient', () => {
  let syncClient

  beforeEach(async () => {
    // Fresh import each time
    vi.resetModules()
    const mod = await import('../api/syncClient.js')
    syncClient = mod.syncClient
  })

  it('constructs URL from WORKER_PROXY_URL + endpoint', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      json: () => Promise.resolve({ status: 'ok' }),
    })

    await syncClient.health()

    expect(globalThis.fetch).toHaveBeenCalledTimes(1)
    const calledUrl = globalThis.fetch.mock.calls[0][0]
    expect(calledUrl).toContain('/api/health')
    expect(calledUrl).toContain('forged-sync.danielruh.workers.dev')
  })

  it('throws with .status on 404 response', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: { get: () => null },
    })

    try {
      await syncClient.health()
      expect.unreachable('Should have thrown')
    } catch (err) {
      expect(err.status).toBe(404)
      expect(err.message).toContain('404')
    }
  })

  it('throws with .status on 500 response', async () => {
    globalThis.fetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
      headers: { get: () => null },
    })

    try {
      await syncClient.health()
      expect.unreachable('Should have thrown')
    } catch (err) {
      expect(err.status).toBe(500)
    }
  })

  it('marks network errors with isNetwork flag', async () => {
    globalThis.fetch.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    try {
      await syncClient.health()
      expect.unreachable('Should have thrown')
    } catch (err) {
      expect(err.isNetwork).toBe(true)
      expect(err.status).toBe(0)
    }
  })

  it('times out after configured timeout', async () => {
    // Make fetch hang forever
    globalThis.fetch.mockImplementationOnce(
      (url, opts) =>
        new Promise((resolve, reject) => {
          opts?.signal?.addEventListener('abort', () => {
            reject(new DOMException('The operation was aborted.', 'AbortError'))
          })
        })
    )

    try {
      await syncClient.request('/api/health', { timeout: 50 })
      expect.unreachable('Should have thrown')
    } catch (err) {
      expect(err.isTimeout).toBe(true)
    }
  }, 5000)
})
