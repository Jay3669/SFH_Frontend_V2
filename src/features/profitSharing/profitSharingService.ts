import { apiEndpoints } from '../../services/api/apiEndpoints'
import { authenticatedApiRequest } from '../../services/api/apiClient'

export type ProfitSharingCalculation = {
  id: string
  businessDate: string
  eligibleNetProfit: number | string
  totalAllocationPercentage: number | string
  totalProfitShare: number | string
  status: string
  details?: Array<{
    id: string
    staffId: string
    roleId: string
    appliedPercentage: number | string
    calculatedShare: number | string
  }>
}

type ApiResponse<T> = { data?: T }

export function getDailyProfitSharing(businessDate?: string) {
  const suffix = businessDate ? `?businessDate=${encodeURIComponent(businessDate)}` : ''
  return authenticatedApiRequest<ApiResponse<ProfitSharingCalculation[]>>(
    `${apiEndpoints.profitSharing.daily}${suffix}`,
  )
}

export function calculateDailyProfitSharing(businessDate: string) {
  return authenticatedApiRequest<ApiResponse<{ calculation: ProfitSharingCalculation; details: unknown[] }>>(
    apiEndpoints.profitSharing.calculate,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ businessDate }),
    },
  )
}

export function approveProfitSharing(id: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`/profit-sharing/${id}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
}

export function rejectProfitSharing(id: string, remarks: string) {
  return authenticatedApiRequest<ApiResponse<unknown>>(`/profit-sharing/${id}/reject`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ remarks }),
  })
}
