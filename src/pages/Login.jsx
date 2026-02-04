import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Shield, Activity, Share, ExternalLink, Smartphone, Download, MoreHorizontal } from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  // 偵測環境
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    
    // 1. 偵測內建瀏覽器 (LINE, FB, IG)
    if (/Line|FBAN|FBAV|Instagram/i.test(userAgent)) {
        setIsInAppBrowser(true)
    }

    // 2. 偵測 iOS (為了顯示不同的教學圖示)
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        setIsIOS(true)
    }

    // 3. 檢查登入狀態
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        navigate('/home')
      }
    }
    checkUser()
  }, [navigate])

  const handleLogin = async () => {
    // 雙重防禦：如果按鈕沒被隱藏，點擊時再次檢查
    if (isInAppBrowser) {
        alert("請依照畫面指示，切換至 Chrome/Safari 開啟以進行登入")
        return
    }

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
      
      {/* 背景裝飾 (動態網格) - 您的原始設計保留 */}
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
          <p className="text-blue-200 text-sm font-mono mt-2 tracking-widest">ENTERPRISE SYSTEM</p>
        </div>

        {/* 🚀 PWA 戰術引導層：如果是 LINE/FB，顯示此區塊 */}
        {isInAppBrowser ? (
            <div className="bg-slate-800/80 border border-blue-500/30 rounded-xl p-6 text-center animate-fade-in">
                <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Smartphone className="text-blue-400" size={24}/>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">啟動 App 安全模式</h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    為確保 Google 帳號安全與資料同步，<br/>
                    請切換至系統瀏覽器以繼續。
                </p>
                
                {/* 動態教學區：根據 iOS/Android 顯示不同指引 */}
                <div className="bg-black/40 p-4 rounded-lg text-left text-sm text-white space-y-3 border border-white/5">
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mr-3 text-xs font-bold shadow-sm">1</span>
                        <span className="flex items-center">
                            點擊右上角的 
                            {isIOS ? <Share size={16} className="mx-1.5 text-blue-300"/> : <MoreHorizontal size={16} className="mx-1.5 text-blue-300"/>} 
                            圖示
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mr-3 text-xs font-bold shadow-sm">2</span>
                        <span className="flex items-center">
                            選擇 
                            <span className="mx-1.5 font-bold text-blue-300 border-b border-blue-300/50">
                                {isIOS ? '以瀏覽器開啟' : '以其他應用程式開啟'}
                            </span>
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-green-600 flex items-center justify-center mr-3 text-xs font-bold shadow-sm">3</span>
                        <span>登入後可選擇「加入主畫面」</span>
                    </div>
                </div>

                <div className="mt-4 flex justify-center text-xs text-slate-500 font-mono items-center">
                    <Shield size={10} className="mr-1"/> Google OAuth 2.0 Security
                </div>
            </div>
        ) : (
            /* ✅ 正常環境：顯示登入按鈕 */
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                        <Shield className="text-green-400 mb-2" size={24} />
                        <h3 className="text-white font-bold text-xs">企業級資安</h3>
                    </div>
                    <div className="flex flex-col items-center p-3 bg-white/5 rounded-xl border border-white/10 text-center">
                        <Activity className="text-blue-400 mb-2" size={24} />
                        <h3 className="text-white font-bold text-xs">即時戰情同步</h3>
                    </div>
                </div>

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full bg-white hover:bg-blue-50 text-slate-900 font-bold py-4 rounded-xl transition-all transform active:scale-95 flex items-center justify-center shadow-xl shadow-blue-900/20 group relative overflow-hidden"
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
                    ) : (
                        <>
                            <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 mr-3" />
                            <span className="text-lg">Google 登入 / 註冊</span>
                        </>
                    )}
                </button>
                
                <div className="text-center space-y-2">
                    <p className="text-slate-500 text-xs">
                        登入即代表您同意本系統之隱私權政策
                    </p>
                    {/* PWA 提示 (如果是正常瀏覽器，提示可以安裝) */}
                    <div className="inline-flex items-center text-[10px] text-blue-300/70 bg-blue-900/20 px-2 py-1 rounded-full">
                        <Download size={10} className="mr-1"/> 支援「加入主畫面」安裝 App
                    </div>
                </div>
            </div>
        )}

      </div>
      
      <div className="absolute bottom-4 text-slate-600 text-[10px] font-mono tracking-widest">
          V2.0.1 PWA READY
      </div>
    </div>
  )
}