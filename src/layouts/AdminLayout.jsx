import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { 
  LayoutDashboard, Users, Trophy, Settings, LogOut, Menu, X, 
  FileText, Activity, ShieldAlert, Upload 
} from 'lucide-react'

export default function AdminLayout() {
  const [isSidebarOpen, setSidebarOpen] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const location = useLocation()

  const CREATOR_EMAIL = 'marco1104@gmail.com'

  useEffect(() => {
    checkAdmin()
  }, [])

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
        navigate('/login')
        return
    }

    if (user.email === CREATOR_EMAIL) {
        setIsAdmin(true)
        setLoading(false)
        return
    }

    const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (data && (data.role === 'SUPER_ADMIN' || data.role === 'EVENT_MANAGER')) {
        setIsAdmin(true)
    } else {
        alert("權限不足：您無權進入戰情中心")
        navigate('/home')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const navItems = [
    { icon: LayoutDashboard, label: '系統運作全方位', path: '/admin/dashboard' },
    { icon: Trophy, label: '賽事管理系統', path: '/admin/events' },
    { icon: Users, label: '會員資料中心', path: '/admin/members' },
    { icon: Upload, label: '資料匯入中心', path: '/admin/import' },
    { icon: ShieldAlert, label: '權限管理 (IAM)', path: '/admin/permissions', highlight: true },
    { icon: Activity, label: '系統操作日誌', path: '/admin/logs' },
  ]

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-blue-500"><Activity className="animate-spin mr-2"/> 正在驗證指揮官身分...</div>

  if (!isAdmin) return null

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-30 w-64 bg-[#0f172a] text-white transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}>
        <div className="p-6 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center font-black text-lg mr-3 shadow-lg shadow-blue-500/50">I</div>
            <div>
              <h1 className="text-xl font-bold tracking-wider">IRON MEDIC</h1>
              <p className="text-[10px] text-blue-400 font-mono tracking-widest">ENTERPRISE SYSTEM</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`
                  flex items-center px-4 py-3.5 rounded-xl transition-all duration-200 group
                  ${isActive 
                    ? item.highlight 
                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                        : 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'
                  }
                `}
              >
                <item.icon size={20} className={`mr-3 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-blue-400'}`} />
                <span className="font-bold text-sm">{item.label}</span>
                {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse"></div>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
            <Link to="/home" className="flex items-center w-full px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors mb-2">
                <FileText size={18} className="mr-3"/>
                <span className="text-sm font-bold">返回前台首頁</span>
            </Link>
            <button 
                onClick={handleLogout}
                className="flex items-center w-full px-4 py-3 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-colors"
            >
                <LogOut size={18} className="mr-3" />
                <span className="text-sm font-bold">安全登出</span>
            </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#f8fafc]">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 lg:px-8 shadow-sm z-10">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-slate-500 hover:text-slate-800 p-2">
            <Menu size={24} />
          </button>
          
          <div className="flex items-center ml-auto space-x-4">
             <div className="text-right hidden md:block">
                 <div className="text-xs font-bold text-blue-600 uppercase tracking-wider">System Online</div>
                 <div className="text-sm font-black text-slate-800">戰情指揮中心</div>
             </div>
             <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold border border-slate-200">
                 M
             </div>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-8 relative">
            <Outlet />
        </div>
      </main>
    </div>
  )
}