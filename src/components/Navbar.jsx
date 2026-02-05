import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Menu, X, LogOut, LayoutDashboard, CreditCard, User } from 'lucide-react'
// 🔥 1. 統一用這個檔名，不要再改了
import UserAvatar from './UserAvatar' 
import DigitalIDCard from './DigitalIDCard' 

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  
  const [showIDCard, setShowIDCard] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
          setUser(session.user)
          fetchUserRole(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchUserRole(session.user.id)
    })

    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowUserMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
        subscription.unsubscribe()
        document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  const fetchUserRole = async (uid) => {
      try {
        const { data } = await supabase.from('profiles').select('role').eq('id', uid).single()
        if (data) setUserRole(data.role)
      } catch (e) {
          console.error("Error fetching role:", e)
      }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'EVENT_MANAGER'

  // 🔥 2. 強制計算：不管頭像元件多笨，這裡直接告訴它要顯示什麼字
  const getAvatarLabel = (u) => {
      if (!u || !u.email) return 'M';
      if (u.email === 'marco1104@gmail.com') return '艦長';
      if (u.email === 'medicmarco1104@gmail.com') return '醫護';
      // 其他人顯示 Email 首字
      return u.email.charAt(0).toUpperCase();
  }

  const avatarText = getAvatarLabel(user);

  return (
    <>
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            
            <div className="flex items-center">
              <Link to="/home" className="flex-shrink-0 flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black mr-2 shadow-md">I</div>
                <span className="font-black text-xl tracking-tight text-slate-900">IRON MEDIC</span>
              </Link>
            </div>

            {/* 電腦版 */}
            <div className="hidden md:flex items-center space-x-4">
              
              {isAdmin && (
                  <Link to="/admin/dashboard" className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-all shadow-md transform hover:-translate-y-0.5">
                      <LayoutDashboard size={16} className="mr-2"/>
                      戰情室
                  </Link>
              )}

              {user ? (
                <div className="relative ml-4" ref={menuRef}>
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="focus:outline-none transition-transform active:scale-95"
                  >
                    {/* 🔥 3. 關鍵：把算好的 avatarText 塞進去 */}
                    <UserAvatar 
                        user={user} 
                        text={avatarText} 
                        styleType={1} 
                        size="md" 
                    />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-3 w-60 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 animate-scale-in origin-top-right z-50">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <p className="text-sm font-black text-slate-800 truncate">{user.email}</p>
                        <p className="text-xs text-blue-600 font-bold">{userRole || '載入中...'}</p>
                      </div>
                      
                      <button 
                        onClick={() => { setShowIDCard(true); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 flex items-center"
                      >
                        <CreditCard size={16} className="mr-3 text-blue-500"/> 數位 ID
                      </button>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center">
                        <LogOut size={16} className="mr-3"/> 登出
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="text-sm font-bold text-blue-600 hover:text-blue-800">登入</Link>
              )}
            </div>

            {/* 手機版 */}
            <div className="flex items-center md:hidden">
              <button onClick={() => setIsOpen(!isOpen)} className="text-slate-500 hover:text-slate-800 p-2">
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* 手機版選單 */}
        {isOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-xl z-40">
            {user && (
                <div className="px-4 pt-4 pb-2 flex items-center border-b border-slate-100 mb-2 bg-slate-50">
                    {/* 🔥 4. 手機版也要塞 */}
                    <UserAvatar 
                        user={user} 
                        text={avatarText} 
                        styleType={1} 
                        size="sm" 
                        className="mr-3"
                    />
                    <div className="overflow-hidden">
                        <p className="text-sm font-black text-slate-800 truncate">{user.email}</p>
                    </div>
                </div>
            )}
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {isAdmin && (
                  <Link to="/admin/dashboard" className="block px-3 py-3 rounded-lg text-base font-bold text-white bg-red-600 mb-2 flex items-center justify-center shadow-md">
                      <LayoutDashboard size={18} className="mr-2"/> 進入戰情室
                  </Link>
              )}
              <Link to="/home" className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50">首頁</Link>
              {user && (
                <button onClick={() => { setShowIDCard(true); setIsOpen(false); }} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50 flex items-center">
                    <CreditCard size={18} className="mr-3 text-blue-600"/> 數位 ID
                </button>
              )}
              <button onClick={handleLogout} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 flex items-center">
                  <LogOut size={18} className="mr-3"/> 登出
              </button>
            </div>
          </div>
        )}
      </nav>

      {/* ID 卡彈窗 */}
      {showIDCard && <DigitalIDCard user={user} role={userRole} onClose={() => setShowIDCard(false)} />}
    </>
  )
}