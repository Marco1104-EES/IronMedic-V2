import { useState, useEffect } from 'react'
import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { LayoutDashboard, Users, LogOut, Loader2, ShieldAlert, ShieldCheck, UserPlus, AlertTriangle, Ban, ServerCog, UploadCloud } from 'lucide-react'

export default function AdminLayout() {
  const [loading, setLoading] = useState(true)
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [userEmail, setUserEmail] = useState('')
  const navigate = useNavigate()
  const location = useLocation()

  const searchParams = new URLSearchParams(location.search)
  const currentView = searchParams.get('view') || 'ALL'

  useEffect(() => { checkAdminPrivileges() }, [])

  const checkAdminPrivileges = async () => {
    // 🔥🔥🔥 【上帝模式開啟】 🔥🔥🔥
    const GOD_MODE = true; 
    
    if (GOD_MODE) {
        console.log("⚠️ 目前處於開發者上帝模式 (Dev God Mode) - 已繞過登入驗證");
        setUserEmail('marco1104@gmail.com'); 
        setIsAuthorized(true); 
        setLoading(false);
        return; 
    }
    // 🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate('/login'); return }
      setUserEmail(user.email)
      
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      
      if (!profile || !['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR'].includes(profile.role)) {
        alert("⛔ 權限不足"); navigate('/home'); return
      }
      setIsAuthorized(true)
    } catch (e) { navigate('/login') } finally { setLoading(false) }
  }

  const handleLogout = async () => { 
      await supabase.auth.signOut(); 
      navigate('/login') 
  }

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin mr-2"/> 核對權限中...</div>
  
  if (!isAuthorized) return null

  // 📝 選單配置
  const menuGroups = [
      { 
          title: "戰情中心",
          items: [
              { path: '/admin/dashboard', icon: <LayoutDashboard size={18}/>, label: '戰情儀表板' }
          ]
      },
      {
          title: "人員戰略部署",
          items: [
              { path: '/admin/members', view: null, icon: <Users size={18}/>, label: '全部人員總覽' },
              { path: '/admin/members', view: 'COMMAND', icon: <ShieldAlert size={18}/>, label: '🅰️ 指揮核心 (VIP)' },
              { path: '/admin/members', view: 'ACTIVE', icon: <ShieldCheck size={18}/>, label: '🅱️ 主力戰鬥部隊' },
              { path: '/admin/members', view: 'RESERVE', icon: <UserPlus size={18}/>, label: '🆎 潛力儲備軍' },
              { path: '/admin/members', view: 'RISK', icon: <AlertTriangle size={18}/>, label: '⚠️ 風險預警名單' },
              { path: '/admin/members', view: 'BLACKLIST', icon: <Ban size={18}/>, label: '⛔ 停權黑名單' },
              // 👇 新增的匯入中心 (注意上一行有逗號)
              { path: '/admin/import', icon: <UploadCloud size={18}/>, label: '📥 資料匯入中心' }
          ]
      }
  ]

  return (
    <div className="min-h-screen bg-slate-100 flex font-sans">
      <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shadow-2xl fixed h-full z-50 overflow-y-auto">
          {/* Logo */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3 sticky top-0 bg-slate-900 z-10">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">I</div>
              <span className="font-bold text-white tracking-wider">IRON MEDIC</span>
          </div>

          <div className="bg-red-900/50 p-2 text-center text-xs text-red-200 font-bold border-b border-red-800 animate-pulse">
              🛡️ GOD MODE ACTIVE
          </div>

          <nav className="flex-1 p-4 space-y-6">
              {menuGroups.map((group, idx) => (
                  <div key={idx}>
                      <div className="text-xs font-bold text-slate-500 px-3 mb-2 uppercase tracking-widest">{group.title}</div>
                      <div className="space-y-1">
                          {group.items.map((item, i) => {
                              const isPathMatch = location.pathname === item.path
                              // 修正 active 判斷邏輯
                              const isViewMatch = item.view ? currentView === item.view : (!searchParams.get('view') && isPathMatch)
                              const isActive = isPathMatch && (item.view ? isViewMatch : true)

                              return (
                                <Link 
                                    key={i} 
                                    to={item.view ? `${item.path}?view=${item.view}` : item.path}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-sm ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' : 'hover:bg-slate-800 hover:text-white'}`}
                                >
                                    {item.icon}
                                    {item.label}
                                </Link>
                              )
                          })}
                      </div>
                  </div>
              ))}

              {/* 上帝模式專屬選單 */}
              {userEmail === 'marco1104@gmail.com' && (
                  <div>
                      <div className="text-xs font-bold text-red-500 px-3 mb-2 uppercase tracking-widest border-t border-slate-800 pt-4">最高權限區</div>
                      <Link to="/admin/system-status" className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all font-bold text-sm text-red-400 hover:bg-red-900/20">
                          <ServerCog size={18}/>
                          系統運作總覽
                      </Link>
                  </div>
              )}
          </nav>

          <div className="p-4 border-t border-slate-800 sticky bottom-0 bg-slate-900">
              <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-3 w-full rounded-xl hover:bg-red-900/30 hover:text-red-400 transition-colors text-sm font-bold text-slate-400">
                  <LogOut size={18}/> 登出系統
              </button>
          </div>
      </aside>

      <main className="flex-1 ml-64 p-8 animate-fade-in">
          <header className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-800">
                  {location.pathname === '/admin/system-status' ? '系統資源運作監控' : 
                   location.pathname === '/admin/import' ? '資料匯入中心' :
                   menuGroups.flatMap(g => g.items).find(i => 
                      i.path === location.pathname && (i.view ? currentView === i.view : !searchParams.get('view'))
                  )?.label || '戰情中心'}
              </h2>
              <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-200">
                  <div className={`w-2 h-2 rounded-full animate-pulse ${userEmail === 'marco1104@gmail.com' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                  <span className="text-xs font-bold text-slate-700">
                      {userEmail === 'marco1104@gmail.com' ? 'COMMANDER (GOD MODE)' : 'ADMIN'}
                  </span>
              </div>
          </header>
          <Outlet />
      </main>
    </div>
  )
}