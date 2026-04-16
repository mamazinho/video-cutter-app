import { createContext } from 'react'
import type { User } from 'firebase/auth'
import type { UserProfile } from '../types'

export interface AuthContextValue {
  firebaseUser: User | null
  profile: UserProfile | null
  apiToken: string | null
  isAuthenticated: boolean
  loading: boolean
  error: string
  hasFirebaseConfig: boolean
  signInWithGoogle: () => Promise<void>
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)
