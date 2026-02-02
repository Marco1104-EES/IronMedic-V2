import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom' // 🟢 補回 BrowserRouter
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// ⬇️ 路徑確認：指揮官在 pages，零件在 components
import Navbar from './components/Navbar' 
import Login from './pages/Login'        
import Home from './pages/Home'          
import UserProfile from './pages/UserProfile' 
import AdminDashboard from './admin/AdminDashboard'

// Loading 畫面
const LoadingScreen = () => (
  <div className="min-h-screen bg-[#020617] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
)

// 守衛
const PrivateRoute = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
  }, [])

  if (loading) return <LoadingScreen />
  
  return session ? children : <Navigate to="/login" replace />
}

function App() {
  return (
    // 🟢 關鍵修正：因為 main.jsx 沒有包，這裡必須包 BrowserRouter
    <BrowserRouter>
      <Routes>
          {/* 1. 唯一入口：Login */}
          <Route path="/login" element={<Login />} />
          
          {/* 2. 賽事首頁 (需登入) */}
          <Route path="/home" element={
            <PrivateRoute>
              <Navbar /> 
              <Home />
            </PrivateRoute>
          } />

          {/* 3. 會員中心 (需登入) */}
          <Route path="/profile" element={
            <PrivateRoute>
              <Navbar />
              <UserProfile />
            </PrivateRoute>
          } />
          
          {/* 4. 後台戰情室 (需登入) */}
          <Route path="/admin/*" element={
            <PrivateRoute>
              <AdminDashboard />
            </PrivateRoute>
          } />
          
          {/* 導向設定 */}
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App