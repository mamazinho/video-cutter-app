import { useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { User } from 'firebase/auth'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { apiClient, ApiError } from '../api/client'
import { auth, googleProvider, hasFirebaseConfig } from '../firebase'
import type { UserProfile } from '../types'
import { AuthContext } from './AuthContextStore'

const STORAGE_KEY = 'video-cutter-api-token'

function defaultProfile(firebaseUser: User): UserProfile {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName ?? 'Google User',
    email: firebaseUser.email ?? 'No email available',
    photo_url: firebaseUser.photoURL,
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [apiToken, setApiToken] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setFirebaseUser(nextUser)
      setError('')

      if (!nextUser) {
        localStorage.removeItem(STORAGE_KEY)
        setApiToken(null)
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        const token = await nextUser.getIdToken()
        const bootstrapResponse = await apiClient.auth.bootstrap(token)
        const backendToken = bootstrapResponse.access_token ?? token

        localStorage.setItem(STORAGE_KEY, backendToken)
        setApiToken(backendToken)
        setProfile(bootstrapResponse.user ?? defaultProfile(nextUser))
      } catch (bootstrapError) {
        if (bootstrapError instanceof ApiError) {
          setError(bootstrapError.message)
        } else {
          setError('Unable to initialize your account right now.')
        }
        setProfile(defaultProfile(nextUser))
      } finally {
        setLoading(false)
      }
    })

    return unsubscribe
  }, [])

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    if (!auth || !googleProvider || !hasFirebaseConfig) {
      throw new Error('Firebase environment variables are missing.')
    }

    setError('')
    await signInWithPopup(auth, googleProvider)
  }, [])

  const logout = useCallback(async (): Promise<void> => {
    if (!auth) return
    await signOut(auth)
  }, [])

  const value = useMemo(
    () => ({
      firebaseUser,
      profile,
      apiToken,
      isAuthenticated: Boolean(firebaseUser),
      loading,
      error,
      hasFirebaseConfig,
      signInWithGoogle,
      logout,
    }),
    [firebaseUser, profile, apiToken, loading, error, signInWithGoogle, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
