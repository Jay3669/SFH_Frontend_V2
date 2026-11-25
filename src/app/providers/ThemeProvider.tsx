import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CssBaseline, ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material'
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('light')

  useEffect(() => {
    document.documentElement.dataset.theme = 'light'
  }, [])

  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    setMode(media.matches ? 'dark' : 'light')
    const listener = (event: MediaQueryListEvent) => setMode(event.matches ? 'dark' : 'light')
    media.addEventListener('change', listener)
    return () => media.removeEventListener('change', listener)
  }, [])

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#D99A32', dark: '#B78128', contrastText: '#172333' },
      secondary: { main: '#27834B' },
      background: mode === 'light'
        ? { default: '#F5F3EE', paper: '#FFFFFF' }
        : { default: '#101722', paper: '#172333' },
      text: mode === 'light'
        ? { primary: '#343A40', secondary: '#77766F' }
        : { primary: '#F5F3EE', secondary: '#BCC4CC' },
      error: { main: '#A83E30' },
    },
    shape: { borderRadius: 9 },
    typography: {
      fontFamily: 'Inter, "Segoe UI", Arial, sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      button: { textTransform: 'none', fontWeight: 700 },
    },
    components: {
      MuiButton: {
        defaultProps: { disableElevation: true },
        styleOverrides: {
          root: { minHeight: 42, borderRadius: 9, paddingInline: 18, boxShadow: 'none' },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small', variant: 'outlined' },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 9, backgroundColor: '#FFFFFF' },
          notchedOutline: { borderColor: '#DDD7CB' },
        },
      },
      MuiDialog: {
        defaultProps: { slotProps: { backdrop: { style: { backgroundColor: 'rgba(16, 23, 35, 0.48)' } } } },
        styleOverrides: { paper: { borderRadius: 14, maxWidth: 560 } },
      },
      MuiDialogTitle: { styleOverrides: { root: { padding: '22px 24px 8px', fontWeight: 700 } } },
      MuiDialogContent: { styleOverrides: { root: { padding: '8px 24px 18px' } } },
      MuiDialogActions: { styleOverrides: { root: { padding: '12px 24px 22px', gap: 8 } } },
      MuiCard: {
        styleOverrides: { root: { borderRadius: 13 } },
      },
      MuiTooltip: {
        defaultProps: { arrow: true },
      },
    },
  }), [mode])

  return (
    <MuiThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        {children}
      </LocalizationProvider>
    </MuiThemeProvider>
  )
}
