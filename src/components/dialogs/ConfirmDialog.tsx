import { useId } from 'react'
import { Dialog, DialogActions, DialogContent, DialogTitle, Button } from '@mui/material'
import { Icon, type IconName } from '../common/Icon/Icon'
import './confirm-dialog.css'

export function ConfirmDialog({
  title,
  message,
  confirmLabel,
  icon = 'delete',
  danger = true,
  onConfirm,
  onCancel,
}: {
  title: string
  message: string
  confirmLabel: string
  icon?: Extract<IconName, 'delete' | 'logout' | 'deactivate'>
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}) {
  const titleId = useId()
  const messageId = useId()

  return (
    <Dialog
      open
      onClose={onCancel}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      className="sfh-confirm-dialog"
      slotProps={{ paper: { className: 'sfh-confirm-dialog__paper' } }}
    >
      <DialogTitle id={titleId} className="sfh-confirm-dialog__title">
        <span className={`sfh-confirm-dialog__icon${danger ? ' is-danger' : ''}`} aria-hidden="true">
          <Icon name={icon} size={22} />
        </span>
        <span>{title}</span>
      </DialogTitle>
      <DialogContent className="sfh-confirm-dialog__content">
        <p id={messageId}>{message}</p>
      </DialogContent>
      <DialogActions className="sfh-confirm-dialog__actions">
        <Button variant="outlined" onClick={onCancel} autoFocus>
          Cancel
        </Button>
        <Button color={danger ? 'error' : 'primary'} variant="contained" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
