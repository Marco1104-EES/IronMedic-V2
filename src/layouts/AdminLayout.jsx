import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { ShieldAlert, Loader2, FileWarning, LayoutDashboard, Users, Trophy, LogOut } from 'lucide-react'

export default function AdminLayout() {
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const navigate = useNavigate()
  const location = useLocation() // 取得目前網址，用來標示選單

  useEffect(() => {
    checkAdminPrivileges()
  }, [])

  const checkAdminPrivileges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*') 
        .eq('id', user.id)
        .maybeSingle() 

      if (error || !profile) {
        setErrorMsg("⚠️ 無法讀取權限檔案")
        return
      }

      const ALLOWED_ROLES = ['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'EVENT_MANAGER']
      const userRole = (profile.role || '').toUpperCase()

      if (ALLOWED_ROLES.includes(userRole)) {
        setIsAuthorized(true)
      } else {
        alert(`⛔ 存取被拒：您的權限 (${userRole}) 不足`)
        navigate('/home')
      }
    } catch (error) {
      navigate('/login')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
      await supabase.auth.signOut()
      navigate('/login')
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin mr-2"/> 核對權限中...</div>
  if (errorMsg) return <div className="p-10 text-center text-red-600 font-bold">{errorMsg}</div>
  if (!isAuthorized) return null

  // 定義選單項目
  const menuItems = [
      { path: '/admin/dashboard', icon: <LayoutDashboard size={20}/>, label: '戰情儀表板' },
      { path: '/admin/members', icon: <Users size={20}/>, label: '人員名冊 CRM' },
      // { path: '/admin/events', icon: <Trophy size={20}/>, label: '賽事管理 (即將推出)' },
  ]

  return (
    <div className="min-h-screen bg-slate-100 flex">
      
      {/* 🟢 左側戰略導航列 (Sidebar) */}
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl fixed h-full z-50">
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">I</div>
              <span className="font-bold text-white tracking-wider">IRON MEDIC</span>
          </div>

          <nav className="flex-1 p-4 space-y-2">
              <div className="text-xs font-bold text-slate-500 px-3 mb-2 uppercase tracking-widest">Admin Console</div>
              
              {menuItems.map((item) => {
                  const isActive = location.pathname === item.path
                  return (
                    <Link 
                        key={item.path} 
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-3 rounded-xl transition-all font-bold ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
                    >
                        {item.icon}
                        {item.label}
                    </Link>
                  )
              })}
          </nav>

          <div className="p-4 border-t border-slate-800">
              <button 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-3 w-full rounded-xl hover:bg-red-900/30 hover:text-red-400 transition-colors text-sm font-bold text-slate-400"
              >
                  <LogOut size={18}/>
                  登出系統
              </button>
          </div>
      </aside>

      {/* 🟢 右側內容區 */}
      <main className="flex-1 ml-64 p-8 animate-fade-in">
          {/* 頂部狀態列 */}
          <header className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">
                  {menuItems.find(m => m.path === location.pathname)?.label || '戰情中心'}
              </h2>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs font-bold text-slate-500 uppercase">Secure Connection</span>
                  <span className="text-xs font-mono text-slate-300">|</span>
                  <span className="text-xs font-bold text-slate-700">SUPER_ADMIN</span>
              </div>
          </header>

          <Outlet />
      </main>
    </div>
  )
}