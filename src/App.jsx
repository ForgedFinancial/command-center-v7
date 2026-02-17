import AuthGate from './components/layout/AuthGate'
import Shell from './components/layout/Shell'
import { TaskBoardProvider } from './context/TaskBoardContext'
import { CRMProvider } from './context/CRMContext'

function App() {
  const authenticated = sessionStorage.getItem('forged-os-session') === 'true'

  if (!authenticated) {
    return <AuthGate onAuth={() => window.location.reload()} />
  }

  return (
    <TaskBoardProvider>
      <CRMProvider>
        <Shell />
      </CRMProvider>
    </TaskBoardProvider>
  )
}

export default App
