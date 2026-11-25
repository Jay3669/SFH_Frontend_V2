import { MenuItem, TextField, type TextFieldProps } from '@mui/material'

export type AppSelectOption = {
  value: string
  label: string
  disabled?: boolean
}

export type AppSelectProps = Omit<TextFieldProps, 'select' | 'children'> & {
  options: readonly AppSelectOption[]
  displayEmpty?: boolean
}

export function AppSelect({ options, fullWidth = true, displayEmpty = false, slotProps, ...props }: AppSelectProps) {
  return (
    <TextField
      {...props}
      slotProps={{
        ...slotProps,
        select: { ...slotProps?.select, displayEmpty },
      }}
      select
      fullWidth={fullWidth}
    >
      {options.map((option) => (
        <MenuItem key={option.value} value={option.value} disabled={option.disabled}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  )
}
