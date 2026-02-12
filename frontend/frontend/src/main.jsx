import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { EnergyProvider } from "./context/EnergyContext";


createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <EnergyProvider>
        <App />
      </EnergyProvider>
    </BrowserRouter>
  </StrictMode>
)


