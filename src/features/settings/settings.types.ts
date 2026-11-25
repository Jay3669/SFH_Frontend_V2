export type PaymentTender = 'cash' | 'card' | 'upi'
export type PaymentMethod = PaymentTender | 'split'

export type AdditionalChargeSetting = {
  id: string
  name: string
  enabled: boolean
  calculationType: 'fixed' | 'percentage'
  amount: number
}

export type ApplicationSettings = {
  billing: {
    invoicePrefix: string
    tax: { enabled: boolean; rate: number }
    packingCharge: { enabled: boolean; amount: number }
    additionalCharges: AdditionalChargeSetting[]
  }
  payments: {
    enabledMethods: Record<PaymentTender, boolean>
    allowSplit: boolean
  }
  regional: {
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'
    timeFormat: '12h' | '24h'
    timeZone: string
  }
  profitSharing: {
    maxAllocationPercentage: number
  }
}

export type ApplicationSettingsResponse = {
  statusCode: number
  status: string
  message: string
  data?: {
    settings: ApplicationSettings
    nextInvoiceNumber: string
    settingsUpdatedAt: string
  }
}
