import { useState } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Shield, Loader2, Mail, ArrowRight } from 'lucide-react'

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      // 使用 Magic Link (電子郵件連結) 登入
      const { error } = await supabase.auth.signInWithOtp({
        email: email,
        options: {
          // 登入成功後跳轉回 Admin 儀表板
          emailRedirectTo: window.location.origin + '/admin/dashboard',
        },
      })

      if (error) throw error

      setMessage('🚀 登入連結已寄出！請去收信，點擊連結即可進入戰情中心。')
    } catch (error) {
      setMessage('⛔ 登入失敗: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-down">
        {/* Header */}
        <div className="bg-blue-600 p-8 text-center">
          <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <Shield className="text-blue-600" size={32} />
          </div>
          <h1 className="text-2xl font-black text-white tracking-wider">IRON MEDIC</h1>
          <p className="text-blue-100 text-sm mt-1">戰情指揮中心</p>
        </div>

        {/* Body */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-6 text-center">指揮官登入</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-500 mb-1">Email 信箱</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={20}/>
                <input 
                  type="email" 
                  required
                  placeholder="name@example.com" 
                  className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-700"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin"/> : <>發送登入連結 <ArrowRight size={18}/></>}
            </button>
          </form>

          {/* 訊息提示區 */}
          {message && (
            <div className={`mt-6 p-4 rounded-xl text-sm font-bold ${message.includes('失敗') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600 animate-pulse'}`}>
              {message}
            </div>
          )}
          
          <div className="mt-8 text-center text-xs text-slate-400">
            僅限授權人員存取 | System V10.3
          </div>
        </div>
      </div>
    </div>
  )
}