import '@testing-library/jest-dom'

// Global fetch mock
globalThis.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(''),
  })
)

// Mock crypto.subtle for AuthGate tests
if (!globalThis.crypto?.subtle) {
  globalThis.crypto = {
    ...globalThis.crypto,
    subtle: {
      digest: vi.fn(async (algo, data) => {
        // Return a deterministic fake hash buffer
        return new ArrayBuffer(32)
      }),
    },
  }
}
