import { useState } from 'react'

export interface UploadFormValues {
  file: File
  requestedCuts: number
}

interface UploadFormProps {
  onSubmit: (values: UploadFormValues) => Promise<void>
  isSubmitting: boolean
}

export function UploadForm({ onSubmit, isSubmitting }: UploadFormProps) {
  const [file, setFile] = useState<File | null>(null)
  const [requestedCuts, setRequestedCuts] = useState(1)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!file) return

    await onSubmit({ file, requestedCuts })
    setFile(null)
    setRequestedCuts(1)
    event.currentTarget.reset()
  }

  return (
    <section className="card">
      <h2>Upload video</h2>
      <p className="inline-note">Upload-only MVP (no video URL ingestion yet).</p>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="video-file">
          Video file
        </label>
        <input
          id="video-file"
          type="file"
          accept="video/*"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          required
        />

        <label className="field-label" htmlFor="cuts">
          Requested cuts
        </label>
        <input
          id="cuts"
          type="number"
          min="1"
          max="50"
          value={requestedCuts}
          onChange={(event) => setRequestedCuts(Number(event.target.value))}
          required
        />

        <button className="btn" type="submit" disabled={!file || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Create clipping job'}
        </button>
      </form>
    </section>
  )
}
