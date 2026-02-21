import { useState } from 'react'
import { useTaskBoard } from '../../../../context/TaskBoardContext'
import ProjectsHeader from './ProjectsHeader'
import ProjectsGrid from './ProjectsGrid'
import ProjectDetailView from './ProjectDetailView'

export default function ProjectsView() {
  const { state } = useTaskBoard()
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('newest')
  const [categoryFilter, setCategoryFilter] = useState('')

  if (state.selectedProject) {
    return <ProjectDetailView />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <ProjectsHeader
        search={search} onSearchChange={setSearch}
        sort={sort} onSortChange={setSort}
        categoryFilter={categoryFilter} onCategoryChange={setCategoryFilter}
      />
      <ProjectsGrid search={search} sort={sort} categoryFilter={categoryFilter} />
    </div>
  )
}
