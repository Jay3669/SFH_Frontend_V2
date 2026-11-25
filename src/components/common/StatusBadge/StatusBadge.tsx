export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral'

export function StatusBadge({
  children,
  tone = 'neutral',
}: {
  children: string
  tone?: StatusTone
}) {
  return <span className={`sfh-status-badge sfh-status-${tone}`}>{children}</span>
}
