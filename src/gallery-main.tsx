import React from 'react'
import ReactDOM from 'react-dom/client'
import { ComponentGalleryStandalone } from './components/ComponentGallery/ComponentGalleryStandalone'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ComponentGalleryStandalone />
  </React.StrictMode>,
)
