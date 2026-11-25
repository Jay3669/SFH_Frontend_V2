import { useEffect, useState, type FormEvent } from 'react'
import { AdminLayout } from '../../layouts/AdminLayout'
import type { AuthUser } from '../../types/auth.types'
import { formatTimestamp } from '../../utils/dateFormatting'
import { getApplicationSettings, updateApplicationSettings } from './settingsService'
import type {
  AdditionalChargeSetting,
  ApplicationSettings,
  PaymentTender,
} from './settings.types'
import './settings.css'

const defaultSettings: ApplicationSettings = {
  billing: {
    invoicePrefix: 'POS',
    tax: { enabled: false, rate: 0 },
    packingCharge: { enabled: false, amount: 0 },
    additionalCharges: [],
  },
  payments: {
    enabledMethods: { cash: true, card: true, upi: true },
    allowSplit: true,
  },
  regional: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    timeZone: 'Asia/Kolkata',
  },
  profitSharing: {
    maxAllocationPercentage: 20,
  },
}

const requestError = (error: unknown) =>
  error instanceof Error ? error.message : 'The settings request could not be completed.'

const paymentLabels: Record<PaymentTender, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
}

function SettingSwitch({
  checked,
  label,
  onChange,
  disabled = false,
}: {
  checked: boolean
  label: string
  onChange: () => void
  disabled?: boolean
}) {
  return (
    <button
      className="sfh-switch"
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
    />
  )
}

export function SettingsPage({
  user,
  onLogout,
}: {
  user: AuthUser
  onLogout: () => void
}) {
  const [settings, setSettings] = useState<ApplicationSettings>(defaultSettings)
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('1')
  const [loading, setLoading] = useState(true)
  const [settingsLoaded, setSettingsLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    let active = true
    getApplicationSettings()
      .then((response) => {
        if (!response.data) throw new Error('The server returned no application settings.')
        if (!active) return
        setSettings(response.data.settings)
        setNextInvoiceNumber(response.data.nextInvoiceNumber)
        setSettingsLoaded(true)
        setError('')
      })
      .catch((loadError: unknown) => {
        if (active) setError(requestError(loadError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  function updateCharge(id: string, update: Partial<AdditionalChargeSetting>) {
    setSettings((current) => ({
      ...current,
      billing: {
        ...current.billing,
        additionalCharges: current.billing.additionalCharges.map((charge) =>
          charge.id === id ? { ...charge, ...update } : charge),
      },
    }))
  }

  function addCharge() {
    if (settings.billing.additionalCharges.length >= 10) return
    const charge: AdditionalChargeSetting = {
      id: crypto.randomUUID(),
      name: '',
      enabled: false,
      calculationType: 'fixed',
      amount: 0,
    }
    setSettings((current) => ({
      ...current,
      billing: {
        ...current.billing,
        additionalCharges: [...current.billing.additionalCharges, charge],
      },
    }))
  }

  function togglePaymentMethod(method: PaymentTender) {
    setSettings((current) => {
      const enabledMethods = {
        ...current.payments.enabledMethods,
        [method]: !current.payments.enabledMethods[method],
      }
      const enabledCount = Object.values(enabledMethods).filter(Boolean).length
      return {
        ...current,
        payments: {
          enabledMethods,
          allowSplit: current.payments.allowSplit && enabledCount >= 2,
        },
      }
    })
  }

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await updateApplicationSettings(settings)
      if (!response.data) throw new Error('The server returned no saved settings.')
      setSettings(response.data.settings)
      setNextInvoiceNumber(response.data.nextInvoiceNumber)
      setNotice('Settings saved. They now apply to every register.')
    } catch (saveError) {
      setError(requestError(saveError))
    } finally {
      setSaving(false)
    }
  }

  const enabledPaymentCount = Object.values(settings.payments.enabledMethods).filter(Boolean).length
  const previewNumber = `${settings.billing.invoicePrefix}-${nextInvoiceNumber.padStart(6, '0')}`

  return (
    <AdminLayout
      user={user}
      roleLabel="Administrator"
      sectionTitle="Settings"
      onLogout={onLogout}
    >
      <main className="settings-page">
        <header className="settings-heading">
          <div>
            <p className="eyebrow">WORKSPACE PREFERENCES</p>
            <h1>Settings</h1>
            <p>Manage billing rules, accepted payment methods, and regional formats for every register.</p>
          </div>
        </header>

        {error && <div className="operations-alert operations-alert-error" role="alert">{error}</div>}
        {notice && <div className="operations-alert operations-alert-success" role="status">{notice}</div>}
        {loading
          ? <section className="settings-card"><p className="settings-muted">Loading saved settings…</p></section>
          : settingsLoaded && <form className="settings-form" onSubmit={(event) => void saveSettings(event)}>
            <section className="settings-card">
              <div className="settings-card-heading">
                <div><p className="settings-overline">BILLING &amp; NUMBERING</p><h2>Bill defaults</h2></div>
                <span className="settings-status">Applied at checkout</span>
              </div>
              <div className="settings-grid">
                <label>Invoice prefix
                  <input
                    value={settings.billing.invoicePrefix}
                    onChange={(event) => setSettings((current) => ({
                      ...current,
                      billing: { ...current.billing, invoicePrefix: event.target.value.toUpperCase() },
                    }))}
                    maxLength={12}
                    pattern="[A-Za-z0-9][A-Za-z0-9-]{0,11}"
                    required
                  />
                </label>
                <label>Next sequential number
                  <input value={nextInvoiceNumber} readOnly aria-readonly="true" />
                </label>
              </div>
              <p className="settings-preview">Next bill reference <strong>{previewNumber}</strong>. Numbers continue sequentially and are never reset when the prefix changes.</p>

              <div className="settings-rule">
                <div className="settings-rule-copy"><strong>Tax</strong><span>Apply tax to the discounted subtotal.</span></div>
                <SettingSwitch
                  checked={settings.billing.tax.enabled}
                  label="Enable tax"
                  onChange={() => setSettings((current) => ({
                    ...current,
                    billing: { ...current.billing, tax: { ...current.billing.tax, enabled: !current.billing.tax.enabled } },
                  }))}
                />
              </div>
              <label className="settings-inline-field">Tax rate (%)
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={settings.billing.tax.rate}
                  disabled={!settings.billing.tax.enabled}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    billing: { ...current.billing, tax: { ...current.billing.tax, rate: Number(event.target.value) } },
                  }))}
                />
              </label>

              <div className="settings-rule">
                <div className="settings-rule-copy"><strong>Packing charge</strong><span>Add a fixed packing fee to each bill.</span></div>
                <SettingSwitch
                  checked={settings.billing.packingCharge.enabled}
                  label="Enable packing charge"
                  onChange={() => setSettings((current) => ({
                    ...current,
                    billing: {
                      ...current.billing,
                      packingCharge: { ...current.billing.packingCharge, enabled: !current.billing.packingCharge.enabled },
                    },
                  }))}
                />
              </div>
              <label className="settings-inline-field">Packing charge (₹)
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={settings.billing.packingCharge.amount}
                  disabled={!settings.billing.packingCharge.enabled}
                  onChange={(event) => setSettings((current) => ({
                    ...current,
                    billing: {
                      ...current.billing,
                      packingCharge: { ...current.billing.packingCharge, amount: Number(event.target.value) },
                    },
                  }))}
                />
              </label>

              <div className="settings-subheading">
                <div><h3>Additional charges</h3><p>Configure optional fixed or percentage charges, each with its own switch.</p></div>
                <button className="sfh-button sfh-button-secondary" type="button" onClick={addCharge} disabled={settings.billing.additionalCharges.length >= 10}>
                  Add charge
                </button>
              </div>
              <div className="settings-charge-list">
                {settings.billing.additionalCharges.map((charge) => (
                  <article className="settings-charge" key={charge.id}>
                    <div className="settings-charge-title">
                      <label>Charge name
                        <input
                          value={charge.name}
                          onChange={(event) => updateCharge(charge.id, { name: event.target.value })}
                          maxLength={40}
                          required
                        />
                      </label>
                      <div className="settings-charge-enabled">
                        <span>Enabled</span>
                        <SettingSwitch
                          checked={charge.enabled}
                          label={`Enable ${charge.name || 'additional charge'}`}
                          onChange={() => updateCharge(charge.id, { enabled: !charge.enabled })}
                        />
                      </div>
                      <button
                        className="settings-remove-button"
                        type="button"
                        onClick={() => setSettings((current) => ({
                          ...current,
                          billing: {
                            ...current.billing,
                            additionalCharges: current.billing.additionalCharges.filter((entry) => entry.id !== charge.id),
                          },
                        }))}
                      >
                        Remove
                      </button>
                    </div>
                    <div className="settings-charge-fields">
                      <label>Calculation
                        <select
                          value={charge.calculationType}
                          onChange={(event) => updateCharge(charge.id, {
                            calculationType: event.target.value as AdditionalChargeSetting['calculationType'],
                            amount: 0,
                          })}
                        >
                          <option value="fixed">Fixed amount</option>
                          <option value="percentage">Percentage</option>
                        </select>
                      </label>
                      <label>{charge.calculationType === 'fixed' ? 'Amount (₹)' : 'Rate (%)'}
                        <input
                          type="number"
                          min="0"
                          max={charge.calculationType === 'percentage' ? 100 : undefined}
                          step="0.01"
                          value={charge.amount}
                          disabled={!charge.enabled}
                          onChange={(event) => updateCharge(charge.id, { amount: Number(event.target.value) })}
                        />
                      </label>
                    </div>
                  </article>
                ))}
                {settings.billing.additionalCharges.length === 0 && (
                  <p className="settings-muted">No additional charges configured.</p>
                )}
              </div>
            </section>

            <section className="settings-card">
              <div className="settings-card-heading">
                <div><p className="settings-overline">PAYMENTS</p><h2>Accepted tender types</h2></div>
              </div>
              <div className="settings-option-list">
                {(['cash', 'card', 'upi'] as const).map((method) => (
                  <div className="settings-rule" key={method}>
                    <div className="settings-rule-copy"><strong>{paymentLabels[method]}</strong><span>Allow cashiers to record {paymentLabels[method].toLowerCase()} payments.</span></div>
                    <SettingSwitch
                      checked={settings.payments.enabledMethods[method]}
                      label={`Enable ${paymentLabels[method]} payments`}
                      onChange={() => togglePaymentMethod(method)}
                    />
                  </div>
                ))}
              </div>
              <div className="settings-rule settings-split-rule">
                <div className="settings-rule-copy"><strong>Split payment</strong><span>Allow any two enabled methods on a single bill.</span></div>
                <SettingSwitch
                  checked={settings.payments.allowSplit}
                  label="Enable split payments"
                  disabled={enabledPaymentCount < 2}
                  onChange={() => setSettings((current) => ({
                    ...current,
                    payments: { ...current.payments, allowSplit: !current.payments.allowSplit },
                  }))}
                />
              </div>
              <p className="settings-preview">For split payments, the two tender amounts must add up exactly to the bill total.</p>
            </section>

            <section className="settings-card">
              <div className="settings-card-heading">
                <div><p className="settings-overline">DATE &amp; TIME</p><h2>Regional format</h2></div>
              </div>
              <div className="settings-grid">
                <label>Date format
                  <select
                    value={settings.regional.dateFormat}
                    onChange={(event) => setSettings((current) => ({
                      ...current,
                      regional: {
                        ...current.regional,
                        dateFormat: event.target.value as ApplicationSettings['regional']['dateFormat'],
                      },
                    }))}
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </label>
                <label>Time format
                  <select
                    value={settings.regional.timeFormat}
                    onChange={(event) => setSettings((current) => ({
                      ...current,
                      regional: { ...current.regional, timeFormat: event.target.value as '12h' | '24h' },
                    }))}
                  >
                    <option value="12h">12-hour</option>
                    <option value="24h">24-hour</option>
                  </select>
                </label>
                <label>Time zone
                  <select
                    value={settings.regional.timeZone}
                    onChange={(event) => setSettings((current) => ({
                      ...current,
                      regional: { ...current.regional, timeZone: event.target.value },
                    }))}
                  >
                    {['Asia/Kolkata', 'Asia/Dubai', 'Europe/London', 'America/New_York', 'UTC'].map((zone) => (
                      <option key={zone} value={zone}>{zone.replace('_', ' ')}</option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="settings-preview">Preview: <strong>{formatTimestamp(new Date(), settings.regional)}</strong></p>
            </section>

            <section className="settings-card">
              <div className="settings-card-heading">
                <div><p className="settings-overline">STAFF PROFIT SHARING</p><h2>Allocation limit</h2></div>
              </div>
              <div className="settings-grid">
                <label>Maximum total staff allocation (%)
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={settings.profitSharing.maxAllocationPercentage}
                    onChange={(event) => setSettings((current) => ({
                      ...current,
                      profitSharing: {
                        maxAllocationPercentage: Math.max(0, Math.min(100, Number(event.target.value))),
                      },
                    }))}
                    required
                  />
                </label>
              </div>
              <p className="settings-preview">Daily approval is blocked when the additive allocation exceeds this configured limit.</p>
            </section>

            <div className="settings-save-row">
              <p>Updates are shared with all users and take effect on the next checkout.</p>
              <button className="sfh-button" type="submit" disabled={saving}>
                {saving ? 'Saving settings…' : 'Save settings'}
              </button>
            </div>
          </form>}
      </main>
    </AdminLayout>
  )
}
