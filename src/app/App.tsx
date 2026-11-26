import { AppRouter } from './router'
import { useAuth } from '../hooks/useAuth'

export default function App() {
  const { authReady, user } = useAuth()
  if (!authReady && !user) {
    return <main className="auth-loading" aria-live="polite">Checking your session…</main>
  }
  return <AppRouter />
}
