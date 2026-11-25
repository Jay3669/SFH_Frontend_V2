import { apiEndpoints } from '../../services/api/apiEndpoints'
import { authenticatedApiRequest } from '../../services/api/apiClient'
import type {
  ApiResponse,
  StockCategory,
  StockCategoryInput,
  StockItem,
  StockItemInput,
  StockMovement,
  StockMovementInput,
  StockSummary,
} from './stock.types'

type StockListResponse<T> = ApiResponse<T[]> & {
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

export function getStockSummary() {
  return authenticatedApiRequest<ApiResponse<StockSummary>>(apiEndpoints.stock.summary)
}

export function getStockCategories() {
  return authenticatedApiRequest<ApiResponse<StockCategory[]>>(apiEndpoints.stock.categories)
}

export function getStockCategory(id: string) {
  return authenticatedApiRequest<ApiResponse<StockCategory>>(`${apiEndpoints.stock.categories}/${id}`)
}

export function createStockCategory(input: StockCategoryInput) {
  return authenticatedApiRequest<ApiResponse<StockCategory>>(apiEndpoints.stock.categories, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function updateStockCategory(id: string, input: Partial<StockCategoryInput>) {
  return authenticatedApiRequest<ApiResponse<StockCategory>>(`${apiEndpoints.stock.categories}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function deleteStockCategory(id: string) {
  return authenticatedApiRequest<ApiResponse<{ id: string; deleted: boolean }>>(
    `${apiEndpoints.stock.categories}/${id}`,
    { method: 'DELETE' },
  )
}

export function getStockItems({
  q,
  status,
  page = 1,
  limit = 20,
}: {
  q: string
  status: 'active' | 'low' | 'out' | 'inactive'
  page?: number
  limit?: number
}) {
  const query = new URLSearchParams({ q, status, page: String(page), limit: String(limit) })
  return authenticatedApiRequest<StockListResponse<StockItem>>(
    `${apiEndpoints.stock.items}?${query.toString()}`,
  )
}

export function getStockMovements(page = 1, limit = 20) {
  const query = new URLSearchParams({ page: String(page), limit: String(limit) })
  return authenticatedApiRequest<StockListResponse<StockMovement>>(
    `${apiEndpoints.stock.movements}?${query.toString()}`,
  )
}

export function createStockItem(input: StockItemInput) {
  return authenticatedApiRequest<ApiResponse<StockItem>>(apiEndpoints.stock.items, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function updateStockItem(id: string, input: Partial<StockItemInput>) {
  return authenticatedApiRequest<ApiResponse<StockItem>>(`${apiEndpoints.stock.items}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function archiveStockItem(id: string) {
  return authenticatedApiRequest<ApiResponse<StockItem>>(`${apiEndpoints.stock.items}/${id}`, {
    method: 'DELETE',
  })
}

export function restoreStockItem(id: string) {
  return authenticatedApiRequest<ApiResponse<StockItem>>(`${apiEndpoints.stock.items}/${id}/restore`, {
    method: 'PATCH',
  })
}

export function recordStockMovement(id: string, input: StockMovementInput) {
  return authenticatedApiRequest<ApiResponse<{ item: StockItem; movement: StockMovement }>>(
    `${apiEndpoints.stock.items}/${id}/movements`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}
