import React from 'react'
import ReactDOM from 'react-dom/client'
import { ComponentGallery } from './components/ComponentGallery/ComponentGallery'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <div style={{ 
      width: '100vw', 
      height: '100vh', 
      background: 'var(--bg-darkest)',
      overflow: 'hidden'
    }}>
      <ComponentGallery />
    </div>
  </React.StrictMode>,
)
