import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ManifestTabs from '../components/tabs/ops-board/task-detail/ManifestTabs'

describe('ManifestTabs', () => {
  it('calls onSave with edited content workflow', () => {
    const onSave = vi.fn()
    const onChange = vi.fn()
    const onSectionChange = vi.fn()

    render(
      <ManifestTabs
        activeSection="spec"
        onSectionChange={onSectionChange}
        sectionContent="Initial"
        onChange={onChange}
        onSave={onSave}
        loading={false}
      />,
    )

    fireEvent.change(screen.getByDisplayValue('Initial'), { target: { value: 'Updated spec' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Section' }))

    expect(onChange).toHaveBeenCalled()
    expect(onSave).toHaveBeenCalledTimes(1)
  })
})
