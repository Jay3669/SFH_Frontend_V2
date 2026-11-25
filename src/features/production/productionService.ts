import { apiEndpoints } from '../../services/api/apiEndpoints'
import { authenticatedApiRequest } from '../../services/api/apiClient'
import type { StockItem } from '../inventory/stock.types'
import type { PaymentMethod, PaymentTender } from '../settings/settings.types'
import type {
  MenuItem,
  MenuCategory,
  FinancialReport,
  OperatingExpense,
  ProductionAvailability,
  ProductionDayClose,
  ProductionApiResponse,
  ProductionPreview,
  ProductionRecord,
  ProductionReport,
  ProductionRequest,
  ProductionSale,
  Recipe,
  RecipeVersionInput,
} from './production.types'

type ListResponse<T> = ProductionApiResponse<T[]> & {
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

type MenuCategoryListResponse = ProductionApiResponse<MenuCategory[]> & {
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}

export type MenuCategoryQuery = {
  page?: number
  limit?: number
  q?: string
  status?: 'all' | 'active' | 'inactive'
  sort?: 'displayOrder' | 'name' | 'createdAt'
  order?: 'asc' | 'desc'
}

export function getMenuCategories(query: MenuCategoryQuery = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') params.set(key, String(value))
  })
  const queryString = params.toString()
  const search = queryString ? `?${queryString}` : ''
  return authenticatedApiRequest<MenuCategoryListResponse>(
    `${apiEndpoints.production.menuCategories}${search}`,
  )
}

export function getMenuCategory(id: string) {
  return authenticatedApiRequest<ProductionApiResponse<MenuCategory>>(
    `${apiEndpoints.production.menuCategories}/${id}`,
  )
}

export function createMenuCategory(input: {
  name: string
  description: string | null
  displayOrder?: number
  isActive?: boolean
}) {
  return authenticatedApiRequest<ProductionApiResponse<MenuCategory>>(
    apiEndpoints.production.menuCategories,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}

export function updateMenuCategory(
  id: string,
  input: Partial<Pick<MenuCategory, 'name' | 'description' | 'displayOrder' | 'isActive'>>,
) {
  return authenticatedApiRequest<ProductionApiResponse<MenuCategory>>(
    `${apiEndpoints.production.menuCategories}/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}

export function deleteMenuCategory(id: string) {
  return authenticatedApiRequest<ProductionApiResponse<{
    category: MenuCategory | null
    categoryId: string
    deleted: boolean
    deactivated: boolean
    associatedMenuItemCount: number
  }>>(`${apiEndpoints.production.menuCategories}/${id}`, { method: 'DELETE' })
}

export function getMenuItems() {
  return authenticatedApiRequest<ListResponse<MenuItem>>(`${apiEndpoints.production.menuItems}?status=all&limit=100`)
}

export function createMenuItem(input: {
  name: string
  categoryId: string
  isVegetarian: boolean
  price: number
  description: string | null
  imageUrl: string | null
}) {
  return authenticatedApiRequest<ProductionApiResponse<MenuItem>>(apiEndpoints.production.menuItems, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function updateMenuItem(id: string, input: Partial<MenuItem>) {
  return authenticatedApiRequest<ProductionApiResponse<MenuItem>>(
    `${apiEndpoints.production.menuItems}/${id}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}

export function deleteMenuItem(id: string) {
  return authenticatedApiRequest<ProductionApiResponse<{ deleted: boolean }>>(
    `${apiEndpoints.production.menuItems}/${id}`,
    { method: 'DELETE' },
  )
}

export function getRecipes(status: 'active' | 'archived' | 'all' = 'active') {
  return authenticatedApiRequest<ListResponse<Recipe>>(
    `${apiEndpoints.production.recipes}?status=${status}&limit=100`,
  )
}

export function createRecipe(input: RecipeVersionInput & { menuItemId: string; name: string }) {
  return authenticatedApiRequest<ProductionApiResponse<Recipe>>(apiEndpoints.production.recipes, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function createRecipeVersion(id: string, input: RecipeVersionInput) {
  return authenticatedApiRequest<ProductionApiResponse<Recipe>>(
    `${apiEndpoints.production.recipes}/${id}/versions`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}

export function setRecipeArchived(id: string, isArchived: boolean) {
  return authenticatedApiRequest<ProductionApiResponse<Recipe>>(
    `${apiEndpoints.production.recipes}/${id}/archive`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isArchived }),
    },
  )
}

export function previewProduction(input: ProductionRequest) {
  return authenticatedApiRequest<ProductionApiResponse<ProductionPreview>>(
    apiEndpoints.production.preview,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}

export function confirmProduction(input: ProductionRequest & { idempotencyKey: string }) {
  return authenticatedApiRequest<ProductionApiResponse<ProductionRecord>>(apiEndpoints.production.records, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })
}

export function getProductionRecords(query: { from?: string; to?: string; limit?: number } = {}) {
  const params = new URLSearchParams({ limit: String(query.limit ?? 50) })
  if (query.from) params.set('from', query.from)
  if (query.to) params.set('to', query.to)
  return authenticatedApiRequest<ListResponse<ProductionRecord>>(
    `${apiEndpoints.production.records}?${params}`,
  )
}

export function getProductionRecord(id: string) {
  return authenticatedApiRequest<ProductionApiResponse<ProductionRecord>>(
    `${apiEndpoints.production.records}/${id}`,
  )
}

export function updateProductionYield(id: string, actualPlateCount: number) {
  return authenticatedApiRequest<ProductionApiResponse<ProductionRecord>>(
    `${apiEndpoints.production.records}/${id}/yield`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualPlateCount }),
    },
  )
}

export function cancelProduction(
  id: string,
  input: {
    reason: string
    notes?: string
    recoveries?: Array<{ productionIngredientId: string; quantityRecovered: number }>
  },
) {
  return authenticatedApiRequest<ProductionApiResponse<ProductionRecord>>(
    `${apiEndpoints.production.records}/${id}/cancel`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}

export function getProductionReport(from: string, to: string) {
  const query = new URLSearchParams({ from, to })
  return authenticatedApiRequest<ProductionApiResponse<ProductionReport>>(
    `${apiEndpoints.production.reports}?${query}`,
  )
}

export function getProductionAvailability(productionDate: string) {
  const query = new URLSearchParams({ productionDate })
  return authenticatedApiRequest<ProductionApiResponse<ProductionAvailability>>(
    `${apiEndpoints.production.availability}?${query}`,
  )
}

export function completeProductionSale(input: {
  productionDate: string
  idempotencyKey: string
  settingsUpdatedAt?: string
  paymentMethod: PaymentMethod
  paymentBreakdown?: Partial<Record<PaymentTender, number>>
  discountAmount: number
  items: Array<{ menuItemId: string; quantity: number }>
}) {
  return authenticatedApiRequest<ProductionApiResponse<ProductionSale>>(
    apiEndpoints.production.sales,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}

export function closeProductionDay(productionDate: string) {
  return authenticatedApiRequest<ProductionApiResponse<ProductionDayClose>>(
    apiEndpoints.production.close,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productionDate }),
    },
  )
}

export function getFinancialReport(
  from: string,
  to: string,
  filters: {
    categoryId?: string
    menuItemId?: string
    paymentMethod?: PaymentMethod | 'all'
    paymentStatus?: 'completed' | 'failed' | 'cancelled' | 'all'
  } = {},
) {
  const query = new URLSearchParams({ from, to })
  Object.entries(filters).forEach(([key, value]) => {
    if (value) query.set(key, value)
  })
  return authenticatedApiRequest<ProductionApiResponse<FinancialReport>>(
    `${apiEndpoints.production.financialReports}?${query}`,
  )
}

export function getOperatingExpenses(from: string, to: string) {
  const query = new URLSearchParams({ from, to })
  return authenticatedApiRequest<ProductionApiResponse<OperatingExpense[]>>(
    `${apiEndpoints.production.expenses}?${query}`,
  )
}

export function createOperatingExpense(input: {
  expenseDate: string
  category: string
  description: string
  amount: number
}) {
  return authenticatedApiRequest<ProductionApiResponse<OperatingExpense>>(
    apiEndpoints.production.expenses,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    },
  )
}

export function getActiveStockItems() {
  return authenticatedApiRequest<ProductionApiResponse<StockItem[]>>(
    apiEndpoints.production.stockItems,
  )
}

