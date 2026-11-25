export const STAFF_ROLES = ['manager', 'cashier', 'employee'] as const

export const USER_ROLES = ['admin', 'customer', ...STAFF_ROLES] as const
