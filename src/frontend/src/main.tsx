import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import Navigation from './shared/components/Navigation'
import { ToastContainer } from 'react-toastify'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Navigation />
      <App />
      <ToastContainer
        position="bottom-right"
        limit={2} // Displays max 2 toasts at a time. If more should be opened, they will be opened after previous 2 disappear
        /* 3,7 seconds, Why? autoClose should be always less than polling interval. Let's imagine a polling situation where we 
         * could display multiple toasts in a short period of time, e.g. we are trying to fetch the status but it fails, 
         * then toast is displayed and we are trying to fetch status again. What if it fails again? The new toast appears
         * and right after that the previous (old) one disappears. It doesn't look very well. At least in my opinion,
         * for the better UX (ofc the best it would be if status was be fetched successfully on the first try) it would be
         * better if the first toast disappeared and THEN a new one appeared. But why 3,7 seconds? Wouldn't 4 suffice? 
         * Well, not necessarily. I am not sure if it's because we are dealing with async operations or it has something
         * to do with animation but for some reason 4 seconds simply is not enough and sometimes 2 toasts stack on each other.
         * Empirically it was discovered that the value 3700 (3,7 seconds) is fine, or at least it seems so. */
        autoClose={3700}
        newestOnTop
        draggable={false} />
    </BrowserRouter>
  </StrictMode>
)
