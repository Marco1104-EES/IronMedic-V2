import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom' 
import { supabase } from '../supabaseClient'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts'
import { 
  LayoutDashboard, Users, Database, LogOut, Menu, Calendar, Settings, 
  Home, TrendingUp, Activity, AlertCircle, FileText, X
} from 'lucide-react'

import BulkImport from './BulkImport'
import MemberCRM from './MemberCRM'
import SystemLogs from './SystemLogs'

// --- DashboardHome (首頁內容) ---
function DashboardHome() {
  const revenueData = [
    { name: '1月', 營收: 4000, 報名: 240 }, { name: '2月', 營收: 3000, 報名: 139 },
    { name: '3月', 營收: 2000, 報名: 980 }, { name: '4月', 營收: 2780, 報名: 390 },
    { name: '5月', 營收: 1890, 報名: 480 }, { name: '6月', 營收: 2390, 報名: 380 },
  ]
  const stats = [
    { title: '總會員數', value: '1,280', change: '+12%', sub: '較上月增加', color: 'bg-blue-500', icon: Users },
    { title: '本月營收', value: 'NT$ 452k', change: '+5.4%', sub: '目標達成率 85%', color: 'bg-green-500', icon: TrendingUp },
    { title: '進行中賽事', value: '3', change: '持平', sub: '下場賽事: 4/18', color: 'bg-purple-500', icon: Calendar },
    { title: '待處理異常', value: '15', change: '-2', sub: '需人工審核', color: 'bg-orange-500', icon: AlertCircle },
  ]
  return (
    <div className="space-y-6 animate-fade-in pb-20 md:pb-10">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden group">
            <div className="flex justify-between items-start z-10 relative">
              <div><p className="text-sm text-gray-500 font-medium mb-1">{stat.title}</p><h3 className="text-3xl font-bold text-gray-800 tracking-tight">{stat.value}</h3></div>
              <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10 text-${stat.color.split('-')[1]}-600`}><stat.icon size={24} /></div>
            </div>
          </div>
        ))}
      </div>
      {/* 手機版圖表高度調整 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto md:h-96">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-80 md:h-auto">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center"><Activity size={20} className="mr-2 text-blue-600"/> 年度報名與營收趨勢</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%"><BarChart data={revenueData}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} /><YAxis axisLine={false} tickLine={false} /><Tooltip /><Bar dataKey="報名" fill="#3b82f6" radius={[4, 4, 0, 0]} /><Bar dataKey="營收" fill="#10b981" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex flex-col h-64 md:h-auto">
          <h3 className="font-bold text-gray-800 mb-4">系統即時動態</h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2">{[1,2,3].map(i=>(<div key={i} className="flex items-start pb-3 border-b border-gray-50"><div className="w-2 h-2 mt-2 rounded-full bg-blue-500 mr-3 flex-shrink-0"></div><div><p className="text-sm text-gray-800 font-medium">王小明 報名活動</p><p className="text-xs text-gray-400">10 分鐘前</p></div></div>))}</div>
        </div>
      </div>
    </div>
  )
}

// --- 主程式 (v5.0 RWD Fix) ---
export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard')
  // 📱 重點修改：預設直接判斷寬度，小於 768px 就設為 false (關閉)
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [loading, setLoading] = useState(true)
  const [adminProfile, setAdminProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    checkAdmin()
    const handleResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (!mobile) setSidebarOpen(true) // 電腦版：視窗變大就自動打開
      else setSidebarOpen(false)        // 手機版：視窗變小就自動關閉
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setAdminProfile({ id: user?.id || 'god-id', full_name: '最高指揮官 (God Mode)', role: 'super_admin' })
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
    { id: 'logs', icon: <FileText size={20} />, label: '系統作業日誌' },
    { id: 'events', icon: <Calendar size={20} />, label: '賽事管理 (建置中)' }, 
    { id: 'settings', icon: <Settings size={20} />, label: '系統設定 (建置中)' }, 
  ]

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardHome />
      case 'members': return <MemberCRM />
      case 'import': return <BulkImport />
      case 'logs': return <SystemLogs />
      default: return <div className="p-10 text-center text-gray-500">此功能模組建置中...</div>
    }
  }

  if (loading) return <div className="p-10 text-center">Loading...</div>

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans relative">
      
      {/* 📱 手機版遮罩 (Overlay) - 只有在手機且選單打開時才出現 */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 backdrop-blur-sm transition-opacity"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* 🔴 Sidebar (Fixed Position for Mobile) */}
      <aside className={`
        fixed md:static inset-y-0 left-0 z-50 
        bg-[#0f172a] text-slate-300 shadow-2xl transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isMobile ? 'w-72' : (isSidebarOpen ? 'w-64' : 'w-20')} 
        flex flex-col h-full
      `}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 bg-[#020617] border-b border-slate-800 shrink-0">
          {isSidebarOpen || isMobile ? (
            <span className="font-bold text-lg tracking-wider text-white">IRON ERP <span className="text-blue-500 text-xs">v5.1</span></span>
          ) : (
            <span className="font-bold text-xl mx-auto text-blue-500">I</span>
          )}
          {/* 手機版關閉按鈕 */}
          {isMobile && (
             <button onClick={() => setSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white bg-slate-800 rounded-lg"><X size={20}/></button>
          )}
        </div>

        {/* 選單 */}
        <nav className="flex-1 py-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id)
                if (isMobile) setSidebarOpen(false) // 手機版點擊後自動收合
              }}
              className={`w-full flex items-center px-4 py-3 transition-all duration-200 border-l-4
                ${activeTab === item.id 
                  ? 'bg-slate-800 border-blue-500 text-white shadow-inner' 
                  : 'border-transparent hover:bg-slate-800 hover:text-white'}`}
            >
              <div className="min-w-[24px] flex justify-center">{item.icon}</div>
              {(isSidebarOpen || isMobile) && <span className="ml-3 text-sm font-medium">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* 回首頁 */}
        <div className="px-4 py-2 shrink-0">
          <Link to="/" className="flex items-center w-full px-4 py-3 rounded-lg bg-slate-800 text-blue-400 hover:bg-blue-600 hover:text-white transition-all">
            <Home size={20} className="min-w-[20px]"/>
            {(isSidebarOpen || isMobile) && <span className="ml-3 text-sm font-bold">回到前台官網</span>}
          </Link>
        </div>
        
        {/* 登出 */}
        <div className="p-4 border-t border-slate-800 bg-[#020617] shrink-0">
          <button onClick={handleLogout} className="flex items-center justify-center w-full px-2 py-2 text-red-400 hover:bg-red-900/20 rounded">
            <LogOut size={20} />
            {(isSidebarOpen || isMobile) && <span className="ml-3 text-sm">安全登出</span>}
          </button>
        </div>
      </aside>

      {/* 🔵 右側內容區 */}
      <main className="flex-1 flex flex-col overflow-hidden relative w-full h-full">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center px-4 md:px-8 justify-between z-10 shrink-0">
          <div className="flex items-center">
            {/* 📱 手機版漢堡按鈕 */}
            <button 
              onClick={() => setSidebarOpen(true)} 
              className="mr-3 p-2 rounded-lg hover:bg-gray-100 text-gray-700 md:hidden border border-gray-200 shadow-sm"
            >
              <Menu size={24} />
            </button>
            {/* 電腦版縮放按鈕 */}
            <button 
              onClick={() => setSidebarOpen(!isSidebarOpen)} 
              className="mr-4 p-1 rounded hover:bg-gray-100 text-gray-400 hidden md:block"
            >
              <Menu size={20} />
            </button>
            <h2 className="text-lg md:text-xl font-bold text-gray-800 truncate">
              {menuItems.find(i => i.id === activeTab)?.label}
            </h2>
          </div>
          
          {/* 右上角頭像 */}
          <div className="flex items-center space-x-3">
             <div className="text-right hidden md:block">
               <div className="text-sm font-bold text-gray-700">{adminProfile?.full_name}</div>
               <div className="text-xs text-blue-600 bg-blue-50 px-2 rounded-full inline-block border border-blue-100">Super Admin</div>
             </div>
             <div className="w-8 h-8 md:w-9 md:h-9 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-bold border-2 border-white shadow-sm">
               {adminProfile?.full_name?.[0] || 'A'}
             </div>
          </div>
        </header>
        
        {/* 內容區 */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8 bg-slate-50 w-full">
          <div className="max-w-7xl mx-auto pb-10">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  )
}