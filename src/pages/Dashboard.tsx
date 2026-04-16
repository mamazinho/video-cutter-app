import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiClient, ApiError } from '../api/client'
import { CreditsCard } from '../components/CreditsCard'
import { JobsList } from '../components/JobsList'
import { UploadForm } from '../components/UploadForm'
import type { UploadFormValues } from '../components/UploadForm'
import { useAuth } from '../context/useAuth'
import type { CreditPackage, Job } from '../types'
import type { JobsListResponse } from '../api/client'

const CREDIT_PACKAGES: CreditPackage[] = [
  { label: '3 credits', credits: 3, price: 'R$ 30' },
  { label: '10 credits', credits: 10, price: 'R$ 100' },
  { label: '30 credits', credits: 30, price: 'R$ 300' },
]

function normalizeJobs(payload: JobsListResponse | null | undefined): Job[] {
  if (!payload) return []
  if (Array.isArray(payload)) return payload
  if ('items' in payload && Array.isArray(payload.items)) return payload.items ?? []
  if ('jobs' in payload && Array.isArray(payload.jobs)) return payload.jobs ?? []
  return []
}

export function Dashboard() {
  const navigate = useNavigate()
  const { profile, apiToken } = useAuth()
  const [balance, setBalance] = useState(0)
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [isSubmittingUpload, setIsSubmittingUpload] = useState(false)
  const [purchaseLoadingCredits, setPurchaseLoadingCredits] = useState<number | null>(null)
  const [errorMessage, setErrorMessage] = useState('')

  const userName = useMemo(() => profile?.name ?? profile?.email ?? 'User', [profile])

  const loadDashboard = useCallback(async () => {
    if (!apiToken) return

    setLoading(true)
    setErrorMessage('')

    try {
      const [wallet, jobsPayload] = await Promise.all([
        apiClient.wallet.getBalance(apiToken),
        apiClient.jobs.list(apiToken),
      ])

      setBalance(wallet?.balance ?? wallet?.credits ?? 0)
      setJobs(normalizeJobs(jobsPayload))
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not load your dashboard data.',
      )
    } finally {
      setLoading(false)
    }
  }, [apiToken])

  useEffect(() => {
    loadDashboard()
  }, [loadDashboard])

  const handlePurchase = async (credits: number) => {
    if (!apiToken) return
    setPurchaseLoadingCredits(credits)
    setErrorMessage('')

    try {
      const response = await apiClient.billing.createCheckout(apiToken, credits)
      if (response?.checkout_url) {
        window.location.assign(response.checkout_url)
        return
      }
      setErrorMessage('Checkout was created, but no redirect URL was provided by the backend.')
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Could not start checkout right now.',
      )
    } finally {
      setPurchaseLoadingCredits(null)
    }
  }

  const handleUpload = async ({ file, requestedCuts }: UploadFormValues) => {
    if (!apiToken) return
    setIsSubmittingUpload(true)
    setErrorMessage('')

    try {
      const job = await apiClient.upload.uploadVideo({ token: apiToken, file, requestedCuts })
      const jobId = job?.id ?? job?.job_id
      await loadDashboard()
      if (jobId) {
        navigate(`/jobs/${jobId}`)
      }
    } catch (err) {
      if (
        err instanceof ApiError &&
        (err.status === 402 ||
          (err.data as Record<string, unknown> | null)?.code === 'INSUFFICIENT_CREDITS')
      ) {
        setErrorMessage(
          'You do not have enough credits for this request. Please buy more credits and try again.',
        )
      } else {
        setErrorMessage(
          err instanceof Error ? err.message : 'Could not submit your upload.',
        )
      }
    } finally {
      setIsSubmittingUpload(false)
    }
  }

  return (
    <main className="page stack">
      <section className="card">
        <h1>Dashboard</h1>
        <p>Welcome, {userName}</p>
        <p className="inline-note">{profile?.email}</p>
      </section>

      <CreditsCard balance={balance} loading={loading} />

      <section className="card">
        <h2>Purchase credits</h2>
        <p className="inline-note">
          Complete checkout with Mercado Pago and credits will be added after payment confirmation.
        </p>
        <div className="package-grid">
          {CREDIT_PACKAGES.map((item) => (
            <button
              key={item.credits}
              type="button"
              className="package-card"
              onClick={() => handlePurchase(item.credits)}
              disabled={purchaseLoadingCredits === item.credits}
            >
              <strong>{item.label}</strong>
              <span>{item.price}</span>
            </button>
          ))}
        </div>
      </section>

      <UploadForm onSubmit={handleUpload} isSubmitting={isSubmittingUpload} />

      <section className="card">
        <h2>Jobs</h2>
        <JobsList jobs={jobs} />
      </section>

      {errorMessage ? <p className="inline-note error-text">{errorMessage}</p> : null}
    </main>
  )
}
