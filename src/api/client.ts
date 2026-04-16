import type { Clip, Job, UserProfile } from '../types'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '')
const rawApiPrefix = import.meta.env.VITE_API_PREFIX
const API_PREFIX = (rawApiPrefix === undefined ? '/api' : rawApiPrefix).replace(/\/+$/, '')

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  if (!API_PREFIX) {
    return `${API_BASE_URL}${normalizedPath}`
  }
  return `${API_BASE_URL}${API_PREFIX}${normalizedPath}`
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value != null && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function toStringOrUndefined(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function toNumberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

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
  requestedCuts?: number
  clips?: Clip[]
  outputs?: Clip[]
  generated_clips?: Clip[]
  job?: JobResponse
  data?: JobResponse
}

export type JobsListResponse =
  | Job[]
  | { items?: Job[]; jobs?: Job[]; data?: Job[]; results?: Job[] }

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

  const response = await fetch(buildApiUrl(path), {
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
    const message = toStringOrUndefined(errorPayload?.detail)
      ?? toStringOrUndefined(errorPayload?.message)
      ?? toStringOrUndefined(errorPayload?.error)
      ?? `Request failed with status ${response.status}`
    throw new ApiError(
      message,
      response.status,
      payload,
    )
  }

  return payload as T
}

// --- API client ---

export const apiClient = {
  auth: {
    async bootstrap(firebaseToken: string): Promise<BootstrapResponse> {
      const payload = await request<BootstrapResponse>('/auth/firebase', {
        method: 'POST',
        body: {
          firebase_token: firebaseToken,
          id_token: firebaseToken,
          token: firebaseToken,
        },
      })
      const asObject = asRecord(payload)
      const accessToken = toStringOrUndefined(asObject?.access_token)
        ?? toStringOrUndefined(asObject?.token)
        ?? toStringOrUndefined(asObject?.jwt)
      return { ...payload, access_token: accessToken }
    },
  },
  wallet: {
    async getBalance(token: string): Promise<WalletResponse> {
      const payload = await request<WalletResponse>('/wallet/balance', { token })
      const asObject = asRecord(payload)
      const balance = toNumberOrUndefined(asObject?.balance)
        ?? toNumberOrUndefined(asObject?.credits)
        ?? toNumberOrUndefined(asObject?.available_credits)
        ?? toNumberOrUndefined(asObject?.credit_balance)
      return { ...payload, balance }
    },
  },
  billing: {
    async createCheckout(token: string, credits: number): Promise<CheckoutResponse> {
      const payload = await request<CheckoutResponse>('/billing/checkout', {
        method: 'POST',
        token,
        body: { credits, quantity: credits },
      })
      const asObject = asRecord(payload)
      const checkoutUrl = toStringOrUndefined(asObject?.checkout_url)
        ?? toStringOrUndefined(asObject?.checkoutUrl)
        ?? toStringOrUndefined(asObject?.init_point)
        ?? toStringOrUndefined(asObject?.url)
      return { ...payload, checkout_url: checkoutUrl }
    },
  },
  upload: {
    async requestUploadUrl(token: string, file: File): Promise<UploadRequestResponse> {
      const payload = await request<UploadRequestResponse>('/uploads/request', {
        method: 'POST',
        token,
        body: {
          filename: file.name,
          content_type: file.type || 'video/mp4',
          contentType: file.type || 'video/mp4',
          size_bytes: file.size,
          sizeBytes: file.size,
        },
      })

      const asObject = asRecord(payload)
      const uploadUrl = toStringOrUndefined(asObject?.upload_url)
        ?? toStringOrUndefined(asObject?.uploadUrl)
        ?? toStringOrUndefined(asObject?.signed_url)
        ?? toStringOrUndefined(asObject?.url)
      const uploadId = toStringOrUndefined(asObject?.upload_id)
        ?? toStringOrUndefined(asObject?.uploadId)
        ?? toStringOrUndefined(asObject?.id)
      const storageKey = toStringOrUndefined(asObject?.storage_key)
        ?? toStringOrUndefined(asObject?.storageKey)
        ?? toStringOrUndefined(asObject?.key)

      if (!uploadUrl || !uploadId || !storageKey) {
        throw new ApiError('Upload request response is missing required fields.', 500, payload)
      }

      return {
        ...payload,
        upload_url: uploadUrl,
        upload_id: uploadId,
        storage_key: storageKey,
      }
    },
    completeUpload: (
      token: string,
      uploadId: string,
      storageKey: string,
    ): Promise<UploadCompleteResponse> =>
      request<UploadCompleteResponse>('/uploads/complete', {
        method: 'POST',
        token,
        body: {
          upload_id: uploadId,
          uploadId,
          storage_key: storageKey,
          storageKey,
        },
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
        requestedCuts,
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
