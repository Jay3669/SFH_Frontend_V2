import type { UserRole } from '../../types/auth.types'

export const routes = {
  login: '/',
  adminDashboard: '/admin/dashboard',
  stockManagement: '/admin/stock',
  menuManagement: '/admin/production',
  recipeManagement: '/admin/recipes',
  dailyProduction: '/admin/daily-production',
  billingPos: '/admin/pos',
  salesReports: '/admin/sales-reports',
  reports: '/admin/reports',
  profitSharing: '/admin/profit-sharing',
  staffManagement: '/admin/staff',
  staffList: '/admin/staff/list',
  staffCreate: '/admin/staff/create',
  staffRoles: '/admin/staff/roles',
  staffDailyWork: '/admin/staff/daily-work',
  staffProfitSharing: '/admin/staff/profit-sharing',
  staffPayments: '/admin/staff/payments',
  staffReports: '/admin/staff/reports',
  staffProfile: '/admin/staff/:staffId',
  staffEdit: '/admin/staff/:staffId/edit',
  settings: '/admin/settings',
  staffDashboard: '/staff/dashboard',
  customerDashboard: '/customer/dashboard',
} as const

export const staffRoles: UserRole[] = ['manager', 'cashier', 'employee']

export function dashboardPath(role: UserRole) {
  if (role === 'admin') return routes.adminDashboard
  if (role === 'customer') return routes.customerDashboard
  return routes.staffDashboard
}
