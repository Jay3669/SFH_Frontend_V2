import { AppRouter } from './router'
import { useAuth } from '../hooks/useAuth'

export default function App() {
  const { authReady } = useAuth()
  if (!authReady) {
    return <main className="auth-loading" aria-live="polite">Checking your session…</main>
  }
  return <AppRouter />
}
