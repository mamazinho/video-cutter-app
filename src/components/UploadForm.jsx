import { useState } from 'react'

export function UploadForm({ onSubmit, isSubmitting }) {
  const [file, setFile] = useState(null)
  const [requestedCuts, setRequestedCuts] = useState(1)

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!file) return

    await onSubmit({ file, requestedCuts: Number(requestedCuts) })
    setFile(null)
    setRequestedCuts(1)
    event.target.reset()
  }

  return (
    <section className="card">
      <h2>Upload video</h2>
      <p className="inline-note">Upload-only MVP (no video URL ingestion yet).</p>
      <form className="stack" onSubmit={handleSubmit}>
        <label className="field-label" htmlFor="video-file">Video file</label>
        <input id="video-file" type="file" accept="video/*" onChange={(event) => setFile(event.target.files?.[0] || null)} required />

        <label className="field-label" htmlFor="cuts">Requested cuts</label>
        <input
          id="cuts"
          type="number"
          min="1"
          max="50"
          defaultValue="1"
          onChange={(event) => setRequestedCuts(event.target.value)}
          required
        />

        <button className="btn" type="submit" disabled={!file || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Create clipping job'}
        </button>
      </form>
    </section>
  )
}
