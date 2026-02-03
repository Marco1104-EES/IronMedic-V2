import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { 
  LayoutDashboard, Trophy, Users, Upload, Shield, Terminal, 
  Menu, X, LogOut, Home 
} from 'lucide-react'

export default function AdminLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  // 🛠️ 企業級標準導航命名
  const menuItems = [
    // 1. 營運總覽 -> 系統運作全方位
    { icon: LayoutDashboard, label: '系統運作全方位', path: '/admin/dashboard' },
    // 2. 賽事管理 -> 賽事管理系統
    { icon: Trophy, label: '賽事管理系統', path: '/admin/events' }, 
    // 3. 會員中心 -> 會員資料中心
    { icon: Users, label: '會員資料中心', path: '/admin/users' },
    // 4. 資料匯入 -> 資料匯入中心
    { icon: Upload, label: '資料匯入中心', path: '/admin/import' },
    // 5. 權限設定 -> 權限管理 (IAM)
    { icon: Shield, label: '權限管理 (IAM)', path: '/admin/permissions' },
    // 6. 系統日誌 -> 系統操作日誌
    { icon: Terminal, label: '系統操作日誌', path: '/admin/logs' },
  ]

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* 手機版遮罩 */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* 側邊欄 Sidebar */}
      <aside 
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] text-slate-300 transition-transform duration-300 ease-in-out shadow-2xl
          md:static md:translate-x-0 
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-slate-800 bg-[#0f172a]">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black mr-3">I</div>
          <div>
            <h1 className="text-white font-black text-lg leading-none">IRON MEDIC</h1>
            {/* 修正：ENTERPRISE SYSTEM (取代後臺管理系統) */}
            <span className="text-[10px] text-blue-400 font-bold tracking-wider">ENTERPRISE SYSTEM</span>
          </div>
          <button onClick={closeMobileMenu} className="md:hidden ml-auto text-slate-400 hover:text-white"><X size={20} /></button>
        </div>

        {/* 選單列表 */}
        <nav className="p-4 space-y-2 overflow-y-auto h-[calc(100vh-140px)] custom-scrollbar">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path
            return (
              <Link 
                key={item.path} 
                to={item.path}
                onClick={closeMobileMenu}
                className={`
                  flex items-center px-4 py-3 rounded-xl transition-all duration-200 font-bold text-sm
                  ${isActive 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
                    : 'hover:bg-slate-800 hover:text-white'
                  }
                `}
              >
                <item.icon size={18} className="mr-3" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* 底部按鈕 */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-[#0f172a] border-t border-slate-800 space-y-2">
            {/* 修正：返回賽事介面 */}
            <Link to="/home" className="flex items-center justify-center w-full py-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white text-xs font-bold transition-all">
                <Home size={14} className="mr-2"/> 返回賽事介面
            </Link>
            <button onClick={handleLogout} className="flex items-center justify-center w-full py-2 rounded-lg border border-red-900/30 text-red-400 hover:bg-red-900/20 text-xs font-bold transition-all">
                <LogOut size={14} className="mr-2"/> 安全登出
            </button>
        </div>
      </aside>

      {/* 主內容區 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        <header className="md:hidden flex items-center bg-white border-b border-slate-200 px-4 h-16 shrink-0 sticky top-0 z-30">
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 -ml-2 text-slate-600"><Menu size={24} /></button>
          <span className="ml-3 font-black text-slate-800 text-lg">IRON MEDIC</span>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 custom-scrollbar">
          <div className="max-w-7xl mx-auto min-h-full">
             {children}
          </div>
        </main>
      </div>
    </div>
  )
}