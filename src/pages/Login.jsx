import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, Activity, Share, Smartphone, Download, 
  MoreHorizontal, ArrowDown, ExternalLink, PlusSquare
} from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  // 🟢 環境狀態
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null) 
  const [showIOSGuide, setShowIOSGuide] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || window.opera
    
    // 1. 偵測內建瀏覽器
    if (/Line|FBAN|FBAV|Instagram/i.test(ua)) {
        setIsInAppBrowser(true)
    }

    // 2. 偵測 iOS
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
        setIsIOS(true)
    }

    // 3. 偵測 Android 安裝事件
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 4. 偵測 App 模式
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
    }

    // 5. 檢查登入
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

  // 🚀 超級防呆安裝邏輯
  const handleInstallApp = async () => {
    if (isIOS) {
        setShowIOSGuide(true)
    } else if (deferredPrompt) {
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') setDeferredPrompt(null)
    } else {
        alert("若您使用 Android，請點擊瀏覽器選單中的「安裝應用程式」。\n若您使用 iOS，請使用 Safari 的「加入主畫面」。")
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* 背景光暈 */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 left-0 w-80 h-80 bg-blue-600 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
          <div className="absolute bottom-0 right-0 w-80 h-80 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] animate-pulse"></div>
      </div>

      {/* 🍎 iOS 視覺強迫引導遮罩 (正中央戰術版) */}
      {showIOSGuide && (
          <div 
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-lg flex flex-col items-center justify-center animate-fade-in"
            onClick={() => setShowIOSGuide(false)}
          >
              <div className="relative z-10 text-center px-4 w-full max-w-sm space-y-8 mt-[-10vh]">
                  
                  {/* 第一段說明 */}
                  <div className="space-y-3 text-slate-300 text-lg font-bold">
                      <p>找到全畫面中，網址列</p>
                      <div className="flex items-center justify-center gap-2 text-white text-xl bg-white/10 py-3 rounded-xl border border-white/10">
                          <Share className="w-6 h-6 text-blue-400" />
                          <span>分享畫面</span>
                      </div>
                      <p>按下後，選擇</p>
                  </div>

                  {/* 核心目標：加入主畫面 (特大號) */}
                  <div className="animate-pulse">
                      <div className="inline-flex items-center justify-center gap-3 bg-white/10 border-2 border-yellow-400/50 text-white px-8 py-6 rounded-3xl backdrop-blur-xl shadow-[0_0_30px_rgba(250,204,21,0.3)]">
                          <PlusSquare className="w-10 h-10 text-yellow-400" />
                          <span className="text-4xl font-black tracking-widest text-yellow-400 drop-shadow-md">
                              加入主畫面
                          </span>
                      </div>
                  </div>
              </div>

              {/* 超長手繪風箭頭 SVG (指向底部) */}
              <svg className="absolute bottom-0 left-0 w-full h-[40%] pointer-events-none z-0" viewBox="0 0 400 400" fill="none" preserveAspectRatio="none">
                {/* 箭頭路徑：從中間偏上(文字區) 指向 底部中間(瀏覽器Bar) */}
                <path d="M200,20 C 200,150 200,250 200,380" stroke="white" strokeWidth="4" strokeLinecap="round" strokeDasharray="10 10" className="opacity-50" />
                {/* 箭頭頭部 */}
                <path d="M200,380 L 180,350 M 200,380 L 220,350" stroke="white" strokeWidth="4" strokeLinecap="round" className="animate-bounce" />
                 {/* 底部波紋 */}
                <circle cx="200" cy="380" r="20" fill="white" opacity="0.2" className="animate-ping"/>
              </svg>

              <div className="absolute bottom-10 text-sm text-slate-500 font-mono">點擊任意處關閉</div>
          </div>
      )}

      {/* 主卡片 */}
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-8 relative z-10">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-4xl font-black text-white">I</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-wider">IRON MEDIC</h1>
          <div className="flex items-center mt-2 space-x-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold tracking-widest border border-blue-500/30">ENTERPRISE SYSTEM</span>
          </div>
        </div>

        {/* 🔄 狀態分流 */}
        {isInAppBrowser ? (
            <div className="bg-slate-900/80 border border-red-500/30 rounded-2xl p-6 text-center animate-fade-in">
                <Smartphone className="text-red-400 w-12 h-12 mx-auto mb-4 animate-pulse"/>
                <h3 className="text-xl font-bold text-white mb-2">請切換瀏覽器</h3>
                <p className="text-slate-400 text-sm mb-6">
                    LINE / FB 瀏覽器不支援安全驗證。<br/>
                    請點擊右上角選單，選擇：
                </p>
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
                
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <Shield className="text-green-400 mb-2" size={28} />
                        <h3 className="text-white font-bold text-sm">企業級資安</h3>
                    </div>
                    <div className="flex flex-col items-center p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <Activity className="text-blue-400 mb-2" size={28} />
                        <h3 className="text-white font-bold text-sm">即時戰情同步</h3>
                    </div>
                </div>

                {/* 1. Google 登入 (Web 版) */}
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
                
                {/* 電腦網頁版適用提示 */}
                <p className="text-center text-red-400/80 font-bold text-lg tracking-widest mt-[-10px]">
                    電腦網頁版適用
                </p>

                {/* 2. PWA 安裝按鈕 (巨像化 40% UP) */}
                {!isStandalone && (
                    <button
                        onClick={handleInstallApp}
                        // 調整：py-10 (巨大高度), rounded-3xl
                        className="w-full bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-600 hover:to-purple-600 border-2 border-blue-400/50 text-white py-10 rounded-3xl transition-all active:scale-95 flex items-center justify-center shadow-2xl group relative overflow-hidden ring-4 ring-blue-500/20 mt-4"
                    >
                        {/* 光掃動畫 */}
                        <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:animate-shine"></div>
                        
                        <div className="mr-6 bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                            <Download className="w-10 h-10 text-white drop-shadow-md" />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <span className="text-3xl font-black tracking-wide drop-shadow-md">
                                {isIOS ? '下載 iOS App' : '一鍵安裝 App'}
                            </span>
                            <span className="text-base text-blue-100 opacity-90 mt-2 font-bold flex items-center">
                                <Download size={16} className="mr-1"/> 支援「加入主畫面」安裝 App
                            </span>
                        </div>
                    </button>
                )}

                <div className="text-center">
                    <p className="text-slate-500 text-xs mt-4">
                        登入即代表您同意本系統之隱私權政策
                    </p>
                </div>

            </div>
        )}

      </div>
      
      <div className="absolute bottom-6 text-slate-500 text-[10px] font-mono tracking-[0.2em]">
          V2.4.0 COLOSSUS
      </div>
    </div>
  )
}