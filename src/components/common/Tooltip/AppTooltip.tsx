import Tooltip, { type TooltipProps } from '@mui/material/Tooltip'
import type { ReactElement, ReactNode } from 'react'

export function AppTooltip({
  title,
  placement = 'top',
  children,
}: {
  title: ReactNode
  placement?: TooltipProps['placement']
  children: ReactElement
}) {
  return (
    <Tooltip
      title={title}
      placement={placement}
      arrow
      enterDelay={350}
      slotProps={{
        tooltip: {
          sx: {
            borderRadius: '7px',
            backgroundColor: '#171d2d',
            boxShadow: '0 5px 16px rgb(23 29 45 / 22%)',
            fontSize: '0.72rem',
            fontWeight: 600,
          },
        },
        arrow: { sx: { color: '#171d2d' } },
      }}
    >
      {children}
    </Tooltip>
  )
}
