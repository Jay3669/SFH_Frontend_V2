import type { ReactNode } from 'react'

export type IconName = 'view' | 'edit' | 'delete' | 'activate' | 'deactivate' | 'close' | 'logout' | 'add' | 'reset'

const iconShapes: Record<IconName, ReactNode> = {
  view: <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z" /><circle cx="12" cy="12" r="2.5" /></>,
  edit: <><path d="m14 5 5 5" /><path d="M4 20l4.2-.9L19 8.3 15.7 5 4.9 15.8 4 20Z" /><path d="M13.5 7.2 16.8 10.5" /></>,
  delete: <><path d="M4 7h16" /><path d="m6 7 1 13h10l1-13" /><path d="M9 7V4h6v3" /><path d="M10 11v5M14 11v5" /></>,
  activate: <><rect x="2.5" y="6" width="19" height="12" rx="6" /><circle cx="15" cy="12" r="3" fill="currentColor" /></>,
  deactivate: <><rect x="2.5" y="6" width="19" height="12" rx="6" /><circle cx="9" cy="12" r="3" fill="currentColor" /></>,
  close: <><path d="m6 6 12 12M18 6 6 18" /></>,
  logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
  add: <><path d="M12 5v14M5 12h14" /></>,
  reset: <><path d="M3 11a9 9 0 0 1 15.36-6.36L21 7" /><path d="M21 3v4h-4" /><path d="M21 13a9 9 0 0 1-15.36 6.36L3 17" /><path d="M3 21v-4h4" /></>,
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconShapes[name]}
    </svg>
  )
}
