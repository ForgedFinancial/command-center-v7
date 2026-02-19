import AuthGate from './components/layout/AuthGate'
import Shell from './components/layout/Shell'
import { TaskBoardProvider } from './context/TaskBoardContext'
import { CRMProvider } from './context/CRMContext'
import { ThemeProvider } from './context/ThemeContext'
import { PhoneProvider } from './context/PhoneContext'
import FloatingCallBar from './components/shared/FloatingCallBar'
import { IncomingCallBanner } from './components/tabs/crm/phone/RingingSystem'
import CallScriptPanel from './components/tabs/crm/phone/CallScriptPanel'

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
            <FloatingCallBar />
            <IncomingCallBanner />
            <CallScriptPanel isVisible={true} />
          </CRMProvider>
        </TaskBoardProvider>
      </PhoneProvider>
    </ThemeProvider>
  )
}

export default App
