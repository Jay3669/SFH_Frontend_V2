import { useSyncExternalStore } from 'react'
import { ApiLoadingIndicator } from './ApiLoadingIndicator'
import {
  getApiLoaderVisible,
  subscribeToApiRequests,
} from '../../services/api/apiClient'

export function ApiLoadingOverlay({ disabled = false }: { disabled?: boolean }) {
  const loaderVisible = useSyncExternalStore(
    subscribeToApiRequests,
    getApiLoaderVisible,
    () => false,
  )

  if (disabled || !loaderVisible) return null

  return (
    <div className="api-loading-overlay">
      <ApiLoadingIndicator />
    </div>
  )
}
