import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// 引入元件
import Navbar from './components/Navbar' 
import Login from './components/Login'   // 唯一入口檢查站
import AdminDashboard from './admin/AdminDashboard' // 後台
import UserProfile from './components/UserProfile'
import PublicHome from './components/PublicHome' // ✨ 把它救回來，這是賽事首頁

function App() {
  return (
    <BrowserRouter>
      {/* Navbar 可以放在這裡，讓所有頁面都有導航列 (Login 頁面除外，Login 自己會處理) */}
      
      <Routes>
        {/* 🛑 1. 唯一入口：不管打什麼網址，先進入 Login 檢查站 */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />

        {/* ✅ 2. 通過檢查後的目的地：賽事首頁 */}
        <Route path="/home" element={
          <>
            <Navbar /> {/* 進入首頁後才顯示導航列 */}
            <PublicHome />
          </>
        } />

        {/* 會員個人資料 */}
        <Route path="/profile" element={
          <>
            <Navbar />
            <UserProfile />
          </>
        } />
        
        {/* 後台戰情室 (裡面自己有 Layout，不用外層 Navbar) */}
        <Route path="/admin/*" element={<AdminDashboard />} />
        
        {/* 防呆：亂打網址的一律踢回入口 */}
        <Route path="*" element={<Login />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App