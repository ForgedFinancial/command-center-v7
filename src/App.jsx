import AuthGate from './components/layout/AuthGate'
import Shell from './components/layout/Shell'
import { TaskBoardProvider } from './context/TaskBoardContext'
import { CRMProvider } from './context/CRMContext'
import { ThemeProvider } from './context/ThemeContext'

function App() {
  const authenticated = sessionStorage.getItem('forged-os-session') === 'true'

  if (!authenticated) {
    return <AuthGate onAuth={() => window.location.reload()} />
  }

  return (
    <ThemeProvider>
      <TaskBoardProvider>
        <CRMProvider>
          <Shell />
        </CRMProvider>
      </TaskBoardProvider>
    </ThemeProvider>
  )
}

export default App
