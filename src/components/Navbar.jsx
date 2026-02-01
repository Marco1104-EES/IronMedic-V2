import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Menu, X, User, LogIn, LayoutDashboard, LogOut } from 'lucide-react'

export default function Navbar() {
  const navigate = useNavigate()
  const [isOpen, setIsOpen] = useState(false)
  const [session, setSession] = useState(null)
  const [userRole, setUserRole] = useState('user') // 預設

  // 偵測登入狀態 (IFF System)
  useEffect(() => {
    // 1. 初始檢查
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) checkUserRole(session.user.id)
    })

    // 2. 監聽狀態變化 (登入/登出時自動切換按鈕)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) checkUserRole(session.user.id)
    })

    return () => subscription.unsubscribe()
  }, [])

  // 檢查是否為管理員 (為了顯示不同顏色的按鈕)
  const checkUserRole = async (userId) => {
    const { data } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single()
    if (data) setUserRole(data.role)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setSession(null)
    navigate('/') // 登出後回到首頁
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          
          {/* Logo 區 */}
          <div className="flex items-center cursor-pointer" onClick={() => navigate('/')}>
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center mr-2 shadow-lg shadow-blue-500/30">
              <span className="text-white font-black text-lg">I</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900 tracking-tight">IRON MEDIC</h1>
              <p className="text-[10px] text-gray-500 tracking-wider font-bold">醫護鐵人賽事系統</p>
            </div>
          </div>

          {/* 電腦版選單 (Desktop Menu) */}
          <div className="hidden md:flex items-center space-x-4">
            <Link to="/" className="text-gray-600 hover:text-blue-600 px-3 py-2 rounded-md text-sm font-bold transition-colors">
              賽事首頁
            </Link>
            
            {/* ✨ 核心判斷邏輯 ✨ */}
            {session ? (
              // --- 狀態 A: 已登入 (顯示進入後台 & 登出) ---
              <div className="flex items-center space-x-3 ml-4">
                <div className="flex flex-col items-end mr-2">
                   <span className="text-xs font-bold text-gray-800">
                     {session.user.email?.split('@')[0]}
                   </span>
                   <span className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 rounded">
                     ● 線上 (Online)
                   </span>
                </div>
                
                <button 
                  onClick={() => navigate('/admin')}
                  className="flex items-center bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 rounded-full text-sm font-bold shadow-md transition-transform active:scale-95 border border-slate-700"
                >
                  <LayoutDashboard size={16} className="mr-2"/> 
                  {userRole === 'admin' ? '指揮中心' : '會員中心'}
                </button>

                <button 
                  onClick={handleLogout}
                  className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  title="登出"
                >
                  <LogOut size={20}/>
                </button>
              </div>
            ) : (
              // --- 狀態 B: 未登入 (顯示登入 & 註冊) ---
              <div className="flex items-center space-x-3 ml-4">
                <div className="flex items-center text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                  <User size={12} className="mr-1.5"/> 線上: 129
                </div>
                <button 
                  onClick={() => navigate('/login')} 
                  className="text-gray-600 hover:text-blue-600 font-bold px-4 py-2 text-sm transition-colors"
                >
                  登入
                </button>
                <button 
                  onClick={() => navigate('/login')} 
                  className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-full text-sm font-bold shadow-md shadow-blue-200 transition-transform active:scale-95"
                >
                  註冊
                </button>
              </div>
            )}
          </div>

          {/* 手機版漢堡選單 (Mobile Menu Button) */}
          <div className="flex items-center md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 hover:text-gray-900 p-2">
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* 手機版下拉選單 (Mobile Dropdown) */}
      {isOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 pt-2 pb-4 shadow-xl animate-fade-in-down">
          <div className="flex flex-col space-y-2">
            <Link to="/" className="block px-3 py-2 text-base font-bold text-gray-700 hover:bg-gray-50 rounded-lg">
              賽事首頁
            </Link>
            
            {session ? (
              <>
                <button 
                  onClick={() => { navigate('/admin'); setIsOpen(false); }}
                  className="w-full text-left flex items-center px-3 py-3 bg-slate-900 text-white rounded-lg text-base font-bold shadow-md"
                >
                  <LayoutDashboard size={18} className="mr-3"/> 進入後臺系統
                </button>
                <button 
                  onClick={handleLogout}
                  className="w-full text-left flex items-center px-3 py-2 text-red-500 font-bold hover:bg-red-50 rounded-lg"
                >
                  <LogOut size={18} className="mr-3"/> 安全登出
                </button>
              </>
            ) : (
              <>
                <button 
                  onClick={() => { navigate('/login'); setIsOpen(false); }}
                  className="w-full flex items-center justify-center px-3 py-3 border-2 border-gray-200 text-gray-700 rounded-lg text-base font-bold"
                >
                  <LogIn size={18} className="mr-2"/> 登入帳號
                </button>
                <button 
                  onClick={() => { navigate('/login'); setIsOpen(false); }}
                  className="w-full flex items-center justify-center px-3 py-3 bg-blue-600 text-white rounded-lg text-base font-bold shadow-md"
                >
                  立即註冊
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}