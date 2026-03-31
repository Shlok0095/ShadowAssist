import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'

function basename(): string {
  const b = import.meta.env.BASE_URL
  if (b === '/') return ''
  return b.replace(/\/$/, '')
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter basename={basename()}>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
