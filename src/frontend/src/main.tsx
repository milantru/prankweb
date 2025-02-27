import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import Navigation from './shared/components/navigation/Navigation'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Navigation />
      <App />
    </BrowserRouter>
  </StrictMode>
)
