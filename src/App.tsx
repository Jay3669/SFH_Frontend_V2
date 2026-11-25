import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './app/router'
import { AuthProvider } from './app/providers/AuthProvider'
import { ApiLoadingOverlay } from './components/loaders/ApiLoadingOverlay'

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ApiLoadingOverlay />
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
