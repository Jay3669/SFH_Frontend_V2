import { useSyncExternalStore } from 'react'
import { useLocation } from 'react-router-dom'
import { Lottie } from 'lottie-react'
import loaderAnimation from '../../assets/loader.json'
import {
  getApiLoaderVisible,
  subscribeToApiRequests,
} from '../../services/api/apiClient'
import './api-loading-overlay.css'

export function ApiLoadingOverlay() {
  const { pathname } = useLocation()
  const loaderVisible = useSyncExternalStore(
    subscribeToApiRequests,
    getApiLoaderVisible,
    () => false,
  )
  const isAuthPage = pathname === '/' ||
    /(?:^|\/)(?:login|forgot-password|forgotpassword|reset-password)(?:\/|$)/i.test(pathname)

  if (!loaderVisible || isAuthPage) return null

  return (
    <div className="api-loading-overlay" role="status" aria-live="polite" aria-busy="true">
      <Lottie className="api-loading-animation" src={loaderAnimation} loop autoplay />
      <span>Loading…</span>
    </div>
  )
}
