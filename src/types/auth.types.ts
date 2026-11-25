import { USER_ROLES } from '../utils/constants'

export type UserRole = typeof USER_ROLES[number]

export type AuthUser = {
  id: string
  name: string
  email: string
  phoneNumber?: string | null
  role: UserRole
  permissions: string[]
}

export type AuthResponse = {
  message?: string
  data?: {
    tokens?: {
      accessToken?: unknown
      tokenType?: unknown
    }
    user?: unknown
  }
}

function isUserRole(role: unknown): role is UserRole {
  return USER_ROLES.some((userRole) => userRole === role)
}

export function toAuthUser(user: unknown): AuthUser | null {
  if (!user || typeof user !== 'object') return null
  const candidate = user as {
    id?: unknown
    name?: unknown
    firstName?: unknown
    lastName?: unknown
    email?: unknown
    phoneNumber?: unknown
    role?: unknown
    permissions?: unknown
  }
  if (
    typeof candidate.id !== 'string' ||
    typeof candidate.email !== 'string' ||
    !isUserRole(candidate.role)
  ) {
    return null
  }

  const name = typeof candidate.name === 'string'
    ? candidate.name
    : [candidate.firstName, candidate.lastName]
      .filter((part): part is string => typeof part === 'string')
      .join(' ')
      .trim()

  if (!name) return null

  return {
    id: candidate.id,
    name,
    email: candidate.email,
    phoneNumber: typeof candidate.phoneNumber === 'string' || candidate.phoneNumber === null
      ? candidate.phoneNumber
      : undefined,
    role: candidate.role,
    permissions: Array.isArray(candidate.permissions)
      ? candidate.permissions.filter((permission): permission is string => typeof permission === 'string')
      : [],
  }
}
