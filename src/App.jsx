import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Loader2, X } from 'lucide-react'

// 🌟 引入 PWA 註冊與自動更新監聽模組 (Service Worker)
import { useRegisterSW } from 'virtual:pwa-register/react'

import Login from "./pages/Login";
import AdminLayout from './layouts/AdminLayout'
import MemberCRM from './admin/MemberCRM'
import Dashboard from './admin/Dashboard'
import SystemStatus from './admin/SystemStatus'
import DataImportCenter from './admin/DataImportCenter' 
import RaceEvents from './pages/RaceEvents' 
import RaceDetail from './pages/RaceDetail' 
import RaceBuilder from './admin/RaceBuilder' 
import RaceManager from './admin/RaceManager' 
import DigitalID from './pages/DigitalID'

// 🌟 定義四大後台通行權限
const VALID_ADMIN_ROLES = ['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'RACE_ADMIN', 'ADMIN'];

const AdminRoute = ({ children, requiredRole = 'ANY_ADMIN' }) => {
  const [authStatus, setAuthStatus] = useState('LOADING') 

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !user.email) {
        setAuthStatus('DENIED')
        return
      }
      
      try {
          const { data } = await supabase.from('profiles').select('role').eq('email', user.email.toLowerCase()).maybeSingle()
          const userRole = data?.role?.toUpperCase() || 'USER'
          
          // 嚴格判斷 SUPER_ADMIN 專屬路由
          if (requiredRole === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
              setAuthStatus('DENIED') 
          } 
          // 只要符合四大管理員名稱之一，就放行進入一般後台
          else if (VALID_ADMIN_ROLES.includes(userRole)) {
              setAuthStatus('AUTHORIZED')
          } 
          else {
              setAuthStatus('DENIED')
          }
      } catch (error) {
          console.error("查無管理員權限:", error)
          setAuthStatus('DENIED')
      }
    }
    checkAdmin()
  }, [requiredRole])

  if (authStatus === 'LOADING') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={48}/></div>
  }

  if (authStatus === 'DENIED') {
    return <Navigate to="/races" replace />
  }

  return children
}

function App() {
  // 🌟 PWA 版本更新監聽邏輯
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('🚀 PWA Service Worker 已成功註冊:', r)
    },
    onRegisterError(error) {
      console.error('❌ PWA Service Worker 註冊失敗:', error)
    },
  })

  return (
    <BrowserRouter>
      {/* 🌟 PWA 更新提示橫幅 (絕對定位，不影響排版，平時隱藏，有新版本才會跳出) */}
      {needRefresh && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-bounce-in">
            <div>
                <h4 className="font-black text-sm mb-0.5">系統已發布新版本！</h4>
                <p className="text-[10px] text-slate-400 font-medium">點擊更新以獲取最順暢的系統體驗。</p>
            </div>
            <button 
                onClick={() => updateServiceWorker(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors shadow-md active:scale-95"
            >
                立即更新
            </button>
            <button onClick={() => setNeedRefresh(false)} className="text-slate-400 hover:text-white p-1 ml-1 transition-colors">
                <X size={16}/>
            </button>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        
        <Route path="/races" element={<RaceEvents />} />
        <Route path="/race-detail/:id" element={<RaceDetail />} />
        <Route path="/my-id" element={<DigitalID />} />
        
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<MemberCRM />} />
          <Route path="races" element={<RaceManager />} />        
          <Route path="race-builder" element={<RaceBuilder />} /> 
          <Route path="import" element={<DataImportCenter />} />
          
          {/* 🌟 絕對禁區：只有 SUPER_ADMIN 才能進系統伺服器監控 */}
          <Route path="system-status" element={<AdminRoute requiredRole="SUPER_ADMIN"><SystemStatus /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App