import type { ApiResponse, StockItem } from '../inventory/stock.types'
import type { PaymentMethod, PaymentTender } from '../settings/settings.types'

export type ProductionApiResponse<T> = ApiResponse<T>

export type MenuItem = {
  id: string
  itemCode: string
  name: string
  category: string
  categoryId: string
  displayOrder: number
  isVegetarian: boolean
  price: number | string
  description: string | null
  imageUrl: string | null
  isActive: boolean
}

export type MenuCategory = {
  id: string
  categoryCode: string
  name: string
  description: string | null
  imageUrl: string | null
  displayOrder: number
  isActive: boolean
  menuItemCount: number
}

export type RecipeIngredient = {
  id?: string
  stockItemId: string
  quantity: number | string
  unit: string
  preparationNotes: string | null
  wastagePercentage: number | string
  stockItem?: StockItem
}

export type RecipeVersion = {
  id: string
  version: number
  baseProductionQuantity: number | string
  baseProductionUnit: string
  expectedPlateCount: number | string
  servingSize: number | string | null
  servingUnit: string | null
  preparationInstructions: string | null
  cookingTimeMinutes: number | null
  wastagePercentage: number | string
  ingredients: RecipeIngredient[]
}

export type Recipe = {
  id: string
  name: string
  currentVersion: number
  isArchived: boolean
  menuItem: MenuItem
  current: RecipeVersion | null
  versions?: RecipeVersion[]
}

export type ProductionPreview = {
  recipe: {
    id: string
    name: string
    currentVersion: number
    menuItem: MenuItem
  }
  productionQuantity: number
  productionUnit: string
  productionDate: string
  expectedPlateCount: number
  sellingPricePerPlate: number
  expectedSalesAmount: number
  expectedProfit: number
  ingredients: Array<{
    stockItemId: string
    ingredientName: string
    unit: string
    theoreticalQuantity: number
    quantityDeducted: number
    availableQuantity: number
    balanceAfter: number | null
    unitCost: number
    totalCost: number
    sufficient: boolean
  }>
  additionalCosts: Array<{ name: string; amount: number }>
  totalIngredientCost: number
  additionalCost: number
  totalProductionCost: number
  costPerKg: number | null
  costPerPlate: number
  canProduce: boolean
  shortages: Array<{
    stockItemId: string
    ingredientName: string
    requiredQuantity: number
    availableQuantity: number
    unit: string
  }>
}

export type ProductionIngredientRecord = {
  id: string
  stockItemId: string
  ingredientName: string
  theoreticalQuantity: number | string
  quantityDeducted: number | string
  unit: string
  unitCost: number | string
  totalCost: number | string
  balanceAfter: number | string
  stockItem?: StockItem
}

export type ProductionRecord = {
  id: string
  reference: string
  productionDate: string
  productionQuantity: number | string
  productionUnit: string
  expectedPlateCount: number | string
  actualPlateCount: number | string | null
  totalProductionCost: number | string
  costPerKg: number | string | null
  costPerPlate: number | string
  status: 'confirmed' | 'cancelled'
  notes: string | null
  menuItem: MenuItem
  ingredients?: ProductionIngredientRecord[]
}

export type ProductionReport = {
  period: { from: string; to: string }
  summary: {
    batches: number
    platesProduced: number
    totalProductionCost: number
    averageCostPerPlate: number
  }
  daily: Array<{ date: string; batches: number; plates: number; productionCost: number }>
  menuItems: Array<{ menuItemId: string; name: string; batches: number; plates: number; productionCost: number }>
  ingredients: Array<{ stockItemId: string; name: string; unit: string; quantityUsed: number; totalCost: number }>
  productions: ProductionRecord[]
}

export type ProductionAvailabilityItem = {
  menuItemId: string
  name: string
  category: string
  categoryId: string
  imageUrl: string | null
  price: number | string
  producedPlates: number | string
  soldPlates: number | string
  availablePlates: number | string
  productionCost: number | string
  expectedSales: number | string
  expectedProfit: number | string
  salesRevenue: number | string
}

export type ProductionAvailability = {
  productionDate: string
  isClosed: boolean
  summary: {
    producedPlates: number | string
    soldPlates: number | string
    availablePlates: number | string
    productionCost: number | string
    expectedSales: number | string
    actualSales: number | string
  }
  items: ProductionAvailabilityItem[]
}

export type ProductionSale = {
  id: string
  reference: string
  productionDate: string
  subtotal: number | string
  discountAmount: number | string
  taxRate: number | string
  taxAmount: number | string
  packingCharge: number | string
  totalAmount: number | string
  paymentMethod: PaymentMethod
  paymentBreakdown: Partial<Record<PaymentTender, number | string>>
  additionalCharges: Array<{
    id: string
    name: string
    calculationType: 'fixed' | 'percentage'
    configuredAmount: number | string
    amount: number | string
  }>
  paymentStatus: 'completed' | 'failed' | 'cancelled'
  items: Array<{
    id: string
    menuItemId: string
    menuItemName: string
    quantity: number | string
    unitPrice: number | string
    discountAmount: number | string
    totalPrice: number | string
  }>
}

export type ProductionDayClose = {
  productionDate: string
  isClosed: boolean
  summary: {
    producedPlates: number
    soldPlates: number
    wastagePlates: number
    availablePlates: number
    productionCost: number
    salesRevenue: number
    wastageCost: number
    soldFoodCost?: number
    grossProfit: number
  }
  items: Array<{
    menuItemId: string
    menuItemName: string
    producedPlates: number
    soldPlates: number
    remainingPlates: number
    wastagePlates: number
    productionCost: number
    salesRevenue: number
    wastageCost: number
  }>
}

export type FinancialReport = {
  period: { from: string; to: string }
  summary: {
    totalProductionCost: number
    totalExpectedRevenue: number
    totalSalesRevenue: number
    soldFoodCost: number
    totalProducedPlates: number
    totalSoldPlates: number
    availablePlates: number
    totalWastagePlates: number
    totalWastageCost: number
    grossProfit: number
    grossLoss: number
    operatingExpenses: number
    netProfit: number
    netLoss: number
  }
  paymentMethods: Record<PaymentMethod, { bills: number; amount: number }>
  paymentTenders: Record<PaymentTender, { bills: number; amount: number }>
  paymentStatuses: Record<'completed' | 'failed' | 'cancelled', { bills: number; amount: number }>
  daily: Array<{
    date: string
    producedPlates: number
    soldPlates: number
    remainingPlates: number
    productionCost: number
    expectedRevenue: number
    salesRevenue: number
    wastagePlates: number
    wastageCost: number
    operatingExpenses: number
    grossProfit: number
    netProfit: number
  }>
  menuItems: Array<{
    date: string
    menuItemId: string
    name: string
    producedPlates: number
    soldPlates: number
    remainingPlates: number
    wastagePlates: number
    productionCost: number
    expectedRevenue: number
    salesRevenue: number
    wastageCost: number
  }>
  expenses: OperatingExpense[]
}

export type OperatingExpense = {
  id: string
  expenseDate: string
  category: string
  description: string
  amount: number | string
}

export type RecipeVersionInput = {
  baseProductionQuantity: number
  baseProductionUnit: string
  expectedPlateCount: number
  servingSize?: number | null
  servingUnit?: string | null
  preparationInstructions?: string | null
  cookingTimeMinutes?: number | null
  wastagePercentage: number
  ingredients: Array<{
    stockItemId: string
    quantity: number
    unit: string
    preparationNotes?: string | null
    wastagePercentage: number
  }>
}

export type ProductionRequest = {
  recipeId: string
  quantity: number
  unit: string
  productionDate: string
  actualPlateCount?: number | null
  notes?: string | null
  additionalCosts?: Array<{ name: string; amount: number }>
}
