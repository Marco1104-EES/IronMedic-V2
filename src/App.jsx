import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

import AdminLayout from './layouts/AdminLayout' 
import UserLayout from './layouts/UserLayout'   
import Login from './pages/Login'        
import Home from './pages/Home'          

import DashboardHome from './admin/DashboardHome'
import EventManagement from './admin/EventManagement'
import MemberCRM from './admin/MemberCRM'           
import DataImportCenter from './admin/DataImportCenter' 
import UserPermission from './admin/UserPermission' 
import SystemLogs from './admin/SystemLogs'         

const LoadingScreen = () => (
  <div className="min-h-screen bg-[#020617] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-500"></div>
  </div>
)

const PrivateRoute = ({ children }) => {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <LoadingScreen />
  return session ? children : <Navigate to="/login" replace />
}

// 🔴 修改版 AdminRoute：包含 VIP 白名單檢查
const AdminRoute = ({ children }) => {
  const [session, setSession] = useState(null)
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  // 👑 緊急恢復：路由層級的白名單
  const VIP_EMAILS = [
      'marco1104@gmail.com', 
      'mark780502@gmail.com',
      'pianopub1130@gmail.com'
  ]

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
          setLoading(false)
          return 
      }
      setSession(session)

      // 1. 先查白名單 (最快)
      if (VIP_EMAILS.includes(session.user.email)) {
          setAuthorized(true)
          setLoading(false)
          return
      }

      // 2. 再查資料庫
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()
      
      if (data?.role === 'SUPER_ADMIN' || data?.role === 'EVENT_MANAGER') {
          setAuthorized(true)
      }
      setLoading(false)
    }
    checkAdmin()
  }, [])

  if (loading) return <LoadingScreen />
  
  if (!session) return <Navigate to="/login" replace />
  return authorized ? children : <Navigate to="/home" replace />
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<PrivateRoute><UserLayout><Home /></UserLayout></PrivateRoute>} />
          
          <Route path="/admin/dashboard" element={<AdminRoute><AdminLayout><DashboardHome /></AdminLayout></AdminRoute>} />
          <Route path="/admin/events" element={<AdminRoute><AdminLayout><EventManagement /></AdminLayout></AdminRoute>} />
          <Route path="/admin/users" element={<AdminRoute><AdminLayout><MemberCRM /></AdminLayout></AdminRoute>} />
          <Route path="/admin/import" element={<AdminRoute><AdminLayout><DataImportCenter /></AdminLayout></AdminRoute>} />
          <Route path="/admin/permissions" element={<AdminRoute><AdminLayout><UserPermission /></AdminLayout></AdminRoute>} />
          <Route path="/admin/logs" element={<AdminRoute><AdminLayout><SystemLogs /></AdminLayout></AdminRoute>} />

          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App