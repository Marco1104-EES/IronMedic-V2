import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom' // 👈 關鍵：必須把這個加回來！
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 👇 關鍵：用 BrowserRouter 把 App 包起來，讓它能看懂路徑 */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)