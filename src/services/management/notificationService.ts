import { authenticatedApiRequest } from '../api/apiClient'
import { apiEndpoints } from '../api/apiEndpoints'

type ApiResponse<T> = { data?: T }

export function listNotifications(query: Record<string, string | number | undefined> = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.set(key, String(value))
  })
  const suffix = params.toString() ? `?${params}` : ''
  return authenticatedApiRequest<ApiResponse<unknown[]>>(`${apiEndpoints.notifications}${suffix}`)
}

export function getNotification(id: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.notifications}/${id}`)
}

export function markNotificationRead(id: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.notifications}/${id}/read`, { method: 'PATCH' })
}

export function markNotificationUnread(id: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.notifications}/${id}/unread`, { method: 'PATCH' })
}

export function markAllNotificationsRead() {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.notifications}/read-all`, { method: 'PATCH' })
}

export function deleteReadNotifications() {
  return authenticatedApiRequest<ApiResponse<unknown>>(`${apiEndpoints.notifications}/read`, { method: 'DELETE' })
}
