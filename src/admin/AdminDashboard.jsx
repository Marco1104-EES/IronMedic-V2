import { useState, useEffect } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabaseClient' 

// 🟢 修正：補齊所有漏掉的圖示 (Server, HardDrive, Home)
import { 
  LayoutDashboard, FileText, Settings, LogOut, Plus, Upload, AlertTriangle, 
  Activity, Database, Users, Globe, Zap, Clock, Shield, UserCog, User, Home,
  Server, HardDrive 
} from 'lucide-react'

// 圖表引擎
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

// 子頁面引入
import EventManagement from './EventManagement'
import SystemLogs from './SystemLogs' 
import UserPermission from './UserPermission'
import DataImportCenter from './DataImportCenter'
import MemberCRM from './MemberCRM'

// --- 模擬數據 ---
const MOCK_DB_STATS = [
  { name: '00:00', requests: 40, auth: 2 },
  { name: '04:00', requests: 30, auth: 1 },
  { name: '08:00', requests: 120, auth: 15 },
  { name: '12:00', requests: 200, auth: 45 },
  { name: '16:00', requests: 180, auth: 30 },
  { name: '20:00', requests: 90, auth: 10 },
  { name: '23:59', requests: 50, auth: 5 },
];

const MOCK_YEARLY_STATS = {
  '2026': { users: 908, events: 12, revenue: 150000, growth: '+15%' },
  '2025': { users: 750, events: 10, revenue: 120000, growth: '+8%' },
  '2024': { users: 500, events: 8, revenue: 80000, growth: '+5%' },
  '2023': { users: 200, events: 4, revenue: 30000, growth: 'N/A' },
};

// --- 1. 戰情首頁元件 ---
function AdminHome() {
  const navigate = useNavigate()
  const [stats, setStats] = useState({ users: 0, events: 0, registrations: 0, errors: 0 })
  const [selectedYear, setSelectedYear] = useState('2026')
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
      setDbUsage(Math.min(100, (totalRows * 0.002 / 500) * 100)) 
    }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* A. 頂級狀態列 */}
      <div className="flex flex-col md:flex-row gap-4 mb-2">
        <div className="flex-1 bg-slate-900 rounded-xl p-4 border-l-4 border-green-500 shadow-lg flex items-center justify-between">
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">系統狀態 (SYSTEM)</p>
             <h2 className="text-white text-xl font-black tracking-tight">OPERATIONAL</h2>
           </div>
           <Activity className="text-green-500 animate-pulse" size={30} />
        </div>
        <div className="flex-1 bg-slate-900 rounded-xl p-4 border-l-4 border-blue-500 shadow-lg flex items-center justify-between">
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">戰略年度 (YEAR)</p>
             <div className="flex gap-2 mt-1">
                {['2026','2025','2024','2023'].map(yr => (
                  <button 
                    key={yr} 
                    onClick={() => setSelectedYear(yr)}
                    className={`text-xs px-2 py-1 rounded font-bold transition-all ${selectedYear === yr ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-500 hover:text-white'}`}
                  >
                    {yr}
                  </button>
                ))}
             </div>
           </div>
           <Clock size={30} className="text-blue-500" />
        </div>
        <div className="flex-1 bg-slate-900 rounded-xl p-4 border-l-4 border-purple-500 shadow-lg flex items-center justify-between">
           <div>
             <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">DB 負載 (LOAD)</p>
             <h2 className="text-white text-xl font-black tracking-tight">{dbUsage.toFixed(2)}%</h2>
           </div>
           <Database className="text-purple-500" size={30} />
        </div>
      </div>

      {/* B. 核心圖表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
           <div className="flex justify-between items-center mb-6">
             <h3 className="text-white font-bold flex items-center">
               <Zap size={18} className="mr-2 text-green-400"/> Database Requests
             </h3>
             <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded">24 Hours</span>
           </div>
           <div className="h-64 w-full">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={MOCK_DB_STATS}>
                 <defs>
                   <linearGradient id="colorRequests" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                     <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false}/>
                 <XAxis dataKey="name" stroke="#94a3b8" tick={{fontSize: 12}}/>
                 <YAxis stroke="#94a3b8" tick={{fontSize: 12}}/>
                 <Tooltip contentStyle={{backgroundColor: '#1e293b', border: 'none', color: '#fff'}}/>
                 <Area type="monotone" dataKey="requests" stroke="#22c55e" strokeWidth={2} fillOpacity={1} fill="url(#colorRequests)" />
               </AreaChart>
             </ResponsiveContainer>
           </div>
        </div>

        <div className="grid grid-cols-1 gap-6">
           <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl flex flex-col justify-center">
              <div className="flex justify-between items-center mb-4">
                 <h3 className="text-white font-bold flex items-center"><Shield size={18} className="mr-2 text-green-400"/> Auth Transactions</h3>
                 <span className="text-green-400 font-mono text-xl font-bold">Health: 100%</span>
              </div>
              <div className="h-24 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={MOCK_DB_STATS}>
                    <Bar dataKey="auth" fill="#22c55e" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
           </div>

           <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-xl">
              <h3 className="text-white font-bold flex items-center mb-4"><Server size={18} className="mr-2 text-blue-400"/> {selectedYear} 戰略分析</h3>
              <div className="grid grid-cols-3 gap-4 text-center">
                 <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-slate-400 text-xs">會員數</p>
                    <p className="text-white text-xl font-bold">{MOCK_YEARLY_STATS[selectedYear]?.users || stats.users}</p>
                 </div>
                 <div className="bg-slate-800 p-3 rounded-lg">
                    <p className="text-slate-400 text-xs">舉辦賽事</p>
                    <p className="text-white text-xl font-bold">{MOCK_YEARLY_STATS[selectedYear]?.events || stats.events}</p>
                 </div>
                 <div className="bg-slate-800 p-3 rounded-lg border border-green-500/30">
                    <p className="text-green-400 text-xs">成長率</p>
                    <p className="text-green-400 text-xl font-bold">{MOCK_YEARLY_STATS[selectedYear]?.growth || '-'}</p>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* C. SEO 與流量情報 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
         <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-gray-800 flex items-center">
              <Globe size={20} className="mr-2 text-blue-600"/> SEO & Traffic Intelligence
            </h3>
            <button className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-bold hover:bg-blue-100">查看報表</button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
               <p className="text-xs text-gray-500 font-bold">SEO HEALTH</p>
               <div className="mt-2 flex items-end">
                  <span className="text-3xl font-black text-gray-800">92</span>
                  <span className="text-sm text-green-500 font-bold mb-1 ml-2">優異</span>
               </div>
               <div className="w-full bg-gray-200 h-1.5 mt-2 rounded-full"><div className="bg-green-500 h-1.5 rounded-full" style={{width: '92%'}}></div></div>
            </div>
            
            {/* 這裡使用了 HardDrive 做裝飾 */}
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
               <div className="flex justify-between items-start">
                 <p className="text-xs text-gray-500 font-bold">RESOURCE LIMIT</p>
                 <HardDrive size={14} className="text-gray-400"/>
               </div>
               <div className="mt-2 flex items-end">
                  <span className="text-3xl font-black text-gray-800">0.4%</span>
                  <span className="text-sm text-green-500 font-bold mb-1 ml-2">SAFE</span>
               </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
               <p className="text-xs text-gray-500 font-bold">RANKING</p>
               <div className="mt-2 flex items-end">
                  <span className="text-3xl font-black text-gray-800">8.4</span>
                  <span className="text-sm text-blue-500 font-bold mb-1 ml-2">-0.2</span>
               </div>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
               <p className="text-xs text-gray-500 font-bold">REGISTRATIONS</p>
               <div className="mt-2 flex items-end">
                  <span className="text-3xl font-black text-blue-600">{stats.registrations}</span>
                  <span className="text-sm text-gray-400 font-bold mb-1 ml-2">Total</span>
               </div>
            </div>
         </div>
      </div>

    </div>
  )
}

// --- 2. 艦長側邊欄 ---
function Sidebar({ menuItems, currentPath, onNavigate, onLogout }) {
  const MENU_GROUPS = [
    {
      title: "戰情指揮 (COMMAND)",
      items: [
        menuItems.find(i => i.path === '/admin') 
      ]
    },
    {
      title: "賽事作戰 (OPERATIONS)",
      items: [
        menuItems.find(i => i.path === '/admin/events') 
      ]
    },
    {
      title: "人員情報 (INTELLIGENCE)",
      items: [
        menuItems.find(i => i.path === '/admin/users') 
      ]
    },
    {
      title: "系統核心 (SYSTEM)",
      items: [
        menuItems.find(i => i.path === '/admin/import'), 
        menuItems.find(i => i.path === '/admin/permissions'), 
        menuItems.find(i => i.path === '/admin/logs') 
      ]
    }
  ]

  return (
    <aside className="w-72 bg-[#020617] text-white flex flex-col fixed h-full z-20 shadow-2xl border-r border-slate-800">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
              <span className="font-black text-xl">I</span>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wider text-white leading-none">IRON MEDIC</h1>
              <p className="text-[10px] text-blue-400 mt-1 tracking-widest font-mono">NUCLEAR CLASS v14.2</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-6 overflow-y-auto custom-scrollbar">
          {MENU_GROUPS.map((group, idx) => (
            <div key={idx}>
              <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-2">{group.title}</h4>
              <div className="space-y-1">
                {group.items.filter(Boolean).map((item) => {
                  const isActive = currentPath === item.path
                  return (
                    <button 
                      key={item.path}
                      onClick={() => onNavigate(item.path)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
                    >
                      <div className="flex items-center">
                        <item.icon size={18} className={`mr-3 ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}`}/>
                        <span className="font-medium text-sm tracking-wide">{item.label}</span>
                      </div>
                      {isActive && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800 bg-slate-900/50">
           <button onClick={() => onNavigate('/')} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-lg text-xs font-bold flex justify-center items-center transition-colors mb-2 border border-slate-700">
             <Home size={14} className="mr-2" /> 返回前台官網
           </button>
           <button onClick={onLogout} className="w-full text-red-400 hover:bg-red-500/10 hover:text-red-300 py-2 text-xs font-bold flex justify-center items-center rounded-lg transition-colors">
             <LogOut size={14} className="mr-2"/> 安全登出系統
           </button>
        </div>
      </aside>
  )
}

// --- 3. 主 Layout ---
export default function AdminDashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const [viewRole, setViewRole] = useState('god')

  // 定義路由與選單 (包含 CRM 與 Import)
  const BASE_MENU_ITEMS = [
    { icon: LayoutDashboard, label: '戰情總覽', path: '/admin' },
    { icon: FileText, label: '賽事管理', path: '/admin/events' },
    { icon: Users, label: '會員情報中心', path: '/admin/users' }, 
    { icon: Upload, label: '資料匯入中心', path: '/admin/import' },
    { icon: Settings, label: '權限設定 (IAM)', path: '/admin/permissions' },
    { icon: AlertTriangle, label: '系統日誌', path: '/admin/logs' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const currentTitle = BASE_MENU_ITEMS.find(i => i.path === location.pathname)?.label || '戰略指揮中心'

  return (
    <div className="flex min-h-screen bg-[#0f172a] font-sans">
      
      <Sidebar 
        menuItems={BASE_MENU_ITEMS} 
        currentPath={location.pathname} 
        onNavigate={navigate} 
        onLogout={handleLogout}
      />

      <main className="flex-1 ml-72 p-8 overflow-y-auto h-screen custom-scrollbar bg-[#f8fafc]">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-8 bg-white p-4 rounded-xl shadow-sm border border-gray-200 sticky top-0 z-10">
           <div className="flex items-center">
             <div>
               <h2 className="text-xl font-black text-gray-800 flex items-center">
                 {currentTitle}
               </h2>
               <div className="flex items-center text-xs text-gray-400 mt-1 font-mono">
                 <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></span>
                 SYSTEM ONLINE
               </div>
             </div>
           </div>
           
           <div className="flex items-center gap-4">
             {/* 視角切換器 */}
             <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                <span className="text-[10px] font-bold text-gray-400 uppercase mr-2 ml-2">模擬視角:</span>
                <button onClick={() => setViewRole('god')} className={`p-1.5 rounded-md transition-all ${viewRole === 'god' ? 'bg-white shadow text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}><Shield size={16} /></button>
                <button onClick={() => setViewRole('operator')} className={`p-1.5 rounded-md transition-all ${viewRole === 'operator' ? 'bg-white shadow text-green-600' : 'text-gray-400 hover:text-gray-600'}`}><UserCog size={16} /></button>
                <button onClick={() => setViewRole('user')} className={`p-1.5 rounded-md transition-all ${viewRole === 'user' ? 'bg-white shadow text-purple-600' : 'text-gray-400 hover:text-gray-600'}`}><User size={16} /></button>
             </div>

             <div className="text-right mr-2">
               <div className="text-[10px] text-blue-600 font-black uppercase tracking-wider">
                 {viewRole === 'god' ? 'COMMANDER' : viewRole === 'operator' ? 'OPERATOR' : 'MEMBER'}
               </div>
               <div className="text-sm font-bold text-gray-800">
                 {viewRole === 'god' ? 'God Mode' : viewRole === 'operator' ? 'Admin Staff' : 'User View'}
               </div>
             </div>
             
             <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold shadow-md ring-2 ring-white
                ${viewRole === 'god' ? 'bg-slate-900' : viewRole === 'operator' ? 'bg-green-600' : 'bg-purple-600'}
             `}>
                {viewRole === 'god' ? <Shield size={18}/> : viewRole === 'operator' ? <UserCog size={18}/> : <User size={18}/>}
             </div>
           </div>
        </header>

        <Routes>
          <Route path="/" element={<AdminHome />} />
          <Route path="/events" element={<EventManagement />} />
          <Route path="/logs" element={<SystemLogs />} />
          <Route path="/permissions" element={<UserPermission />} />
          <Route path="/users" element={<MemberCRM />} />
          <Route path="/import" element={<DataImportCenter />} />
          <Route path="*" element={<div className="text-center py-20 text-gray-400">該戰略模組建設中...</div>} />
        </Routes>
      </main>
    </div>
  )
}