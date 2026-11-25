export function isValidIdentifier(value: string) {
  const identifier = value.trim()
  const emailIsValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
  const phoneDigits = identifier.replace(/\D/g, '')
  const phoneIsValid = /^\+?[\d\s().-]+$/.test(identifier) &&
    phoneDigits.length >= 7 && phoneDigits.length <= 15
  return emailIsValid || phoneIsValid
}
