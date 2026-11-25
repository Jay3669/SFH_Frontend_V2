import { TextField, type TextFieldProps } from '@mui/material'

export type AppTextFieldProps = TextFieldProps & {
  requiredLabel?: boolean
}

export function AppTextField({ requiredLabel, required, label, ...props }: AppTextFieldProps) {
  return (
    <TextField
      {...props}
      label={requiredLabel ? `${label ?? ''} *` : label}
      required={required}
      fullWidth
    />
  )
}
