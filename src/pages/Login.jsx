import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { 
  Shield, Activity, Share, Smartphone, Download, 
  MoreHorizontal, PlusSquare, ArrowDown 
} from 'lucide-react'

export default function Login() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  
  // 🟢 環境與安裝狀態偵測
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)
  const [isIOS, setIsIOS] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null) // Android 安裝事件
  const [showIOSGuide, setShowIOSGuide] = useState(false)    // iOS 動畫指引開關
  const [isStandalone, setIsStandalone] = useState(false)    // 是否已經是 App 模式

  useEffect(() => {
    const userAgent = navigator.userAgent || navigator.vendor || window.opera
    
    // 1. 偵測內建瀏覽器 (LINE, FB, IG) - 用於顯示阻擋頁
    if (/Line|FBAN|FBAV|Instagram/i.test(userAgent)) {
        setIsInAppBrowser(true)
    }

    // 2. 偵測 iOS - 用於顯示特定的教學箭頭
    if (/iPad|iPhone|iPod/.test(userAgent) && !window.MSStream) {
        setIsIOS(true)
    }

    // 3. 偵測 Android PWA 安裝事件 (這是核心魔法)
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault()
      setDeferredPrompt(e) // 把安裝事件存起來，綁定到我們的按鈕上
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    // 4. 偵測是否已經是 App 模式 (如果是，就隱藏下載按鈕)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsStandalone(true)
    }

    // 5. 檢查登入
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) navigate('/home')
    }
    checkUser()

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [navigate])

  const handleLogin = async () => {
    if (isInAppBrowser) {
        alert("請依照畫面指示，切換至 Chrome/Safari 開啟以進行登入")
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
      alert('登入連線異常: ' + error.message)
      setLoading(false)
    }
  }

  // 🚀 智慧安裝按鈕邏輯
  const handleInstallApp = async () => {
    if (isIOS) {
        // iOS 戰術：開啟全螢幕遮罩 + 跳動箭頭
        setShowIOSGuide(true)
    } else if (deferredPrompt) {
        // Android 戰術：直接觸發系統安裝窗
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') {
            setDeferredPrompt(null)
        }
    } else {
        // 電腦版或不支援的環境
        alert("請使用 Chrome (Android) 或 Safari (iOS) 的「加入主畫面」功能來安裝 App。")
    }
  }

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      
      {/* 背景裝飾 */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute bottom-0 left-20 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      {/* 🍎 iOS 視覺強迫引導遮罩 (Super Foolproof Guide) */}
      {showIOSGuide && (
          <div 
            className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-end pb-8 animate-fade-in"
            onClick={() => setShowIOSGuide(false)} // 點擊任意處關閉
          >
              <div className="text-white text-center mb-4 px-6">
                  <p className="text-xl font-black mb-2 text-yellow-400">👇 點擊下方按鈕</p>
                  <p className="text-sm text-slate-300">
                      找到 <Share className="inline w-4 h-4 mx-1"/> 分享圖示 <br/>
                      然後選擇 <span className="font-bold text-white border border-white/30 px-1 rounded">加入主畫面</span>
                  </p>
              </div>
              
              {/* 跳動箭頭動畫 - 指向 Safari 底部中間的分享鈕 */}
              <div className="animate-bounce">
                  <ArrowDown size={48} className="text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]"/>
              </div>
              
              <div className="mt-8 text-xs text-slate-500 font-mono">點擊畫面任意處關閉</div>
          </div>
      )}

      <div className="max-w-md w-full bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 shadow-2xl p-8 relative z-10">
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg mb-4 transform rotate-3 hover:rotate-0 transition-all duration-300">
            <span className="text-3xl font-black text-white">I</span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-wider">IRON MEDIC</h1>
          <p className="text-blue-200 text-sm font-mono mt-2 tracking-widest">ENTERPRISE SYSTEM</p>
        </div>

        {/* 🛑 LINE/FB 阻擋頁 */}
        {isInAppBrowser ? (
            <div className="bg-slate-800/90 border border-blue-500/30 rounded-xl p-6 text-center animate-fade-in">
                <div className="w-12 h-12 bg-blue-600/20 rounded-full flex items-center justify-center mx-auto mb-3 animate-pulse">
                    <Smartphone className="text-blue-400" size={24}/>
                </div>
                
                <h3 className="text-xl font-bold text-white mb-2">啟動 App 安全模式</h3>
                <p className="text-slate-300 text-sm mb-6 leading-relaxed">
                    為確保 Google 帳號安全，<br/>請切換至系統瀏覽器。
                </p>
                
                <div className="bg-black/40 p-4 rounded-lg text-left text-sm text-white space-y-3 border border-white/5">
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mr-3 text-xs font-bold shadow-sm">1</span>
                        <span className="flex items-center">
                            點擊右上角的 
                            {isIOS ? <MoreHorizontal size={16} className="mx-1.5 text-blue-300"/> : <MoreHorizontal size={16} className="mx-1.5 text-blue-300"/>} 
                            圖示
                        </span>
                    </div>
                    <div className="flex items-center">
                        <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center mr-3 text-xs font-bold shadow-sm">2</span>
                        <span className="flex items-center">
                            選擇 <span className="mx-1.5 font-bold text-blue-300 border-b border-blue-300/50">{isIOS ? '以瀏覽器開啟' : '以其他應用程式開啟'}</span>
                        </span>
                    </div>
                </div>
            </div>
        ) : (
            /* ✅ 正常登入區 */
            <div className="space-y-4">
                
                {/* 1. Google 登入 (Web 版) */}
                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full bg-white hover:bg-blue-50 text-slate-900 font-bold py-4 rounded-xl transition-all transform active:scale-95 flex items-center justify-center shadow-xl shadow-blue-900/10 relative overflow-hidden"
                >
                    {loading ? (
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-slate-900"></div>
                    ) : (
                        <>
                            <img src="https://www.google.com/favicon.ico" alt="G" className="w-5 h-5 mr-3" />
                            <span className="text-base">Google 帳號登入 (Web)</span>
                        </>
                    )}
                </button>

                {/* 2. PWA 安裝按鈕 (超級顯眼版) */}
                {/* 只有在非 App 模式且 (是 Android 或 iOS) 時才顯示 */}
                {!isStandalone && (isIOS || deferredPrompt) && (
                    <button
                        onClick={handleInstallApp}
                        className="w-full bg-blue-600/20 backdrop-blur-md border border-blue-400/50 text-white font-bold py-4 rounded-xl transition-all transform active:scale-95 flex items-center justify-center shadow-lg group hover:bg-blue-600/30"
                    >
                        <Download className="w-5 h-5 mr-2 animate-bounce" />
                        <div className="flex flex-col items-start text-left leading-none">
                            <span className="text-sm font-black tracking-wide">
                                {isIOS ? '下載 iOS App' : '一鍵安裝 Android App'}
                            </span>
                            <span className="text-[10px] text-blue-200 mt-1">
                                {isIOS ? '點擊查看安裝教學' : '獲得最佳全螢幕體驗'}
                            </span>
                        </div>
                    </button>
                )}
                
                <div className="flex justify-center gap-4 mt-2">
                    <div className="flex flex-col items-center text-center">
                        <Shield className="text-green-400 mb-1" size={16} />
                        <span className="text-[10px] text-slate-400">SSL 加密防護</span>
                    </div>
                    <div className="flex flex-col items-center text-center">
                        <Activity className="text-blue-400 mb-1" size={16} />
                        <span className="text-[10px] text-slate-400">即時同步</span>
                    </div>
                </div>
            </div>
        )}

      </div>
      
      <div className="absolute bottom-4 text-slate-600 text-[10px] font-mono tracking-widest">
          V2.1.0 PWA ENTERPRISE
      </div>
    </div>
  )
}