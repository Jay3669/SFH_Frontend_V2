import { authenticatedApiRequest } from '../api/apiClient'
import { apiEndpoints } from '../api/apiEndpoints'

type ApiResponse<T> = { data?: T }

export function listUsers(query: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value))
  })
  const suffix = params.toString() ? `?${params}` : ''
  return authenticatedApiRequest<ApiResponse<unknown[]>>(`${apiEndpoints.users}${suffix}`)
}

export function getUser(id: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.users}/${id}`)
}

export function updateUser(id: string, input: Record<string, unknown>) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.users}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function deactivateUser(id: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.users}/${id}`, { method: 'DELETE' })
}

export function setUserPermission(id: string, permissionId: string, granted: boolean) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.users}/${id}/permissions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ permissionId, granted }),
  })
}

export function listStaff(query: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value))
  })
  const suffix = params.toString() ? `?${params}` : ''
  return authenticatedApiRequest<ApiResponse<unknown[]>>(`${apiEndpoints.staff}${suffix}`)
}

export function createStaff(input: Record<string, unknown>) {
  return authenticatedApiRequest<ApiResponse<unknown>>(apiEndpoints.staff, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function updateStaff(id: string, input: Record<string, unknown>) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.staff}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function deactivateStaff(id: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.staff}/${id}`, { method: 'DELETE' })
}

export function listCustomers(query: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value))
  })
  const suffix = params.toString() ? `?${params}` : ''
  return authenticatedApiRequest<ApiResponse<unknown[]>>(`${apiEndpoints.customers}${suffix}`)
}

export function getCustomer(id: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.customers}/${id}`)
}

export function createCustomer(input: Record<string, unknown>) {
  return authenticatedApiRequest<ApiResponse<unknown>>(apiEndpoints.customers, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function updateCustomer(id: string, input: Record<string, unknown>) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.customers}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function deactivateCustomer(id: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.customers}/${id}`, { method: 'DELETE' })
}

export function getRolesPermissions() {
  return authenticatedApiRequest<ApiResponse<unknown>>(apiEndpoints.permissions)
}

export function setRolePermission(roleId: string, permissionId: string, enabled: boolean) {
  return authenticatedApiRequest<ApiResponse<unknown>>(apiEndpoints.rolePermissions, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roleId, permissionId, enabled }),
  })
}
