import AuthGate from './components/layout/AuthGate'
import Shell from './components/layout/Shell'

function App() {
  const authenticated = sessionStorage.getItem('forged-os-session') === 'true'

  if (!authenticated) {
    return <AuthGate onAuth={() => window.location.reload()} />
  }

  return <Shell />
}

export default App
