import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { loadFonts } from './utils/loadFonts'
import './styles/global.css'

// Inject @font-face rules with base-aware URLs before first paint
loadFonts()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)





