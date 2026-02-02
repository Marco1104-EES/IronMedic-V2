import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Mail, Zap, Loader2, ShieldCheck } from 'lucide-react'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true) // 身分識別中
  const [email, setEmail] = useState('')
  const navigate = useNavigate()

  // 🛡️ 核心攔截邏輯
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session) {
        // 🟢 已登入：彈射到「賽事首頁」，不是後台！
        console.log('指揮官/會員已登入，前往賽事大廳...')
        navigate('/home', { replace: true }) 
      } else {
        // 🔴 未登入：顯示登入框
        setVerifying(false)
      }
    }

    checkSession()
  }, [navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/home`, // 登入成功後也去 home
        },
      })
      if (error) throw error
      alert('🚀 魔法連結已發射！請檢查您的信箱。')
    } catch (error) {
      alert(error.error_description || error.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home`, // Google 登入後也去 home
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      })
      if (error) throw error
    } catch (error) {
      alert(error.message)
    }
  }

  // ✨ 身分識別中的過場畫面
  if (verifying) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl flex flex-col items-center animate-pulse">
           <ShieldCheck size={48} className="text-blue-600 mb-4"/>
           <h2 className="text-xl font-bold text-gray-800">正在驗證身份...</h2>
           <p className="text-xs text-gray-400 mt-2 font-mono">SECURITY CHECK IN PROGRESS</p>
        </div>
      </div>
    )
  }

  // --- 登入介面 ---
  return (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 transform transition-all hover:scale-[1.01]">
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-900/20">
            <Zap className="text-yellow-400 fill-yellow-400" size={32} />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">醫護鐵人賽事系統</h1>
          <p className="text-sm text-gray-500 mt-2 font-bold">請先登入以繼續</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center bg-white border-2 border-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all mb-6 group"
        >
          <img 
            src="https://www.google.com/favicon.ico" 
            alt="Google" 
            className="w-5 h-5 mr-3 group-hover:scale-110 transition-transform"
          />
          使用 Google 帳號登入
        </button>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white text-gray-400 font-mono text-xs">或使用 Email</span>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <div className="relative">
              <input
                type="email"
                placeholder="請輸入您的 Email"
                className="w-full pl-4 pr-4 py-3.5 bg-gray-50 border-2 border-transparent focus:bg-white focus:border-blue-500 rounded-xl outline-none transition-all text-sm font-bold text-gray-800 placeholder:font-normal"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-900/20 flex items-center justify-center transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2" size={20} />
                發射連結...
              </>
            ) : (
              <>
                寄送魔法連結 ✨
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}