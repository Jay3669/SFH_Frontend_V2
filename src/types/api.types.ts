export type ApiResponse<T> = {
  statusCode: number
  status: string
  message: string
  data?: T
  errors?: unknown
  pagination?: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}
