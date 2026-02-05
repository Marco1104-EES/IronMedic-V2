import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { Menu, X, User, LogOut, LayoutDashboard } from 'lucide-react'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
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

    return () => subscription.unsubscribe()
  }, [])

  const fetchUserRole = async (uid) => {
      const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', uid)
          .single()
      
      if (data) setUserRole(data.role)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const isAdmin = userRole === 'SUPER_ADMIN' || userRole === 'EVENT_MANAGER'

  return (
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
                <Link to="/admin/dashboard" className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5">
                    <LayoutDashboard size={16} className="mr-2"/>
                    進入戰情中心
                </Link>
            )}

            {user ? (
              <div className="flex items-center space-x-4 ml-4">
                <span className="text-sm font-bold text-slate-600 hidden lg:block">{user.email}</span>
                <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <LogOut size={20}/>
                </button>
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
        <div className="md:hidden bg-white border-t border-slate-100 absolute w-full shadow-xl">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {isAdmin && (
                <Link to="/admin/dashboard" className="block px-3 py-4 rounded-md text-base font-bold text-white bg-blue-600 mb-2 flex items-center justify-center">
                    <LayoutDashboard size={18} className="mr-2"/> 進入戰情中心
                </Link>
            )}
            <Link to="/home" className="block px-3 py-2 rounded-md text-base font-medium text-slate-700 hover:bg-slate-50">首頁</Link>
            {user && (
                <button onClick={handleLogout} className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-red-600 hover:bg-red-50">
                    登出系統
                </button>
            )}
          </div>
        </div>
      )}
    </nav>
  )
}