import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Menu, X, LogOut, LayoutDashboard, CreditCard, User, Settings } from 'lucide-react'
import UserAvatar from './UserAvatar'       
import DigitalIDCard from './DigitalIDCard' 

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [profile, setProfile] = useState(null) 
  const [showIDCard, setShowIDCard] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const menuRef = useRef(null)

  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) fetchProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) fetchProfile(session.user.id)
      else setProfile(null)
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

  const fetchProfile = async (uid) => {
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', uid).single()
        if (data) setProfile(data)
      } catch (e) { console.error("Error fetching profile:", e) }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isAdmin = profile?.role === 'SUPER_ADMIN' || profile?.role === 'EVENT_MANAGER'
  const displayName = profile?.display_name || profile?.email || '會員'
  const avatarText = profile?.badge_title || profile?.email?.charAt(0).toUpperCase() || 'M'

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

            {/* 電腦版選單 */}
            <div className="hidden md:flex items-center space-x-4">
              {isAdmin && (
                  <Link to="/admin/dashboard" className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-all shadow-md transform hover:-translate-y-0.5">
                      <LayoutDashboard size={16} className="mr-2"/> 戰情指揮中心
                  </Link>
              )}

              {profile ? (
                <div className="relative ml-4" ref={menuRef}>
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="focus:outline-none transition-transform active:scale-95"
                  >
                    <UserAvatar user={profile} text={avatarText} styleType={1} size="md" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 animate-scale-in origin-top-right z-50">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <p className="text-sm font-black text-slate-800 truncate">{displayName}</p>
                        <p className="text-xs text-blue-600 font-bold">{profile.role || 'User'}</p>
                      </div>
                      
                      {/* 🔥 新增：個人資料設定按鈕 */}
                      <Link 
                        to="/profile" 
                        onClick={() => setShowUserMenu(false)}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center"
                      >
                        <Settings size={16} className="mr-3 text-slate-400"/> 個人資料設定
                      </Link>

                      <button 
                        onClick={() => { setShowIDCard(true); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 flex items-center"
                      >
                        <CreditCard size={16} className="mr-3 text-blue-500"/> 數位識別證
                      </button>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center">
                        <LogOut size={16} className="mr-3"/> 安全登出
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="text-sm font-bold text-blue-600 hover:text-blue-800">登入</Link>
              )}
            </div>

            {/* 手機版按鈕 */}
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
            {profile && (
                <div className="px-4 pt-4 pb-2 flex items-center border-b border-slate-100 mb-2 bg-slate-50">
                    <UserAvatar user={profile} text={avatarText} styleType={1} size="sm" className="mr-3"/>
                    <div className="overflow-hidden">
                        <p className="text-sm font-black text-slate-800 truncate">{displayName}</p>
                        <p className="text-xs text-slate-500 truncate">{profile.email}</p>
                    </div>
                </div>
            )}
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {isAdmin && (
                  <Link to="/admin/dashboard" className="block px-3 py-3 rounded-lg text-base font-bold text-white bg-slate-800 mb-2 flex items-center justify-center shadow-md">
                      <LayoutDashboard size={18} className="mr-2"/> 戰情指揮中心
                  </Link>
              )}
              <Link to="/home" className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50">首頁</Link>
              
              {/* 🔥 新增：手機版個人資料設定 */}
              {profile && (
                <Link to="/profile" onClick={() => setIsOpen(false)} className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50 flex items-center">
                    <Settings size={18} className="mr-3 text-slate-400"/> 個人資料設定
                </Link>
              )}

              {profile && (
                <button onClick={() => { setShowIDCard(true); setIsOpen(false); }} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50 flex items-center">
                    <CreditCard size={18} className="mr-3 text-blue-600"/> 數位識別證
                </button>
              )}
              <button onClick={handleLogout} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50 flex items-center">
                  <LogOut size={18} className="mr-3"/> 登出
              </button>
            </div>
          </div>
        )}
      </nav>

      {showIDCard && <DigitalIDCard user={profile} role={profile?.role} onClose={() => setShowIDCard(false)} />}
    </>
  )
}