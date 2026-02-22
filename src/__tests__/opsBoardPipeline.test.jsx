import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import PipelineView from '../components/tabs/ops-board/pipeline/PipelineView'

describe('OpsBoard PipelineView', () => {
  it('renders all 7 stage columns', () => {
    render(<PipelineView tasks={[]} onMoveTask={vi.fn()} onOpenTask={vi.fn()} />)

    expect(screen.getByText('SPEC')).toBeInTheDocument()
    expect(screen.getByText('PLANNING')).toBeInTheDocument()
    expect(screen.getByText('BUILD')).toBeInTheDocument()
    expect(screen.getByText('VALIDATE')).toBeInTheDocument()
    expect(screen.getByText('DEPLOY')).toBeInTheDocument()
    expect(screen.getByText('MONITOR')).toBeInTheDocument()
    expect(screen.getByText('ARCHIVE')).toBeInTheDocument()
  })

  it('renders task cards in matching stage column', () => {
    render(
      <PipelineView
        tasks={[
          {
            id: 'TASK-100',
            title: 'Build auth flow',
            description: 'Implement oauth',
            stage: 'BUILD',
            classification: 'FULLSTACK',
            assignedAgent: 'mason',
            priority: 'high',
            progress: { percentage: 40, currentStep: 'Implement API' },
          },
        ]}
        onMoveTask={vi.fn()}
        onOpenTask={vi.fn()}
      />,
    )

    expect(screen.getByText('Build auth flow')).toBeInTheDocument()
    expect(screen.getByText('Implement API')).toBeInTheDocument()
  })
})
