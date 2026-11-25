import { Logo } from '../../../components/common/Logo/Logo'
import { NavLink } from 'react-router-dom'
import type { UserRole } from '../../../types/auth.types'
import { dashboardPath, routes } from '../../../app/router/routes'
import { Users } from 'lucide-react'

export function Sidebar({ userRole, permissions, open = false, onNavigate }: { userRole: UserRole; permissions: string[]; open?: boolean; onNavigate?: () => void }) {
    const can = (permission: string) =>
        userRole === 'admin' || permissions.includes(permission)
    const hasAny = (items: string[]) => userRole === 'admin' || items.some(can)

    return (
        <aside className={`dashboard-sidebar${open ? ' sidebar-open' : ''}`}>
            <Logo />
            <div className="sidebar-label">WORKSPACE</div>
            <NavLink
                onClick={onNavigate}
                className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                to={dashboardPath(userRole)}
            >
                <span className="side-icon">⌂</span> Overview
            </NavLink>
            {can('stock:read') && (
                <NavLink
                    className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                    to={routes.stockManagement}
                >
                    <span className="side-icon">◈</span> Stock management
                </NavLink>
            )}
            {hasAny(['menu:read', 'menu:create', 'menu:update']) && (
                <NavLink
                    className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                    to={routes.menuManagement}
                >
                    <span className="side-icon">▤</span> Menu Management
                </NavLink>
            )}
            {hasAny(['recipes:read', 'recipes:create', 'recipes:update']) && (
                <NavLink
                    className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                    to={routes.recipeManagement}
                >
                    <span className="side-icon">◇</span> Recipes
                </NavLink>
            )}
            {hasAny(['production:read', 'production:create', 'production:preview']) && (
                <NavLink
                    className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                    to={routes.dailyProduction}
                >
                    <span className="side-icon">◷</span> Daily Production
                </NavLink>
            )}
            {hasAny(['production:pos:read', 'production:pos:checkout']) && (
                <NavLink
                    className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                    to={routes.billingPos}
                >
                    <span className="side-icon">▣</span> Billing & POS
                </NavLink>
            )}
            {userRole === 'admin' ? (
                <NavLink
                    className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                    to={routes.reports}
                >
                    <span className="side-icon">▥</span> Reports
                </NavLink>
            ) : can('production:reports:read') && (
                <NavLink
                    className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                    to={routes.salesReports}
                >
                    <span className="side-icon">▥</span> Reports
                </NavLink>
            )}
            {userRole === 'admin' && (
                <NavLink
                    className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                    to={routes.profitSharing}
                >
                    <span className="side-icon">₹</span> Profit sharing
                </NavLink>
            )}
            {userRole === 'admin' && (
                <NavLink
                    className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                    to={routes.staffManagement}
                >
                    <Users size={17} className="side-icon" /> Staff management
                </NavLink>
            )}
            {userRole === 'admin' && (
                <NavLink
                    className={({ isActive }) => `side-link${isActive ? ' side-link-active' : ''}`}
                    to={routes.settings}
                >
                    <span className="side-icon">⚙</span> Settings
                </NavLink>
            )}
            <div className="sidebar-foot"><span className="status-dot" /><span>Signed in securely</span></div>
        </aside>
    )
}
