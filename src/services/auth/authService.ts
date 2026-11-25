import { apiEndpoints } from '../api/apiEndpoints'
import { apiRequest, authenticatedApiRequest } from '../api/apiClient'
import type { AuthResponse, AuthUser } from '../../types/auth.types'
import { toAuthUser } from '../../types/auth.types'
import { appConfig } from '../../config/app.config'

export const accessTokenKey = appConfig.accessTokenStorageKey
export const accessTokenTypeKey = appConfig.accessTokenTypeStorageKey

export async function signIn(identifier: string, password: string) {
  const result = await apiRequest<AuthResponse>(apiEndpoints.auth.login, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: identifier.trim(), password }),
  })

  const user = toAuthUser(result.data?.user)
  const accessToken = result.data?.tokens?.accessToken
  const tokenType = result.data?.tokens?.tokenType
  if (
    typeof accessToken !== 'string' ||
    !accessToken ||
    tokenType !== 'Bearer' ||
    !user
  ) {
    throw new Error('The server returned an invalid login response.')
  }

  return {
    accessToken,
    tokenType,
    user,
  }
}

export async function getCurrentUser(): Promise<AuthUser> {
  const result = await authenticatedApiRequest<AuthResponse>(apiEndpoints.auth.currentUser)
  const user = toAuthUser(result.data?.user)
  if (!user) {
    throw new Error('Your session has expired. Please sign in again.')
  }
  return user
}

export function forgotPassword(email: string) {
  return apiRequest(apiEndpoints.auth.forgotPassword, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
}

export function verifyResetToken(email: string, code: string) {
  return apiRequest(apiEndpoints.auth.verifyResetToken, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code }),
  })
}

export function resetPassword(email: string, code: string, newPassword: string) {
  return apiRequest(apiEndpoints.auth.resetPassword, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  })
}

export function updateProfile(input: { firstName?: string; lastName?: string; email?: string; phoneNumber?: string }) {
  return authenticatedApiRequest(apiEndpoints.auth.profile, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function changePassword(currentPassword: string, newPassword: string) {
  return authenticatedApiRequest(apiEndpoints.auth.changePassword, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword }),
  })
}
