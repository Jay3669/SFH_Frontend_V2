import type { InputHTMLAttributes } from 'react'
import { AppTextField } from '../../common/AppTextField'
import { FormErrorMessage } from '../FormErrorMessage/FormErrorMessage'

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}

export function FormInput({ id, label, error, ...inputProps }: FormInputProps) {
  const inputId = id ?? inputProps.name
  const {
    value,
    defaultValue,
    name,
    type,
    placeholder,
    disabled,
    readOnly,
    onChange,
    onBlur,
    onFocus,
  } = inputProps

  return (
    <div className="sfh-form-field">
      <AppTextField
        id={inputId}
        name={name}
        type={type}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        onChange={onChange}
        onBlur={onBlur}
        onFocus={onFocus}
        label={label}
        error={Boolean(error)}
        helperText={error ? <FormErrorMessage message={error} /> : undefined}
        required={inputProps.required}
        slotProps={{
          htmlInput: {
            readOnly,
            maxLength: inputProps.maxLength,
            min: inputProps.min,
            max: inputProps.max,
            step: inputProps.step,
            inputMode: inputProps.inputMode,
          },
        }}
      />
    </div>
  )
}
