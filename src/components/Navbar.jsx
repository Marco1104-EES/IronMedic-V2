import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { LogOut, User, LayoutDashboard, Home, Users } from 'lucide-react'
import UserAvatar from './UserAvatar' // 引入超酷頭像

export default function Navbar() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState(128)
  
  // ✨ 讀取頭像設定
  const [avatarStyle, setAvatarStyle] = useState(1)

  useEffect(() => {
    checkUser()
    // 監聽 localStorage 變化 (為了即時更新)
    const updateStyle = () => {
       const saved = localStorage.getItem('avatar_style')
       if (saved) setAvatarStyle(parseInt(saved))
    }
    updateStyle()
    window.addEventListener('storage', updateStyle) // 監聽

    const interval = setInterval(() => {
      setOnlineUsers(prev => Math.max(100, Math.min(200, prev + Math.floor(Math.random() * 5) - 2)))
    }, 3000)

    return () => {
      clearInterval(interval)
      window.removeEventListener('storage', updateStyle)
    }
  }, [])

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      setUser(session.user)
      // 這裡也可以再次確認 localStorage，確保登入後同步
      const saved = localStorage.getItem('avatar_style')
      if (saved) setAvatarStyle(parseInt(saved))
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setDropdownOpen(false)
    navigate('/login')
  }

  const displayName = user?.email ? user.email.split('@')[0] : '會員'
  const initial = displayName.charAt(0).toUpperCase()

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          
          {/* 左側：Logo + 首頁 */}
          <div className="flex items-center gap-6">
            <Link to="/" className="flex items-center group">
              <div className="bg-blue-600 text-white p-1.5 rounded-lg mr-2 group-hover:bg-blue-700 transition-colors">
                <span className="font-bold text-lg tracking-tighter">I</span>
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-xl text-blue-900 leading-none">IRON MEDIC</span>
                <span className="text-[10px] text-gray-500 tracking-wider">醫護鐵人賽事系統</span>
              </div>
            </Link>
            <Link to="/" className="hidden md:flex items-center text-gray-600 hover:text-blue-600 font-bold text-sm">
              <Home size={16} className="mr-1.5"/> 賽事首頁
            </Link>
          </div>

          {/* 右側：線上人數 + 會員 */}
          <div className="flex items-center gap-4">
            
            <div className="hidden md:flex items-center bg-green-50 px-3 py-1.5 rounded-full border border-green-100 shadow-sm">
               <div className="relative mr-2">
                 <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                   <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                   <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                 </span>
                 <Users size={14} className="text-green-700"/>
               </div>
               <span className="text-xs font-bold text-green-800 font-mono">線上: {onlineUsers}</span>
            </div>

            <div className="hidden md:block h-6 w-px bg-gray-200"></div>

            {user ? (
              <div className="relative">
                <button 
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center space-x-3 focus:outline-none hover:bg-gray-50 p-1 rounded-xl transition-all border border-transparent hover:border-gray-200"
                >
                  {/* ✨ 黃金版位：名字在左，文字靠右 */}
                  <div className="text-right hidden sm:block mr-1">
                    <div className="text-[10px] text-blue-500 font-black uppercase tracking-widest">IRON MEMBER</div>
                    <div className="text-sm font-bold text-gray-800 leading-none">{displayName}</div>
                  </div>
                  
                  {/* ✨ 酷炫頭像 (使用新元件) */}
                  <UserAvatar styleType={avatarStyle} text={initial} size="md" />
                </button>

                {dropdownOpen && (
                  <div className="absolute right-0 mt-3 w-60 bg-white rounded-xl shadow-xl py-2 border border-gray-100 animate-fade-in-down origin-top-right z-50">
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                      <p className="text-xs text-gray-500">登入帳號</p>
                      <p className="text-sm font-bold text-gray-800 truncate">{user.email}</p>
                    </div>
                    
                    <Link to="/profile" className="block px-4 py-3 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 flex items-center transition-colors">
                      <User size={16} className="mr-3"/> 
                      <div>
                        <span className="block font-bold">個人檔案 / 數位ID</span>
                        <span className="text-xs text-gray-400">更換您的頭像風格</span>
                      </div>
                    </Link>

                    {(user.email?.includes('admin') || user.email?.includes('medic') || user.email?.includes('marco')) && (
                      <Link to="/admin" className="block px-4 py-3 text-sm text-purple-600 hover:bg-purple-50 font-bold flex items-center transition-colors">
                        <LayoutDashboard size={16} className="mr-3"/> 進入企業後台
                      </Link>
                    )}

                    <button 
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center border-t border-gray-100 mt-1"
                    >
                      <LogOut size={16} className="mr-3"/> 登出系統
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="text-sm font-bold text-gray-600 hover:text-blue-600 px-3 py-2">登入</Link>
                <Link to="/login" className="bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-700 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5">
                  註冊
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}