import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Shield, Activity, AlertTriangle, ExternalLink } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)

  // 🕵️‍♂️ 偵測是否為 LINE / Facebook / Instagram 等內建瀏覽器 (In-App Browser)
  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    // 常見的內建瀏覽器關鍵字
    if (/Line|FBAN|FBAV|Instagram/i.test(userAgent)) {
        setIsInAppBrowser(true)
    }
  }, [])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/home')
      }
    }
    checkUser()
  }, [navigate])

  const handleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/home`,
        },
      })
      if (error) throw error
    } catch (error) {
      alert('登入連線異常: ' + error.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* 背景裝飾 (動態網格) */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8 relative z-10">
        
        {/* Logo 區 */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-4 transform rotate-3 hover:rotate-0 transition-all duration-300">
            <span className="text-3xl font-black text-white">I</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-wider">IRON MEDIC</h1>
          <p className="text-blue-200 text-sm font-mono mt-2">醫護鐵人賽事系統</p>
        </div>

        {/* 🛑 防禦機制：如果是 LINE/FB 開啟，顯示引導教學，隱藏登入按鈕 */}
        {isInAppBrowser ? (
            <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center animate-pulse">
                <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                <h3 className="text-xl font-bold text-white mb-2">無法在此環境登入</h3>
                <p className="text-red-100 text-sm mb-4 leading-relaxed">
                    Google 安全政策限制：<br/>
                    無法在 LINE / Facebook 內建瀏覽器中進行驗證。
                </p>
                <div className="bg-black/30 p-3 rounded-lg text-left text-sm text-white">
                    <p className="font-bold mb-2 text-yellow-400">⚡️ 請依照以下步驟操作：</p>
                    <ol className="list-decimal pl-5 space-y-1 text-slate-200">
                        <li>點擊螢幕右上角的 <span className="font-bold border border-white/30 px-1 rounded">⋮</span> 或 <span className="font-bold border border-white/30 px-1 rounded">分享</span> 圖示</li>
                        <li>選擇 <span className="font-bold text-white flex items-center inline-flex"><ExternalLink size={12} className="mr-1"/> 以瀏覽器開啟</span> (Safari/Chrome)</li>
                        <li>在新開啟的視窗中登入</li>
                    </ol>
                </div>
            </div>
        ) : (
            /* ✅ 正常環境：顯示 Google 登入按鈕 */
            <div className="space-y-6">
                <div className="space-y-4">
                    <div className="flex items-center p-4 bg-white/5 rounded-xl border border-white/10">
                        <Shield className="text-green-400 mr-4" size={24} />
                        <div>
                            <h3 className="text-white font-bold text-sm">系統防護</h3>
                            <p className="text-slate-400 text-xs">SSL 加密傳輸 / Google 安全驗證</p>
                        </div>
                    </div>
                    <div className="flex items-center p-4 bg-white/5 rounded-xl border border-white/10">
                        <Activity className="text-blue-400 mr-4" size={24} />
                        <div>
                            <h3 className="text-white font-bold text-sm">即時同步</h3>
                            <p className="text-slate-400 text-xs">賽事狀態 / 資格審核即時更新</p>
                        </div>
                    </div>
                </div>

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-bold py-4 rounded-xl transition-all transform active:scale-95 flex items-center justify-center shadow-lg group relative overflow-hidden"
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
                    ) : (
                        <>
                            <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 mr-3" />
                            <span className="text-lg">使用 Google 帳號登入</span>
                        </>
                    )}
                </button>
                
                <p className="text-center text-slate-500 text-xs">
                    登入即代表您同意本系統之<br/>隱私權政策與服務條款
                </p>
            </div>
        )}

      </div>
      
      <div className="absolute bottom-4 text-slate-600 text-xs font-mono">
          V17.0 ENTERPRISE EDITION
      </div>
    </div>
  )
}