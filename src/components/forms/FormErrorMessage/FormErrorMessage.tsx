export function FormErrorMessage({ message }: { message?: string }) {
  if (!message) return null
  return <p className="sfh-form-error" role="alert">{message}</p>
}
