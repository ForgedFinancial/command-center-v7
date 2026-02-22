import { describe, expect, it } from 'vitest'
import { WORKSPACE_STRUCTURE, WORKSPACE_AGENT_ORDER } from '../config/workspace'
import { buildWorkspaceTree, getWorkspaceFileKey } from '../components/tabs/workspaces/workspaceUtils'

describe('workspaceUtils', () => {
  it('builds tree and maps known core files into core folder', () => {
    const tree = buildWorkspaceTree({
      structure: WORKSPACE_STRUCTURE,
      agentOrder: WORKSPACE_AGENT_ORDER,
      workspaceFiles: {
        clawd: [
          { filename: 'IDENTITY.md', path: 'IDENTITY.md', size: 123, lastModified: '2026-02-20T00:00:00.000Z' },
        ],
      },
    })

    const clawd = tree.find(agent => agent.id === 'clawd')
    const core = clawd.folders.find(folder => folder.id === 'core')
    expect(core.count).toBe(1)
    expect(core.files[0].filename).toBe('IDENTITY.md')
  })

  it('keeps folderized paths in matching folder ids', () => {
    const tree = buildWorkspaceTree({
      structure: WORKSPACE_STRUCTURE,
      agentOrder: WORKSPACE_AGENT_ORDER,
      workspaceFiles: {
        mason: [
          { filename: 'BUILD-GUIDE.md', path: 'sops/BUILD-GUIDE.md', size: 99, lastModified: '2026-02-20T00:00:00.000Z' },
        ],
      },
    })

    const mason = tree.find(agent => agent.id === 'mason')
    const sops = mason.folders.find(folder => folder.id === 'sops')
    expect(sops.count).toBe(1)
    expect(sops.files[0].path).toBe('sops/BUILD-GUIDE.md')
  })

  it('filters files by search term', () => {
    const tree = buildWorkspaceTree({
      structure: WORKSPACE_STRUCTURE,
      agentOrder: WORKSPACE_AGENT_ORDER,
      workspaceFiles: {
        sentinel: [
          { filename: 'AUDIT-PLAN.md', path: 'AUDIT-PLAN.md', size: 50, lastModified: '2026-02-20T00:00:00.000Z' },
          { filename: 'TOOLS.md', path: 'TOOLS.md', size: 30, lastModified: '2026-02-20T00:00:00.000Z' },
        ],
      },
      search: 'audit',
    })

    const sentinel = tree.find(agent => agent.id === 'sentinel')
    expect(sentinel.count).toBe(1)
    expect(sentinel.folders.some(folder => folder.files.some(file => file.filename === 'AUDIT-PLAN.md'))).toBe(true)
  })

  it('creates stable keys', () => {
    expect(getWorkspaceFileKey('clawd', 'core/IDENTITY.md')).toBe('clawd:core/IDENTITY.md')
  })
})

