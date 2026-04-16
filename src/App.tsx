import type { ReactNode } from 'react'
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { Home } from './pages/Home'
import { JobDetail } from './pages/JobDetail'
import { Login } from './pages/Login'
import { useAuth } from './context/useAuth'
import './App.css'

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p className="loading-state">Loading authentication...</p>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return children
}

function AppHeader() {
  const { isAuthenticated, profile, logout } = useAuth()

  return (
    <header className="app-header">
      <Link to="/" className="brand">
        Video Cutter MVP
      </Link>
      <nav className="nav-links">
        <Link to="/">Home</Link>
        {isAuthenticated ? (
          <Link to="/dashboard">Dashboard</Link>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
      {isAuthenticated ? (
        <div className="user-mini">
          <span>{profile?.email}</span>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Logout
          </button>
        </div>
      ) : null}
    </header>
  )
}

export default function App() {
  return (
    <>
      <AppHeader />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path="/jobs/:jobId"
          element={
            <RequireAuth>
              <JobDetail />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
