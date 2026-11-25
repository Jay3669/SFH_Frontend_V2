export type SelectOption<T extends string = string> = {
  label: string
  value: T
}

export type AsyncStatus = 'idle' | 'loading' | 'success' | 'error'
