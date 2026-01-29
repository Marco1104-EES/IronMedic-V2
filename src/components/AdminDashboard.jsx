import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom' // 引入 Link
import { supabase } from '../supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line 
} from 'recharts'
import { 
  LayoutDashboard, Users, Database, LogOut, Menu, Calendar, Settings, 
  Home, TrendingUp, Activity, AlertCircle
} from 'lucide-react'

import BulkImport from './BulkImport'
import MemberCRM from './MemberCRM'

// --- 內部元件: 儀表板首頁 (DashboardHome) ---
function DashboardHome() {
  // 假數據：營收趨勢 (讓畫面看起來專業)
  const revenueData = [
    { name: '1月', 營收: 4000, 報名: 240 },
    { name: '2月', 營收: 3000, 報名: 139 },
    { name: '3月', 營收: 2000, 報名: 980 },
    { name: '4月', 營收: 2780, 報名: 390 },
    { name: '5月', 營收: 1890, 報名: 480 },
    { name: '6月', 營收: 2390, 報名: 380 },
  ]

  const stats = [
    { title: '總會員數', value: '1,280', change: '+12%', sub: '較上月增加', color: 'bg-blue-500', icon: Users },
    { title: '本月營收', value: 'NT$ 452k', change: '+5.4%', sub: '目標達成率 85%', color: 'bg-green-500', icon: TrendingUp },
    { title: '進行中賽事', value: '3', change: '持平', sub: '下場賽事: 4/18', color: 'bg-purple-500', icon: Calendar },
    { title: '待處理異常', value: '15', change: '-2', sub: '需人工審核', color: 'bg-orange-500', icon: AlertCircle },
  ]

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      
      {/* 1. 數據卡片區 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="flex justify-between items-start z-10 relative">
              <div>
                <p className="text-sm text-gray-500 font-medium mb-1">{stat.title}</p>
                <h3 className="text-3xl font-bold text-gray-800 tracking-tight">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10 text-${stat.color.split('-')[1]}-600`}>
                <stat.icon size={24} />
              </div>
            </div>
            <div className="mt-4 flex items-center text-sm">
              <span className={`font-bold ${stat.change.startsWith('+') ? 'text-green-600' : 'text-red-500'}`}>
                {stat.change}
              </span>
              <span className="text-gray-400 ml-2">{stat.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 2. 圖表區 (左大右小) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-96">
        {/* 左側：營收趨勢圖 */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center">
            <Activity size={20} className="mr-2 text-blue-600"/> 年度報名與營收趨勢
          </h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="報名" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                <Bar dataKey="營收" fill="#10b981" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 右側：近期動態 (Log Stream) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
          <h3 className="font-bold text-gray-800 mb-4">系統即時動態</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">
            {[1,2,3,4,5].map((i) => (
              <div key={i} className="flex items-start pb-3 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 mt-2 rounded-full bg-blue-500 mr-3 flex-shrink-0"></div>
                <div>
                  <p className="text-sm text-gray-800 font-medium">王小明 報名了 "2026 金門馬拉松"</p>
                  <p className="text-xs text-gray-400 mt-1">10 分鐘前 • IP 192.168.1.X</p>
                </div>
              </div>
            ))}
            <div className="flex items-start pb-3 border-b border-gray-50">
              <div className="w-2 h-2 mt-2 rounded-full bg-red-500 mr-3 flex-shrink-0"></div>
              <div>
                <p className="text-sm text-gray-800 font-medium">系統警告：匯入資料格式錯誤</p>
                <p className="text-xs text-gray-400 mt-1">2 小時前 • 匯入中心</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// --- 主程式: 後台框架 ---
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [loading, setLoading] = useState(true)
  const [adminProfile, setAdminProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    // 🔓 上帝模式 (God Mode)
    const { data: { user } } = await supabase.auth.getUser()
    setAdminProfile({
      id: user?.id || 'god-id',
      full_name: '最高指揮官 (God Mode)', 
      role: 'super_admin'
    })
    setLoading(false) 
  }

  const handleLogout = async () => {
    if (window.confirm('確定要登出管理系統嗎？')) {
      await supabase.auth.signOut()
      navigate('/login')
    }
  }

  const menuItems = [
    { id: 'dashboard', icon: <LayoutDashboard size={20} />, label: '戰情儀表板' },
    { id: 'members', icon: <Users size={20} />, label: '會員戰情中心' },    
    { id: 'import', icon: <Database size={20} />, label: '資料匯入中心' },  
    { id: 'events', icon: <Calendar size={20} />, label: '賽事管理 (建置中)' }, 
    { id: 'settings', icon: <Settings size={20} />, label: '系統設定 (建置中)' }, 
  ]

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {/* 🔴 左側 Sidebar (專業深色系) */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-[#0f172a] text-slate-300 transition-all duration-300 flex flex-col shadow-2xl z-20`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 bg-[#020617] border-b border-slate-800">
          {isSidebarOpen ? (
            <span className="font-bold text-lg tracking-wider text-white">IRON ERP <span className="text-blue-500 text-xs align-top">v4.0</span></span>
          ) : (
            <span className="font-bold text-xl mx-auto text-blue-500">I</span>
          )}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-800 rounded">
            <Menu size={18} />
          </button>
        </div>

        {/* 導航選單 */}
        <nav className="flex-1 py-6 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center px-4 py-3 transition-all duration-200 border-l-4
                ${activeTab === item.id 
                  ? 'bg-slate-800 border-blue-500 text-white shadow-inner' 
                  : 'border-transparent hover:bg-slate-800 hover:text-white'}`}
            >
              <div className="min-w-[24px] flex justify-center">{item.icon}</div>
              {isSidebarOpen && <span className="ml-3 text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* 👇 關鍵新增：回到前台按鈕 */}
        <div className="px-4 py-2">
          <Link 
            to="/" 
            className={`flex items-center w-full px-4 py-3 rounded-lg bg-slate-800 text-blue-400 hover:bg-blue-600 hover:text-white transition-all group ${!isSidebarOpen && 'justify-center px-0'}`}
          >
            <Home size={20} className="group-hover:scale-110 transition-transform"/>
            {isSidebarOpen && <span className="ml-3 text-sm font-bold">回到前台官網</span>}
          </Link>
        </div>

        {/* 登出 */}
        <div className="p-4 border-t border-slate-800 bg-[#020617]">
          <button onClick={handleLogout} className="flex items-center justify-center w-full px-2 py-2 text-red-400 hover:bg-red-900/20 rounded transition-colors">
            <LogOut size={20} />
            {isSidebarOpen && <span className="ml-3 text-sm">安全登出</span>}
          </button>
        </div>
      </aside>

      {/* 🔵 右側內容 */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center px-8 justify-between z-10">
          <h2 className="text-xl font-bold text-gray-800 flex items-center">
            {menuItems.find(i => i.id === activeTab)?.label}
          </h2>
          <div className="flex items-center space-x-4">
             <div className="text-right hidden md:block">
               <div className="text-sm font-bold text-gray-700">{adminProfile?.full_name}</div>
               <div className="text-xs text-blue-600 bg-blue-50 px-2 rounded-full inline-block border border-blue-100">Super Admin</div>
             </div>
             <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold">
               {adminProfile?.full_name?.[0] || 'A'}
             </div>
          </div>
        </header>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'dashboard' && <DashboardHome />}
            {activeTab === 'members' && <MemberCRM />}
            {activeTab === 'import' && <BulkImport />}
            {/* 其他 Tab 內容... */}
          </div>
        </div>
      </main>
    </div>
  )
}