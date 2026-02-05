import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, Activity, Share, Smartphone, Download, 
  MoreHorizontal, PlusSquare, ArrowDownCircle
} from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null) 
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera
    if (/Line|FBAN|FBAV|Instagram/i.test(ua)) setIsInAppBrowser(true)
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) setIsIOS(true)
    
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    if (window.matchMedia('(display-mode: standalone)').matches) setIsStandalone(true)

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate('/home')
    })

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [navigate])

  const handleLogin = async () => {
    if (isInAppBrowser) {
        alert("請依照畫面指示，切換瀏覽器以進行登入")
        return
    }
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/home` },
      })
      if (error) throw error
    } catch (error) {
      alert('登入異常: ' + error.message)
      setLoading(false)
    }
  }

  const handleInstallApp = async () => {
    if (isIOS) {
        setShowIOSGuide(true)
    } else if (deferredPrompt) {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') setDeferredPrompt(null)
    } else {
        alert("請使用瀏覽器選單中的「安裝應用程式」或「加入主畫面」。")
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {showIOSGuide && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex flex-col animate-fade-in"
            onClick={() => setShowIOSGuide(false)}
          >
              <div className="mt-12 px-6 text-center space-y-4 relative z-20">
                  <h2 className="text-2xl font-black text-white drop-shadow-md">👇 找到全畫面中，網址列</h2>
                  <div className="inline-flex items-center bg-gray-800 border border-gray-600 px-5 py-3 rounded-xl text-white font-bold text-lg">
                      <Share className="w-5 h-5 mr-3 text-blue-400" /> 分享畫面
                  </div>
                  <p className="text-xl font-bold text-slate-300">按下後，選擇</p>
                  <div className="inline-flex items-center bg-gray-800 border border-yellow-500 px-5 py-3 rounded-xl text-yellow-400 font-black text-2xl shadow-[0_0_15px_rgba(234,179,8,0.3)]">
                      <PlusSquare className="w-6 h-6 mr-3" /> 加入主畫面
                  </div>
              </div>
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 400 800" preserveAspectRatio="none">
                  <path d="M280,180 Q 350,400 200,700" stroke="#ef4444" strokeWidth="8" fill="none" strokeLinecap="round" className="drop-shadow-lg"/>
                  <path d="M200,700 L 170,660 M 200,700 L 230,660" stroke="#ef4444" strokeWidth="8" fill="none" strokeLinecap="round" strokeJoin="round"/>
              </svg>
              <div className="absolute bottom-10 left-0 w-full flex flex-col items-center z-20">
                  <div className="bg-red-600 text-white font-black text-xl px-6 py-3 rounded-full mb-6 animate-bounce shadow-xl border-2 border-red-400">👇 點擊下方按鈕</div>
                  <p className="text-xs text-slate-500 font-mono">點擊畫面任意處關閉</p>
              </div>
          </div>
      )}

      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 relative z-10">
        <div className="flex flex-col items-center mb-6 md:mb-8">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-3xl md:text-4xl font-black text-white">I</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-wider">IRON MEDIC</h1>
          <div className="flex items-center mt-2 space-x-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold tracking-widest border border-blue-500/30">ENTERPRISE SYSTEM</span>
          </div>
        </div>

        {isInAppBrowser ? (
            <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl p-6 text-center animate-fade-in">
                <Smartphone className="text-red-400 w-12 h-12 mx-auto mb-4 animate-pulse"/>
                <h3 className="text-xl font-bold text-white mb-2">請切換瀏覽器</h3>
                <p className="text-slate-400 text-sm mb-6">LINE / FB 瀏覽器不支援安全驗證。</p>
                <div className="bg-black/40 p-4 rounded-xl text-left text-sm text-white space-y-3 border border-white/10">
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mr-3 text-xs font-bold">1</span>
                        <span>點擊 {isIOS ? <Share className="inline w-4 h-4"/> : <MoreHorizontal className="inline w-4 h-4"/>} 選單</span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mr-3 text-xs font-bold">2</span>
                        <span>選擇 <span className="font-bold text-yellow-400">以瀏覽器開啟</span></span>
                    </div>
                </div>
            </div>
        ) : (
            <div className="space-y-6">
                <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="flex flex-col items-center p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <Shield className="text-green-400 mb-1 md:mb-2" size={24} />
                        <h3 className="text-white font-bold text-xs md:text-sm">企業級資安</h3>
                    </div>
                    <div className="flex flex-col items-center p-3 md:p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <Activity className="text-blue-400 mb-1 md:mb-2" size={24} />
                        <h3 className="text-white font-bold text-xs md:text-sm">即時戰情同步</h3>
                    </div>
                </div>

                <div className="relative group">
                    <button
                        onClick={handleLogin}
                        disabled={loading}
                        className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold py-5 rounded-2xl transition-all active:scale-95 flex items-center justify-center shadow-lg"
                    >
                        {loading ? (
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
                        ) : (
                            <>
                                <img src="https://www.google.com/favicon.ico" alt="G" className="w-6 h-6 mr-3" />
                                <span className="text-xl">Google 登入 / 註冊</span>
                            </>
                        )}
                    </button>
                    <div className="absolute -bottom-3 right-4 bg-slate-800 text-red-400 text-[10px] font-black px-2 py-0.5 rounded border border-red-500/30 transform rotate-[-2deg]">電腦網頁版適用</div>
                </div>

                {!isStandalone && (
                    <button
                        onClick={handleInstallApp}
                        className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 border-2 border-blue-400/50 text-white py-8 rounded-3xl transition-all active:scale-95 flex flex-col items-center justify-center shadow-2xl group relative overflow-hidden ring-4 ring-blue-500/20"
                    >
                        <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:animate-shine"></div>
                        <div className="flex items-center mb-2">
                            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm mr-3">
                                <Download className="w-8 h-8 text-white animate-bounce" />
                            </div>
                            <span className="text-3xl font-black tracking-wide drop-shadow-md">一鍵安裝 App</span>
                        </div>
                        <span className="text-lg text-blue-100 font-bold bg-black/20 px-4 py-1 rounded-full flex items-center">
                            <ArrowDownCircle size={18} className="mr-2"/> 支援「加入主畫面」安裝 App
                        </span>
                    </button>
                )}
                <p className="text-center text-slate-500 text-xs mt-4">登入即代表您同意本系統之隱私權政策</p>
            </div>
        )}
      </div>
      <div className="absolute bottom-6 text-slate-500 text-[10px] font-mono tracking-[0.2em] opacity-50">V2.8.1 STABLE</div>
    </div>
  )
}