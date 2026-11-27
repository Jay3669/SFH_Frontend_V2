export type StockItem = {
  id: string
  itemCode: string
  name: string
  imageUrl: string | null
  sku: string | null
  expiryDate: string | null
  displayOrder: number
  categoryId: string
  category: string
  unit: string
  quantity: number | string
  reorderLevel: number | string
  unitCost: number | string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type StockCategory = {
  id: string
  categoryCode: string
  name: string
  description: string | null
  imageUrl: string | null
  displayOrder: number
  itemCount: number
  createdAt: string
  updatedAt: string
}

export type StockSummary = {
  totalItems: number
  lowStock: number
  outOfStock: number
  stockValue: number
  dailyUsedItems: number
  dailyUsage: Array<{
    itemId: string
    name: string
    unit: string
    quantity: number
  }>
  recentMovements: StockMovement[]
}

export type StockMovement = {
  id: string
  stockItemId: string
  type: 'in' | 'out' | 'count'
  quantity: number | string
  unitCost: number | string | null
  change: number | string
  beforeQuantity: number | string
  afterQuantity: number | string
  unit: string
  reason: string
  actorUserId: string
  createdAt: string
  item?: Pick<StockItem, 'id' | 'name' | 'sku' | 'unit'>
}

export type StockItemInput = {
  name: string
  sku: string | null
  imageUrl: string | null
  expiryDate: string | null
  displayOrder: number
  categoryId: string
  unit: string
  reorderLevel: number
}

export type StockCategoryInput = {
  name: string
  description: string | null
  imageUrl: string | null
  displayOrder?: number
}

export type StockMovementInput =
  | { type: 'in'; quantity: number; totalCost: number; reason: string }
  | { type: 'out' | 'count'; quantity: number; reason: string }

export type ApiResponse<T> = {
  statusCode: number
  status: string
  message: string
  data?: T
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
