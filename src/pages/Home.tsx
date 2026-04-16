import { Link } from 'react-router-dom'

export function Home() {
  return (
    <main className="page stack">
      <section className="hero-card">
        <h1>Turn one video into multiple social clips</h1>
        <p>
          Upload your video, choose how many cuts you want, and pay only for what you use.
          Built for a fast pay-per-cut workflow.
        </p>
        <div className="actions-row">
          <Link className="btn" to="/login">
            Start with Google login
          </Link>
          <Link className="btn btn-secondary" to="/dashboard">
            Open dashboard
          </Link>
        </div>
      </section>
    </main>
  )
}
