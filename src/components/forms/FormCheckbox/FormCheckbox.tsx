import type { InputHTMLAttributes } from 'react'
import { Checkbox, FormControlLabel } from '@mui/material'

type FormCheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label: string
}

export function FormCheckbox({ label, id, ...inputProps }: FormCheckboxProps) {
  const inputId = id ?? inputProps.name
  return (
    <FormControlLabel
      control={
        <Checkbox
          id={inputId}
          name={inputProps.name}
          checked={inputProps.checked}
          defaultChecked={inputProps.defaultChecked}
          disabled={inputProps.disabled}
          onChange={inputProps.onChange}
          value={inputProps.value}
        />
      }
      label={label}
    />
  )
}
