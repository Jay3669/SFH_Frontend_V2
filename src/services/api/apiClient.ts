import { envConfig } from '../../config/env.config'
import { appConfig } from '../../config/app.config'
import { apiEndpoints } from './apiEndpoints'
import { getAuthSessionId } from '../auth/authSession'
import { readSessionValue, writeSessionValue } from '../storage/sessionStorage'
import { activeBranchStorageKey } from '../storage/branchStorage'

export const sessionExpiredEvent = 'sfh:session-expired'
export const accessTokenRefreshedEvent = 'sfh:access-token-refreshed'

const refreshableAuthCodes = new Set([
  'TOKEN_EXPIRED',
  'INVALID_ACCESS_TOKEN',
  'SESSION_INVALID',
])
const API_REQUEST_TIMEOUT_MS = 30_000
const API_LOADER_MIN_DURATION_MS = 3_000
const authRequestsWithoutLoader = new Set([
  apiEndpoints.auth.login,
  apiEndpoints.auth.logout,
  apiEndpoints.auth.refresh,
].map((path) => path.toLowerCase()))

type TokenResponse = {
  data?: {
    tokens?: {
      accessToken?: unknown
      tokenType?: unknown
    }
  }
}

type RefreshOperation = {
  sessionId: string
  promise: Promise<string | null>
}

let refreshOperation: RefreshOperation | null = null
let activeApiRequestCount = 0
let apiLoaderVisible = false
let apiLoaderStartedAt = 0
let hideApiLoaderTimeout: ReturnType<typeof setTimeout> | null = null
const apiRequestSubscribers = new Set<() => void>()

function notifyApiRequestSubscribers() {
  apiRequestSubscribers.forEach((subscriber) => subscriber())
}

export function getApiLoaderVisible() {
  return apiLoaderVisible
}

export function subscribeToApiRequests(subscriber: () => void) {
  apiRequestSubscribers.add(subscriber)
  return () => apiRequestSubscribers.delete(subscriber)
}

function beginApiLoading() {
  if (hideApiLoaderTimeout !== null) {
    clearTimeout(hideApiLoaderTimeout)
    hideApiLoaderTimeout = null
  }
  if (activeApiRequestCount === 0 && !apiLoaderVisible) {
    apiLoaderVisible = true
    apiLoaderStartedAt = Date.now()
    notifyApiRequestSubscribers()
  }
  activeApiRequestCount += 1
}

function finishApiLoading() {
  activeApiRequestCount = Math.max(0, activeApiRequestCount - 1)
  if (activeApiRequestCount > 0 || !apiLoaderVisible) return

  const remainingDuration = Math.max(
    0,
    API_LOADER_MIN_DURATION_MS - (Date.now() - apiLoaderStartedAt),
  )
  if (remainingDuration === 0) {
    apiLoaderVisible = false
    notifyApiRequestSubscribers()
    return
  }

  hideApiLoaderTimeout = setTimeout(() => {
    hideApiLoaderTimeout = null
    if (activeApiRequestCount === 0 && apiLoaderVisible) {
      apiLoaderVisible = false
      notifyApiRequestSubscribers()
    }
  }, remainingDuration)
}

export class ApiError extends Error {
  readonly status?: number
  readonly code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.status = status
    this.code = code
    this.name = 'ApiError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object'
}

function authErrorCode(payload: Record<string, unknown>) {
  const errors = payload.errors
  if (isRecord(errors) && typeof errors.code === 'string') return errors.code
  return undefined
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const requestPath = path.split(/[?#]/, 1)[0].toLowerCase()
  const isLoginPage = typeof window !== 'undefined' && window.location.pathname === '/'
  const showApiLoader = !authRequestsWithoutLoader.has(requestPath) && !isLoginPage
  if (showApiLoader) beginApiLoading()

  const controller = new AbortController()
  const externalSignal = options.signal
  let timedOut = false
  const timeoutId = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, API_REQUEST_TIMEOUT_MS)
  const abortFromCaller = () => controller.abort(externalSignal?.reason)
  if (externalSignal?.aborted) abortFromCaller()
  else externalSignal?.addEventListener('abort', abortFromCaller, { once: true })

  try {
    let response: Response
    try {
      response = await fetch(`${envConfig.apiBaseUrl}${path}`, {
        ...options,
        signal: controller.signal,
        credentials: options.credentials ?? 'include',
      })
    } catch (error) {
      if (timedOut) {
        throw new ApiError('The request timed out after 30 seconds.', undefined, 'REQUEST_TIMEOUT')
      }
      if (controller.signal.aborted) {
        throw new ApiError('The request was cancelled.', undefined, 'REQUEST_ABORTED')
      }
      if (error instanceof TypeError) {
        throw new ApiError('Could not reach the server. Check your connection and API configuration.')
      }
      throw error
    }

    if (response.status === 204) return undefined as T

    let result: unknown
    try {
      result = await response.json()
    } catch {
      if (timedOut) {
        throw new ApiError('The request timed out after 30 seconds.', undefined, 'REQUEST_TIMEOUT')
      }
      if (controller.signal.aborted) {
        throw new ApiError('The request was cancelled.', undefined, 'REQUEST_ABORTED')
      }
      throw new ApiError('The server returned an invalid response.', response.status)
    }

    if (!isRecord(result)) {
      throw new ApiError('The server returned an invalid response.', response.status)
    }

    if (!response.ok) {
      throw new ApiError(
        typeof result.message === 'string'
          ? result.message
          : 'The request could not be completed.',
        response.status,
        authErrorCode(result),
      )
    }

    return result as T
  } finally {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', abortFromCaller)
    if (showApiLoader) finishApiLoading()
  }
}

function dispatchSessionExpired(token: string, sessionId: string) {
  if (
    typeof window !== 'undefined' &&
    getAuthSessionId() === sessionId &&
    readSessionValue(appConfig.accessTokenStorageKey) === token
  ) {
    window.dispatchEvent(new CustomEvent(sessionExpiredEvent, {
      detail: { token, sessionId },
    }))
  }
}

async function renewAccessToken(token: string, sessionId: string): Promise<string | null> {
  if (getAuthSessionId() !== sessionId) return null
  const currentToken = readSessionValue(appConfig.accessTokenStorageKey)
  if (currentToken && currentToken !== token) return currentToken

  if (refreshOperation?.sessionId === sessionId) return refreshOperation.promise

  const promise = (async () => {
    try {
      const response = await apiRequest<TokenResponse>(apiEndpoints.auth.refresh, {
        method: 'POST',
      })
      const refreshedToken = response.data?.tokens?.accessToken
      const tokenType = response.data?.tokens?.tokenType
      if (typeof refreshedToken !== 'string' || !refreshedToken || tokenType !== 'Bearer') {
        return null
      }
      if (
        getAuthSessionId() !== sessionId ||
        readSessionValue(appConfig.accessTokenStorageKey) !== token
      ) {
        return null
      }

      writeSessionValue(appConfig.accessTokenStorageKey, refreshedToken)
      writeSessionValue(appConfig.accessTokenTypeStorageKey, tokenType)
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(accessTokenRefreshedEvent, {
          detail: { previousToken: token, accessToken: refreshedToken, tokenType, sessionId },
        }))
      }
      return refreshedToken
    } catch {
      return null
    }
  })()

  const operation = { sessionId, promise }
  refreshOperation = operation
  try {
    return await promise
  } finally {
    if (refreshOperation === operation) refreshOperation = null
  }
}

function requestWithToken<T>(path: string, options: RequestInit, token: string) {
  const headers = new Headers(options.headers)
  headers.set('Authorization', `Bearer ${token}`)
  if (typeof window !== 'undefined') {
    const branchId = window.localStorage.getItem(activeBranchStorageKey)
    if (branchId) headers.set('X-Branch-Id', branchId)
  }
  return apiRequest<T>(path, { ...options, headers })
}

export async function handleAccessTokenExpiration(token: string, sessionId: string) {
  if (
    getAuthSessionId() !== sessionId ||
    readSessionValue(appConfig.accessTokenStorageKey) !== token
  ) {
    return
  }
  const refreshedToken = await renewAccessToken(token, sessionId)
  if (!refreshedToken) dispatchSessionExpired(token, sessionId)
}

export async function authenticatedApiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = readSessionValue(appConfig.accessTokenStorageKey)
  const sessionId = getAuthSessionId()
  if (!token || !sessionId) {
    throw new ApiError('Your session has expired. Please sign in again.', 401)
  }

  try {
    return await requestWithToken<T>(path, options, token)
  } catch (error) {
    if (
      !(error instanceof ApiError) ||
      error.status !== 401 ||
      !error.code ||
      !refreshableAuthCodes.has(error.code)
    ) {
      throw error
    }
    if (getAuthSessionId() !== sessionId) throw error

    const currentToken = readSessionValue(appConfig.accessTokenStorageKey)
    if (currentToken && currentToken !== token) {
      return requestWithToken<T>(path, options, currentToken)
    }

    const refreshedToken = await renewAccessToken(token, sessionId)
    if (!refreshedToken) {
      dispatchSessionExpired(token, sessionId)
      throw error
    }
    try {
      return await requestWithToken<T>(path, options, refreshedToken)
    } catch (retryError) {
      if (
        retryError instanceof ApiError &&
        retryError.status === 401 &&
        retryError.code &&
        refreshableAuthCodes.has(retryError.code)
      ) {
        dispatchSessionExpired(refreshedToken, sessionId)
      }
      throw retryError
    }
  }
}
