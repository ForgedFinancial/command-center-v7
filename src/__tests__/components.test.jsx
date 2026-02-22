import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

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
import { render, screen } from '@testing-library/react'
import { renderWithContext } from './helpers/renderWithContext'

describe('ErrorBoundary', () => {
  it('renders children when no error', async () => {
    const ErrorBoundary = (await import('../components/shared/ErrorBoundary.jsx')).default
    render(
      <ErrorBoundary>
        <div>Child content</div>
      </ErrorBoundary>
    )
    expect(screen.getByText('Child content')).toBeInTheDocument()
  })

  it('catches errors and shows recovery UI', async () => {
    const ErrorBoundary = (await import('../components/shared/ErrorBoundary.jsx')).default

    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function Bomb() {
      throw new Error('Boom!')
    }

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>
    )

    expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    expect(screen.getByText('Try Again')).toBeInTheDocument()

    consoleSpy.mockRestore()
  })
})

describe('Toast', () => {
  it('renders message', async () => {
    const Toast = (await import('../components/shared/Toast.jsx')).default
    render(<Toast id={1} type="info" message="Hello world" onClose={() => {}} />)
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  it('renders with different types', async () => {
    const Toast = (await import('../components/shared/Toast.jsx')).default
    const { container } = render(
      <Toast id={2} type="error" message="Error occurred" onClose={() => {}} />
    )
    expect(screen.getByText('Error occurred')).toBeInTheDocument()
    expect(container).toBeInTheDocument()
  })
})

describe('Badge', () => {
  it('renders with variant', async () => {
    const Badge = (await import('../components/shared/Badge.jsx')).default
    render(<Badge variant="success">Online</Badge>)
    expect(screen.getByText('Online')).toBeInTheDocument()
  })

  it('renders with neutral variant by default', async () => {
    const Badge = (await import('../components/shared/Badge.jsx')).default
    render(<Badge>Default</Badge>)
    expect(screen.getByText('Default')).toBeInTheDocument()
  })

  it('renders with error variant', async () => {
    const Badge = (await import('../components/shared/Badge.jsx')).default
    render(<Badge variant="error">Critical</Badge>)
    expect(screen.getByText('Critical')).toBeInTheDocument()
  })
})
