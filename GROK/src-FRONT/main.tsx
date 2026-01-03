// src/main.tsx

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { AuthProvider } from './features/auth/AuthContext' // <-- Importar

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider> {/* <-- Envolver la App */}
      <App />
    </AuthProvider>
  </React.StrictMode>,
)

