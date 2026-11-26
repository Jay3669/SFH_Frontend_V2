import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { routes } from './routes'

export function ProtectedRoute() {
  const { user, authReady } = useAuth()

  if (!authReady && !user) {
    return <main className="auth-loading" aria-live="polite">Checking your session…</main>
  }
  if (!user) return <Navigate to={routes.login} replace />
  return <Outlet />
}
