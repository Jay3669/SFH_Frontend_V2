import { useEffect, useRef, useState, type ReactNode } from 'react'

const DEFAULT_TIMEOUT_MS = 5000

export function AutoDismissMessage({
  message,
  children,
  onDismiss,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: {
  message: string
  children: ReactNode
  onDismiss?: () => void
  timeoutMs?: number
}) {
  const [dismissedMessage, setDismissedMessage] = useState<string | null>(null)
  const onDismissRef = useRef(onDismiss)

  useEffect(() => {
    onDismissRef.current = onDismiss
  }, [onDismiss])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDismissedMessage(message)
      onDismissRef.current?.()
    }, timeoutMs)

    return () => window.clearTimeout(timeoutId)
  }, [message, timeoutMs])

  return dismissedMessage === message ? null : children
}
