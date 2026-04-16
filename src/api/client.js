const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

async function request(path, { method = 'GET', body, token, headers = {} } = {}) {
  const requestHeaders = new Headers(headers)

  if (!requestHeaders.has('Content-Type') && body && !(body instanceof FormData)) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (token) {
    requestHeaders.set('Authorization', `Bearer ${token}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: requestHeaders,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : null

  if (!response.ok) {
    throw new ApiError(
      payload?.message || `Request failed with status ${response.status}`,
      response.status,
      payload,
    )
  }

  return payload
}

export const apiClient = {
  auth: {
    bootstrap: (firebaseToken) =>
      request('/auth/firebase', {
        method: 'POST',
        body: { firebase_token: firebaseToken },
      }),
  },
  wallet: {
    getBalance: (token) => request('/wallet/balance', { token }),
  },
  billing: {
    createCheckout: (token, credits) =>
      request('/billing/checkout', {
        method: 'POST',
        token,
        body: { credits },
      }),
  },
  upload: {
    requestUploadUrl: (token, file) =>
      request('/uploads/request', {
        method: 'POST',
        token,
        body: {
          filename: file.name,
          content_type: file.type || 'video/mp4',
          size_bytes: file.size,
        },
      }),
    completeUpload: (token, uploadId, storageKey) =>
      request('/uploads/complete', {
        method: 'POST',
        token,
        body: { upload_id: uploadId, storage_key: storageKey },
      }),
    async uploadVideo({ token, file, requestedCuts }) {
      const uploadResponse = await this.requestUploadUrl(token, file)
      const putResponse = await fetch(uploadResponse.upload_url, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type || 'video/mp4',
        },
        body: file,
      })

      if (!putResponse.ok) {
        throw new ApiError('Failed to upload video file.', putResponse.status)
      }

      const completion = await this.completeUpload(
        token,
        uploadResponse.upload_id,
        uploadResponse.storage_key,
      )

      return apiClient.jobs.create(token, {
        requested_cuts: requestedCuts,
        source_type: 'upload',
        upload_id: completion.upload_id || uploadResponse.upload_id,
      })
    },
  },
  jobs: {
    create: (token, payload) =>
      request('/jobs', {
        method: 'POST',
        token,
        body: payload,
      }),
    list: (token) => request('/jobs', { token }),
    getById: (token, jobId) => request(`/jobs/${jobId}`, { token }),
  },
}
