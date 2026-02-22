import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import OpsBoardHeader from '../components/tabs/ops-board/OpsBoardHeader'

describe('OpsBoardHeader filters', () => {
  it('emits filter updates for stage and search', () => {
    const onFiltersChange = vi.fn()

    render(
      <OpsBoardHeader
        tasks={[{ id: 'TASK-1', assignedAgent: 'mason' }]}
        filters={{ stage: '', agent: '', classification: '', priority: '', search: '' }}
        onFiltersChange={onFiltersChange}
        onOpenCreate={vi.fn()}
        syncing={false}
        wsConnected={true}
      />,
    )

    const stageSelect = screen.getByDisplayValue('All Stages')
    fireEvent.change(stageSelect, { target: { value: 'BUILD' } })

    const search = screen.getByPlaceholderText('Search title or description')
    fireEvent.change(search, { target: { value: 'auth' } })

    expect(onFiltersChange).toHaveBeenCalledWith({ stage: 'BUILD' })
    expect(onFiltersChange).toHaveBeenCalledWith({ search: 'auth' })
  })
})
