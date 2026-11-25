import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import type { UserRole } from '../../types/auth.types'
import { dashboardPath } from './routes'

export function RoleBasedRoute({
  allowedRoles,
  children,
}: {
  allowedRoles: UserRole[]
  children: ReactNode
}) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/" replace />
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={dashboardPath(user.role)} replace />
  }
  return children
}
