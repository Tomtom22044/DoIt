import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { StorageProvider } from './context/StorageContext'
import './styles/global.css'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <StorageProvider>
        <App />
      </StorageProvider>
    </AuthProvider>
  </StrictMode>,
)
