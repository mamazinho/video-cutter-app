interface CreditsCardProps {
  balance: number
  loading: boolean
}

export function CreditsCard({ balance, loading }: CreditsCardProps) {
  return (
    <section className="card">
      <h2>Credits</h2>
      <p className="credits-value">{loading ? 'Loading...' : `${balance} credits`}</p>
      <p className="inline-note">1 credit = 1 generated cut.</p>
    </section>
  )
}
