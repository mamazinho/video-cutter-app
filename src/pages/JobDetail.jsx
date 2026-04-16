import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { ClipCard } from '../components/ClipCard'
import { useAuth } from '../context/useAuth'

const TERMINAL_STATUSES = new Set(['completed', 'failed'])

function normalizeClips(jobPayload) {
  if (!jobPayload) return []
  if (Array.isArray(jobPayload.clips)) return jobPayload.clips
  if (Array.isArray(jobPayload.outputs)) return jobPayload.outputs
  return []
}

export function JobDetail() {
  const { jobId } = useParams()
  const { apiToken } = useAuth()
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const clips = useMemo(() => normalizeClips(job), [job])

  const loadJob = useCallback(async () => {
    if (!apiToken) return

    try {
      const payload = await apiClient.jobs.getById(apiToken, jobId)
      setJob(payload?.job || payload)
      setError('')
    } catch (requestError) {
      setError(requestError.message || 'Could not load the selected job.')
    } finally {
      setLoading(false)
    }
  }, [apiToken, jobId])

  useEffect(() => {
    loadJob()
  }, [loadJob])

  useEffect(() => {
    if (!job || TERMINAL_STATUSES.has(job.status)) return undefined

    const interval = setInterval(loadJob, 8000)
    return () => clearInterval(interval)
  }, [job, loadJob])

  return (
    <main className="page stack">
      <section className="card">
        <Link className="btn btn-link" to="/dashboard">
          ← Back to dashboard
        </Link>
        <h1>Job #{jobId}</h1>
        {loading ? <p>Loading job status...</p> : <p>Status: {job?.status || 'unknown'}</p>}
        {error ? <p className="inline-note error-text">{error}</p> : null}
      </section>

      <section className="card">
        <h2>Generated clips</h2>
        {clips.length ? (
          <div className="clip-grid">
            {clips.map((clip) => (
              <ClipCard key={clip.id || clip.download_url || `${clip.start_time}-${clip.end_time}`} clip={clip} />
            ))}
          </div>
        ) : (
          <p className="inline-note">No clips available yet. This page auto-refreshes while processing.</p>
        )}
      </section>
    </main>
  )
}
