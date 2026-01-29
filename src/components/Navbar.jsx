import { Link, useNavigate } from 'react-router-dom'
import { LogIn, LayoutDashboard, User, LogOut, Home, ChevronDown } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'

export default function Navbar() {
  const [user, setUser] = useState(null)
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [profile, setProfile] = useState(null)
  const menuRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    // 1. 抓取使用者 & 詳細資料
    const getUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    getUserData()

    // 點擊外面關閉選單
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.reload()
  }

  return (
    <nav className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-18 py-3">
          
          {/* Logo 區 */}
          <div className="flex items-center">
            <Link to="/" className="flex items-center group">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-xl mr-3 shadow-lg group-hover:scale-105 transition-transform">
                I
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent">
                  IRON MEDIC
                </span>
                <span className="text-xs text-gray-500 font-medium tracking-wider">醫護鐵人賽事系統</span>
              </div>
            </Link>
          </div>

          {/* 右側功能區 */}
          <div className="flex items-center space-x-6">
            <Link to="/" className="hidden md:flex items-center text-gray-500 hover:text-blue-600 font-medium transition-colors">
              <Home size={18} className="mr-2" />
              賽事首頁
            </Link>

            {user ? (
              // --- 已登入：顯示頭像下拉選單 ---
              <div className="relative" ref={menuRef}>
                <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center space-x-3 focus:outline-none hover:bg-gray-50 p-2 rounded-xl transition-colors"
                >
                  <div className="text-right hidden md:block">
                    <div className="text-sm font-bold text-gray-800">{profile?.full_name || '會員'}</div>
                    <div className="text-xs text-gray-500">會員中心</div>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold shadow ring-2 ring-white">
                    {profile?.full_name?.[0] || user.email?.[0]?.toUpperCase()}
                  </div>
                  <ChevronDown size={16} className="text-gray-400" />
                </button>

                {/* 下拉選單本體 */}
                {isMenuOpen && (
                  <div className="absolute right-0 mt-3 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 animate-fade-in-down transform origin-top-right">
                    <div className="px-4 py-3 border-b border-gray-100 mb-2">
                      <p className="text-sm font-bold text-gray-800">登入帳號</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    
                    <Link to="/profile" className="flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors">
                      <User size={16} className="mr-3" />
                      個人檔案 / 參賽紀錄
                    </Link>

                    {/* 只有管理員才顯示這顆 */}
                    <Link to="/admin" className="flex items-center px-4 py-2.5 text-sm text-purple-700 hover:bg-purple-50 transition-colors">
                      <LayoutDashboard size={16} className="mr-3" />
                      進入企業後台
                    </Link>

                    <button 
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-2"
                    >
                      <LogOut size={16} className="mr-3" />
                      登出系統
                    </button>
                  </div>
                )}
              </div>
            ) : (
              // --- 未登入：顯示登入按鈕 ---
              <Link 
                to="/login" 
                className="flex items-center bg-gray-900 text-white px-5 py-2.5 rounded-full font-medium hover:bg-gray-800 transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <LogIn size={18} className="mr-2" />
                立即登入
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}