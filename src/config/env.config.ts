const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:6060/api'

export const envConfig = {
  apiBaseUrl: apiBaseUrl.replace(/\/$/, ''),
} as const
