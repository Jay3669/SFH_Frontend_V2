import foodBackground from '../../assets/images/food-background.png'
import logo from '../../assets/logos/sfh-logo.png'
import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { routes } from '../../app/router/routes'
import { ApiLoadingIndicator } from '../../components/loaders/ApiLoadingIndicator'
import { AutoDismissMessage } from '../../components/common/AutoDismissMessage/AutoDismissMessage'
import { AdminLayout } from '../../layouts/AdminLayout'
import type { AuthUser } from '../../types/auth.types'
import { getStockSummary } from '../inventory/stockService'
import { getProductionReport } from '../production/productionService'
import type { StockSummary } from '../inventory/stock.types'

export function DashboardPage({
  user,
  onLogout,
}: {
  user: AuthUser
  onLogout: () => void
}) {
  const [stockSummary, setStockSummary] = useState<StockSummary | null>(null)
  const [productionCost, setProductionCost] = useState(0)
  const [productionPlates, setProductionPlates] = useState(0)
  const [dashboardError, setDashboardError] = useState('')

  useEffect(() => {
    let active = true
    if (!['admin', 'manager', 'employee'].includes(user.role)) return

    const today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()).replace(/\//g, '-')

    Promise.all([getStockSummary(), getProductionReport(today, today)])
      .then(([stock, production]) => {
        if (!active) return
        setStockSummary(stock.data ?? null)
        setProductionCost(production.data?.summary.totalProductionCost ?? 0)
        setProductionPlates(production.data?.summary.platesProduced ?? 0)
      })
      .catch((error) => {
        if (active) setDashboardError(error instanceof Error ? error.message : 'Dashboard data could not be loaded.')
      })

    return () => { active = false }
  }, [user.role])

  const isAdmin = user.role === 'admin'
  const isCustomer = user.role === 'customer'
  const roleLabel = isAdmin
    ? 'Administrator'
    : user.role[0].toUpperCase() + user.role.slice(1)

  return (
    <AdminLayout user={user} roleLabel={roleLabel} onLogout={onLogout}>
      <div className="dashboard-main">
        <p className="eyebrow">
          {isAdmin
            ? `${new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' })
              .format(new Date())
              .toUpperCase()} · YOUR WORKSPACE IS READY`
            : `SECURE ${roleLabel.toUpperCase()} WORKSPACE`}
        </p>
        <h1>{isAdmin ? 'Good to see you' : 'Welcome'}, {user.name.split(' ')[0]}.</h1>
        <p className="dashboard-subtitle">
          {isAdmin
            ? 'Your Surya Food Hub operations, all in one place.'
            : isCustomer
              ? 'Your Surya Food Hub account is ready.'
              : `Your ${roleLabel.toLowerCase()} workspace is ready.`}
        </p>

        <section className="welcome-banner" style={{ backgroundImage: `url(${foodBackground})` }}>
          <div className="welcome-overlay" />
          <div className="welcome-copy">
            <span className="welcome-kicker">SURYA FOOD HUB</span>
            <h2>{isCustomer ? 'Good food, made for you.' : 'Made with warmth.'}<br />
              {isCustomer ? '' : 'Served with care.'}</h2>
            <p>{isAdmin
              ? 'Manage your team and keep every service running smoothly.'
              : isCustomer
                ? 'Your account is ready whenever you are.'
                : 'Your Surya Food Hub shift starts here.'}</p>
          </div>
          <img src={logo} alt="Surya Food Hub" className="banner-logo" />
        </section>

        {isAdmin && (
          <section className="quick-access-grid" aria-label="Today's operations summary">
            <WorkspaceCard
              icon="▥"
              color="icon-gold"
              title="Today’s production"
              description={`${productionPlates.toLocaleString('en-IN')} plates · ₹${productionCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })} cost`}
              badge="Live report"
            />
            <WorkspaceCard
              icon="◈"
              color="icon-green"
              title="Stock health"
              description={stockSummary
                ? `${stockSummary.lowStock} low · ${stockSummary.outOfStock} out of stock`
                : <ApiLoadingIndicator label="Loading stock summary…" compact />}
              badge="Live inventory"
            />
            <WorkspaceCard
              icon="₹"
              color="icon-orange"
              title="Inventory value"
              description={stockSummary
                ? `₹${Number(stockSummary.stockValue).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`
                : <ApiLoadingIndicator label="Loading inventory value…" compact />}
              badge="Live stock"
            />
          </section>
        )}

        {dashboardError && <AutoDismissMessage message={dashboardError} onDismiss={() => setDashboardError('')}>
          <div className="dashboard-note" role="alert">
            <span className="note-mark">i</span>
            <p>{dashboardError}</p>
          </div>
        </AutoDismissMessage>}

        <div className="section-heading">
          <div>
            <h2>{isAdmin ? 'Quick access' : isCustomer ? 'Your account' : 'Your workspace'}</h2>
            <p>{isAdmin ? 'Pick up where your team needs you.' : `Signed in securely with your ${roleLabel.toLowerCase()} account.`}</p>
          </div>
          <span className="workspace-pill"><span className="status-dot" /> {isAdmin ? 'Admin workspace' : `${roleLabel} access`}</span>
        </div>

        <div className="quick-access-grid">
          {isAdmin ? (
            <>
              <WorkspaceCard icon="◷" color="icon-gold" title="Orders" description="Review incoming orders and keep service moving." />
              <WorkspaceCard
                icon="◈"
                color="icon-green"
                title="Stock management"
                description="Track ingredients, stock levels, and every inventory movement."
                to={routes.stockManagement}
                badge="Open stock"
              />
              <WorkspaceCard icon="♙" color="icon-orange" title="Team access" description="Manage staff roles and account access." />
            </>
          ) : (
            <>
              <WorkspaceCard
                icon={isCustomer ? '♡' : '◷'}
                color="icon-gold"
                title={isCustomer ? 'Your profile' : 'Your shift'}
                description={isCustomer
                  ? 'Your account details are available to you.'
                  : 'Your assigned work and shift tools will appear here.'}
              />
              <WorkspaceCard
                icon="▤"
                color="icon-green"
                title={isCustomer ? 'Orders' : 'Service tasks'}
                description={isCustomer
                  ? 'Your order history will appear here.'
                  : 'Role-specific operations will appear here.'}
              />
            </>
          )}
        </div>

        <div className="dashboard-note">
          <span className="note-mark">i</span>
          <p>Signed in as <strong>{user.email}</strong>. Access to account features is limited by your role.</p>
        </div>
      </div>
    </AdminLayout>
  )
}

function WorkspaceCard({
  icon,
  color,
  title,
  description,
  to,
  badge,
}: {
  icon: string
  color: string
  title: string
  description: ReactNode
  to?: string
  badge?: string
}) {
  const content = (
    <>
      <span className={`workspace-card-icon ${color}`}>{icon}</span>
      <div className="workspace-card-copy"><h3>{title}</h3><div className="workspace-card-description">{description}</div></div>
      <span className="coming-soon">{badge || 'Coming soon'}</span>
    </>
  )

  if (to) {
    return <Link className="workspace-card workspace-card-link" to={to}>{content}</Link>
  }

  return (
    <article className="workspace-card">{content}</article>
  )
}
