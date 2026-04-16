export interface UserProfile {
  id: string
  name: string
  email: string
  photo_url: string | null
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Job {
  id: string | number
  status: JobStatus | string
  requested_cuts?: number
  created_at?: string
  finished_at?: string
  clips?: Clip[]
  outputs?: Clip[]
}

export interface Clip {
  id?: string | number
  index?: number
  start_time?: number
  end_time?: number
  download_url?: string
  url?: string
}

export interface CreditPackage {
  label: string
  credits: number
  price: string
}
