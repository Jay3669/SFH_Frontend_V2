import { useEffect, useMemo, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { Icon } from '../../components/common/Icon/Icon'
import { AdminLayout } from '../../layouts/AdminLayout'
import type { AuthUser } from '../../types/auth.types'
import { capitalizeFirstLetter } from '../../utils/capitalizeFirstLetter'
import { DEFAULT_REGIONAL_FORMAT, formatDateOnly } from '../../utils/dateFormatting'
import { getApplicationSettings } from '../settings/settingsService'
import type { ApplicationSettings, PaymentMethod, PaymentTender } from '../settings/settings.types'
import {
  cancelProduction,
  closeProductionDay,
  completeProductionSale,
  confirmProduction,
  getProductionAvailability,
  getProductionRecord,
  getProductionRecords,
  getRecipes,
  previewProduction,
  updateProductionYield,
} from './productionService'
import type {
  ProductionAvailability,
  ProductionPreview,
  ProductionRecord,
  ProductionSale,
  Recipe,
} from './production.types'
import './productionOperations.css'

const today = () => new Date().toISOString().slice(0, 10)
const asNumber = (value: number | string | null | undefined) => Number(value ?? 0)
const money = (value: number | string) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(asNumber(value))
const quantity = (value: number | string) =>
  new Intl.NumberFormat('en-IN', { maximumFractionDigits: 3 }).format(asNumber(value))
const requestError = (error: unknown) =>
  error instanceof Error ? error.message : 'The request could not be completed.'

function PageFrame({
  user,
  onLogout,
  title,
  eyebrow,
  description,
  children,
}: {
  user: AuthUser
  onLogout: () => void
  title: string
  eyebrow: string
  description: string
  children: ReactNode
}) {
  return (
    <AdminLayout
      user={user}
      roleLabel={user.role === 'admin' ? 'Administrator' : user.role[0].toUpperCase() + user.role.slice(1)}
      sectionTitle={title}
      onLogout={onLogout}
    >
      <main className="operations-page">
        <header className="operations-heading">
          <div>
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>
        {children}
      </main>
    </AdminLayout>
  )
}

function Alert({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error && <div className="operations-alert operations-alert-error" role="alert">{error}</div>}
      {notice && <div className="operations-alert operations-alert-success" role="status">{notice}</div>}
    </>
  )
}

export function DailyProductionPage({
  user,
  onLogout,
}: {
  user: AuthUser
  onLogout: () => void
}) {
  const [productionDate, setProductionDate] = useState(today())
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [records, setRecords] = useState<ProductionRecord[]>([])
  const [availability, setAvailability] = useState<ProductionAvailability | null>(null)
  const [recipeId, setRecipeId] = useState('')
  const [productionQuantity, setProductionQuantity] = useState('1')
  const [unit, setUnit] = useState('kg')
  const [preview, setPreview] = useState<ProductionPreview | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const [selectedRecord, setSelectedRecord] = useState<ProductionRecord | null>(null)
  const [yieldDraft, setYieldDraft] = useState('')
  const [cancelReason, setCancelReason] = useState('')
  const [recoveryDraft, setRecoveryDraft] = useState<Record<string, string>>({})
  const [regionalFormat, setRegionalFormat] = useState(DEFAULT_REGIONAL_FORMAT)
  const [settingsError, setSettingsError] = useState('')
  const canClose = user.role === 'admin' || user.role === 'manager'

  const activeRecipes = useMemo(() => recipes.filter((recipe) =>
    !recipe.isArchived && recipe.current && recipe.menuItem?.isActive), [recipes])
  const selectedRecipe = activeRecipes.find((recipe) => recipe.id === recipeId)

  useEffect(() => {
    let active = true
    Promise.all([
      getRecipes('active'),
      getProductionRecords({ from: productionDate, to: productionDate }),
      getProductionAvailability(productionDate),
    ])
      .then(([recipeResponse, recordResponse, availabilityResponse]) => {
        if (!active) return
        const loadedRecipes = recipeResponse.data ?? []
        setRecipes(loadedRecipes)
        setRecords(recordResponse.data ?? [])
        setAvailability(availabilityResponse.data ?? null)
        setError('')
      })
      .catch((loadError: unknown) => {
        if (active) setError(requestError(loadError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [productionDate, refreshKey])

  useEffect(() => {
    let active = true
    getApplicationSettings()
      .then((response) => {
        if (!response.data) throw new Error('The server returned no regional settings.')
        if (active) {
          setRegionalFormat(response.data.settings.regional)
          setSettingsError('')
        }
      })
      .catch((loadError: unknown) => {
        if (active) setSettingsError(requestError(loadError))
      })
    return () => { active = false }
  }, [])

  function resetProductionDate() {
    const defaultDate = today()
    setProductionDate(defaultDate)
    setPreview(null)
    setError('')
    setNotice('')
    if (productionDate === defaultDate) setRefreshKey((key) => key + 1)
  }

  async function openRecord(record: ProductionRecord) {
    setSaving(true)
    setError('')
    try {
      const response = await getProductionRecord(record.id)
      const selected = response.data || record
      setSelectedRecord(selected)
      setYieldDraft(String(selected.actualPlateCount ?? selected.expectedPlateCount))
      setCancelReason('')
      setRecoveryDraft({})
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not load production details.')
    } finally {
      setSaving(false)
    }
  }

  async function saveYield(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRecord) return
    setSaving(true)
    setError('')
    try {
      const response = await updateProductionYield(selectedRecord.id, Number(yieldDraft))
      setSelectedRecord(response.data || selectedRecord)
      setNotice('Actual production yield updated.')
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not update production yield.')
    } finally {
      setSaving(false)
    }
  }

  async function submitCancellation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selectedRecord) return
    setSaving(true)
    setError('')
    try {
      const recoveries = selectedRecord.ingredients?.flatMap((ingredient) => {
        const quantityRecovered = Number(recoveryDraft[ingredient.id] || 0)
        return quantityRecovered > 0
          ? [{ productionIngredientId: ingredient.id, quantityRecovered }]
          : []
      }) || []
      const response = await cancelProduction(selectedRecord.id, {
        reason: cancelReason.trim(),
        recoveries,
      })
      setSelectedRecord(response.data || selectedRecord)
      setNotice('Production cancelled. Only the entered unused quantities were returned to stock.')
      setRefreshKey((key) => key + 1)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Could not cancel production.')
    } finally {
      setSaving(false)
    }
  }

  async function createPreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!recipeId || !selectedRecipe) {
      setError('Select a menu recipe before previewing production.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await previewProduction({
        recipeId,
        quantity: Number(productionQuantity),
        unit,
        productionDate,
      })
      setPreview(result.data ?? null)
    } catch (previewError) {
      setPreview(null)
      setError(requestError(previewError))
    } finally {
      setSaving(false)
    }
  }

  async function confirmBatch() {
    if (!preview?.canProduce || !recipeId) return
    setSaving(true)
    setError('')
    try {
      const result = await confirmProduction({
        recipeId,
        quantity: Number(productionQuantity),
        unit,
        productionDate,
        idempotencyKey: crypto.randomUUID(),
      })
      setNotice(`Production ${result.data?.reference ?? ''} confirmed. Ingredients were deducted once.`)
      setPreview(null)
      setRefreshKey((key) => key + 1)
    } catch (confirmError) {
      setError(requestError(confirmError))
    } finally {
      setSaving(false)
    }
  }

  async function closeDay() {
    if (!window.confirm(`Close production for ${productionDate}? Remaining plates will be permanently recorded as wastage.`)) return
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const result = await closeProductionDay(productionDate)
      const totals = result.data?.summary
      setNotice(
        `Day closed. ${quantity(totals?.wastagePlates ?? 0)} plates recorded as wastage (${money(totals?.wastageCost ?? 0)}).`,
      )
      setRefreshKey((key) => key + 1)
    } catch (closeError) {
      setError(requestError(closeError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageFrame
      user={user}
      onLogout={onLogout}
      title="Daily Production"
      eyebrow="KITCHEN OPERATIONS"
      description="Plan today’s batches, review ingredient cost, and close the day’s unsold plates."
    >
      <Alert error={error || settingsError} notice={notice} />
      <section className="operations-panel operations-toolbar">
        <label>Production date
          <input type="date" value={productionDate} onChange={(event) => {
            setProductionDate(event.target.value)
            setPreview(null)
            setNotice('')
          }} />
        </label>
        <button type="button" className="sfh-button sfh-button-secondary" onClick={resetProductionDate}>
          <Icon name="reset" size={14} /> Reset filters
        </button>
        <div className={`operations-day-state${availability?.isClosed ? ' is-closed' : ''}`}>
          {availability?.isClosed ? 'Day closed' : 'Day open'}
        </div>
        {canClose && <button
          className="sfh-button sfh-button-danger"
          type="button"
          onClick={() => void closeDay()}
          disabled={saving || loading || availability?.isClosed}
        >
          {availability?.isClosed ? 'Production closed' : 'Close daily production'}
        </button>}
      </section>

      <section className="operations-metrics">
        <Metric label="Produced plates" value={quantity(availability?.summary.producedPlates ?? 0)} />
        <Metric label="Sold plates" value={quantity(availability?.summary.soldPlates ?? 0)} />
        <Metric label="Available plates" value={quantity(availability?.summary.availablePlates ?? 0)} />
        <Metric label="Production cost" value={money(availability?.summary.productionCost ?? 0)} />
        <Metric label="Expected sales" value={money(availability?.summary.expectedSales ?? 0)} />
        <Metric label="Actual sales" value={money(availability?.summary.actualSales ?? 0)} />
      </section>

      <div className="operations-columns">
        <section className="operations-panel">
          <div className="operations-panel-heading">
            <div><h2>Prepare a batch</h2><p>Ingredient quantities and costs come from the current recipe and inventory cost.</p></div>
          </div>
          <form className="operations-form" onSubmit={(event) => void createPreview(event)}>
            <label>Menu item / recipe
              <select value={recipeId} onChange={(event) => {
                const nextRecipe = activeRecipes.find((recipe) => recipe.id === event.target.value)
                setRecipeId(event.target.value)
                setUnit(nextRecipe?.current?.baseProductionUnit ?? 'kg')
                setPreview(null)
              }} required>
                <option value="">Select a recipe</option>
                {activeRecipes.map((recipe) => <option key={recipe.id} value={recipe.id}>{recipe.menuItem.name}</option>)}
              </select>
            </label>
            <label>Preparation quantity
              <div className="operations-inline-input">
                <input type="number" min="0.001" step="0.001" value={productionQuantity} onChange={(event) => {
                  setProductionQuantity(event.target.value)
                  setPreview(null)
                }} required />
                <select value={unit} onChange={(event) => setUnit(event.target.value)} aria-label="Preparation unit">
                  {[...new Set([unit, selectedRecipe?.current?.baseProductionUnit ?? 'kg', 'kg', 'g', 'l', 'ml'])].map((option) =>
                    <option key={option} value={option}>{option}</option>)}
                </select>
              </div>
            </label>
            <button className="sfh-button" disabled={saving || loading || availability?.isClosed}>
              {saving ? 'Calculating…' : 'Calculate ingredients and cost'}
            </button>
          </form>

          {preview && <div className="operations-preview">
            <div className="operations-preview-metrics">
              <Metric label="Expected plates" value={quantity(preview.expectedPlateCount)} />
              <Metric label="Selling price / plate" value={money(preview.sellingPricePerPlate)} />
              <Metric label="Expected sales" value={money(preview.expectedSalesAmount)} />
              <Metric label="Ingredient cost" value={money(preview.totalIngredientCost)} />
              <Metric label="Cost / plate" value={money(preview.costPerPlate)} />
              <Metric label="Expected profit" value={money(preview.expectedProfit)} />
            </div>
            <div className="operations-table-wrap">
              <table className="sfh-table">
                <thead><tr><th>Ingredient</th><th>Required</th><th>Stock balance</th><th>Unit cost</th><th>Cost</th></tr></thead>
                <tbody>{preview.ingredients.map((ingredient) => <tr key={ingredient.stockItemId}>
                  <td>{ingredient.ingredientName}</td>
                  <td>{quantity(ingredient.quantityDeducted)} {ingredient.unit}</td>
                  <td>{quantity(ingredient.availableQuantity)} {ingredient.unit}</td>
                  <td>{money(ingredient.unitCost)}</td>
                  <td>{money(ingredient.totalCost)}</td>
                </tr>)}</tbody>
              </table>
            </div>
            {preview.shortages.length > 0 && <p className="operations-alert operations-alert-error">There is not enough stock to confirm this batch.</p>}
            <button className="sfh-button" type="button" onClick={() => void confirmBatch()} disabled={saving || !preview.canProduce || availability?.isClosed}>
              {saving ? 'Confirming…' : 'Confirm production and deduct stock'}
            </button>
          </div>}
        </section>

        <section className="operations-panel">
          <div className="operations-panel-heading">
            <div><h2>Today’s production</h2><p>Available plates are tracked by menu item and production date.</p></div>
          </div>
          <div className="operations-menu-list">
            {(availability?.items ?? []).map((item) => (
              <article className="operations-menu-row" key={item.menuItemId}>
                {item.imageUrl
                  ? <img src={item.imageUrl} alt="" />
                  : <span className="operations-image-placeholder">{item.name.slice(0, 1)}</span>}
                <div className="operations-menu-copy">
                  <strong>{item.name}</strong>
                  <span>{item.category} · {money(item.price)} per plate</span>
                  <small>Produced {quantity(item.producedPlates)} · Sold {quantity(item.soldPlates)} · Available {quantity(item.availablePlates)}</small>
                </div>
                <strong>{money(item.productionCost)}</strong>
              </article>
            ))}
            {!loading && availability?.items.length === 0 && <p className="operations-empty">No production has been confirmed for this date.</p>}
            {loading && <p className="operations-empty">Loading production…</p>}
          </div>
        </section>
      </div>

      <section className="operations-panel">
        <div className="operations-panel-heading">
          <div><h2>Production history</h2><p>Batch-level recipe, ingredient and cost snapshots.</p></div>
        </div>
        <div className="operations-table-wrap">
          <table className="sfh-table">
            <thead><tr><th>Reference</th><th>Menu item</th><th>Quantity</th><th>Plates</th><th>Cost</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{records.map((record) => <tr key={record.id}>
              <td>{record.reference}</td>
              <td>{record.menuItem?.name ?? '—'}</td>
              <td>{quantity(record.productionQuantity)} {record.productionUnit}</td>
              <td>{quantity(record.actualPlateCount ?? record.expectedPlateCount)}</td>
              <td>{money(record.totalProductionCost)}</td>
              <td>{record.status}</td>
              <td><button className="production-text-button" type="button" onClick={() => void openRecord(record)} disabled={saving}>
                <Icon name="view" size={14} /> Details
              </button></td>
            </tr>)}</tbody>
          </table>
        </div>
        {!loading && records.length === 0 && <p className="operations-empty">No batches recorded for this date.</p>}
      </section>

      {selectedRecord && <div className="production-modal-backdrop" role="presentation" onMouseDown={(event) => {
        if (event.target === event.currentTarget) setSelectedRecord(null)
      }}>
        <section className="production-modal" role="dialog" aria-modal="true" aria-labelledby="production-detail-title">
          <div className="production-modal-heading">
            <div><p className="eyebrow">{selectedRecord.reference}</p><h2 id="production-detail-title">{selectedRecord.menuItem?.name || 'Production details'}</h2></div>
            <button type="button" className="production-modal-close" onClick={() => setSelectedRecord(null)} aria-label="Close details">
              <Icon name="close" size={18} />
            </button>
          </div>
          <p className="production-detail-summary">
            {formatDateOnly(selectedRecord.productionDate, regionalFormat)} · {quantity(selectedRecord.productionQuantity)} {selectedRecord.productionUnit} · {money(selectedRecord.totalProductionCost)} · {selectedRecord.status}
          </p>
          <div className="production-table-wrap"><table className="production-table">
            <thead><tr><th>Ingredient</th><th>Consumed</th><th>Unit cost</th><th>Total</th></tr></thead>
            <tbody>{(selectedRecord.ingredients || []).map((ingredient) => <tr key={ingredient.id}>
              <td>{ingredient.ingredientName}</td>
              <td>{quantity(ingredient.quantityDeducted)} {ingredient.unit}</td>
              <td>{money(ingredient.unitCost)}</td>
              <td>{money(ingredient.totalCost)}</td>
            </tr>)}</tbody>
          </table></div>
          {selectedRecord.status === 'confirmed' && <>
            <form className="production-form production-detail-form" onSubmit={(event) => void saveYield(event)}>
              <label>Actual plates<input type="number" min="0" step="0.001" value={yieldDraft} onChange={(event) => setYieldDraft(event.target.value)} required /></label>
              <button className="production-button" disabled={saving}>Save yield</button>
            </form>
            {canClose && <form className="production-form production-cancel-form" onSubmit={(event) => void submitCancellation(event)}>
              <h3>Cancel production / recover unused stock</h3>
              <p>Enter only quantities that are genuinely unused and safe to return. Omitted ingredients are treated as consumed or wasted.</p>
              {(selectedRecord.ingredients || []).map((ingredient) => <label key={ingredient.id}>{ingredient.ingredientName} recovery ({ingredient.unit})
                <input type="number" min="0" max={asNumber(ingredient.quantityDeducted)} step="0.001" value={recoveryDraft[ingredient.id] || ''} onChange={(event) => setRecoveryDraft((draft) => ({ ...draft, [ingredient.id]: event.target.value }))} placeholder={`Max ${asNumber(ingredient.quantityDeducted)}`} />
              </label>)}
              <label>Cancellation reason<input value={cancelReason} onChange={(event) => setCancelReason(capitalizeFirstLetter(event.target.value))} required maxLength={255} /></label>
              <button className="production-button production-button-danger" disabled={saving}>Cancel batch and return listed stock</button>
            </form>}
          </>}
        </section>
      </div>}
    </PageFrame>
  )
}

type Cart = Record<string, number>

const methodLabels: Record<PaymentTender, string> = {
  cash: 'Cash',
  card: 'Card',
  upi: 'UPI',
}

export function BillingPosPage({
  user,
  onLogout,
}: {
  user: AuthUser
  onLogout: () => void
}) {
  const [productionDate, setProductionDate] = useState(today())
  const [availability, setAvailability] = useState<ProductionAvailability | null>(null)
  const [cart, setCart] = useState<Cart>({})
  const [category, setCategory] = useState('all')
  const [appSettings, setAppSettings] = useState<ApplicationSettings | null>(null)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsError, setSettingsError] = useState('')
  const [settingsUpdatedAt, setSettingsUpdatedAt] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash')
  const [splitMethods, setSplitMethods] = useState<[PaymentTender, PaymentTender]>(['cash', 'card'])
  const [splitAmounts, setSplitAmounts] = useState<Partial<Record<PaymentTender, string>>>({})
  const [discountAmount, setDiscountAmount] = useState('0')
  const [tenderReceived, setTenderReceived] = useState(false)
  const [receipt, setReceipt] = useState<ProductionSale | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)
  const pendingRequest = useRef<{ fingerprint: string; key: string } | null>(null)

  useEffect(() => {
    let active = true
    getProductionAvailability(productionDate)
      .then((response) => {
        if (!active) return
        setAvailability(response.data ?? null)
        setError('')
      })
      .catch((loadError: unknown) => {
        if (active) setError(requestError(loadError))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [productionDate, refreshKey])

  useEffect(() => {
    let active = true
    getApplicationSettings()
      .then((response) => {
        if (!response.data) throw new Error('The server returned no billing settings.')
        if (!active) return
        const nextSettings = response.data.settings
        const enabledMethods = (['cash', 'card', 'upi'] as const)
          .filter((method) => nextSettings.payments.enabledMethods[method])
        setAppSettings(nextSettings)
        setSettingsUpdatedAt(response.data.settingsUpdatedAt)
        setPaymentMethod(enabledMethods[0] || 'cash')
        if (enabledMethods.length > 1) setSplitMethods([enabledMethods[0], enabledMethods[1]])
        setSettingsError('')
      })
      .catch((loadError: unknown) => {
        if (active) setSettingsError(requestError(loadError))
      })
      .finally(() => {
        if (active) setSettingsLoading(false)
      })
    return () => { active = false }
  }, [])

  function resetAvailabilityFilters() {
    const defaultDate = today()
    if (productionDate !== defaultDate) {
      setCart({})
      setReceipt(null)
      setTenderReceived(false)
    } else {
      setRefreshKey((key) => key + 1)
    }
    setProductionDate(defaultDate)
    setCategory('all')
    setError('')
  }

  const items = useMemo(() => availability?.items ?? [], [availability])
  const categories = useMemo(() => [...new Set(items.map((item) => item.category))].sort(), [items])
  const visibleItems = category === 'all' ? items : items.filter((item) => item.category === category)
  const cartItems = items.filter((item) => (cart[item.menuItemId] || 0) > 0)
  const subtotal = cartItems.reduce((sum, item) => sum + asNumber(item.price) * cart[item.menuItemId], 0)
  const discount = Math.min(Math.max(0, Number(discountAmount) || 0), subtotal)
  const discountedSubtotal = Math.round((subtotal - discount) * 100) / 100
  const taxRate = appSettings?.billing.tax.enabled ? appSettings.billing.tax.rate : 0
  const tax = Math.round(discountedSubtotal * taxRate) / 100
  const packing = appSettings?.billing.packingCharge.enabled
    ? appSettings.billing.packingCharge.amount
    : 0
  const configuredAdditionalCharges = appSettings?.billing.additionalCharges.filter((charge) => charge.enabled) ?? []
  const calculatedAdditionalCharges = configuredAdditionalCharges.map((charge) => ({
    ...charge,
    total: charge.calculationType === 'percentage'
      ? Math.round(discountedSubtotal * charge.amount) / 100
      : charge.amount,
  }))
  const estimatedTotal = Math.round((
    discountedSubtotal + tax + packing +
    calculatedAdditionalCharges.reduce((total, charge) => total + charge.total, 0)
  ) * 100) / 100
  const enabledPaymentMethods = (['cash', 'card', 'upi'] as const)
    .filter((method) => appSettings?.payments.enabledMethods[method])
  const splitPaymentEnabled = Boolean(appSettings?.payments.allowSplit && enabledPaymentMethods.length > 1)
  const splitAmountsInCents = splitMethods.map((method) =>
    Math.round((Number(splitAmounts[method]) || 0) * 100))
  const splitTenderComplete = splitMethods.every((method) =>
    Number(splitAmounts[method]) > 0 &&
    Number.isFinite(Number(splitAmounts[method]))) &&
    splitAmountsInCents[0] + splitAmountsInCents[1] === Math.round(estimatedTotal * 100)
  const paymentReady = paymentMethod === 'split'
    ? splitPaymentEnabled && splitMethods[0] !== splitMethods[1] &&
      splitMethods.every((method) => enabledPaymentMethods.includes(method)) && splitTenderComplete
    : Boolean(appSettings?.payments.enabledMethods[paymentMethod])
  const receiptPaymentLabel = receipt
    ? receipt.paymentMethod === 'split'
      ? `SPLIT (${Object.entries(receipt.paymentBreakdown).map(([method, amount]) =>
        `${method.toUpperCase()} ${money(asNumber(amount))}`).join(' + ')})`
      : receipt.paymentMethod.toUpperCase()
    : ''

  function updateSplitMethod(index: 0 | 1, method: PaymentTender) {
    setSplitMethods((current) => {
      const next = [...current] as [PaymentTender, PaymentTender]
      next[index] = method
      return next
    })
  }

  function addItem(menuItemId: string) {
    const item = items.find((entry) => entry.menuItemId === menuItemId)
    if (!item) return
    const nextQuantity = (cart[menuItemId] || 0) + 1
    if (nextQuantity > Math.floor(asNumber(item.availablePlates))) {
      setError(`Only ${Math.floor(asNumber(item.availablePlates))} plates of ${item.name} remain.`)
      return
    }
    setError('')
    setCart((current) => ({ ...current, [menuItemId]: nextQuantity }))
    setReceipt(null)
  }

  function setItemQuantity(menuItemId: string, value: string) {
    const item = items.find((entry) => entry.menuItemId === menuItemId)
    const nextQuantity = Number(value)
    if (!item || !Number.isInteger(nextQuantity) || nextQuantity < 0 ||
      nextQuantity > Math.floor(asNumber(item.availablePlates))) return
    setCart((current) => {
      const next = { ...current }
      if (nextQuantity === 0) delete next[menuItemId]
      else next[menuItemId] = nextQuantity
      return next
    })
    setReceipt(null)
  }

  async function checkout(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!availability || availability.isClosed || cartItems.length === 0 ||
      !tenderReceived || !appSettings || !paymentReady) {
      setError(availability?.isClosed
        ? 'Billing is closed for this date.'
        : paymentMethod === 'split' && !splitTenderComplete
          ? 'Split tender amounts must be positive and add up to the estimated total.'
          : 'Add available items, choose an enabled payment method, and confirm the payment.')
      return
    }
    const request = {
      productionDate,
      settingsUpdatedAt,
      paymentMethod,
      discountAmount: Number(discountAmount),
      ...(paymentMethod === 'split'
        ? { paymentBreakdown: {
          [splitMethods[0]]: Number(splitAmounts[splitMethods[0]]),
          [splitMethods[1]]: Number(splitAmounts[splitMethods[1]]),
        } }
        : {}),
      items: cartItems.map((item) => ({ menuItemId: item.menuItemId, quantity: cart[item.menuItemId] })),
    }
    const fingerprint = JSON.stringify(request)
    if (pendingRequest.current?.fingerprint !== fingerprint) {
      pendingRequest.current = { fingerprint, key: crypto.randomUUID() }
    }
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const response = await completeProductionSale({
        ...request,
        idempotencyKey: pendingRequest.current.key,
      })
      setReceipt(response.data ?? null)
      setNotice('Payment recorded and bill completed.')
      setCart({})
      setTenderReceived(false)
      setDiscountAmount('0')
      setSplitAmounts({})
      pendingRequest.current = null
      setRefreshKey((key) => key + 1)
    } catch (checkoutError) {
      setError(requestError(checkoutError))
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageFrame
      user={user}
      onLogout={onLogout}
      title="Billing & POS"
      eyebrow="FRONT OF HOUSE"
      description="Sell only today’s confirmed production. Plates are deducted atomically when a bill is completed."
    >
      <Alert error={error || settingsError} notice={notice} />
      <section className="operations-panel operations-toolbar">
        <label>Production date
          <input type="date" value={productionDate} onChange={(event) => {
            setProductionDate(event.target.value)
            setCart({})
            setReceipt(null)
            setTenderReceived(false)
          }} />
        </label>
        <label>Menu category
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">All categories</option>
            {categories.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>
        <button type="button" className="sfh-button sfh-button-secondary" onClick={resetAvailabilityFilters}>
          <Icon name="reset" size={14} /> Reset filters
        </button>
        <div className={`operations-day-state${availability?.isClosed ? ' is-closed' : ''}`}>
          {availability?.isClosed ? 'Day closed' : `${quantity(availability?.summary.availablePlates ?? 0)} plates available`}
        </div>
      </section>

      {receipt && <section className="operations-panel operations-receipt" aria-label="Completed sale receipt">
        <div className="operations-panel-heading">
          <div><h2>Payment successful</h2><p>Receipt {receipt.reference} · {receiptPaymentLabel} · {receipt.paymentStatus}</p></div>
          <button type="button" className="sfh-button sfh-button-secondary" onClick={() => window.print()}>Print receipt</button>
        </div>
        <div className="operations-table-wrap">
          <table className="sfh-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead>
            <tbody>{receipt.items.map((line) => <tr key={line.id}>
              <td>{line.menuItemName}</td><td>{quantity(line.quantity)}</td><td>{money(line.unitPrice)}</td><td>{money(line.totalPrice)}</td>
            </tr>)}</tbody>
          </table>
        </div>
        <dl className="operations-receipt-breakdown">
          <div><dt>Subtotal</dt><dd>{money(asNumber(receipt.subtotal))}</dd></div>
          <div><dt>Discount</dt><dd>−{money(asNumber(receipt.discountAmount))}</dd></div>
          <div><dt>Tax</dt><dd>{money(asNumber(receipt.taxAmount))}</dd></div>
          <div><dt>Packing</dt><dd>{money(asNumber(receipt.packingCharge))}</dd></div>
          {receipt.additionalCharges.map((charge) => (
            <div key={charge.id}><dt>{charge.name}</dt><dd>{money(asNumber(charge.amount))}</dd></div>
          ))}
          {Object.entries(receipt.paymentBreakdown).map(([method, amount]) => (
            <div key={method}><dt>{method.toUpperCase()} tender</dt><dd>{money(asNumber(amount))}</dd></div>
          ))}
        </dl>
        <p className="operations-receipt-total">Bill total: {money(receipt.totalAmount)}</p>
      </section>}

      <div className="operations-pos-layout">
        <section className="operations-panel">
          <div className="operations-panel-heading"><div><h2>Available menu items</h2><p>Produced, sold, and currently available counts refresh after each completed bill.</p></div></div>
          <div className="operations-pos-grid">
            {visibleItems.map((item) => {
              const available = Math.floor(asNumber(item.availablePlates))
              return <article className="operations-pos-card" key={item.menuItemId}>
                {item.imageUrl
                  ? <img className="operations-pos-image" src={item.imageUrl} alt={item.name} />
                  : <div className="operations-pos-image operations-image-placeholder">{item.name.slice(0, 1)}</div>}
                <div className="operations-pos-card-copy">
                  <span>{item.category}</span><h3>{item.name}</h3><strong>{money(item.price)}</strong>
                  <small>Produced {quantity(item.producedPlates)} · Sold {quantity(item.soldPlates)} · Available {quantity(item.availablePlates)}</small>
                  <button className="sfh-button" type="button" onClick={() => addItem(item.menuItemId)} disabled={available < 1 || availability?.isClosed}>
                    {available < 1 ? 'Sold out' : 'Add to cart'}
                  </button>
                </div>
              </article>
            })}
            {!loading && visibleItems.length === 0 && <p className="operations-empty">No confirmed production is available for this date.</p>}
            {loading && <p className="operations-empty">Loading available menu items…</p>}
          </div>
        </section>

        <form className="operations-panel operations-cart" onSubmit={(event) => void checkout(event)}>
          <div className="operations-panel-heading"><div><h2>Current bill</h2><p>{cartItems.length} menu items</p></div></div>
          {cartItems.length === 0
            ? <p className="operations-empty">Add an available dish to start a bill.</p>
            : <div className="operations-cart-lines">{cartItems.map((item) => <div className="operations-cart-line" key={item.menuItemId}>
              <div><strong>{item.name}</strong><span>{money(item.price)} each</span></div>
              <input
                type="number"
                min="0"
                max={Math.floor(asNumber(item.availablePlates))}
                step="1"
                value={cart[item.menuItemId]}
                aria-label={`${item.name} quantity`}
                onChange={(event) => setItemQuantity(item.menuItemId, event.target.value)}
              />
              <strong>{money(asNumber(item.price) * cart[item.menuItemId])}</strong>
            </div>)}</div>}
          <div className="operations-cart-adjustments">
            <label>Discount (₹)<input type="number" min="0" max={subtotal} step="0.01" value={discountAmount} onChange={(event) => setDiscountAmount(event.target.value)} /></label>
          </div>
          <dl className="operations-totals">
            <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>Discount</dt><dd>−{money(discount)}</dd></div>
            <div><dt>Tax{taxRate > 0 ? ` (${taxRate}%)` : ''}</dt><dd>{money(tax)}</dd></div>
            <div><dt>Packing</dt><dd>{money(packing)}</dd></div>
            {calculatedAdditionalCharges.map((charge) => (
              <div key={charge.id}><dt>{charge.name}</dt><dd>{money(charge.total)}</dd></div>
            ))}
            <div className="operations-grand-total"><dt>Estimated total</dt><dd>{money(estimatedTotal)}</dd></div>
          </dl>
          <label>Payment method
            <select
              value={paymentMethod}
              disabled={settingsLoading || !appSettings}
              onChange={(event) => {
                setPaymentMethod(event.target.value as PaymentMethod)
                setTenderReceived(false)
              }}
            >
              {enabledPaymentMethods.map((method) => (
                <option key={method} value={method}>{methodLabels[method]}</option>
              ))}
              {splitPaymentEnabled && <option value="split">Split payment</option>}
            </select>
          </label>
          {paymentMethod === 'split' && splitPaymentEnabled && (
            <div className="operations-split-payment">
              <p>Choose two tender types and enter amounts that equal {money(estimatedTotal)}.</p>
              <div className="operations-split-methods">
                {splitMethods.map((method, index) => {
                  const position = index as 0 | 1
                  const otherMethod = splitMethods[(1 - index) as 0 | 1]
                  return <label key={position}>Tender {position + 1}
                    <select
                      value={method}
                      onChange={(event) => {
                        updateSplitMethod(position, event.target.value as PaymentTender)
                        setTenderReceived(false)
                      }}
                    >
                      {enabledPaymentMethods
                        .filter((option) => option === method || option !== otherMethod)
                        .map((option) => <option key={option} value={option}>{methodLabels[option]}</option>)}
                    </select>
                  </label>
                })}
              </div>
              <div className="operations-split-methods">
                {splitMethods.map((method) => <label key={method}>{methodLabels[method]} amount (₹)
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={splitAmounts[method] ?? ''}
                    onChange={(event) => {
                      setSplitAmounts((current) => ({ ...current, [method]: event.target.value }))
                      setTenderReceived(false)
                    }}
                  />
                </label>)}
              </div>
              <p className={`operations-split-total${splitTenderComplete ? ' is-valid' : ''}`}>
                Entered: {money(splitAmountsInCents.reduce((total, cents) => total + cents, 0) / 100)}
              </p>
            </div>
          )}
          <label className="operations-tender-confirmation">
            <input type="checkbox" checked={tenderReceived} onChange={(event) => setTenderReceived(event.target.checked)} />
            {paymentMethod === 'split'
              ? `I confirm ${splitMethods.map((method) => methodLabels[method]).join(' + ')} payment was received`
              : `I confirm the ${paymentMethod.toUpperCase()} payment was received`}
          </label>
          <button className="sfh-button operations-checkout-button" disabled={saving || loading || settingsLoading || !appSettings || !paymentReady || cartItems.length === 0 || availability?.isClosed || !tenderReceived}>
            {saving ? 'Completing payment…' : 'Complete payment'}
          </button>
          {availability?.isClosed && <p className="operations-alert operations-alert-error">Daily production is closed. No more bills can be completed.</p>}
          <p className="operations-payment-note">Payments are recorded after cashier confirmation. No payment gateway is connected.</p>
        </form>
      </div>
    </PageFrame>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="operations-metric"><span>{label}</span><strong>{value}</strong></article>
}
