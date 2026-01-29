import { useState, useEffect } from 'react'
import { Link, Outlet, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { 
  LayoutDashboard, 
  Calendar, 
  Users, 
  Bell, 
  FileText, 
  LogOut,
  Menu 
} from 'lucide-react'

export default function AdminLayout() {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      navigate('/login')
      return
    }

    // 檢查權限
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin' || profile?.role === 'super_admin') {
      setIsAdmin(true)
    } else {
      alert('您沒有權限進入戰情室！')
      navigate('/')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  if (loading) return <div className="p-10 text-center">驗證權限中...</div>

  // 側邊欄選單項目
  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: '戰情儀表板', path: '/admin' },
    { icon: <Calendar size={20} />, label: '賽事管理', path: '/admin/events' },
    { icon: <Users size={20} />, label: '會員 CRM', path: '/admin/users' },
    { icon: <Bell size={20} />, label: '廣播中心', path: '/admin/broadcast' },
    { icon: <FileText size={20} />, label: '稽核日誌', path: '/admin/logs' },
  ]

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 🔴 左側 Sidebar */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-slate-900 text-white transition-all duration-300 flex flex-col`}>
        <div className="p-4 flex items-center justify-between border-b border-slate-700">
          {isSidebarOpen && <span className="font-bold text-xl tracking-wider">IRON ADMIN</span>}
          <button onClick={() => setSidebarOpen(!isSidebarOpen)} className="p-1 hover:bg-slate-800 rounded">
            <Menu size={20} />
          </button>
        </div>

        <nav className="flex-1 py-6 space-y-2">
          {menuItems.map((item) => (
            <Link 
              key={item.path} 
              to={item.path} 
              className="flex items-center px-4 py-3 text-gray-300 hover:bg-slate-800 hover:text-white transition-colors"
            >
              {item.icon}
              {isSidebarOpen && <span className="ml-4">{item.label}</span>}
            </Link>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-700">
          <button onClick={handleLogout} className="flex items-center w-full text-red-400 hover:text-red-300">
            <LogOut size={20} />
            {isSidebarOpen && <span className="ml-4">登出系統</span>}
          </button>
        </div>
      </aside>

      {/* 🔵 右側內容區 */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white shadow-sm h-16 flex items-center px-6 justify-between">
          <h2 className="text-xl font-semibold text-gray-800">管理控制台</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">超級管理員</span>
            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
              A
            </div>
          </div>
        </header>
        
        <div className="p-8">
          <Outlet /> {/* 這裡會顯示各個子頁面 */}
        </div>
      </main>
    </div>
  )
}