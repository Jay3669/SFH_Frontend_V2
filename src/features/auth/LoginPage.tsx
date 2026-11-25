import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import foodBackground from '../../assets/images/food-background.png'
import { Logo } from '../../components/common/Logo/Logo'
import { useAuth } from '../../hooks/useAuth'
import { isValidIdentifier } from '../../utils/validators'
import { dashboardPath } from '../../app/router/routes'
import { Alert, CircularProgress, IconButton, InputAdornment, TextField, Button } from '@mui/material'
import { Visibility, VisibilityOff, MailOutlined, LockOutlined } from '@mui/icons-material'

export function LoginPage() {
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage('')

    if (!isValidIdentifier(identifier)) {
      setErrorMessage('Enter a valid email address or phone number.')
      return
    }
    if (!password) {
      setErrorMessage('Enter your password.')
      return
    }

    setIsLoading(true)
    try {
      const user = await signIn(identifier, password)
      setPassword('')
      navigate(dashboardPath(user.role), { replace: true })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Sign in failed. Please try again.',
      )
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="login-page">
      <section className="login-visual" style={{ backgroundImage: `url(${foodBackground})` }}>
        <div className="visual-shade" />
        <Logo className="login-brand" />
        <div className="visual-copy">
          <span className="visual-kicker">A TASTE OF HOME</span>
          <h1>Good food.<br />Good people.<br /><em>One hub.</em></h1>
          <p>One secure sign-in for your Surya Food Hub account.</p>
        </div>
        <div className="visual-caption">
          <span className="caption-line" />
          <span>Freshly prepared, thoughtfully served.</span>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <Logo className="mobile-logo" showName={false} />
          <div className="login-overline"><span className="login-overline-mark">✦</span> SECURE ACCOUNT ACCESS</div>
          <h2>Welcome back</h2>
          <p className="login-intro">Sign in to continue to your workspace.</p>

          <form className="login-form" onSubmit={handleSubmit} noValidate>
            <TextField
              id="login-identifier"
              label="Email address or phone number"
              autoComplete="username"
              type="text"
              placeholder="Email or phone number"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              required
              fullWidth
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><MailOutlined fontSize="small" /></InputAdornment>,
                },
              }}
            />

            <TextField
              id="login-password"
              label="Password"
              autoComplete="current-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              fullWidth
              slotProps={{
                input: {
                  startAdornment: <InputAdornment position="start"><LockOutlined fontSize="small" /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((visible) => !visible)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            {errorMessage && <Alert severity="error">{errorMessage}</Alert>}

            <Button className="login-submit" type="submit" variant="contained" disabled={isLoading} fullWidth>
              {isLoading ? <CircularProgress size={20} color="inherit" /> : 'Sign in securely'}
            </Button>
          </form>

          <div className="secure-note"><span>♧</span> Your account role opens the right workspace</div>
        </div>
        <footer className="login-footer">
          <span>© {new Date().getFullYear()} Surya Food Hub</span>
          <span>Made for the love of good food <b>✦</b></span>
        </footer>
      </section>
    </main>
  )
}
