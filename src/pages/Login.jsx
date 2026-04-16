import { Navigate } from 'react-router-dom'
import { GoogleLoginButton } from '../components/GoogleLoginButton'
import { useAuth } from '../context/useAuth'

export function Login() {
  const { isAuthenticated, loading, error } = useAuth()

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="page stack">
      <section className="card narrow-card stack">
        <h1>Login</h1>
        <p>Use Google popup authentication to access your dashboard.</p>
        <GoogleLoginButton />
        {error ? <p className="inline-note error-text">{error}</p> : null}
      </section>
    </main>
  )
}
