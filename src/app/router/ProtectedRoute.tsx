import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { routes } from './routes'
import { ApiLoadingIndicator } from '../../components/loaders/ApiLoadingIndicator'

export function ProtectedRoute() {
  const { user, authReady } = useAuth()

  if (!authReady && !user) {
    return <ApiLoadingIndicator label="Checking your session…" />
  }
  if (!user) return <Navigate to={routes.login} replace />
  return <Outlet />
}
