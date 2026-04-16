import { useState } from 'react'
import { useAuth } from '../context/useAuth'

export function GoogleLoginButton() {
  const { signInWithGoogle, hasFirebaseConfig } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async () => {
    setError('')
    setIsLoading(true)

    try {
      await signInWithGoogle()
    } catch (loginError) {
      setError(loginError.message || 'Google login failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!hasFirebaseConfig) {
    return (
      <p className="inline-note error-text">
        Missing Firebase config. Add env vars to enable Google popup login.
      </p>
    )
  }

  return (
    <div className="login-action">
      <button type="button" className="btn btn-google" onClick={handleLogin} disabled={isLoading}>
        {isLoading ? 'Signing in...' : 'Continue with Google'}
      </button>
      {error ? <p className="inline-note error-text">{error}</p> : null}
    </div>
  )
}
