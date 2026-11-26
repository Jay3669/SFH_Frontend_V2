import { AutoDismissMessage } from '../../common/AutoDismissMessage/AutoDismissMessage'

export function FormErrorMessage({ message }: { message?: string }) {
  if (!message) return null
  return (
    <AutoDismissMessage message={message}>
      <p className="sfh-form-error" role="alert">{message}</p>
    </AutoDismissMessage>
  )
}
