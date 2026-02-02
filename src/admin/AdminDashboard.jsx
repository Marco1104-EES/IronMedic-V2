import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient' 
import { VIP_ROSTER, DEFAULT_USER } from '../constants/roleConfig'
// 🟢 修正：補上 RefreshCw 和 Ban
import { LayoutDashboard, FileText, Settings, LogOut, Upload, AlertTriangle, Users, Home, Menu, ShieldAlert, RefreshCw, Ban } from 'lucide-react'

import DashboardHome from './DashboardHome' 
import EventManagement from './EventManagement'
import SystemLogs from './SystemLogs' 
import UserPermission from './UserPermission'
import DataImportCenter from './DataImportCenter'
import MemberCRM from './MemberCRM'

function Sidebar({ menuItems, currentPath, onNavigate, onLogout }) {
  return (
    <aside className="w-64 bg-[#0f172a] text-white flex flex-col fixed h-full z-20 shadow-2xl border-r border-slate-800">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-[#020617]">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
              <span className="text-white font-black text-lg">I</span>
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white leading-none">IRON MEDIC</h1>
              <p className="text-[10px] text-blue-400 font-bold tracking-widest mt-0.5">後臺管理系統</p>
            </div>
        </div>
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
            {menuItems.map((item) => {
              const isActive = currentPath === item.path || (item.path === '/admin' && currentPath === '/admin/')
              return (
                <button 
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`w-full flex items-center px-3 py-3 rounded-lg transition-all duration-200 group mb-1 ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
                >
                  <item.icon size={18} className={`mr-3 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}/>
                  <span className="font-bold text-sm tracking-wide">{item.label}</span>
                </button>
              )
            })}
        </nav>
        <div className="p-4 border-t border-slate-800 bg-[#020617]">
           <button onClick={() => onNavigate('/home')} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg text-xs font-bold flex justify-center items-center transition-colors mb-2 border border-slate-700"><Home size={14} className="mr-2" /> 返回前台官網</button>
           <button onClick={onLogout} className="w-full text-red-400 hover:bg-red-900/20 hover:text-red-300 py-2 text-xs font-bold flex justify-center items-center rounded-lg transition-colors border border-transparent hover:border-red-900/30"><LogOut size={14} className="mr-2"/> 安全登出</button>
        </div>
      </aside>
  )
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { navigate('/login'); return; }
        
        const user = session.user;
        setCurrentUser(user);
        
        // 🔥 權限檢查
        const isVIP = ['marco1104@gmail.com', 'mark780502@gmail.com'].includes(user.email);
        if (isVIP) {
            setIsAuthorized(true);
        } else {
            // 延遲踢人
            setTimeout(() => navigate('/home'), 100);
        }
        setLoading(false);
    }
    checkAuth()
  }, [navigate])

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/login'); }

  const MENU_ITEMS = [
    { icon: LayoutDashboard, label: '營運總覽', path: '/admin' },
    { icon: FileText, label: '賽事管理', path: '/admin/events' },
    { icon: Users, label: '會員資訊中心', path: '/admin/users' },
    { icon: Upload, label: '資料匯入中心', path: '/admin/import' },
    { icon: Settings, label: '權限設定 (IAM)', path: '/admin/permissions' },
    { icon: AlertTriangle, label: '系統日誌', path: '/admin/logs' },
  ]

  const userRoleConfig = currentUser ? (VIP_ROSTER[currentUser.email] || DEFAULT_USER) : DEFAULT_USER;
  const currentTitle = MENU_ITEMS.find(i => i.path === location.pathname)?.label || '營運總覽'

  if (loading) return (
      <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center text-white font-bold">
          <RefreshCw className="animate-spin mb-4 text-blue-500" size={40}/>
          <p>VERIFYING CLEARANCE...</p>
      </div>
  )

  if (!isAuthorized) {
      return (
        <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center text-red-800 p-4">
            <ShieldAlert size={64} className="mb-4"/>
            <h1 className="text-3xl font-black">ACCESS DENIED</h1>
        </div>
      )
  }

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans">
      <Sidebar menuItems={MENU_ITEMS} currentPath={location.pathname} onNavigate={navigate} onLogout={handleLogout} />
      <main className="flex-1 ml-64 p-8 overflow-y-auto h-screen custom-scrollbar">
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-slate-200 sticky top-0 z-10">
           <div className="flex items-center">
             <div className="mr-4 md:hidden"><Menu size={24} className="text-gray-500"/></div>
             <div>
               <h2 className="text-xl font-black text-slate-800 flex items-center tracking-tight">{currentTitle}</h2>
               <div className="flex items-center text-[10px] text-slate-400 mt-1 font-mono font-bold uppercase"><span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2 animate-pulse"></span>System Online</div>
             </div>
           </div>
           <div className="flex items-center gap-4">
             <div className="text-right mr-2 hidden sm:block">
               <div className={`text-[10px] font-black uppercase tracking-wider ${userRoleConfig.color}`}>{userRoleConfig.rank}</div>
               <div className="text-sm font-bold text-slate-700">{userRoleConfig.label}</div>
             </div>
             <div className={`w-10 h-10 rounded-lg text-white flex items-center justify-center font-bold shadow-md ring-2 ring-white text-sm ${userRoleConfig.bg}`}>{(currentUser?.email?.[0] || 'U').toUpperCase()}</div>
           </div>
        </header>
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/events" element={<EventManagement />} />
          <Route path="/logs" element={<SystemLogs />} />
          <Route path="/permissions" element={<UserPermission />} />
          <Route path="/users" element={<MemberCRM />} />
          <Route path="/import" element={<DataImportCenter />} />
          <Route path="*" element={<div className="text-center py-20 text-gray-400">模組建設中...</div>} />
        </Routes>
      </main>
    </div>
  )
}