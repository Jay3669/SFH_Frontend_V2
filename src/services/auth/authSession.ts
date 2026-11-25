let activeSessionId: string | null = null
let sessionSequence = 0

export function startAuthSession() {
  sessionSequence += 1
  activeSessionId = `${Date.now()}-${sessionSequence}`
  return activeSessionId
}

export function getAuthSessionId() {
  return activeSessionId
}

export function invalidateAuthSession() {
  activeSessionId = null
}

export function readTokenExpiration(token: string): number | null {
  const encodedPayload = token.split('.')[1]
  if (!encodedPayload) return null

  try {
    const payload = JSON.parse(atob(encodedPayload.replace(/-/g, '+').replace(/_/g, '/'))) as {
      exp?: unknown
    }
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null
  } catch {
    return null
  }
}
