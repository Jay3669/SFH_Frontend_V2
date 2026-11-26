import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { SessionExpiredDialog } from '../../components/dialogs/SessionExpiredDialog'
import { appConfig } from '../../config/app.config'
import {
  accessTokenKey,
  accessTokenTypeKey,
  getCurrentUser,
  signIn as authenticate,
} from '../../services/auth/authService'
import {
  accessTokenRefreshedEvent,
  ApiError,
  apiRequest,
  handleAccessTokenExpiration,
  sessionExpiredEvent,
} from '../../services/api/apiClient'
import { apiEndpoints } from '../../services/api/apiEndpoints'
import {
  getAuthSessionId,
  invalidateAuthSession,
  readTokenExpiration,
  startAuthSession,
} from '../../services/auth/authSession'
import {
  readSessionValue,
  removeSessionValue,
  writeSessionValue,
} from '../../services/storage/sessionStorage'
import { toAuthUser, type AuthUser } from '../../types/auth.types'
import { routes } from '../router/routes'
import { AuthContext, type AuthState } from './AuthContext'

type SessionExpiredDetail = { token?: unknown; sessionId?: unknown }
type RefreshedTokenDetail = {
  accessToken?: unknown
  previousToken?: unknown
  tokenType?: unknown
  sessionId?: unknown
}

function readCachedUser(): AuthUser | null {
  if (!readSessionValue(accessTokenKey)) return null
  const cachedUser = readSessionValue(appConfig.authUserStorageKey)
  if (!cachedUser) return null

  try {
    return toAuthUser(JSON.parse(cachedUser))
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [user, setUser] = useState<AuthUser | null>(readCachedUser)
  const [authState, setAuthState] = useState<AuthState>(
    () => readSessionValue(accessTokenKey) ? 'AUTHENTICATING' : 'UNAUTHENTICATED',
  )
  const [authReady, setAuthReady] = useState(() => !readSessionValue(accessTokenKey))
  const authStateRef = useRef(authState)
  const expirationTimerRef = useRef<number | null>(null)
  const logoutRequestRef = useRef<Promise<void>>(Promise.resolve())
  const scheduleExpirationRef = useRef<(token: string, sessionId: string) => void>(() => {})

  const transitionTo = useCallback((nextState: AuthState) => {
    authStateRef.current = nextState
    setAuthState(nextState)
  }, [])

  const clearExpirationTimer = useCallback(() => {
    if (expirationTimerRef.current !== null) {
      window.clearTimeout(expirationTimerRef.current)
      expirationTimerRef.current = null
    }
  }, [])

  const scheduleExpirationCheck = useCallback((token: string, sessionId: string) => {
    clearExpirationTimer()
    const expiresAt = readTokenExpiration(token)
    if (expiresAt === null) return

    const delay = Math.max(0, expiresAt - Date.now())
    const maximumDelay = 2_147_000_000
    expirationTimerRef.current = window.setTimeout(() => {
      if (getAuthSessionId() !== sessionId ||
        readSessionValue(accessTokenKey) !== token) return
      if (delay > maximumDelay) {
        scheduleExpirationRef.current(token, sessionId)
      } else {
        void handleAccessTokenExpiration(token, sessionId)
      }
    }, Math.min(delay, maximumDelay))
  }, [clearExpirationTimer])

  useEffect(() => {
    scheduleExpirationRef.current = scheduleExpirationCheck
  }, [scheduleExpirationCheck])

  const clearAuthentication = useCallback(() => {
    clearExpirationTimer()
    invalidateAuthSession()
    removeSessionValue(accessTokenKey)
    removeSessionValue(accessTokenTypeKey)
    removeSessionValue(appConfig.authUserStorageKey)
    queryClient.clear()
    setUser(null)
  }, [clearExpirationTimer, queryClient])

  useEffect(() => {
    function handleSessionExpired(event: Event) {
      const detail = (event as CustomEvent<SessionExpiredDetail>).detail
      const currentToken = readSessionValue(accessTokenKey)
      if (
        typeof detail?.token !== 'string' ||
        typeof detail.sessionId !== 'string' ||
        detail.token !== currentToken ||
        detail.sessionId !== getAuthSessionId() ||
        !['AUTHENTICATING', 'AUTHENTICATED'].includes(authStateRef.current)
      ) {
        return
      }

      transitionTo('SESSION_EXPIRED')
      clearExpirationTimer()
      removeSessionValue(accessTokenKey)
      removeSessionValue(accessTokenTypeKey)
    }

    function handleTokenRefreshed(event: Event) {
      const detail = (event as CustomEvent<RefreshedTokenDetail>).detail
      if (
        typeof detail?.accessToken !== 'string' ||
        typeof detail.previousToken !== 'string' ||
        detail.tokenType !== 'Bearer' ||
        typeof detail.sessionId !== 'string' ||
        detail.sessionId !== getAuthSessionId() ||
        !['AUTHENTICATING', 'AUTHENTICATED'].includes(authStateRef.current) ||
        readSessionValue(accessTokenKey) !== detail.accessToken
      ) {
        return
      }
      scheduleExpirationCheck(detail.accessToken, detail.sessionId)
    }

    window.addEventListener(sessionExpiredEvent, handleSessionExpired)
    window.addEventListener(accessTokenRefreshedEvent, handleTokenRefreshed)
    return () => {
      window.removeEventListener(sessionExpiredEvent, handleSessionExpired)
      window.removeEventListener(accessTokenRefreshedEvent, handleTokenRefreshed)
    }
  }, [clearExpirationTimer, scheduleExpirationCheck, transitionTo])

  useEffect(() => {
    const token = readSessionValue(accessTokenKey)
    if (!token) return

    const sessionId = startAuthSession()
    scheduleExpirationCheck(token, sessionId)
    let active = true
    getCurrentUser()
      .then((currentUser) => {
        if (active && getAuthSessionId() === sessionId &&
          authStateRef.current === 'AUTHENTICATING') {
          setUser(currentUser)
          writeSessionValue(appConfig.authUserStorageKey, JSON.stringify(currentUser))
          transitionTo('AUTHENTICATED')
        }
      })
      .catch((error: unknown) => {
        if (active && getAuthSessionId() === sessionId &&
          authStateRef.current === 'AUTHENTICATING') {
          if (error instanceof ApiError && error.status === 401) {
            transitionTo('SESSION_EXPIRED')
            clearExpirationTimer()
            removeSessionValue(accessTokenKey)
            removeSessionValue(accessTokenTypeKey)
          } else if (readCachedUser()) {
            transitionTo('AUTHENTICATED')
          } else {
            clearAuthentication()
            transitionTo('UNAUTHENTICATED')
          }
        }
      })
      .finally(() => {
        if (active) setAuthReady(true)
      })

    return () => {
      active = false
    }
  }, [clearAuthentication, clearExpirationTimer, scheduleExpirationCheck, transitionTo])

  useEffect(() => () => clearExpirationTimer(), [clearExpirationTimer])

  const signIn = useCallback(async (identifier: string, password: string) => {
    await logoutRequestRef.current
    transitionTo('AUTHENTICATING')
    try {
      const result = await authenticate(identifier, password)
      const sessionId = startAuthSession()
      writeSessionValue(accessTokenKey, result.accessToken)
      writeSessionValue(accessTokenTypeKey, result.tokenType)
      writeSessionValue(appConfig.authUserStorageKey, JSON.stringify(result.user))
      setUser(result.user)
      scheduleExpirationCheck(result.accessToken, sessionId)
      transitionTo('AUTHENTICATED')
      return result.user
    } catch (error) {
      invalidateAuthSession()
      removeSessionValue(accessTokenKey)
      removeSessionValue(accessTokenTypeKey)
      removeSessionValue(appConfig.authUserStorageKey)
      setUser(null)
      transitionTo('UNAUTHENTICATED')
      throw error
    }
  }, [scheduleExpirationCheck, transitionTo])

  const signOut = useCallback(() => {
    transitionTo('LOGGING_OUT')
    const token = readSessionValue(accessTokenKey)
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    const logoutRequest = apiRequest(apiEndpoints.auth.logout, { method: 'POST', headers })
      .then(() => undefined)
      .catch(() => undefined)
    logoutRequestRef.current = logoutRequest
    clearAuthentication()
    transitionTo('UNAUTHENTICATED')
    navigate(routes.login, { replace: true })
  }, [clearAuthentication, navigate, transitionTo])

  const handleExpiredLogin = useCallback(() => {
    transitionTo('LOGGING_OUT')
    const token = readSessionValue(accessTokenKey)
    const headers = token ? { Authorization: `Bearer ${token}` } : undefined
    const logoutRequest = apiRequest(apiEndpoints.auth.logout, { method: 'POST', headers })
      .then(() => undefined)
      .catch(() => undefined)
    logoutRequestRef.current = logoutRequest
    clearAuthentication()
    transitionTo('UNAUTHENTICATED')
    navigate(routes.login, { replace: true })
  }, [clearAuthentication, navigate, transitionTo])

  const value = useMemo(
    () => ({
      user,
      authReady,
      authState,
      signIn,
      signOut,
    }),
    [authReady, authState, signIn, signOut, user],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
      {authState === 'SESSION_EXPIRED' && <SessionExpiredDialog onLogin={handleExpiredLogin} />}
    </AuthContext.Provider>
  )
}
