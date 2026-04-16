import { Link } from 'react-router-dom'

const STATUS_LABELS = {
  pending: 'Pending',
  processing: 'Processing',
  completed: 'Completed',
  failed: 'Failed',
}

export function JobsList({ jobs }) {
  if (!jobs.length) {
    return <p className="inline-note">No jobs yet. Upload a video to create your first clipping job.</p>
  }

  return (
    <ul className="jobs-list">
      {jobs.map((job) => (
        <li key={job.id} className="job-item">
          <div>
            <p className="job-title">Job #{job.id}</p>
            <p className="inline-note">{STATUS_LABELS[job.status] || job.status}</p>
          </div>
          <Link className="btn btn-link" to={`/jobs/${job.id}`}>
            View details
          </Link>
        </li>
      ))}
    </ul>
  )
}
