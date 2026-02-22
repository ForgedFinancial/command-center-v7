import { describe, expect, it } from 'vitest'
import { initialOpsBoardState, opsBoardReducer } from '../context/OpsBoardContext'

describe('OpsBoard reducer', () => {
  it('handles FETCH_TASKS_SUCCESS', () => {
    const next = opsBoardReducer(initialOpsBoardState, {
      type: 'FETCH_TASKS_SUCCESS',
      payload: [{ id: 'TASK-1', title: 'Task 1', stage: 'SPEC' }],
    })

    expect(next.initialized).toBe(true)
    expect(next.loading).toBe(false)
    expect(next.tasks).toHaveLength(1)
    expect(next.tasks[0].id).toBe('TASK-1')
  })

  it('upserts tasks and replaces matching id', () => {
    const seeded = {
      ...initialOpsBoardState,
      tasks: [{ id: 'TASK-1', title: 'Old', stage: 'SPEC' }],
    }

    const next = opsBoardReducer(seeded, {
      type: 'UPSERT_TASK',
      payload: { id: 'TASK-1', title: 'New', stage: 'PLANNING' },
    })

    expect(next.tasks).toHaveLength(1)
    expect(next.tasks[0].title).toBe('New')
    expect(next.tasks[0].stage).toBe('PLANNING')
  })

  it('stores websocket notifications', () => {
    const next = opsBoardReducer(initialOpsBoardState, {
      type: 'RECEIVE_NOTIFICATION',
      payload: { type: 'error', message: 'Gate failed' },
    })

    expect(next.notifications).toHaveLength(1)
    expect(next.notifications[0].message).toBe('Gate failed')
  })
})
