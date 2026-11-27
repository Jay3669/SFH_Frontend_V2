import { Navigate, Route, Routes } from 'react-router-dom'
import { DashboardPage } from '../../features/dashboard/DashboardPage'
import { StockManagementPage } from '../../features/inventory/StockManagementPage'
import { MenuManagementPage } from '../../features/menuManagement/MenuManagementPage'
import { RecipesPage } from '../../features/recipes/RecipesPage'
import { BillingPosPage, DailyProductionPage } from '../../features/production/ProductionOperationsPage'
import { SalesReportsPage } from '../../features/production/SalesReportsPage'
import { ProfitSharingPage } from '../../features/profitSharing/ProfitSharingPage'
import { SettingsPage } from '../../features/settings/SettingsPage'
import { StaffManagementPage } from '../../features/staff/StaffManagementPage'
import { BranchManagementPage } from '../../features/branches/BranchManagementPage'
import { LoginPage } from '../../features/auth/LoginPage'
import { AuthLayout } from '../../layouts/AuthLayout/AuthLayout'
import { useAuth } from '../../hooks/useAuth'
import { ProtectedRoute } from './ProtectedRoute'
import { RoleBasedRoute } from './RoleBasedRoute'
import { dashboardPath, routes, staffRoles } from './routes'

export function AppRouter() {
  const { user, signOut } = useAuth()

  return (
    <Routes>
      <Route
        path={routes.login}
        element={user
          ? <Navigate to={dashboardPath(user.role)} replace />
          : <AuthLayout><LoginPage /></AuthLayout>}
      />
      <Route element={<ProtectedRoute />}>
        <Route
          path={routes.adminDashboard}
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              {user && <DashboardPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.stockManagement}
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              {user && <StockManagementPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.menuManagement}
          element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'employee']}>
              {user && <MenuManagementPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.recipeManagement}
          element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'employee']}>
              {user && <RecipesPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.dailyProduction}
          element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'employee']}>
              {user && <DailyProductionPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.billingPos}
          element={
            <RoleBasedRoute allowedRoles={['admin', 'manager', 'cashier']}>
              {user && <BillingPosPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.salesReports}
          element={
            <RoleBasedRoute allowedRoles={['admin', 'manager']}>
              {user && <SalesReportsPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.settings}
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              {user && <SettingsPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.profitSharing}
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              {user && <ProfitSharingPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.staffManagement}
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              {user && <StaffManagementPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.branchManagement}
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              {user && <BranchManagementPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path={routes.reports}
          element={
            <RoleBasedRoute allowedRoles={['admin']}>
              {user && <StaffManagementPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        {[
          routes.staffList,
          routes.staffCreate,
          routes.staffRoles,
          routes.staffDailyWork,
          routes.staffProfitSharing,
          routes.staffPayments,
          routes.staffReports,
          routes.staffProfile,
          routes.staffEdit,
        ].map((path) => (
          <Route
            key={path}
            path={path}
            element={
              <RoleBasedRoute allowedRoles={['admin']}>
                {user && <StaffManagementPage user={user} onLogout={signOut} />}
              </RoleBasedRoute>
            }
          />
        ))}
        <Route
          path="/staff/*"
          element={
            <RoleBasedRoute allowedRoles={staffRoles}>
              {user && <DashboardPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
        <Route
          path="/customer/*"
          element={
            <RoleBasedRoute allowedRoles={['customer']}>
              {user && <DashboardPage user={user} onLogout={signOut} />}
            </RoleBasedRoute>
          }
        />
      </Route>
      <Route
        path="*"
        element={<Navigate to={user ? dashboardPath(user.role) : routes.login} replace />}
      />
    </Routes>
  )
}
