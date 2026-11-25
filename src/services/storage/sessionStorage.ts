export function readSessionValue(key: string) {
  return sessionStorage.getItem(key)
}

export function writeSessionValue(key: string, value: string) {
  sessionStorage.setItem(key, value)
}

export function removeSessionValue(key: string) {
  sessionStorage.removeItem(key)
}
