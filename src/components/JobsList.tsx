import { Link } from 'react-router-dom'
import type { Job, JobStatus } from '../types'

const STATUS_LABELS: Record<JobStatus, string> = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

interface JobsListProps {
  jobs: Job[]
}

export function JobsList({ jobs }: JobsListProps) {
  if (!jobs.length) {
    return (
      <p className="inline-note">
        No jobs yet. Upload a video to create your first clipping job.
      </p>
    )
  }

  return (
    <ul className="jobs-list">
      {jobs.map((job) => (
        <li key={job.id} className="job-item">
          <div>
            <p className="job-title">Job #{job.id}</p>
            <p className="inline-note">
              {STATUS_LABELS[job.status as JobStatus] ?? job.status}
            </p>
          </div>
          <Link className="btn btn-link" to={`/jobs/${job.id}`}>
            View details
          </Link>
        </li>
      ))}
    </ul>
  )
}
