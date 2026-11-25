import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material'

export function SessionExpiredDialog({ onLogin }: { onLogin: () => void }) {
  return (
    <Dialog open aria-labelledby="session-expired-title" aria-describedby="session-expired-message">
      <DialogTitle id="session-expired-title">Session expired</DialogTitle>
      <DialogContent>
        <Alert severity="warning" id="session-expired-message">
          Your session has expired. Please log in again to continue.
        </Alert>
      </DialogContent>
      <DialogActions>
        <Button variant="contained" onClick={onLogin} autoFocus>
          Login
        </Button>
      </DialogActions>
    </Dialog>
  )
}
