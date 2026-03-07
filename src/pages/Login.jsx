import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Loader2, AlertCircle, Fingerprint, ShieldCheck } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const navigate = useNavigate()

  // 🌟 魔法認親專用狀態
  const [showIdentityModal, setShowIdentityModal] = useState(false)
  const [identityInput, setIdentityInput] = useState('')
  const [identityLoading, setIdentityLoading] = useState(false)
  const [identityError, setIdentityError] = useState('')
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null) 

  useEffect(() => {
    // 追蹤 auth 狀態變化，這裡負責接住 Google 跳轉回來的 Token
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔄 Auth Event:', event);
        if (event === 'SIGNED_IN' && session?.user) {
            console.log('👤 成功接住 Google Token，開始檢查身分...');
            checkUserIdentity(session.user);
        }
    })

    // 頁面載入時檢查
    supabase.auth.getSession().then(({ data: { session } }) => {
        console.log('🏁 Initial Session Check:', session ? 'User exists' : 'No session');
        if (session?.user) {
            checkUserIdentity(session.user);
        }
    })

    return () => {
        authListener.subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkUserIdentity = async (user) => {
      setLoading(true);
      setErrorMsg('');
      try {
          const userEmail = user.email.toLowerCase();
          console.log(`🔍 正在查詢信箱: ${userEmail}`);
          
          const { data: profile, error } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', userEmail)
              .maybeSingle();

          if (error) {
              console.error("❌ 查詢 Profile 發生錯誤:", error);
              throw error;
          }

          if (profile) {
              console.log("✅ 找到使用者，直接放行進入大廳");
              navigate('/races');
          } else {
              console.log("⚠️ 找不到使用者信箱，準備彈出認親視窗");
              // 找不到人，扣留他！
              setPendingGoogleUser(user);
              setShowIdentityModal(true);
              setLoading(false); 
          }
      } catch (err) {
          console.error("🚨 身分檢查異常:", err);
          setErrorMsg('身分驗證過程發生異常，請聯絡管理員。');
          setLoading(false);
      }
  }

  const handleGoogleLogin = async () => {
    setErrorMsg('')
    setLoading(true)
    try {
      console.log('🚀 開始 Google OAuth 流程, 目標跳轉網址:', window.location.href);

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // 🌟 關鍵修復：跳回 window.location.href (目前的網址)，防止 Router 把 Token 洗掉
          redirectTo: window.location.href 
        }
      })
      if (error) {
          console.error("❌ Google 授權失敗:", error);
          throw error;
      }
    } catch (error) {
      setErrorMsg(error.message || 'Google 登入連線異常，請稍後再試。')
      setLoading(false)
    }
  }

  const handleIdentityLink = async () => {
      if (!identityInput.trim()) {
          setIdentityError('請輸入身分證字號或手機號碼');
          return;
      }
      
      setIdentityError('');
      setIdentityLoading(true);

      try {
          const searchVal = identityInput.trim().toUpperCase(); 
          console.log(`🔗 嘗試橋接身分，搜尋值: ${searchVal}`);
          
          const { data: oldProfiles, error: searchError } = await supabase
              .from('profiles')
              .select('*')
              .or(`national_id.eq.${searchVal},phone.eq.${searchVal}`);

          if (searchError) {
              console.error("❌ 搜尋舊資料失敗:", searchError);
              throw searchError;
          }

          if (oldProfiles && oldProfiles.length > 0) {
              const oldProfile = oldProfiles[0]; 
              const newEmail = pendingGoogleUser.email.toLowerCase();
              console.log(`🎉 找到舊資料! 準備將 email 更新為: ${newEmail}`);

              const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ 
                      email: newEmail,
                      id: pendingGoogleUser.id 
                  })
                  .eq('id', oldProfile.id); 

              if (updateError) {
                  console.error("❌ 更新資料失敗:", updateError);
                  throw new Error(`綁定過程發生錯誤: ${updateError.message}`);
              }

              setShowIdentityModal(false);
              alert('🎉 認親成功！資料已成功綁定，歡迎回來！');
              navigate('/races');

          } else {
              console.log("⚠️ 找不到符合的舊紀錄");
              setIdentityError('找不到符合的紀錄，請確認輸入是否正確。如果持續失敗，請聯繫管理員。');
          }

      } catch (err) {
          setIdentityError(err.message || '系統異常，請稍後再試。');
      } finally {
          setIdentityLoading(false);
      }
  }

  const handleEmailLogin = async (e) => {
    e.preventDefault()
    if (!email || !password) {
        setErrorMsg('請輸入完整的帳號與密碼。')
        return
    }
    
    setErrorMsg('')
    setLoading(true)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(), 
        password,
      })

      if (error) throw error
    } catch (error) {
      setErrorMsg('登入失敗：帳號或密碼錯誤。')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-lg">
                I
            </div>
        </div>
        <h2 className="mt-2 text-center text-3xl font-black text-slate-900 tracking-tight">
          醫護鐵人賽事大廳
        </h2>
        <p className="mt-2 text-center text-sm text-slate-500 font-medium">
          IRON MEDIC MANAGEMENT SYSTEM
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-2xl sm:px-10 border border-slate-100 relative overflow-hidden">
          
          {/* 加入防護，只有在 Modal 沒顯示時才秀整頁 Loading */}
          {loading && !showIdentityModal && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                  <span className="text-sm font-bold text-slate-600 animate-pulse">系統登入中...</span>
              </div>
          )}

          {errorMsg && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-fade-in relative z-10">
              <AlertCircle size={18} className="shrink-0" />
              {errorMsg}
            </div>
          )}

          <div className="mb-6 relative z-10">
            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-slate-300 rounded-xl shadow-sm bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all disabled:opacity-50 active:scale-95"
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              使用 Google 帳號快速登入
            </button>
          </div>

          <div className="mt-6 mb-6 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-slate-400 font-medium">
                  或使用信箱與密碼登入
                </span>
              </div>
            </div>
          </div>

          <form className="space-y-5 relative z-10" onSubmit={handleEmailLogin}>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1" htmlFor="email">
                電子郵件 (Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium transition-colors"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1" htmlFor="password">
                密碼 (Password)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium transition-colors"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-black text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50 active:scale-95"
            >
              系統登入
            </button>
          </form>
        </div>
      </div>

      {/* 🌟 魔法認親視窗 (Modal) */}
      {showIdentityModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in">
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-bounce-in relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                  
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-inner border border-blue-100">
                      <Fingerprint size={32}/>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-2 text-center tracking-tight">哈囉！初次見面</h3>
                  <p className="text-slate-500 text-sm mb-6 text-center leading-relaxed">
                      看起來您是第一次用這個 Google 帳號登入。<br/>為了幫您找回醫護鐵人身分以及所有的賽事紀錄，請告訴我們您的通關密語。
                  </p>

                  {identityError && (
                      <div className="mb-5 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex gap-2 items-start border border-red-100">
                          <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                          {identityError}
                      </div>
                  )}

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2" htmlFor="identityInput">
                              請輸入您的 <span className="text-blue-600">身分證字號</span> 或 <span className="text-blue-600">手機號碼</span>
                          </label>
                          <input 
                              type="text" 
                              id="identityInput"
                              className="w-full border-2 border-slate-200 focus:border-blue-500 p-3.5 rounded-xl outline-none font-black text-slate-800 tracking-wider text-center transition-colors shadow-sm placeholder-slate-300"
                              placeholder="例如：A123456789 或 0912345678"
                              value={identityInput}
                              onChange={e => setIdentityInput(e.target.value)}
                              autoFocus
                          />
                      </div>
                      
                      <button 
                          onClick={handleIdentityLink}
                          disabled={identityLoading}
                          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 mt-2"
                      >
                          {identityLoading ? <Loader2 className="animate-spin" size={20}/> : <ShieldCheck size={20}/>}
                          驗證並綁定帳號
                      </button>
                      
                      <div className="pt-4 text-center">
                          <button 
                              onClick={async () => {
                                  await supabase.auth.signOut();
                                  setShowIdentityModal(false);
                                  setLoading(false);
                                  setPendingGoogleUser(null);
                              }}
                              className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors"
                          >
                              取消並返回登入畫面
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}