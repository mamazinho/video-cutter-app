import type { Clip, Job, UserProfile } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export class ApiError extends Error {
  readonly status: number
  readonly data: unknown

  constructor(message: string, status: number, data?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.data = data
  }
}

interface RequestOptions {
  method?: string
  body?: Record<string, unknown> | FormData
  token?: string | null
  headers?: Record<string, string>
}

// --- Backend response shapes ---

export interface BootstrapResponse {
  access_token?: string
  user?: UserProfile
}

export interface WalletResponse {
  balance?: number
  credits?: number
}

export interface CheckoutResponse {
  checkout_url?: string
}

export interface UploadRequestResponse {
  upload_url: string
  upload_id: string
  storage_key: string
}

export interface UploadCompleteResponse {
  upload_id?: string
}

export interface JobResponse {
  id?: string | number
  job_id?: string | number
  status?: string
  requested_cuts?: number
  clips?: Clip[]
  outputs?: Clip[]
  job?: JobResponse
}

export type JobsListResponse =
  | Job[]
  | { items?: Job[]; jobs?: Job[] }

// --- Core fetch wrapper ---

async function request<T = unknown>(
  path: string,
  { method = 'GET', body, token, headers = {} }: RequestOptions = {},
): Promise<T> {
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
    body: body instanceof FormData ? body : body != null ? JSON.stringify(body) : undefined,
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? (await response.json() as T)
    : null

  if (!response.ok) {
    const errorPayload = payload as Record<string, unknown> | null
    throw new ApiError(
      (errorPayload?.message as string | undefined) ?? `Request failed with status ${response.status}`,
      response.status,
      payload,
    )
  }

  return payload as T
}

// --- API client ---

export const apiClient = {
  auth: {
    bootstrap: (firebaseToken: string): Promise<BootstrapResponse> =>
      request<BootstrapResponse>('/auth/firebase', {
        method: 'POST',
        body: { firebase_token: firebaseToken },
      }),
  },
  wallet: {
    getBalance: (token: string): Promise<WalletResponse> =>
      request<WalletResponse>('/wallet/balance', { token }),
  },
  billing: {
    createCheckout: (token: string, credits: number): Promise<CheckoutResponse> =>
      request<CheckoutResponse>('/billing/checkout', {
        method: 'POST',
        token,
        body: { credits },
      }),
  },
  upload: {
    requestUploadUrl: (token: string, file: File): Promise<UploadRequestResponse> =>
      request<UploadRequestResponse>('/uploads/request', {
        method: 'POST',
        token,
        body: {
          filename: file.name,
          content_type: file.type || 'video/mp4',
          size_bytes: file.size,
        },
      }),
    completeUpload: (
      token: string,
      uploadId: string,
      storageKey: string,
    ): Promise<UploadCompleteResponse> =>
      request<UploadCompleteResponse>('/uploads/complete', {
        method: 'POST',
        token,
        body: { upload_id: uploadId, storage_key: storageKey },
      }),
    async uploadVideo({
      token,
      file,
      requestedCuts,
    }: {
      token: string
      file: File
      requestedCuts: number
    }): Promise<JobResponse> {
      const uploadResponse = await this.requestUploadUrl(token, file)
      const putResponse = await fetch(uploadResponse.upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': file.type || 'video/mp4' },
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
        upload_id: completion.upload_id ?? uploadResponse.upload_id,
      })
    },
  },
  jobs: {
    create: (token: string, payload: Record<string, unknown>): Promise<JobResponse> =>
      request<JobResponse>('/jobs', {
        method: 'POST',
        token,
        body: payload,
      }),
    list: (token: string): Promise<JobsListResponse> =>
      request<JobsListResponse>('/jobs', { token }),
    getById: (token: string, jobId: string | undefined): Promise<JobResponse> =>
      request<JobResponse>(`/jobs/${jobId}`, { token }),
  },
}
