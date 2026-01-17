import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { StorageProvider } from './context/StorageContext'
import './styles/global.css'
import { AuthProvider } from './context/AuthContext'
import App from './App.jsx'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || "YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com"

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID} disableAutomaticPrompt={true}>
      <AuthProvider>
        <StorageProvider>
          <App />
        </StorageProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </StrictMode>,
)
