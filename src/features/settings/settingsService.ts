import { apiEndpoints } from '../../services/api/apiEndpoints'
import { authenticatedApiRequest } from '../../services/api/apiClient'
import type { ApplicationSettings, ApplicationSettingsResponse } from './settings.types'

export function getApplicationSettings() {
  return authenticatedApiRequest<ApplicationSettingsResponse>(apiEndpoints.settings)
}

export function updateApplicationSettings(settings: ApplicationSettings) {
  return authenticatedApiRequest<ApplicationSettingsResponse>(apiEndpoints.settings, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })
}
