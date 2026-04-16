import type { Clip } from '../types'

interface ClipCardProps {
  clip: Clip
}

export function ClipCard({ clip }: ClipCardProps) {
  return (
    <article className="clip-card">
      <p className="clip-title">Clip {clip.index ?? clip.id}</p>
      <p className="inline-note">
        {clip.start_time ?? 0}s - {clip.end_time ?? 0}s
      </p>
      <a
        className="btn btn-link"
        href={clip.download_url ?? clip.url}
        target="_blank"
        rel="noreferrer"
      >
        Download clip
      </a>
    </article>
  )
}
