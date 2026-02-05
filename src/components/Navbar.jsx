import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Menu, X, LogOut, LayoutDashboard, CreditCard, User } from 'lucide-react'
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
      const { data } = await supabase.from('profiles').select('role').eq('id', uid).single()
      if (data) setUserRole(data.role)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'EVENT_MANAGER'

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

            <div className="hidden md:flex items-center space-x-4">
              {isAdmin && (
                  <Link to="/admin/dashboard" className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700 transition-all shadow-md transform hover:-translate-y-0.5">
                      <LayoutDashboard size={16} className="mr-2"/> 戰情室
                  </Link>
              )}

              {user ? (
                <div className="relative ml-4" ref={menuRef}>
                  <button 
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="focus:outline-none transition-transform active:scale-95"
                  >
                    {/* 🔥 這裡傳入 user，現在 UserAvatar 終於看得懂了！ */}
                    <UserAvatar user={user} styleType={1} size="md" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-3 w-64 bg-white rounded-xl shadow-2xl border border-slate-100 py-2 animate-scale-in origin-top-right z-50">
                      <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                        <p className="text-sm font-black text-slate-800 truncate">{user.email}</p>
                        <p className="text-xs text-slate-500 truncate font-mono">{userRole || 'Loading...'}</p>
                      </div>
                      
                      <button 
                        onClick={() => { setShowIDCard(true); setShowUserMenu(false); }}
                        className="w-full text-left px-4 py-3 text-sm font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-600 flex items-center transition-colors"
                      >
                        <CreditCard size={16} className="mr-3 text-blue-500"/> 我的數位 ID
                      </button>

                      <div className="border-t border-slate-100 my-1"></div>

                      <button onClick={handleLogout} className="w-full text-left px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 flex items-center transition-colors">
                        <LogOut size={16} className="mr-3"/> 安全登出
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link to="/login" className="text-sm font-bold text-blue-600 hover:text-blue-800">登入</Link>
              )}
            </div>

            <div className="flex items-center md:hidden">
              <button onClick={() => setIsOpen(!isOpen)} className="text-slate-500 hover:text-slate-800 p-2">
                {isOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {isOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-xl z-40">
            {user && (
                <div className="px-4 pt-4 pb-2 flex items-center border-b border-slate-100 mb-2 bg-slate-50">
                    <UserAvatar user={user} styleType={1} size="sm" className="mr-3"/>
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

      {showIDCard && <DigitalIDCard user={user} role={userRole} onClose={() => setShowIDCard(false)} />}
    </>
  )
}