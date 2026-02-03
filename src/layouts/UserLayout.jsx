import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { LogOut, User, LayoutDashboard, ShieldAlert } from 'lucide-react' // 補上 ShieldAlert
import { useNavigate } from 'react-router-dom'

export default function UserLayout({ children }) {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  
  // 👑 絕對白名單 (上帝視角)
  // 不管資料庫壞了沒，這幾個 Email 登入就是看得到後台按鈕
  const VIP_EMAILS = [
      'marco1104@gmail.com', 
      'mark780502@gmail.com'
  ]

  useEffect(() => {
    const checkPrivilege = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // 1. 先查白名單 (最快，絕對有效)
      if (VIP_EMAILS.includes(user.email)) {
          console.log("👑 指揮官登入確認 (白名單)")
          setIsAdmin(true)
          return
      }

      // 2. 如果不在白名單，再查資料庫 (備用)
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
      {/* 頂部導航 */}
      <nav className="bg-white border-b border-gray-200 px-4 md:px-6 py-4 flex justify-between items-center shadow-sm sticky top-0 z-50">
        
        {/* Logo 區 */}
        <div className="flex items-center cursor-pointer" onClick={() => navigate('/home')}>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black mr-3 shadow-md">I</div>
          <span className="font-black text-slate-800 text-lg tracking-wide hidden md:block">IRON MEDIC</span>
        </div>
        
        {/* 右側功能區 */}
        <div className="flex gap-2 md:gap-4 items-center">
            
            {/* 🔥🔥🔥 後台戰情室按鈕 (絕對顯眼版) 🔥🔥🔥 */}
            {isAdmin && (
                <button 
                    onClick={() => navigate('/admin/dashboard')} 
                    className="flex items-center px-3 py-2 bg-rose-600 text-white hover:bg-rose-700 rounded-lg shadow-md hover:shadow-xl transform active:scale-95 transition-all border border-rose-500 font-bold text-xs md:text-sm animate-pulse"
                    title="進入後台指揮中心"
                >
                    <ShieldAlert size={16} className="mr-1 md:mr-2"/>
                    <span>戰情室</span>
                </button>
            )}

            {/* 分隔線 */}
            <div className="h-6 w-px bg-slate-200 mx-1"></div>

            {/* 個人中心 */}
            <button 
                onClick={() => navigate('/profile')} 
                className="flex items-center justify-center p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" 
                title="個人資料"
            >
                <User size={20}/>
            </button>

            {/* 登出 */}
            <button 
                onClick={handleLogout} 
                className="flex items-center justify-center p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" 
                title="登出"
            >
                <LogOut size={20}/>
            </button>
        </div>
      </nav>

      {/* 內容區 */}
      <main className="max-w-5xl mx-auto p-4 md:p-8 animate-fade-in">
        {children}
      </main>
    </div>
  )
}