import { AppRouter } from './router'
import { useAuth } from '../hooks/useAuth'
import { ApiLoadingIndicator } from '../components/loaders/ApiLoadingIndicator'
import { ApiLoadingOverlay } from '../components/loaders/ApiLoadingOverlay'

export default function App() {
  const { authReady, authState, user } = useAuth()
  const suppressApiLoader = !user ||
    authState === 'SESSION_EXPIRED' ||
    authState === 'LOGGING_OUT'
  return (
    <>
      <ApiLoadingOverlay disabled={suppressApiLoader} />
      {!authReady && !user && authState === 'AUTHENTICATING'
        ? <ApiLoadingIndicator label="Checking your session…" />
        : <AppRouter />}
    </>
  )
}
