import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import '../styles/variables.css'
import '../styles/reset.css'
import '../styles/animations.css'
import '../styles/global.css'
import '../styles/responsive.css'
import { AppProviders } from './AppProviders'
import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AppProviders>
        <App />
      </AppProviders>
    </BrowserRouter>
  </StrictMode>,
)
