import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// 🏗️ Layouts
import AdminLayout from './layouts/AdminLayout' 
import UserLayout from './layouts/UserLayout'   

// 📄 Pages (已移除 UserProfile)
import Login from './pages/Login'        
import Home from './pages/Home'          

// 🛡️ Admin Modules
import DashboardHome from './admin/DashboardHome'
import EventManagement from './admin/EventManagement'
import MemberCRM from './admin/MemberCRM'           
import DataImportCenter from './admin/DataImportCenter' 
import UserPermission from './admin/UserPermission' 
import SystemLogs from './admin/SystemLogs'         

const LoadingScreen = () => (
  <div className="min-h-screen bg-[#020617] flex items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
          {/* 1. 登入 */}
          <Route path="/login" element={<Login />} />
          
          {/* 2. 前台 (只剩首頁) */}
          <Route path="/home" element={
            <PrivateRoute>
              <UserLayout>
                <Home />
              </UserLayout>
            </PrivateRoute>
          } />
          
          {/* 3. 後台戰情室 */}
          <Route path="/admin/dashboard" element={
            <PrivateRoute>
              <AdminLayout>
                <DashboardHome />
              </AdminLayout>
            </PrivateRoute>
          } />

          <Route path="/admin/events" element={
            <PrivateRoute>
              <AdminLayout>
                <EventManagement />
              </AdminLayout>
            </PrivateRoute>
          } />

          <Route path="/admin/users" element={
            <PrivateRoute>
              <AdminLayout>
                <MemberCRM />
              </AdminLayout>
            </PrivateRoute>
          } />

          <Route path="/admin/import" element={
            <PrivateRoute>
              <AdminLayout>
                <DataImportCenter />
              </AdminLayout>
            </PrivateRoute>
          } />

          <Route path="/admin/permissions" element={
            <PrivateRoute>
              <AdminLayout>
                <UserPermission />
              </AdminLayout>
            </PrivateRoute>
          } />

          <Route path="/admin/logs" element={
            <PrivateRoute>
              <AdminLayout>
                <SystemLogs />
              </AdminLayout>
            </PrivateRoute>
          } />

          {/* 導向邏輯 */}
          <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/home" replace />} />
          {/* 任何未定義路徑 (包含原本的 /profile) 都會被踢回首頁 */}
          <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App