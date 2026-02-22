import { formatFileSize, formatRelativeTimestamp, getWorkspaceFileKey } from './workspaceUtils'

function ToggleGlyph({ open }) {
  return (
    <span
      aria-hidden
      style={{
        display: 'inline-flex',
        width: '12px',
        fontSize: '12px',
        color: 'var(--text-muted)',
      }}
    >
      {open ? 'v' : '>'}
    </span>
  )
}

export default function FileTree({
  tree,
  search,
  onSearchChange,
  searchInputRef,
  expandedAgents,
  expandedFolders,
  onToggleAgent,
  onToggleFolder,
  currentFile,
  dirtyFiles,
  onSelectFile,
}) {
  const currentKey = currentFile ? getWorkspaceFileKey(currentFile.agentId, currentFile.path) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: '12px' }}>
        <input
          ref={searchInputRef}
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search files (Ctrl+F)"
          style={{
            width: '100%',
            padding: '8px 10px',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            background: 'var(--theme-bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '12px',
            outline: 'none',
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '4px' }}>
        {tree.map(agent => {
          const agentOpen = expandedAgents.has(agent.id)
          return (
            <div key={agent.id} style={{ marginBottom: '8px' }}>
              <button
                type="button"
                onClick={() => onToggleAgent(agent.id)}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  background: 'var(--theme-bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '7px 8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <ToggleGlyph open={agentOpen} />
                <span style={{ color: 'var(--text-primary)', fontSize: '13px', fontWeight: 600 }}>
                  {agent.name}
                </span>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px', marginLeft: 'auto' }}>
                  {agent.role} | {agent.count}
                </span>
              </button>

              {agentOpen && (
                <div style={{ marginTop: '4px', paddingLeft: '10px' }}>
                  {agent.folders.map(folder => {
                    const folderKey = `${agent.id}:${folder.id}`
                    const folderOpen = expandedFolders.has(folderKey)
                    return (
                      <div key={folderKey} style={{ marginBottom: '3px' }}>
                        <button
                          type="button"
                          onClick={() => onToggleFolder(agent.id, folder.id)}
                          style={{
                            width: '100%',
                            textAlign: 'left',
                            background: 'transparent',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '5px 4px',
                          }}
                        >
                          <ToggleGlyph open={folderOpen} />
                          <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                            {folder.name}
                          </span>
                          <span style={{ marginLeft: 'auto', color: 'var(--text-muted)', fontSize: '11px' }}>
                            {folder.count}
                          </span>
                        </button>

                        {folderOpen && (
                          <div style={{ marginTop: '2px', paddingLeft: '14px' }}>
                            {folder.files.length === 0 ? (
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', padding: '2px 4px' }}>
                                No files
                              </div>
                            ) : folder.files.map(file => {
                              const fileKey = getWorkspaceFileKey(agent.id, file.path)
                              const isCurrent = currentKey === fileKey
                              const isDirty = dirtyFiles.has(fileKey)
                              return (
                                <button
                                  key={fileKey}
                                  type="button"
                                  onClick={() => onSelectFile(agent.id, file)}
                                  title={`${file.path} | ${formatFileSize(file.size)} | ${file.lastModified || 'Unknown time'}`}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    border: '1px solid transparent',
                                    borderRadius: '6px',
                                    background: isCurrent ? 'var(--theme-accent-muted)' : 'transparent',
                                    color: isCurrent ? 'var(--theme-accent)' : 'var(--text-secondary)',
                                    cursor: 'pointer',
                                    padding: '6px',
                                    marginBottom: '2px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                  }}
                                >
                                  <span style={{ fontSize: '12px', fontWeight: isCurrent ? 600 : 500 }}>
                                    {file.filename}{isDirty ? ' *' : ''}
                                  </span>
                                  <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                    {formatFileSize(file.size)} | {formatRelativeTimestamp(file.lastModified)}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
