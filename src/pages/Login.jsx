import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, Activity, Share, Smartphone, Download, 
  MoreHorizontal, PlusSquare, ArrowDownCircle, Monitor, MousePointerClick
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

      {/* 🍎 iOS 視覺強迫引導遮罩 (精準打擊版) */}
      {showIOSGuide && (
          <div 
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-lg flex flex-col animate-fade-in"
            onClick={() => setShowIOSGuide(false)}
          >
              {/* 上半部：圖文步驟引導 */}
              <div className="flex-1 flex flex-col justify-center items-center px-6 space-y-8">
                  <h2 className="text-2xl font-black text-white mb-4 text-center drop-shadow-md">
                      👇 請依照以下步驟操作
                  </h2>
                  
                  <div className="space-y-6 w-full max-w-sm">
                      {/* 步驟 1 */}
                      <div className="flex items-center bg-white/10 p-4 rounded-2xl border border-white/10">
                          <span className="w-10 h-10 bg-blue-600 flex items-center justify-center rounded-full font-black text-xl mr-4 shrink-0">1</span>
                          <p className="text-lg text-slate-200 font-bold">
                              找到全畫面中的<br/><span className="text-white">網址列</span>
                          </p>
                      </div>

                      {/* 步驟 2 */}
                      <div className="flex items-center bg-white/10 p-4 rounded-2xl border border-white/10 animate-pulse">
                          <span className="w-10 h-10 bg-blue-600 flex items-center justify-center rounded-full font-black text-xl mr-4 shrink-0">2</span>
                          <p className="text-lg text-slate-200 font-bold flex items-center flex-wrap">
                              按下這一個
                              <span className="mx-2 bg-white/20 p-2 rounded-lg border border-white/30">
                                <Share className="w-6 h-6 text-blue-400" />
                              </span>
                              <span className="text-white">分享畫面</span>
                          </p>
                      </div>

                      {/* 步驟 3 */}
                      <div className="flex items-center bg-white/10 p-4 rounded-2xl border border-white/10">
                          <span className="w-10 h-10 bg-green-600 flex items-center justify-center rounded-full font-black text-xl mr-4 shrink-0">3</span>
                          <p className="text-lg text-slate-200 font-bold flex items-center flex-wrap">
                              再選擇
                              <span className="mx-2 bg-white/20 p-2 rounded-lg border border-white/30">
                                <PlusSquare className="w-6 h-6 text-yellow-400" />
                              </span>
                              <span className="text-white">加入主畫面</span>
                          </p>
                      </div>
                  </div>
              </div>

              {/* 下半部：底部視覺聚焦區 (取代虛線箭頭) */}
              <div className="h-[25vh] relative flex justify-center items-end pb-8 bg-gradient-to-t from-black via-black/50 to-transparent">
                  <div className="absolute inset-x-0 bottom-0 h-20 bg-white/10 animate-pulse"></div>
                  <div className="flex flex-col items-center relative z-10 animate-bounce">
                      <ArrowDownCircle className="w-12 h-12 text-white drop-shadow-lg mb-2"/>
                      <p className="text-white font-bold tracking-widest bg-black/50 px-4 py-2 rounded-full">按鈕在這裡</p>
                  </div>
                  <div className="absolute bottom-10 text-sm text-slate-500 font-mono">點擊畫面任意處關閉教學</div>
              </div>
          </div>
      )}

      {/* 主卡片 */}
      <div className="max-w-md w-full bg-white/10 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl p-6 md:p-8 relative z-10">
        
        {/* Logo - 手機版稍微縮小邊距 */}
        <div className="flex flex-col items-center mb-6 md:mb-8">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
            <span className="text-3xl md:text-4xl font-black text-white">I</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-black text-white tracking-wider">IRON MEDIC</h1>
          <div className="flex items-center mt-2 space-x-2">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-bold tracking-widest border border-blue-500/30">ENTERPRISE SYSTEM</span>
          </div>
        </div>

        {/* 🔄 狀態分流 */}
        {isInAppBrowser ? (
            /* LINE/FB 阻擋頁 - 保持不變 */
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
            /* ✅ 正常登入區 - 戰術重構 */
            <div className="space-y-5 md:space-y-6">
                
                {/* 資安圖示區 - 手機版縮小間距，更緊湊 */}
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

                {/* 1. Google 登入 (響應式文案戰術) */}
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full bg-white hover:bg-slate-50 text-slate-900 font-bold py-4 md:py-5 rounded-2xl transition-all active:scale-95 flex items-center justify-center shadow-lg group relative overflow-hidden"
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
                    ) : (
                        <>
                            <img src="https://www.google.com/favicon.ico" alt="G" className="w-6 h-6 mr-3" />
                            <span className="text-xl">
                                {/* 🟢 戰術核心：手機顯示短文案，電腦顯示長文案 */}
                                <span className="md:hidden">Google 登入</span>
                                <span className="hidden md:inline">Google 登入 (電腦網頁版)</span>
                            </span>
                            {/* 電腦版額外圖示提示 */}
                            <Monitor size={18} className="hidden md:block ml-2 text-slate-400"/>
                        </>
                    )}
                </button>

                {/* 2. PWA 安裝按鈕 (巨大化，但高度收斂至 py-8 以協調手機版面) */}
                {!isStandalone && (
                    <button
                        onClick={handleInstallApp}
                        className="w-full bg-gradient-to-r from-blue-600/90 to-purple-600/90 hover:from-blue-600 hover:to-purple-600 border-2 border-blue-400/50 text-white py-8 rounded-3xl transition-all active:scale-95 flex items-center justify-center shadow-2xl group relative overflow-hidden ring-4 ring-blue-500/20"
                    >
                        {/* 光掃動畫 */}
                        <div className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 group-hover:animate-shine"></div>
                        
                        <div className="mr-5 bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                            <Download className="w-10 h-10 text-white drop-shadow-md animate-bounce" />
                        </div>
                        <div className="flex flex-col items-start leading-tight">
                            <span className="text-3xl font-black tracking-wide drop-shadow-md">
                                {isIOS ? '下載 iOS App' : '一鍵安裝 App'}
                            </span>
                            <span className="text-sm text-blue-100 opacity-90 mt-2 font-bold flex items-center bg-blue-800/30 px-3 py-1 rounded-full">
                                <MousePointerClick size={16} className="mr-1"/> 
                                {isIOS ? '點擊查看傻瓜教學' : '獲得最佳全螢幕體驗'}
                            </span>
                        </div>
                    </button>
                )}

                {/* 移除底部的隱私權宣告，讓畫面更乾淨 */}

            </div>
        )}

      </div>
      
      <div className="absolute bottom-6 text-slate-500 text-[10px] font-mono tracking-[0.2em] opacity-50">
          V2.5.0 PRECISION HARMONY
      </div>
    </div>
  )
}