import { Lottie } from 'lottie-react'
import loaderAnimation from '../../assets/loader.json'
import './api-loading-overlay.css'

export function ApiLoadingIndicator({
  label = 'Loading…',
  compact = false,
}: {
  label?: string
  compact?: boolean
}) {
  return (
    <div
      className={`api-loading-indicator${compact ? ' api-loading-indicator-compact' : ''}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <Lottie className="api-loading-animation" src={loaderAnimation} loop autoplay />
      <span>{label}</span>
    </div>
  )
}
