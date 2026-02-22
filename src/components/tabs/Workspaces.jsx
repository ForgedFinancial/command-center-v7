import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useApp } from '../../context/AppContext'
import { syncClient } from '../../api/syncClient'
import { WORKSPACE_AGENT_ORDER, WORKSPACE_STRUCTURE } from '../../config/workspace'
import FileTree from './workspaces/FileTree'
import FileEditor from './workspaces/FileEditor'
import { buildWorkspaceTree, getWorkspaceFileKey } from './workspaces/workspaceUtils'

function coerceErrorMessage(error, fallback) {
  if (!error) return fallback
  if (typeof error.message === 'string' && error.message) return error.message
  return fallback
}

function mergeWorkspaceChanges(previous, incoming) {
  const map = new Map()
  previous.forEach(change => {
    const path = change.path || change.filename
    if (!change.agentId || !path) return
    map.set(`${change.agentId}:${path}`, { ...change, path })
  })
  incoming.forEach(change => {
    const path = change.path || change.filename
    if (!change.agentId || !path) return
    const filename = change.filename || path.split('/').pop()
    map.set(`${change.agentId}:${path}`, { ...change, path, filename })
  })
  return Array.from(map.values())
    .sort((a, b) => {
      const aTime = new Date(a.lastModified || 0).getTime()
      const bTime = new Date(b.lastModified || 0).getTime()
      return bTime - aTime
    })
    .slice(0, 50)
}

function normalizeFileMeta(agentId, fileMeta, fileResponse) {
  const resolvedPath = fileResponse?.path || fileMeta?.path || fileMeta?.filename || ''
  const resolvedFilename = fileResponse?.filename || fileMeta?.filename || resolvedPath.split('/').pop() || ''
  return {
    agentId,
    filename: resolvedFilename,
    path: resolvedPath,
    lastModified: fileResponse?.lastModified || fileMeta?.lastModified || null,
    size: fileResponse?.size ?? fileMeta?.size ?? 0,
  }
}

function removeChangeEntry(items, file) {
  const key = getWorkspaceFileKey(file.agentId, file.path)
  return items.filter(item => getWorkspaceFileKey(item.agentId, item.path || item.filename) !== key)
}

export default function Workspaces() {
  const { state, actions } = useApp()
  const searchInputRef = useRef(null)
  const lastSyncRef = useRef(new Date().toISOString())

  const [workspaceFiles, setWorkspaceFiles] = useState({})
  const [loadingTree, setLoadingTree] = useState(true)
  const [treeError, setTreeError] = useState(null)
  const [search, setSearch] = useState('')

  const initialAgent = state.workspaceAgent && WORKSPACE_STRUCTURE[state.workspaceAgent]
    ? state.workspaceAgent
    : 'clawd'

  const [expandedAgents, setExpandedAgents] = useState(() => new Set([initialAgent]))
  const [expandedFolders, setExpandedFolders] = useState(() => new Set([`${initialAgent}:core`]))

  const [currentFile, setCurrentFile] = useState(null)
  const [content, setContent] = useState('')
  const [originalContent, setOriginalContent] = useState('')
  const [loadingFile, setLoadingFile] = useState(false)
  const [savingFile, setSavingFile] = useState(false)
  const [fileError, setFileError] = useState(null)
  const [dirtyFiles, setDirtyFiles] = useState(new Set())
  const [vpsChanges, setVpsChanges] = useState([])
  const [isNarrow, setIsNarrow] = useState(() => (typeof window !== 'undefined' ? window.innerWidth < 980 : false))

  const hasUnsavedCurrentFile = Boolean(currentFile) && content !== originalContent

  const clearDirtyEntry = useCallback((file) => {
    if (!file?.agentId || !file?.path) return
    const key = getWorkspaceFileKey(file.agentId, file.path)
    setDirtyFiles(prev => {
      if (!prev.has(key)) return prev
      const next = new Set(prev)
      next.delete(key)
      return next
    })
  }, [])

  const refreshWorkspaceIndex = useCallback(async (agentIds = WORKSPACE_AGENT_ORDER, options = {}) => {
    const targets = [...new Set(agentIds.filter(agentId => WORKSPACE_STRUCTURE[agentId]))]
    if (targets.length === 0) return
    if (!options.silent) {
      setLoadingTree(true)
      setTreeError(null)
    }

    try {
      const updates = await Promise.all(targets.map(async (agentId) => {
        try {
          const data = await syncClient.getWorkspace(agentId)
          return [agentId, Array.isArray(data?.files) ? data.files : []]
        } catch (error) {
          return [agentId, []]
        }
      }))

      setWorkspaceFiles(prev => {
        const next = { ...prev }
        updates.forEach(([agentId, files]) => {
          next[agentId] = files
        })
        return next
      })
    } catch (error) {
      if (!options.silent) {
        setTreeError(coerceErrorMessage(error, 'Failed to load workspace files'))
      }
    } finally {
      if (!options.silent) {
        setLoadingTree(false)
      }
    }
  }, [])

  const tree = useMemo(() => buildWorkspaceTree({
    structure: WORKSPACE_STRUCTURE,
    agentOrder: WORKSPACE_AGENT_ORDER,
    workspaceFiles,
    search,
  }), [workspaceFiles, search])

  const loadWorkspaceFile = useCallback(async (agentId, fileMeta, options = {}) => {
    const targetPath = fileMeta?.path || fileMeta?.filename
    if (!agentId || !targetPath) return false

    if (!options.skipUnsavedCheck && hasUnsavedCurrentFile) {
      const currentKey = currentFile ? getWorkspaceFileKey(currentFile.agentId, currentFile.path) : null
      const nextKey = getWorkspaceFileKey(agentId, targetPath)
      if (currentKey !== nextKey && !window.confirm('You have unsaved changes. Discard them and switch files?')) {
        return false
      }
      if (currentKey && currentKey !== nextKey) {
        clearDirtyEntry(currentFile)
      }
    }

    setLoadingFile(true)
    setFileError(null)
    try {
      let response
      if (fileMeta.path) {
        response = await syncClient.getWorkspaceFileByPath(agentId, fileMeta.path)
      } else {
        response = await syncClient.getWorkspaceFile(agentId, fileMeta.filename)
      }

      const normalized = normalizeFileMeta(agentId, fileMeta, response)
      setCurrentFile(normalized)
      setContent(response?.content || '')
      setOriginalContent(response?.content || '')
      actions.setWorkspaceAgent(agentId)

      setExpandedAgents(prev => {
        const next = new Set(prev)
        next.add(agentId)
        return next
      })
      if (fileMeta.folderId) {
        setExpandedFolders(prev => {
          const next = new Set(prev)
          next.add(`${agentId}:${fileMeta.folderId}`)
          return next
        })
      }

      setVpsChanges(prev => removeChangeEntry(prev, normalized))
      return true
    } catch (error) {
      setFileError(coerceErrorMessage(error, `Failed to load ${fileMeta.filename || targetPath}`))
      return false
    } finally {
      setLoadingFile(false)
    }
  }, [actions, clearDirtyEntry, currentFile, hasUnsavedCurrentFile])

  const handleSave = useCallback(async () => {
    if (!currentFile || !hasUnsavedCurrentFile || savingFile) return
    setSavingFile(true)
    setFileError(null)
    try {
      const result = await syncClient.saveWorkspaceFileByPath(currentFile.agentId, currentFile.path, content)
      const updated = {
        ...currentFile,
        lastModified: result?.lastModified || new Date().toISOString(),
        size: result?.size ?? currentFile.size,
      }
      setCurrentFile(updated)
      setOriginalContent(content)

      setWorkspaceFiles(prev => {
        const files = Array.isArray(prev[currentFile.agentId]) ? [...prev[currentFile.agentId]] : []
        const index = files.findIndex(file => {
          const pathValue = file.path || file.filename
          return pathValue === currentFile.path
        })
        const nextMeta = {
          filename: updated.filename,
          path: updated.path,
          lastModified: updated.lastModified,
          size: updated.size,
        }
        if (index >= 0) {
          files[index] = { ...files[index], ...nextMeta }
        } else {
          files.push(nextMeta)
        }
        return { ...prev, [currentFile.agentId]: files }
      })

      setVpsChanges(prev => removeChangeEntry(prev, currentFile))
      actions.addToast({ type: 'success', message: `Saved ${currentFile.filename}` })
    } catch (error) {
      const message = coerceErrorMessage(error, `Failed to save ${currentFile.filename}`)
      setFileError(message)
      actions.addToast({ type: 'error', message })
    } finally {
      setSavingFile(false)
    }
  }, [actions, content, currentFile, hasUnsavedCurrentFile, savingFile])

  const handleDiscard = useCallback(() => {
    if (!hasUnsavedCurrentFile) return
    if (!window.confirm('Discard unsaved changes?')) return
    setContent(originalContent)
  }, [hasUnsavedCurrentFile, originalContent])

  const handleCloseEditor = useCallback(() => {
    if (hasUnsavedCurrentFile && !window.confirm('Close this file and discard unsaved changes?')) return
    clearDirtyEntry(currentFile)
    setCurrentFile(null)
    setContent('')
    setOriginalContent('')
    setFileError(null)
  }, [clearDirtyEntry, currentFile, hasUnsavedCurrentFile])

  const handleReloadChanges = useCallback(async () => {
    const changedAgents = [...new Set(vpsChanges.map(change => change.agentId).filter(Boolean))]
    if (changedAgents.length > 0) {
      await refreshWorkspaceIndex(changedAgents)
    }

    if (currentFile) {
      const currentKey = getWorkspaceFileKey(currentFile.agentId, currentFile.path)
      const changedCurrent = vpsChanges.some(change => {
        const pathValue = change.path || change.filename
        return getWorkspaceFileKey(change.agentId, pathValue) === currentKey
      })
      if (changedCurrent && !hasUnsavedCurrentFile) {
        await loadWorkspaceFile(currentFile.agentId, currentFile, { skipUnsavedCheck: true })
      }
    }

    setVpsChanges([])
  }, [currentFile, hasUnsavedCurrentFile, loadWorkspaceFile, refreshWorkspaceIndex, vpsChanges])

  useEffect(() => {
    refreshWorkspaceIndex()
  }, [refreshWorkspaceIndex])

  useEffect(() => {
    const selectedAgent = state.workspaceAgent
    if (!selectedAgent || !WORKSPACE_STRUCTURE[selectedAgent]) return
    setExpandedAgents(prev => {
      const next = new Set(prev)
      next.add(selectedAgent)
      return next
    })
  }, [state.workspaceAgent])

  useEffect(() => {
    if (!currentFile) return
    const key = getWorkspaceFileKey(currentFile.agentId, currentFile.path)
    const isDirty = content !== originalContent
    setDirtyFiles(prev => {
      const next = new Set(prev)
      if (isDirty) next.add(key)
      else next.delete(key)
      return next
    })
  }, [content, currentFile, originalContent])

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (dirtyFiles.size === 0) return
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [dirtyFiles.size])

  useEffect(() => {
    const handleShortcuts = (event) => {
      const key = event.key.toLowerCase()
      if (!event.ctrlKey) return

      if (key === 's') {
        if (!currentFile) return
        event.preventDefault()
        handleSave()
      } else if (key === 'w') {
        if (!currentFile) return
        event.preventDefault()
        handleCloseEditor()
      } else if (key === 'f') {
        event.preventDefault()
        searchInputRef.current?.focus()
        searchInputRef.current?.select()
      }
    }

    window.addEventListener('keydown', handleShortcuts)
    return () => window.removeEventListener('keydown', handleShortcuts)
  }, [currentFile, handleCloseEditor, handleSave])

  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const response = await syncClient.getWorkspaceChanges(lastSyncRef.current)
        const changes = Array.isArray(response?.changes) ? response.changes : []
        if (response?.timestamp) {
          lastSyncRef.current = response.timestamp
        } else {
          lastSyncRef.current = new Date().toISOString()
        }
        if (changes.length === 0) return

        setVpsChanges(prev => mergeWorkspaceChanges(prev, changes))
        const changedAgents = [...new Set(changes.map(change => change.agentId).filter(Boolean))]
        if (changedAgents.length > 0) {
          refreshWorkspaceIndex(changedAgents, { silent: true })
        }
      } catch {
        // Non-blocking polling errors are intentionally ignored.
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [refreshWorkspaceIndex])

  useEffect(() => {
    const onResize = () => {
      setIsNarrow(window.innerWidth < 980)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const totalFileCount = tree.reduce((sum, agent) => sum + agent.count, 0)
  const currentFileChangedOnVps = Boolean(currentFile) && vpsChanges.some(change =>
    getWorkspaceFileKey(change.agentId, change.path || change.filename) === getWorkspaceFileKey(currentFile.agentId, currentFile.path),
  )

  return (
    <div style={{ display: 'flex', flexDirection: isNarrow ? 'column' : 'row', gap: '14px', height: '100%' }}>
      <div
        className="glass-panel"
        style={{
          width: isNarrow ? '100%' : '320px',
          minWidth: isNarrow ? 0 : '290px',
          minHeight: isNarrow ? '220px' : 0,
          maxHeight: isNarrow ? '42vh' : '100%',
          padding: '14px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div style={{ marginBottom: '10px' }}>
          <h2 style={{ margin: 0, fontSize: '15px', color: 'var(--text-primary)' }}>Agent Workspaces</h2>
          <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--text-muted)' }}>
            {totalFileCount} files | {dirtyFiles.size} unsaved
          </div>
        </div>

        {treeError && (
          <div
            style={{
              marginBottom: '10px',
              padding: '8px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(239,68,68,0.35)',
              background: 'rgba(239,68,68,0.08)',
              color: '#ef4444',
              fontSize: '12px',
            }}
          >
            {treeError}
          </div>
        )}

        <FileTree
          tree={tree}
          search={search}
          onSearchChange={setSearch}
          searchInputRef={searchInputRef}
          expandedAgents={expandedAgents}
          expandedFolders={expandedFolders}
          onToggleAgent={(agentId) => {
            setExpandedAgents(prev => {
              const next = new Set(prev)
              if (next.has(agentId)) next.delete(agentId)
              else next.add(agentId)
              return next
            })
          }}
          onToggleFolder={(agentId, folderId) => {
            const key = `${agentId}:${folderId}`
            setExpandedFolders(prev => {
              const next = new Set(prev)
              if (next.has(key)) next.delete(key)
              else next.add(key)
              return next
            })
          }}
          currentFile={currentFile}
          dirtyFiles={dirtyFiles}
          onSelectFile={loadWorkspaceFile}
        />

        {loadingTree && (
          <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
            Refreshing workspace index...
          </div>
        )}
      </div>

      <FileEditor
        file={currentFile}
        content={content}
        loading={loadingFile}
        saving={savingFile}
        error={fileError}
        isDirty={hasUnsavedCurrentFile}
        remoteChanged={currentFileChangedOnVps}
        onChange={setContent}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onClose={handleCloseEditor}
        onReload={() => {
          if (!currentFile) return
          loadWorkspaceFile(currentFile.agentId, currentFile, { skipUnsavedCheck: true })
        }}
      />

      {vpsChanges.length > 0 && (
        <div
          style={{
            position: 'fixed',
            right: isNarrow ? '15px' : '20px',
            bottom: '18px',
            width: isNarrow ? 'calc(100vw - 30px)' : '320px',
            maxHeight: '260px',
            overflowY: 'auto',
            borderRadius: '8px',
            border: '1px solid rgba(245,158,11,0.35)',
            background: 'rgba(20,20,20,0.92)',
            padding: '10px 12px',
            zIndex: 50,
          }}
        >
          <div style={{ fontSize: '12px', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '8px' }}>
            VPS changes detected ({vpsChanges.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {vpsChanges.slice(0, 6).map(change => {
              const key = `${change.agentId}:${change.path || change.filename}`
              return (
                <div key={key} style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                  {change.agentId}/{change.path || change.filename}
                </div>
              )
            })}
          </div>
          <button
            type="button"
            onClick={handleReloadChanges}
            style={{
              marginTop: '8px',
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid rgba(245,158,11,0.5)',
              background: 'transparent',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: '11px',
              width: '100%',
            }}
          >
            Reload changed files
          </button>
        </div>
      )}
    </div>
  )
}
