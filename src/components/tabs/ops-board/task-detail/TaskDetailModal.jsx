import { useEffect, useMemo, useState } from 'react'
import ManifestTabs from './ManifestTabs'
import GateStatusPanel from './GateStatusPanel'
import LiveLogViewer from './LiveLogViewer'

const SECTION_HEADER = {
  spec: '## SPEC',
  planning: '## PLANNING',
  build: '## BUILD',
  validate: '## VALIDATE',
  deploy: '## DEPLOY',
  monitor: '## MONITOR',
  retrospective: '## RETROSPECTIVE',
}

const SECTION_ORDER = ['spec', 'planning', 'build', 'validate', 'deploy', 'monitor', 'retrospective']

function extractSectionContent(markdown, section) {
  const header = SECTION_HEADER[section]
  if (!header || !markdown) return ''

  const start = markdown.indexOf(header)
  if (start === -1) return ''

  const afterHeader = markdown.slice(start + header.length)
  const nextHeaderIndex = SECTION_ORDER
    .filter(key => key !== section)
    .map(key => afterHeader.indexOf(SECTION_HEADER[key]))
    .filter(idx => idx >= 0)
    .sort((a, b) => a - b)[0]

  const raw = nextHeaderIndex === undefined ? afterHeader : afterHeader.slice(0, nextHeaderIndex)
  return raw.replace(/^\s+/, '').replace(/\s+$/, '')
}

export default function TaskDetailModal({
  task,
  manifestContent,
  liveLogLines,
  onClose,
  onArchive,
  actions,
  syncing,
}) {
  const [activeSection, setActiveSection] = useState('spec')
  const [draft, setDraft] = useState('')
  const [loadingManifest, setLoadingManifest] = useState(false)
  const [stageGateConfig, setStageGateConfig] = useState({})

  const currentSectionContent = useMemo(
    () => extractSectionContent(manifestContent || '', activeSection),
    [manifestContent, activeSection],
  )

  useEffect(() => {
    setDraft(currentSectionContent)
  }, [currentSectionContent])

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      if (!task?.id) return
      setLoadingManifest(true)
      try {
        await actions.loadManifest(task.id)
        const gateStatus = await actions.getGateStatus(task.id)
        if (!cancelled) {
          setStageGateConfig(gateStatus.stageGates || {})
        }
      } finally {
        if (!cancelled) setLoadingManifest(false)
      }
    }

    loadData()
    return () => {
      cancelled = true
    }
  }, [task?.id, actions])

  const handleSaveSection = async () => {
    await actions.saveManifestSection(task.id, activeSection, draft)
  }

  const handleSetGate = async (gateName, passed) => {
    await actions.setTaskGate(task.id, gateName, passed, passed ? '' : 'Rejected from modal')
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1200,
        padding: '16px',
      }}
    >
      <div
        onClick={event => event.stopPropagation()}
        style={{
          width: 'min(1100px, 100%)',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '12px',
          border: '1px solid var(--theme-border)',
          backgroundColor: 'var(--theme-bg)',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--theme-text-primary)' }}>{task.title}</h3>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--theme-text-secondary)' }}>
              {task.id} · {task.stage} · {task.assignedAgent || 'Unassigned'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => actions.createTaskCheckpoint(task.id, 0)}
              style={{
                height: '32px',
                padding: '0 10px',
                borderRadius: '8px',
                border: '1px solid var(--theme-border)',
                backgroundColor: 'var(--theme-bg)',
                color: 'var(--theme-text-primary)',
                fontSize: '11px',
                cursor: 'pointer',
              }}
            >
              Checkpoint
            </button>

            <button
              onClick={() => onArchive(task.id)}
              style={{
                height: '32px',
                padding: '0 10px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'rgba(239,68,68,0.2)',
                color: '#ef4444',
                fontSize: '11px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Archive
            </button>

            <button
              onClick={onClose}
              style={{
                height: '32px',
                width: '32px',
                borderRadius: '8px',
                border: '1px solid var(--theme-border)',
                backgroundColor: 'var(--theme-bg)',
                color: 'var(--theme-text-primary)',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>
        </header>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
            gap: '14px',
          }}
        >
          <ManifestTabs
            activeSection={activeSection}
            onSectionChange={setActiveSection}
            sectionContent={draft}
            onChange={setDraft}
            onSave={handleSaveSection}
            loading={syncing || loadingManifest}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <GateStatusPanel
              task={task}
              stageGateConfig={stageGateConfig}
              loading={syncing}
              onValidate={() => actions.validateTaskGates(task.id)}
              onSetGate={handleSetGate}
            />
            <LiveLogViewer lines={liveLogLines} />
          </div>
        </div>
      </div>
    </div>
  )
}
