import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { LogOut, User, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function UserLayout({ children }) {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  
  // 👑 絕對白名單 (備用鑰匙)
  const VIP_EMAILS = [
      'marco1104@gmail.com', 
      'mark780502@gmail.com',
      'pianopub1130@gmail.com' // 您的測試帳號
  ]

  useEffect(() => {
    const checkPrivilege = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. 先查白名單 (直接放行)
      if (VIP_EMAILS.includes(user.email)) {
          setIsAdmin(true)
          return
      }

      // 2. 再查資料庫 (一般邏輯)
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()
      
      if (data?.role === 'SUPER_ADMIN' || data?.role === 'EVENT_MANAGER') {
          setIsAdmin(true)
      }
    }
    checkPrivilege()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/home')}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black mr-3 shadow-md">I</div>
          <span className="font-black text-slate-800 text-lg tracking-wide hidden md:block">IRON MEDIC</span>
        </div>
        
        <div className="flex gap-2 md:gap-4 items-center">
            {isAdmin && (
                <button 
                    onClick={() => navigate('/admin/dashboard')} 
                    className="flex items-center px-3 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-md hover:shadow-xl transform active:scale-95 transition-all border border-rose-500 font-bold text-xs md:text-sm animate-pulse"
                >
                    <ShieldAlert size={16} className="mr-1 md:mr-2"/>
                    <span>戰情室</span>
                </button>
            )}
            <div className="h-6 w-px bg-slate-200 mx-1"></div>
            <button onClick={() => navigate('/profile')} className="flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <User size={20}/>
            </button>
            <button onClick={handleLogout} className="flex items-center justify-center p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <LogOut size={20}/>
            </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
        {children}
      </main>
    </div>
  )
}