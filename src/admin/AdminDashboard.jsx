import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
// 🟢 修正：往上一層即可找到 supabaseClient
import { supabase } from '../supabaseClient' 
import { LayoutDashboard, FileText, Settings, LogOut, Plus, Upload, AlertTriangle, Activity, HardDrive, Server, Home, Shield } from 'lucide-react'

// 引入同一層的子頁面
import EventManagement from './EventManagement'
import SystemLogs from './SystemLogs' 
import UserPermission from './UserPermission'

// --- 1. 儀表板首頁元件 (Dashboard Home) ---
function AdminHome() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ users: 0, events: 0, registrations: 0, errors: 0 })
  const [dbUsage, setDbUsage] = useState(0)

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    const { data } = await supabase.from('system_stats').select('*').single()
    if (data) {
      setStats({
        users: data.total_users || 0,
        events: data.total_events || 0,
        registrations: data.total_registrations || 0,
        errors: data.total_errors || 0
      })
      const totalRows = (data.total_users || 0) + (data.total_events || 0) + (data.total_registrations || 0)
      const estimatedMB = (totalRows * 0.002)
      setDbUsage(Math.min(100, (estimatedMB / 500) * 100)) 
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* A. 歡迎與快速連結卡片 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-gradient-to-br from-[#0f172a] to-[#1e293b] rounded-2xl p-8 text-white shadow-2xl relative overflow-hidden border border-slate-700">
          <div className="relative z-10">
            <h2 className="text-3xl font-black mb-2 tracking-tight">COMMAND CENTER <span className="text-blue-500">v10.0</span></h2>
            <p className="text-slate-400 mb-8 max-w-lg">系統運作正常。您目前擁有最高權限 (God Mode)。</p>
            
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => navigate('/admin/events')} 
                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold flex items-center transition-all shadow-lg shadow-blue-900/50 hover:-translate-y-1"
              >
                <Plus size={18} className="mr-2"/> 新增賽事
              </button>
              <button 
                onClick={() => navigate('/admin/import')} 
                className="bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-bold flex items-center transition-all border border-slate-600 hover:-translate-y-1"
              >
                <Upload size={18} className="mr-2"/> 資料匯入
              </button>
            </div>
          </div>
          <Activity className="absolute right-0 bottom-0 text-blue-500 opacity-10 w-80 h-80 -mr-16 -mb-16"/>
        </div>

        {/* B. 待處理異常 */}
        <div 
          onClick={() => navigate('/admin/logs')} 
          className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 flex flex-col justify-between cursor-pointer hover:border-red-300 hover:shadow-md transition-all group"
        >
           <div className="flex justify-between items-start">
             <div>
               <p className="text-gray-500 text-xs font-black uppercase tracking-widest">SYSTEM ALERT</p>
               <h3 className={`text-5xl font-black mt-2 ${stats.errors > 0 ? 'text-red-600' : 'text-green-500'}`}>{stats.errors}</h3>
               <p className="text-sm font-bold text-gray-800 mt-1">待處理異常</p>
             </div>
             <div className={`p-4 rounded-full ${stats.errors > 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
               <AlertTriangle size={32}/>
             </div>
           </div>
           <div className="mt-4 pt-4 border-t border-gray-100">
             <p className="text-xs text-gray-400 group-hover:text-red-600 transition-colors flex items-center font-bold">
               進入異常處理中心 <span className="ml-1">→</span>
             </p>
           </div>
        </div>
      </div>

      {/* C. 資源監控 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
           <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
             <HardDrive size={20} className="mr-2 text-blue-600"/> Resource Monitor (Free Tier)
           </h3>
           <div className="space-y-6">
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-gray-600">DATABASE STORAGE (Supabase)</span>
                  <span className={dbUsage > 80 ? 'text-red-600' : 'text-blue-600'}>{dbUsage.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${dbUsage > 80 ? 'bg-red-500' : 'bg-blue-600'}`} 
                    style={{ width: `${Math.max(dbUsage, 2)}%` }} 
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className="text-gray-600">GOOGLE SHEETS API QUOTA</span>
                  <span className="text-green-600">SAFE</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: '5%' }}></div>
                </div>
              </div>
           </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
           <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
             <Server size={20} className="mr-2 text-purple-600"/> Traffic & SEO Stats
           </h3>
           <div className="grid grid-cols-2 gap-4">
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-100">
                 <p className="text-xs text-purple-600 font-bold uppercase">Total Users</p>
                 <p className="text-2xl font-black text-purple-900">{stats.users}</p>
              </div>
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                 <p className="text-xs text-blue-600 font-bold uppercase">Registrations</p>
                 <p className="text-2xl font-black text-blue-900">{stats.registrations}</p>
              </div>
           </div>
           <div className="mt-4 text-xs text-gray-400 font-mono">
             <div>Google Analytics: <span className="text-green-500">Active</span></div>
             <div>SEO Indexing: <span className="text-green-500">Good</span></div>
           </div>
        </div>
      </div>
    </div>
  )
}

// --- 2. 主框架 (Sidebar + Layout) ---
export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()

  const MENU_ITEMS = [
    { icon: LayoutDashboard, label: '戰情儀表板', path: '/admin' },
    { icon: FileText, label: '賽事管理', path: '/admin/events' },
    { icon: Settings, label: '權限設定 (IAM)', path: '/admin/permissions' },
    { icon: AlertTriangle, label: '系統日誌', path: '/admin/logs' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const currentTitle = MENU_ITEMS.find(i => i.path === location.pathname)?.label || '管理後台'

  return (
    <div className="flex min-h-screen bg-[#f1f5f9] font-sans">
      <aside className="w-72 bg-[#0f172a] text-white flex flex-col fixed h-full z-20 shadow-2xl">
        <div className="p-8 border-b border-slate-800">
          <h1 className="text-2xl font-black tracking-widest text-white">IRON<span className="text-blue-500">ERP</span></h1>
          <p className="text-xs text-slate-500 mt-1 tracking-wider">ENTERPRISE EDITION</p>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          {MENU_ITEMS.map((item) => {
             const isActive = location.pathname === item.path || (item.path !== '/admin' && location.pathname.startsWith(item.path))
             return (
              <button 
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`w-full flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 translate-x-1' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon size={20} className={`mr-4 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}/>
                <span className="font-bold text-sm tracking-wide">{item.label}</span>
              </button>
             )
          })}
        </nav>

        <div className="p-6 border-t border-slate-800 space-y-3">
           <button onClick={() => navigate('/')} className="w-full bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-xl text-xs font-bold flex justify-center items-center transition-colors border border-slate-700">
             <Home size={14} className="mr-2" /> 回前台官網
           </button>
           <button onClick={handleLogout} className="w-full text-red-400 hover:text-red-300 py-2 text-xs font-bold flex justify-center items-center transition-colors">
             <LogOut size={14} className="mr-2"/> 安全登出
           </button>
        </div>
      </aside>

      <main className="flex-1 ml-72 p-10 overflow-y-auto h-screen custom-scrollbar">
        <header className="flex justify-between items-center mb-10">
           <div>
             <h2 className="text-2xl font-black text-gray-800 flex items-center">{currentTitle}</h2>
             <p className="text-sm text-gray-400 mt-1 font-mono">{new Date().toLocaleDateString()}</p>
           </div>
           
           <div className="flex items-center bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
             <div className="text-right mr-3">
               <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider">ADMINISTRATOR</div>
               <div className="text-sm font-bold text-gray-800">God Mode</div>
             </div>
             <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center font-bold shadow-md">
               <Shield size={18} />
             </div>
           </div>
        </header>

        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/events" element={<EventManagement />} />
          <Route path="/logs" element={<SystemLogs />} />
          <Route path="/permissions" element={<UserPermission />} />
          <Route path="*" element={<div className="text-center py-20 text-gray-400">模組建置中...</div>} />
        </Routes>
      </main>
    </div>
  )
}