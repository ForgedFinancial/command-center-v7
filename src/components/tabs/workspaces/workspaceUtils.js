function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function wildcardToRegExp(pattern) {
  const escaped = escapeRegExp(pattern).replace(/\\\*/g, '.*')
  return new RegExp(`^${escaped}$`, 'i')
}

function ensurePath(fileMeta) {
  if (fileMeta?.path && typeof fileMeta.path === 'string') return fileMeta.path
  if (fileMeta?.filename && typeof fileMeta.filename === 'string') return fileMeta.filename
  return ''
}

function normalizeSlashes(value) {
  return value.replace(/\\/g, '/')
}

function resolveFolderByPath(agentConfig, filePath) {
  if (!filePath.includes('/')) return null
  const prefix = filePath.split('/')[0].toLowerCase()
  const folder = agentConfig.folders.find(item => item.id.toLowerCase() === prefix)
  return folder ? folder.id : null
}

function resolveFolderByCoreFile(agentConfig, filename) {
  const target = filename.toUpperCase()
  for (const folder of agentConfig.folders) {
    if (!Array.isArray(folder.coreFiles) || folder.coreFiles.length === 0) continue
    if (folder.coreFiles.some(file => file.toUpperCase() === target)) {
      return folder.id
    }
  }
  return null
}

function resolveFolderByPatterns(agentConfig, filename) {
  const upperName = filename.toUpperCase()
  for (const folder of agentConfig.folders) {
    if (!Array.isArray(folder.patterns) || folder.patterns.length === 0) continue
    const matched = folder.patterns.some(pattern => {
      if (!pattern) return false
      if (pattern.includes('*')) {
        return wildcardToRegExp(pattern).test(filename)
      }
      return upperName.includes(String(pattern).toUpperCase())
    })
    if (matched) return folder.id
  }
  return null
}

export function getWorkspaceFileKey(agentId, filePath) {
  return `${agentId}:${normalizeSlashes(filePath)}`
}

export function formatFileSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '--'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function formatRelativeTimestamp(iso) {
  if (!iso) return '--'
  const ts = new Date(iso).getTime()
  if (!Number.isFinite(ts)) return '--'
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`
  return `${Math.floor(diffSec / 86400)}d ago`
}

export function resolveFolderId(agentConfig, rawFileMeta) {
  const pathValue = normalizeSlashes(ensurePath(rawFileMeta))
  const filename = rawFileMeta?.filename || pathValue.split('/').pop() || ''

  const byPath = resolveFolderByPath(agentConfig, pathValue)
  if (byPath) return byPath

  const byCore = resolveFolderByCoreFile(agentConfig, filename)
  if (byCore) return byCore

  const byPattern = resolveFolderByPatterns(agentConfig, filename)
  if (byPattern) return byPattern

  return agentConfig.defaultFolder || agentConfig.folders[0]?.id || 'misc'
}

export function buildWorkspaceTree({ structure, agentOrder, workspaceFiles, search = '' }) {
  const needle = search.trim().toLowerCase()

  return agentOrder
    .filter(agentId => structure[agentId])
    .map(agentId => {
      const agentConfig = structure[agentId]
      const folderBuckets = {}
      agentConfig.folders.forEach(folder => {
        folderBuckets[folder.id] = []
      })

      const sourceFiles = Array.isArray(workspaceFiles?.[agentId]) ? workspaceFiles[agentId] : []
      sourceFiles.forEach(fileMeta => {
        const filePath = normalizeSlashes(ensurePath(fileMeta))
        const filename = fileMeta?.filename || filePath.split('/').pop() || ''
        if (!filename) return

        const searchable = `${filename} ${filePath}`.toLowerCase()
        if (needle && !searchable.includes(needle)) return

        const folderId = resolveFolderId(agentConfig, fileMeta)
        if (!folderBuckets[folderId]) folderBuckets[folderId] = []
        folderBuckets[folderId].push({
          ...fileMeta,
          filename,
          path: filePath,
          folderId,
        })
      })

      const folders = agentConfig.folders.map(folder => {
        const files = (folderBuckets[folder.id] || []).sort((a, b) => {
          if (a.path === b.path) return a.lastModified < b.lastModified ? 1 : -1
          return a.path.localeCompare(b.path)
        })
        return { ...folder, files, count: files.length }
      })

      return {
        id: agentId,
        name: agentConfig.name,
        role: agentConfig.role,
        folders,
        count: folders.reduce((sum, folder) => sum + folder.count, 0),
      }
    })
}

