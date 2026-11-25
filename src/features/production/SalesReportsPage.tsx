import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '../../components/common/Icon/Icon'
import { AdminLayout } from '../../layouts/AdminLayout'
import type { AuthUser } from '../../types/auth.types'
import {
  createOperatingExpense,
  getFinancialReport,
  getMenuCategories,
  getMenuItems,
} from './productionService'
import type { MenuCategory, MenuItem } from './production.types'
import type { PaymentMethod } from '../settings/settings.types'
import { getApplicationSettings } from '../settings/settingsService'
import { DEFAULT_REGIONAL_FORMAT, formatDateOnly } from '../../utils/dateFormatting'
import './productionOperations.css'

const today = () => new Date().toISOString().slice(0, 10)
const money = (value: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(value || 0)
const asDate = (date: Date) => date.toISOString().slice(0, 10)
const requestError = (error: unknown) =>
  error instanceof Error ? error.message : 'The report request could not be completed.'

export function SalesReportsPage({
  user,
  onLogout,
}: {
  user: AuthUser
  onLogout: () => void
}) {
  const [from, setFrom] = useState(today())
  const [to, setTo] = useState(today())
  const [categoryId, setCategoryId] = useState('')
  const [menuItemId, setMenuItemId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'all' | PaymentMethod>('all')
  const [paymentStatus, setPaymentStatus] = useState<'all' | 'completed' | 'failed' | 'cancelled'>('all')
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [expenseDate, setExpenseDate] = useState(today())
  const [expenseCategory, setExpenseCategory] = useState('Rent')
  const [expenseDescription, setExpenseDescription] = useState('')
  const [expenseAmount, setExpenseAmount] = useState('')
  const [savingExpense, setSavingExpense] = useState(false)
  const [error, setError] = useState('')
  const [settingsError, setSettingsError] = useState('')
  const [regionalFormat, setRegionalFormat] = useState(DEFAULT_REGIONAL_FORMAT)
  const [notice, setNotice] = useState('')

  const filteredMenuItems = useMemo(() => menuItems.filter((item) =>
    !categoryId || item.categoryId === categoryId), [menuItems, categoryId])

  const reportQuery = useQuery({
    queryKey: ['financial-report', from, to, categoryId, menuItemId, paymentMethod, paymentStatus],
    queryFn: async () => {
      const response = await getFinancialReport(from, to, {
        categoryId: categoryId || undefined,
        menuItemId: menuItemId || undefined,
        paymentMethod,
        paymentStatus,
      })
      return response.data ?? null
    },
  })
  const report = reportQuery.data
  const loading = reportQuery.isLoading || reportQuery.isFetching
  const displayedError = error || settingsError || (reportQuery.error ? requestError(reportQuery.error) : '')

  function loadReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    void reportQuery.refetch()
  }

  function resetReportFilters() {
    const defaultDate = today()
    const alreadyAtDefaults =
      from === defaultDate &&
      to === defaultDate &&
      !categoryId &&
      !menuItemId &&
      paymentMethod === 'all' &&
      paymentStatus === 'all'
    setFrom(defaultDate)
    setTo(defaultDate)
    setCategoryId('')
    setMenuItemId('')
    setPaymentMethod('all')
    setPaymentStatus('all')
    setError('')
    if (alreadyAtDefaults) void reportQuery.refetch()
  }

  useEffect(() => {
    let active = true
    Promise.all([
      getMenuCategories({ page: 1, limit: 100, status: 'all', sort: 'displayOrder', order: 'asc' }),
      getMenuItems(),
    ]).then(([categoryResponse, menuResponse]) => {
      if (!active) return
      setCategories(categoryResponse.data ?? [])
      setMenuItems(menuResponse.data ?? [])
    }).catch((loadError: unknown) => {
      if (active) setError(requestError(loadError))
    })
    return () => { active = false }
  }, [])

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

  function choosePeriod(period: 'day' | 'week' | 'month' | 'quarter' | 'half' | 'year') {
    const end = new Date()
    const start = new Date(end)
    if (period === 'day') start.setDate(end.getDate())
    if (period === 'week') start.setDate(end.getDate() - 6)
    if (period === 'month') start.setDate(1)
    if (period === 'quarter') {
      const quarterStartMonth = Math.floor(end.getMonth() / 3) * 3
      start.setMonth(quarterStartMonth, 1)
    }
    if (period === 'half') start.setMonth(end.getMonth() < 6 ? 0 : 6, 1)
    if (period === 'year') start.setMonth(0, 1)
    setFrom(asDate(start))
    setTo(asDate(end))
  }

  async function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSavingExpense(true)
    setError('')
    setNotice('')
    try {
      await createOperatingExpense({
        expenseDate,
        category: expenseCategory.trim(),
        description: expenseDescription.trim(),
        amount: Number(expenseAmount),
      })
      setNotice('Operating expense recorded.')
      setExpenseDescription('')
      setExpenseAmount('')
      await reportQuery.refetch()
    } catch (saveError) {
      setError(requestError(saveError))
    } finally {
      setSavingExpense(false)
    }
  }

  function downloadCsv() {
    if (!report) return
    const rows = [
      ['Section', 'Date', 'Menu item', 'Produced plates', 'Sold plates', 'Remaining', 'Wastage plates', 'Production cost', 'Sales revenue', 'Wastage cost'],
      ...report.menuItems.map((row) => [
        'Menu item', row.date, row.name, row.producedPlates, row.soldPlates, row.remainingPlates,
        row.wastagePlates, row.productionCost, row.salesRevenue, row.wastageCost,
      ]),
      ...report.expenses.map((expense) => [
        'Expense', expense.expenseDate, `${expense.category}: ${expense.description}`, '', '', '', '', expense.amount, '', '',
      ]),
    ]
    const csv = rows.map((row) => row.map((field) => {
      const value = String(field ?? '')
      const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
      return `"${safe.replace(/"/g, '""')}"`
    }).join(',')).join('\r\n')
    const link = document.createElement('a')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    link.href = url
    link.download = `sales-profit-loss-${from}-${to}.csv`
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const summary = report?.summary
  const trendMaximum = Math.max(1, ...(report?.daily.map((day) => day.salesRevenue) ?? []))
  const topItems = [...(report?.menuItems.reduce((totals, item) => {
    const current = totals.get(item.menuItemId) || {
      menuItemId: item.menuItemId,
      name: item.name,
      soldPlates: 0,
      salesRevenue: 0,
    }
    current.soldPlates += item.soldPlates
    current.salesRevenue += item.salesRevenue
    totals.set(item.menuItemId, current)
    return totals
  }, new Map<string, { menuItemId: string; name: string; soldPlates: number; salesRevenue: number }>()).values() ?? [])]
    .sort((a, b) => b.soldPlates - a.soldPlates)
    .slice(0, 5)
  const itemMaximum = Math.max(1, ...topItems.map((item) => item.soldPlates))
  const financialMaximum = Math.max(
    1,
    ...(report?.daily.flatMap((day) => [Math.abs(day.netProfit), day.wastageCost]) ?? []),
  )

  return (
    <AdminLayout
      user={user}
      roleLabel={user.role === 'admin' ? 'Administrator' : user.role[0].toUpperCase() + user.role.slice(1)}
      sectionTitle="Sales & Reports"
      onLogout={onLogout}
    >
      <main className="operations-page">
        <header className="operations-heading">
          <div><p className="eyebrow">BUSINESS PERFORMANCE</p><h1>Sales & Reports</h1>
            <p>Review production costs, completed sales, wastage, operating expenses and profit/loss.</p></div>
        </header>
        {displayedError && <div className="operations-alert operations-alert-error" role="alert">{displayedError}</div>}
        {notice && <div className="operations-alert operations-alert-success" role="status">{notice}</div>}

        <section className="operations-panel">
          <div className="operations-period-shortcuts" aria-label="Report period shortcuts">
            {([
              ['day', 'Daily'], ['week', 'Weekly'], ['month', 'Monthly'], ['quarter', 'Quarterly'],
              ['half', 'Half-year'], ['year', 'Yearly'],
            ] as const).map(([period, label]) => <button key={period} type="button" className="sfh-button sfh-button-secondary" onClick={() => choosePeriod(period)}>{label}</button>)}
          </div>
          <form className="operations-filters" onSubmit={(event) => void loadReport(event)}>
            <label>From<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} required /></label>
            <label>To<input type="date" value={to} onChange={(event) => setTo(event.target.value)} required /></label>
            <label>Menu category<select value={categoryId} onChange={(event) => {
              setCategoryId(event.target.value)
              setMenuItemId('')
            }}><option value="">All categories</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
            <label>Menu item<select value={menuItemId} onChange={(event) => setMenuItemId(event.target.value)}><option value="">All items</option>{filteredMenuItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <label>Payment method<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as typeof paymentMethod)}><option value="all">All methods</option><option value="cash">Cash</option><option value="upi">UPI</option><option value="card">Card</option><option value="split">Split</option></select></label>
            <label>Payment status<select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value as typeof paymentStatus)}><option value="all">All statuses</option><option value="completed">Completed</option><option value="failed">Failed</option><option value="cancelled">Cancelled</option></select></label>
            <button className="sfh-button" disabled={loading}>{loading ? 'Loading…' : 'Apply filters'}</button>
            <button type="button" className="sfh-button sfh-button-secondary" onClick={resetReportFilters}>
              <Icon name="reset" size={14} /> Reset filters
            </button>
            <button type="button" className="sfh-button sfh-button-secondary" onClick={downloadCsv} disabled={!report}>Export for Excel (CSV)</button>
            <button type="button" className="sfh-button sfh-button-secondary" onClick={() => window.print()} disabled={!report}>Print / Save PDF</button>
          </form>
        </section>

        {loading && <p className="operations-empty">Loading financial report…</p>}
        {report && summary && <>
          <section className="operations-metrics operations-metrics-wide">
            <Metric label="Production cost" value={money(summary.totalProductionCost)} />
            <Metric label="Expected revenue" value={money(summary.totalExpectedRevenue)} />
            <Metric label="Actual sales" value={money(summary.totalSalesRevenue)} />
            <Metric label="Produced plates" value={String(summary.totalProducedPlates)} />
            <Metric label="Sold plates" value={String(summary.totalSoldPlates)} />
            <Metric label="Available plates" value={String(summary.availablePlates)} />
            <Metric label="Wastage plates" value={String(summary.totalWastagePlates)} />
            <Metric label="Wastage cost" value={money(summary.totalWastageCost)} />
            <Metric label="Gross profit" value={money(summary.grossProfit)} />
            <Metric label="Operating expenses" value={money(summary.operatingExpenses)} />
            <Metric label="Net profit" value={money(summary.netProfit)} />
            <Metric label="Net loss" value={money(summary.netLoss)} />
          </section>

          <div className="operations-columns">
            <section className="operations-panel">
              <div className="operations-panel-heading"><div><h2>Revenue and production cost</h2><p>Daily trend within the selected period.</p></div></div>
              <div className="operations-bar-chart">
                {report.daily.map((day) => <div className="operations-bar-column" key={day.date} title={`${formatDateOnly(day.date, regionalFormat)}: sales ${money(day.salesRevenue)}, cost ${money(day.productionCost)}`}>
                  <div className="operations-bar-pair">
                    <span className="operations-bar operations-bar-revenue" style={{ height: `${Math.max(3, day.salesRevenue / trendMaximum * 150)}px` }} />
                    <span className="operations-bar operations-bar-cost" style={{ height: `${Math.max(3, day.productionCost / trendMaximum * 150)}px` }} />
                  </div><small>{formatDateOnly(day.date, regionalFormat)}</small>
                </div>)}
                {report.daily.length === 0 && <p className="operations-empty">No activity in this period.</p>}
              </div>
              <div className="operations-chart-legend"><span>Sales revenue</span><span>Production cost</span></div>
            </section>
            <section className="operations-panel">
              <div className="operations-panel-heading"><div><h2>Profit/loss and wastage trend</h2><p>Net profit includes operating expenses; wastage remains part of production cost.</p></div></div>
              <div className="operations-bar-chart">
                {report.daily.map((day) => <div className="operations-bar-column" key={`profit-${day.date}`} title={`${formatDateOnly(day.date, regionalFormat)}: net ${money(day.netProfit)}, wastage ${money(day.wastageCost)}`}>
                  <div className="operations-bar-pair">
                    <span className={`operations-bar ${day.netProfit < 0 ? 'operations-bar-loss' : 'operations-bar-profit'}`} style={{ height: `${Math.max(3, Math.abs(day.netProfit) / financialMaximum * 150)}px` }} />
                    <span className="operations-bar operations-bar-wastage" style={{ height: `${Math.max(3, day.wastageCost / financialMaximum * 150)}px` }} />
                  </div><small>{formatDateOnly(day.date, regionalFormat)}</small>
                </div>)}
                {report.daily.length === 0 && <p className="operations-empty">No activity in this period.</p>}
              </div>
              <div className="operations-chart-legend"><span className="legend-profit">Net profit / loss</span><span className="legend-wastage">Wastage cost</span></div>
            </section>
            <section className="operations-panel">
              <div className="operations-panel-heading"><div><h2>Best-selling menu items</h2><p>Completed plates sold in the selected period.</p></div></div>
              <div className="operations-rank-list">{topItems.map((item) => <div className="operations-rank" key={item.menuItemId}>
                <div><strong>{item.name}</strong><span>{item.soldPlates} sold · {money(item.salesRevenue)}</span></div>
                <i style={{ width: `${item.soldPlates / itemMaximum * 100}%` }} />
              </div>)}
                {topItems.length === 0 && <p className="operations-empty">No completed sales in this period.</p>}
              </div>
            </section>
          </div>

          <section className="operations-panel">
            <div className="operations-panel-heading"><div><h2>Item-wise production and sales</h2><p>Wastage is already included in production cost and is not subtracted twice from profit.</p></div></div>
            <div className="operations-table-wrap"><table className="sfh-table">
              <thead><tr><th>Date</th><th>Menu item</th><th>Produced</th><th>Sold</th><th>Remaining</th><th>Wastage</th><th>Production cost</th><th>Sales</th><th>Wastage cost</th></tr></thead>
              <tbody>{report.menuItems.map((item) => <tr key={`${item.date}-${item.menuItemId}`}>
                <td>{formatDateOnly(item.date, regionalFormat)}</td><td>{item.name}</td><td>{item.producedPlates}</td><td>{item.soldPlates}</td>
                <td>{item.remainingPlates}</td><td>{item.wastagePlates}</td><td>{money(item.productionCost)}</td>
                <td>{money(item.salesRevenue)}</td><td>{money(item.wastageCost)}</td>
              </tr>)}</tbody>
            </table></div>
            <div className="operations-table-wrap operations-status-table"><table className="sfh-table">
              <thead><tr><th>Payment status</th><th>Bills</th><th>Sales amount</th></tr></thead>
              <tbody>{Object.entries(report.paymentStatuses).map(([status, total]) => <tr key={status}>
                <td>{status}</td><td>{total.bills}</td><td>{money(total.amount)}</td>
              </tr>)}</tbody>
            </table></div>
          </section>

          <div className="operations-columns">
            <section className="operations-panel">
              <div className="operations-panel-heading"><div><h2>Payment summary</h2><p>Only completed cashier-confirmed bills count as sales.</p></div></div>
              <div className="operations-table-wrap"><table className="sfh-table">
                <thead><tr><th>Payment method</th><th>Bills</th><th>Collected total</th></tr></thead>
                <tbody>{Object.entries(report.paymentMethods).map(([method, total]) => <tr key={method}>
                  <td>{method.toUpperCase()}</td><td>{total.bills}</td><td>{money(total.amount)}</td>
                </tr>)}</tbody>
              </table></div>
              <div className="operations-table-wrap operations-status-table"><table className="sfh-table">
                <thead><tr><th>Tender</th><th>Bills using tender</th><th>Amount by tender</th></tr></thead>
                <tbody>{Object.entries(report.paymentTenders).map(([method, total]) => <tr key={method}>
                  <td>{method.toUpperCase()}</td><td>{total.bills}</td><td>{money(total.amount)}</td>
                </tr>)}</tbody>
              </table></div>
            </section>
            <section className="operations-panel">
              <div className="operations-panel-heading"><div><h2>Operating expenses</h2><p>Rent, electricity, wages, gas, maintenance and other costs.</p></div></div>
              <form className="operations-form operations-expense-form" onSubmit={(event) => void addExpense(event)}>
                <label>Date<input type="date" value={expenseDate} onChange={(event) => setExpenseDate(event.target.value)} required /></label>
                <label>Category<input value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)} maxLength={60} required /></label>
                <label>Description<input value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} maxLength={255} required /></label>
                <label>Amount (₹)<input type="number" min="0.01" step="0.01" value={expenseAmount} onChange={(event) => setExpenseAmount(event.target.value)} required /></label>
                <button className="sfh-button" disabled={savingExpense}>{savingExpense ? 'Saving…' : 'Record expense'}</button>
              </form>
              <div className="operations-expense-list">{report.expenses.map((expense) => <div key={expense.id}>
                <span><strong>{expense.category}</strong><small>{formatDateOnly(expense.expenseDate, regionalFormat)} · {expense.description}</small></span><b>{money(Number(expense.amount))}</b>
              </div>)}
                {report.expenses.length === 0 && <p className="operations-empty">No operating expenses recorded for this period.</p>}
              </div>
            </section>
          </div>
        </>}
      </main>
    </AdminLayout>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return <article className="operations-metric"><span>{label}</span><strong>{value}</strong></article>
}
