import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'  // <--- 關鍵！這行就是讓畫面變漂亮的電源線

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)