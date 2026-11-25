import { DatePicker, type DatePickerProps } from '@mui/x-date-pickers'

export type AppDatePickerProps = DatePickerProps

export function AppDatePicker(props: AppDatePickerProps) {
  return (
    <DatePicker
      format="DD-MM-YYYY"
      slotProps={{
        textField: { size: 'small', fullWidth: true },
        ...props.slotProps,
      }}
      {...props}
    />
  )
}
