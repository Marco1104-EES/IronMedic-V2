import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { LayoutDashboard, Users, LogOut, Loader2, ShieldAlert, ShieldCheck, UserPlus, AlertTriangle, Ban, ServerCog, UploadCloud, Flag, History, CalendarClock, Menu, X, Crown, Home, Bell } from 'lucide-react'

// 🌟 定義四大後台通行權限
const VALID_ADMIN_ROLES = ['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'RACE_ADMIN', 'ADMIN'];

export default function AdminLayout() {
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const [userRole, setUserRole] = useState('') 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  
  // 🌟 新增：未讀通知數量狀態
  const [unreadCount, setUnreadCount] = useState(0)

  const navigate = useNavigate()
  const location = useLocation()

  const searchParams = new URLSearchParams(location.search)
  const currentView = searchParams.get('view') || 'ALL'

  useEffect(() => { 
      checkAdminPrivileges() 
      fetchUnreadCount() // 載入時撈取通知數量
  }, [])

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 🌟 撈取近3天的變更紀錄作為未讀通知數
  const fetchUnreadCount = async () => {
      try {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          
          const { count, error } = await supabase
              .from('admin_notifications')
              .select('*', { count: 'exact', head: true })
              .gte('created_at', threeDaysAgo.toISOString())
              
          if (!error && count !== null) {
              setUnreadCount(count)
          }
      } catch (error) {
          console.error("無法撈取通知數量", error)
      }
  }

  const checkAdminPrivileges = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) { navigate('/login'); return }
      
      const email = user.email.toLowerCase()
      setUserEmail(email)

      const { data, error } = await supabase.from('profiles').select('role').eq('email', email).maybeSingle()
      
      const uRole = data?.role?.toUpperCase() || 'USER'
      
      if (VALID_ADMIN_ROLES.includes(uRole)) {
        setIsAuthorized(true)
        setUserRole(uRole)
      } else {
        navigate('/races') 
      }
    } catch (e) {
      console.error("權限檢查失敗:", e)
      navigate('/login') 
    } finally { 
      setLoading(false) 
    }
  }

  const handleLogout = async () => { 
      await supabase.auth.signOut(); 
      navigate('/login') 
  }

  const handleMenuClick = () => {
      if (window.innerWidth < 1024) {
          setIsSidebarOpen(false)
      }
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin mr-2"/> 系統權限核對中...</div>
  if (!isAuthorized) return null

  const menuGroups = [
      { 
          title: "系統總覽",
          items: [
              // 🌟 修正1：營運數據儀表板 => 醫鐵數據儀表板 (已於原檔修正)
              { path: '/admin/dashboard', icon: <LayoutDashboard size={18}/>, label: '醫鐵數據儀表板' },
              // 🌟 新增：醫鐵通知中心，指向 dashboard 並帶參數，防閃退
              { path: '/admin/dashboard', view: 'NOTIFICATIONS', icon: <Bell size={18}/>, label: '醫鐵通知中心', badge: unreadCount }
          ]
      },
      {
          // 🌟 修正：賽事與派班管理 => 賽事任務管理
          title: "賽事任務管理",
          items: [
              { path: '/admin/races', icon: <Flag size={18}/>, label: '🚩 賽事任務總覽' },
              { path: '/admin/races', view: 'HISTORY', icon: <History size={18}/>, label: '📜 歷史任務結算' },
              { path: '/admin/races', view: 'FUTURE', icon: <CalendarClock size={18}/>, label: '📅 未來任務規劃' },
              { path: '/admin/race-builder', icon: <Flag size={18}/>, label: '➕ 建立新賽事' }
          ]
      },
      {
          title: "會員與名單管理",
          items: [
              { path: '/admin/members', view: null, icon: <Users size={18}/>, label: '全部人員總表' },
              { path: '/admin/members', view: 'COMMAND', icon: <ShieldAlert size={18}/>, label: '🅰️ 核心幹部 (VIP)' },
              // 🌟 修正1：活躍醫護會員 => 活躍醫鐵會員 (已於原檔修正)
              { path: '/admin/members', view: 'ACTIVE', icon: <ShieldCheck size={18}/>, label: '🅱️ 活躍醫鐵會員' },
              { path: '/admin/members', view: 'RESERVE', icon: <UserPlus size={18}/>, label: '🆎 新人及未滿10場' },
              { path: '/admin/members', view: 'RISK', icon: <AlertTriangle size={18}/>, label: '⚠️ 異常觀察名單' },
              { path: '/admin/members', view: 'BLACKLIST', icon: <Ban size={18}/>, label: '⛔ 停權黑名單' },
              { path: '/admin/import', icon: <UploadCloud size={18}/>, label: '📥 資料整合匯入中心' }
          ]
      }
  ]

  const getPageTitle = () => {
    const { pathname } = location;
    if (pathname === '/admin/system-status') return '系統伺服器監控';
    if (pathname === '/admin/import') return '資料整合匯入中心';
    if (pathname === '/admin/race-builder') return '建立新賽事';
    
    // 🌟 處理新通知中心的標題
    if (pathname === '/admin/dashboard' && currentView === 'NOTIFICATIONS') return '醫鐵通知中心';

    const matchedItem = menuGroups.flatMap(g => g.items).find(i => 
      i.path === pathname && (i.view ? currentView === i.view : !searchParams.get('view'))
    );
    
    return matchedItem ? matchedItem.label.replace(/🚩 |📜 |📅 |➕ |🅰️ |🅱️ |🆎 |⚠️ |⛔ |📥 /g, '') : '系統總覽'; 
  }

  return (
    <div className="flex h-screen bg-slate-100 font-sans overflow-hidden relative">
      <div className="lg:hidden absolute top-0 left-0 right-0 h-16 bg-slate-900 text-white flex items-center justify-between px-4 z-40 shadow-md">
        <div className="flex items-center gap-2 font-black tracking-wider text-lg">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center">I</div>
            IRON MEDIC
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-800 rounded-lg transition-colors">
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isSidebarOpen && (
        <div className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-64 bg-slate-900 text-slate-300 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl lg:shadow-none h-full
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
          <div className="p-6 border-b border-slate-800 hidden lg:flex items-center gap-3 sticky top-0 bg-slate-900 z-10 shrink-0">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">I</div>
              <span className="font-bold text-white tracking-wider">IRON MEDIC</span>
          </div>

          <div className="bg-blue-900/50 p-2 text-center text-xs text-blue-200 font-bold border-b border-blue-800 mt-16 lg:mt-0 shrink-0">
              🛡️ {userRole === 'SUPER_ADMIN' ? 'SUPER ADMIN MODE' : userRole.replace('_', ' ')}
          </div>

          <nav className="flex-1 p-4 space-y-6 overflow-y-auto custom-scrollbar">
              {menuGroups.map((group, idx) => (
                  <div key={idx}>
                      <div className="text-xs font-bold text-slate-500 px-3 mb-2 uppercase tracking-widest">{group.title}</div>
                      <div className="space-y-1">
                          {group.items.map((item, i) => {
                              const isPathMatch = location.pathname === item.path
                              const isViewMatch = item.view ? currentView === item.view : (!searchParams.get('view') && isPathMatch)
                              const isActive = (isPathMatch || (item.path === '/admin/races' && !item.view && location.pathname === '/admin/race-builder')) && (item.view ? isViewMatch : true)
                              
                              const isSubItem = ['HISTORY', 'FUTURE'].includes(item.view)
                              const linkClasses = `flex items-center justify-between px-3 py-2.5 rounded-lg transition-all font-bold text-sm ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'} ${isSubItem ? 'ml-4 text-xs' : ''}`

                              return (
                                <Link 
                                    key={i} 
                                    to={item.view ? `${item.path}?view=${item.view}` : item.path}
                                    className={linkClasses}
                                    onClick={handleMenuClick} 
                                >
                                    <div className="flex items-center gap-3">
                                        {item.icon}
                                        {item.label}
                                    </div>
                                    {/* 🌟 渲染紅圈圈徽章 (若 badge 大於 0) */}
                                    {item.badge > 0 && (
                                        <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse">
                                            {item.badge > 99 ? '99+' : item.badge}
                                        </span>
                                    )}
                                </Link>
                              )
                          })}
                      </div>
                  </div>
              ))}

              {userRole === 'SUPER_ADMIN' && (
                  <div>
                      <div className="text-xs font-bold text-amber-500 px-3 mb-2 uppercase tracking-widest border-t border-slate-800 pt-4">系統管理區</div>
                      <Link to="/admin/system-status" onClick={handleMenuClick} className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-sm text-amber-400 hover:bg-amber-900/20">
                          <ServerCog size={18}/>
                          系統伺服器監控
                      </Link>
                  </div>
              )}
          </nav>

          <div className="p-4 border-t border-slate-800 sticky bottom-0 bg-slate-900 shrink-0 space-y-2">
              <button onClick={() => navigate('/races')} className="flex items-center gap-3 px-3 py-3 w-full rounded-xl hover:bg-slate-800 hover:text-white transition-colors text-sm font-bold text-slate-400">
                  <Home size={18}/> 返回賽事大廳
              </button>
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 w-full rounded-xl hover:bg-red-900/30 hover:text-red-400 transition-colors text-sm font-bold text-slate-400">
                  <LogOut size={18}/> 登出系統
              </button>
          </div>
      </aside>

      <main className="flex-1 flex flex-col h-screen overflow-hidden bg-slate-100 pt-16 lg:pt-0">
          <div className="flex-1 overflow-y-auto custom-scrollbar p-4 lg:p-8 relative">
              <header className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 md:mb-8 mt-2 md:mt-0">
                  <h2 className="text-xl md:text-2xl font-black text-slate-800">
                      {getPageTitle()}
                  </h2>
                  <div className="flex items-center gap-3 bg-white px-3 py-1.5 md:px-4 md:py-2 rounded-full shadow-sm border border-slate-200 w-fit">
                      <div className={`w-2 h-2 rounded-full animate-pulse bg-amber-500`}></div>
                      <span className="text-[10px] md:text-xs font-bold text-slate-700">
                          {userEmail}
                      </span>
                  </div>
              </header>
              <Outlet />
          </div>
      </main>
    </div>
  )
}