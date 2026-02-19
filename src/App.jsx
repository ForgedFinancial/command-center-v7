import AuthGate from './components/layout/AuthGate'
import Shell from './components/layout/Shell'
import { TaskBoardProvider } from './context/TaskBoardContext'
import { CRMProvider } from './context/CRMContext'
import { ThemeProvider } from './context/ThemeContext'
import { PhoneProvider } from './context/PhoneContext'

function App() {
  const authenticated = sessionStorage.getItem('forged-os-session') === 'true'

  if (!authenticated) {
    return <AuthGate onAuth={() => window.location.reload()} />
  }

  return (
    <ThemeProvider>
      <PhoneProvider>
        <TaskBoardProvider>
          <CRMProvider>
            <Shell />
          </CRMProvider>
        </TaskBoardProvider>
      </PhoneProvider>
    </ThemeProvider>
  )
}

export default App
