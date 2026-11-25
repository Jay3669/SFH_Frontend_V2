import { useEffect, useState, type FormEvent } from 'react'
import { AdminLayout } from '../../layouts/AdminLayout'
import type { AuthUser } from '../../types/auth.types'
import {
  approveProfitSharing,
  calculateDailyProfitSharing,
  getDailyProfitSharing,
  rejectProfitSharing,
  type ProfitSharingCalculation,
} from './profitSharingService'

export function ProfitSharingPage({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  const [businessDate, setBusinessDate] = useState(new Date().toLocaleDateString('en-CA'))
  const [calculations, setCalculations] = useState<ProfitSharingCalculation[]>([])
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  async function load() {
    setError('')
    try {
      const response = await getDailyProfitSharing(businessDate)
      setCalculations(response.data ?? [])
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load calculations.')
    }
  }

  useEffect(() => {
    let active = true
    getDailyProfitSharing(businessDate)
      .then((response) => {
        if (active) setCalculations(response.data ?? [])
      })
      .catch((loadError) => {
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load calculations.')
      })
    return () => { active = false }
  }, [businessDate])

  async function calculate(event: FormEvent) {
    event.preventDefault()
    setError('')
    setNotice('')
    try {
      await calculateDailyProfitSharing(businessDate)
      setNotice('Daily net profit sharing calculated and saved for approval.')
      await load()
    } catch (calculateError) {
      setError(calculateError instanceof Error ? calculateError.message : 'Calculation failed.')
    }
  }

  async function approve(id: string) {
    try {
      await approveProfitSharing(id)
      setNotice('Calculation approved. It is now payable.')
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Approval failed.')
    }
  }

  async function reject(id: string) {
    const remarks = window.prompt('Reason for rejection')
    if (!remarks) return
    try {
      await rejectProfitSharing(id, remarks)
      setNotice('Calculation rejected.')
      await load()
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'Rejection failed.')
    }
  }

  return (
    <AdminLayout user={user} roleLabel="Administrator" sectionTitle="Profit sharing" onLogout={onLogout}>
      <main className="settings-page">
        <header className="settings-heading">
          <div>
            <p className="eyebrow">DAILY STAFF ALLOCATION</p>
            <h1>Profit sharing</h1>
            <p>Calculate and approve staff shares using the existing net daily profit result.</p>
          </div>
        </header>
        {error && <div className="operations-alert operations-alert-error" role="alert">{error}</div>}
        {notice && <div className="operations-alert operations-alert-success" role="status">{notice}</div>}
        <form className="settings-card settings-form" onSubmit={calculate}>
          <div className="settings-grid">
            <label>Business date
              <input type="date" value={businessDate} onChange={(event) => setBusinessDate(event.target.value)} required />
            </label>
          </div>
          <button className="sfh-button" type="submit">Calculate net profit share</button>
        </form>
        {calculations.map((calculation) => (
          <section className="settings-card" key={calculation.id}>
            <div className="settings-card-heading">
              <div>
                <p className="settings-overline">{calculation.businessDate}</p>
                <h2>₹{Number(calculation.totalProfitShare).toLocaleString('en-IN')} staff share</h2>
              </div>
              <span className="settings-status">{calculation.status}</span>
            </div>
            <p>Eligible net profit: <strong>₹{Number(calculation.eligibleNetProfit).toLocaleString('en-IN')}</strong></p>
            <p>Total additive allocation: <strong>{Number(calculation.totalAllocationPercentage).toFixed(4)}%</strong></p>
            {calculation.status === 'pending_approval' && (
              <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
                <button className="sfh-button" type="button" onClick={() => void approve(calculation.id)}>Approve</button>
                <button className="sfh-button" type="button" onClick={() => void reject(calculation.id)}>Reject</button>
              </div>
            )}
          </section>
        ))}
      </main>
    </AdminLayout>
  )
}
