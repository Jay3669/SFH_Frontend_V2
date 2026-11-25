import { createContext } from 'react'
import type { AuthUser } from '../../types/auth.types'

export type AuthState =
  | 'UNAUTHENTICATED'
  | 'AUTHENTICATING'
  | 'AUTHENTICATED'
  | 'SESSION_EXPIRED'
  | 'LOGGING_OUT'

export type AuthContextValue = {
  user: AuthUser | null
  authReady: boolean
  authState: AuthState
  signIn: (identifier: string, password: string) => Promise<AuthUser>
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
