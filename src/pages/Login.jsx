import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Mail, Lock, Loader2, AlertCircle, Fingerprint, ShieldCheck, HelpCircle, Send, ExternalLink, UserCheck, KeyRound, Phone, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  // 🌟 主畫面登入專用狀態 (日常登入：信箱 + 身分證)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('') 
  const [showLoginId, setShowLoginId] = useState(false) // 👁️ 控制密碼顯示/隱藏
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginMessage, setLoginMessage] = useState({ type: '', text: '' }) 
  const navigate = useNavigate()

  // 🌟 首次認親 Modal 專用狀態 (嚴格雙資料認證：信箱 + 身分證 + 電話)
  const [showEmailVerifyModal, setShowEmailVerifyModal] = useState(false)
  const [verifyEmail, setVerifyEmail] = useState('')
  const [verifyNationalId, setVerifyNationalId] = useState('')
  const [showVerifyId, setShowVerifyId] = useState(false) // 👁️ 控制密碼顯示/隱藏
  const [verifyPhone, setVerifyPhone] = useState('') 
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [verifyError, setVerifyError] = useState('')

  // 🌟 Google 魔法認親專用狀態
  const [showIdentityModal, setShowIdentityModal] = useState(false)
  const [identityInput, setIdentityInput] = useState('')
  const [identityLoading, setIdentityLoading] = useState(false)
  const [identityError, setIdentityError] = useState('')
  const [pendingGoogleUser, setPendingGoogleUser] = useState(null) 

  // 🆘 求救表單專用狀態
  const [showHelpModal, setShowHelpModal] = useState(false)
  const [helpForm, setHelpForm] = useState({ name: '', nationalId: '', email: '' })
  const [helpLoading, setHelpLoading] = useState(false)
  const [helpError, setHelpError] = useState('')

  // 🛡️ LINE / FB 內建瀏覽器偵測狀態
  const [isInAppBrowser, setIsInAppBrowser] = useState(false)

  useEffect(() => {
    const checkInAppBrowser = () => {
        const ua = navigator.userAgent || navigator.vendor || window.opera;
        if (ua.indexOf('Line') > -1 || ua.indexOf('FBAV') > -1 || ua.indexOf('Instagram') > -1) {
            setIsInAppBrowser(true);
        }
    };
    checkInAppBrowser();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
            checkUserIdentity(session.user);
        }
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
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
      setLoginLoading(true);
      setLoginMessage({ type: '', text: '' });
      try {
          const userEmail = user.email.toLowerCase();
          
          const { data: profile, error } = await supabase
              .from('profiles')
              .select('id')
              .eq('email', userEmail)
              .maybeSingle();

          if (error) throw error;

          if (profile) {
              navigate('/races');
          } else {
              setPendingGoogleUser(user);
              setShowIdentityModal(true);
              setLoginLoading(false); 
          }
      } catch (err) {
          console.error("🚨 身分檢查異常:", err);
          setLoginMessage({ type: 'error', text: '身分驗證過程發生異常，請聯絡管理員。' });
          setLoginLoading(false);
      }
  }

  const handleGoogleLogin = async () => {
    if (isInAppBrowser) {
        setLoginMessage({ type: 'error', text: '無法在 LINE/FB 內使用 Google 登入，請點擊右上角「以預設瀏覽器開啟」。' });
        return;
    }

    setLoginMessage({ type: '', text: '' })
    setLoginLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.href }
      })
      if (error) throw error;
    } catch (error) {
      setLoginMessage({ type: 'error', text: error.message || 'Google 登入連線異常，請稍後再試。' })
      setLoginLoading(false)
    }
  }

  // 🚀 日常登入通道 (直接輸入信箱+身分證直登系統)
  const handleEmailLogin = async (e) => {
      e.preventDefault()
      if (!loginEmail || !loginPassword) {
          setLoginMessage({ type: 'error', text: '請輸入完整的信箱與身分證字號。' })
          return
      }
      
      setLoginMessage({ type: '', text: '' })
      setLoginLoading(true)

      try {
          const emailTrimmed = loginEmail.toLowerCase().trim();
          const idTrimmed = loginPassword.toUpperCase().trim();
          
          const { error } = await supabase.auth.signInWithPassword({
              email: emailTrimmed,
              password: idTrimmed
          });

          if (error) {
              // 🌟 優化錯誤訊息：精準判斷錯誤原因
              if (error.message.includes('Email not confirmed')) {
                  setLoginMessage({ type: 'error', text: '登入失敗！您的信箱尚未驗證。請聯絡管理員關閉 Supabase 的「Confirm email」功能。' });
              } else if (error.message.includes('Invalid login credentials')) {
                  setLoginMessage({ type: 'error', text: '登入失敗！身分證字號不符。若您曾更換身分證或用 Google 登入，請聯繫管理員處理。' });
              } else {
                  setLoginMessage({ type: 'error', text: `登入失敗！請確認資料是否正確。(${error.message})` });
              }
          } 
          // 成功的話，useEffect 裡的 authListener 會自動跳轉到 /races
      } catch (error) {
          setLoginMessage({ type: 'error', text: '系統連線異常，請稍後再試。' })
      } finally {
          setLoginLoading(false)
      }
  }

  // 🚀 首次認親邏輯 (嚴格雙資料核對：信箱 + 身分證 + 電話)
  const handleEmailVerification = async () => {
    if (!verifyEmail || !verifyNationalId || !verifyPhone) {
        setVerifyError('請輸入信箱、身分證字號與手機號碼。')
        return
    }
    
    setVerifyError('')
    setVerifyLoading(true)
    
    try {
      const emailTrimmed = verifyEmail.toLowerCase().trim();
      const idTrimmed = verifyNationalId.toUpperCase().trim(); 
      const phoneInputClean = verifyPhone.replace(/\D/g, ''); 
      
      const { data: oldProfile, error: searchError } = await supabase
          .from('profiles')
          .select('id, email, national_id, phone')
          .eq('email', emailTrimmed)
          .eq('national_id', idTrimmed)
          .maybeSingle();

      if (searchError) throw searchError;

      if (oldProfile) {
          // 🛡️ 雙重防護：比對手機號碼是否吻合
          const dbPhoneClean = (oldProfile.phone || '').replace(/\D/g, '');
          if (dbPhoneClean && phoneInputClean !== '' && dbPhoneClean !== phoneInputClean) {
              setVerifyError('手機號碼核對不符，請確認是否為當初報名的號碼。');
              setVerifyLoading(false);
              return;
          }

          // 嘗試登入看看是不是已經綁過了
          const { error: signInError } = await supabase.auth.signInWithPassword({
              email: emailTrimmed,
              password: idTrimmed
          });

          // 若尚未建立 Auth 帳號，幫他註冊並綁定
          if (signInError) {
              const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
                  email: emailTrimmed,
                  password: idTrimmed
              });
              
              if (signUpError) throw new Error(`綁定帳號時發生錯誤: ${signUpError.message}`);

              // 🌟 核心防禦：偵測 Supabase「假成功」陷阱
              if (signUpData?.user && signUpData.user.identities && signUpData.user.identities.length === 0) {
                  throw new Error("此信箱已存在於系統中 (可能曾用 Google 登入)。請直接使用 Google 登入，或請管理員刪除舊帳號！");
              }

              if (signUpData?.user) {
                  const { error: updateError } = await supabase
                      .from('profiles')
                      .update({ id: signUpData.user.id })
                      .eq('id', oldProfile.id);
                      
                  if(updateError) throw new Error("資料庫橋接失敗");
              }
          }
          
          alert('🎉 帳號雙重核對成功！系統即將為您登入大廳！');
          setShowEmailVerifyModal(false);
          const { data: { session } } = await supabase.auth.getSession();
          if(session?.user) checkUserIdentity(session.user);
          else window.location.reload();
          
      } else {
          setHelpForm({ name: '', nationalId: idTrimmed, email: emailTrimmed });
          setShowEmailVerifyModal(false); 
          setShowHelpModal(true); 
      }
    } catch (error) {
      setVerifyError(error.message || '系統連線異常，請稍後再試。')
    } finally {
        setVerifyLoading(false)
    }
  }

  // Google 模式的魔法認親
  const handleIdentityLink = async () => {
      if (!identityInput.trim()) {
          setIdentityError('請輸入身分證字號或手機號碼');
          return;
      }
      
      setIdentityError('');
      setIdentityLoading(true);

      try {
          const searchVal = identityInput.trim().toUpperCase(); 
          const targetEmail = pendingGoogleUser.email.toLowerCase();
          
          const { data: oldProfiles, error: searchError } = await supabase
              .from('profiles')
              .select('*')
              .or(`national_id.eq.${searchVal},phone.eq.${searchVal}`);

          if (searchError) throw searchError;

          if (oldProfiles && oldProfiles.length > 0) {
              const oldProfile = oldProfiles[0]; 
              
              const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ 
                      email: targetEmail,
                      id: pendingGoogleUser.id 
                  })
                  .eq('id', oldProfile.id); 

              if (updateError) throw new Error(`綁定過程發生錯誤: ${updateError.message}`);

              setShowIdentityModal(false);
              alert('🎉 認親成功！資料已成功綁定，歡迎回來！');
              navigate('/races');

          } else {
              setIdentityError('找不到符合的紀錄，請確認輸入是否正確。');
          }

      } catch (err) {
          setIdentityError(err.message || '系統異常，請稍後再試。');
      } finally {
          setIdentityLoading(false);
      }
  }

  const submitHelpRequest = async () => {
      if (!helpForm.name.trim() || !helpForm.nationalId.trim() || !helpForm.email.trim()) {
          setHelpError('請填寫完整資訊，以便管理員協助查核。');
          return;
      }
      setHelpLoading(true);
      setHelpError('');

      try {
          const messageStr = `【帳號救援申請】\n姓名：${helpForm.name}\n身分證：${helpForm.nationalId.toUpperCase()}\n嘗試登入信箱：${helpForm.email.toLowerCase()}`;
          const { error } = await supabase.from('admin_notifications').insert([{
                  type: 'PROFILE_UPDATE',
                  user_name: helpForm.name,
                  message: messageStr,
                  is_read: false
              }]);
          if (error) throw error;
          alert('✅ 申請已送出！超級管理員已收到您的救援請求，請靜候信件通知。');
          setShowHelpModal(false);
          setVerifyNationalId(''); 
      } catch (err) {
          setHelpError('發送失敗，請稍後再試或直接聯繫管理員。');
      } finally {
          setHelpLoading(false);
      }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans relative">
      
      {isInAppBrowser && (
          <div className="fixed top-0 left-0 right-0 bg-amber-500 text-white p-3 z-50 shadow-md animate-fade-in-down flex items-start gap-3 justify-center">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <div className="text-sm font-bold">
                  偵測到您使用 LINE 等內建瀏覽器，<span className="font-black underline">無法使用 Google 登入</span>。<br/>
                  請點擊畫面右上角 <span className="font-black bg-amber-600 px-1 rounded">⋮</span>，選擇<span className="font-black bg-amber-600 px-1 rounded">「以預設瀏覽器開啟」</span>。
              </div>
          </div>
      )}

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10 mt-4">
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
          
          {loginLoading && !showIdentityModal && !showHelpModal && !showEmailVerifyModal && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                  <span className="text-sm font-bold text-slate-600 animate-pulse">系統處理中...</span>
              </div>
          )}

          {loginMessage.text && (
            <div className={`mb-6 px-4 py-3 rounded-xl flex items-center gap-2 text-sm font-bold animate-fade-in relative z-10
                ${loginMessage.type === 'error' ? 'bg-red-50 border border-red-200 text-red-600' : 'bg-green-50 border border-green-200 text-green-700'}`}>
              <AlertCircle size={18} className="shrink-0 mt-0.5" />
              <div className="flex-1">{loginMessage.text}</div>
            </div>
          )}

          <div className="mb-6 relative z-10">
            <button
              onClick={handleGoogleLogin}
              disabled={loginLoading || isInAppBrowser}
              className={`w-full flex justify-center items-center gap-3 py-3.5 px-4 border rounded-xl shadow-sm text-sm font-bold transition-all active:scale-95 ${isInAppBrowser ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-70' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'}`}
            >
                <svg className="w-5 h-5" viewBox="0 0 24 24" style={{ filter: isInAppBrowser ? 'grayscale(100%) opacity(50%)' : 'none' }}>
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                </svg>
              {isInAppBrowser ? '請使用外部瀏覽器開啟此功能' : '使用 Google 帳號快速登入'}
            </button>
          </div>

          <div className="mt-6 mb-6 relative z-10">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-3 bg-white text-slate-400 font-bold">
                  或使用一般信箱與身分證登入
                </span>
              </div>
            </div>
          </div>

          {/* 🌟 日常登入表單 (信箱 + 身分證直登) */}
          <form className="space-y-5 relative z-10" onSubmit={handleEmailLogin}>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1" htmlFor="loginEmail">
                您已綁定的電子郵件 (Email)
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  id="loginEmail"
                  required
                  className="appearance-none block w-full pl-10 pr-3 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium transition-colors"
                  placeholder="name@yahoo.com.tw"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                />
              </div>
            </div>

            {/* 🌟 加上「小眼睛」功能的密碼/身分證欄位 */}
            <div>
              <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-bold text-slate-700" htmlFor="loginPassword">
                    身分證字號 (National ID)
                  </label>
                  <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">綁定後直登</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type={showLoginId ? "text" : "password"}
                  id="loginPassword"
                  required
                  className="appearance-none block w-full pl-10 pr-10 py-3 border border-slate-300 rounded-xl shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm font-medium transition-colors uppercase"
                  placeholder="例如：A123456789"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowLoginId(!showLoginId)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 focus:outline-none transition-colors"
                >
                  {showLoginId ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              className="w-full flex justify-center py-3.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-black text-white bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-900 transition-colors disabled:opacity-50 active:scale-95 gap-2 items-center"
            >
              <Send size={18}/> 系統登入
            </button>
            
            <div className="pt-4 text-center border-t border-slate-100 mt-4">
                <button 
                    type="button"
                    onClick={() => setShowEmailVerifyModal(true)}
                    className="text-lg font-black text-blue-600 hover:text-blue-800 transition-colors flex items-center justify-center gap-2 w-full py-3"
                >
                    <UserCheck size={26} className="shrink-0"/> 
                    <span>非Google帳號，首次使用<br className="sm:hidden"/>請點此進行帳號核對綁定</span>
                </button>
            </div>
          </form>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 🌟 首次認親 Modal (嚴格雙資料：信箱 + 身分證 + 電話) */}
      {/* ========================================================= */}
      {showEmailVerifyModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowEmailVerifyModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-bounce-in relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                  
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-inner border bg-blue-50 text-blue-600 border-blue-100">
                      <KeyRound size={32}/>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-2 text-center tracking-tight">首次帳號核對綁定</h3>
                  <p className="text-slate-500 text-sm mb-6 text-center leading-relaxed font-medium">
                      為了保護您的資料安全，首次登入請提供以下三項資料進行嚴格核對。
                  </p>

                  {verifyError && (
                      <div className="mb-5 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex gap-2 items-start border border-red-100">
                          <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                          <div className="flex-1">{verifyError}</div>
                      </div>
                  )}

                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1" htmlFor="vEmail">登入信箱 (Email)</label>
                          <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Mail className="h-4 w-4 text-slate-400" /></div>
                              <input 
                                  type="email" id="vEmail"
                                  className="w-full pl-9 pr-3 border border-slate-300 p-3 rounded-xl outline-none font-medium text-slate-800 transition-colors shadow-sm focus:ring-2 focus:ring-blue-500"
                                  placeholder="請輸入系統建檔信箱" value={verifyEmail} onChange={e => setVerifyEmail(e.target.value)}
                              />
                          </div>
                      </div>
                      
                      {/* 🌟 加上「小眼睛」功能的認親身分證欄位 */}
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1" htmlFor="vId">身分證字號</label>
                          <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Lock className="h-4 w-4 text-slate-400" /></div>
                              <input 
                                  type={showVerifyId ? "text" : "password"} id="vId"
                                  className="w-full pl-9 pr-10 border border-slate-300 p-3 rounded-xl outline-none font-medium text-slate-800 transition-colors shadow-sm focus:ring-2 focus:ring-blue-500 uppercase"
                                  placeholder="例如：A123456789" value={verifyNationalId} onChange={e => setVerifyNationalId(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => setShowVerifyId(!showVerifyId)}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 focus:outline-none transition-colors"
                              >
                                {showVerifyId ? <EyeOff size={18} /> : <Eye size={18} />}
                              </button>
                          </div>
                      </div>
                      
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1" htmlFor="vPhone">手機號碼 (雙重驗證)</label>
                          <div className="relative">
                              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Phone className="h-4 w-4 text-slate-400" /></div>
                              <input 
                                  type="tel" id="vPhone"
                                  className="w-full pl-9 pr-3 border border-slate-300 p-3 rounded-xl outline-none font-medium text-slate-800 transition-colors shadow-sm focus:ring-2 focus:ring-blue-500"
                                  placeholder="例如：0912345678" value={verifyPhone} onChange={e => setVerifyPhone(e.target.value)}
                              />
                          </div>
                      </div>
                      
                      <button 
                          onClick={handleEmailVerification} disabled={verifyLoading}
                          className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
                      >
                          {verifyLoading ? <Loader2 className="animate-spin" size={20}/> : <ShieldCheck size={20}/>}
                          驗證並開通帳號
                      </button>
                      
                      <div className="pt-4 text-center">
                          <button onClick={() => setShowEmailVerifyModal(false)} className="text-xs font-bold text-slate-400 hover:text-slate-600 transition-colors">取消並返回</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 🌟 Google 魔法認親視窗 (原版保留) */}
      {showIdentityModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowIdentityModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-bounce-in relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                  
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-inner border bg-blue-50 text-blue-600 border-blue-100">
                      <Fingerprint size={32}/>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-2 text-center tracking-tight">哈囉！初次見面</h3>
                  <p className="text-slate-500 text-sm mb-6 text-center leading-relaxed font-medium">
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
                              className="w-full border-2 border-slate-200 p-3.5 rounded-xl outline-none font-black text-slate-800 tracking-wider text-center transition-colors shadow-sm placeholder-slate-300 focus:border-blue-500"
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
                                  setLoginLoading(false);
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

      {/* 🆘 申請更新帳號連結 (求救表單) */}
      {showHelpModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowHelpModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-bounce-in relative overflow-hidden" onClick={e => e.stopPropagation()}>
                  <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-red-500 to-rose-600"></div>
                  
                  <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6 mx-auto shadow-inner border bg-red-50 text-red-600 border-red-100">
                      <HelpCircle size={32}/>
                  </div>
                  
                  <h3 className="text-2xl font-black text-slate-800 mb-2 text-center tracking-tight">查無符合的紀錄</h3>
                  <p className="text-slate-500 text-sm mb-6 text-center leading-relaxed font-medium">
                      系統找不到與您輸入相符的紀錄。<br/>如果您曾經更改過信箱或電話，請填寫下方表單，超級管理員將為您更新帳號連結。
                  </p>

                  {helpError && (
                      <div className="mb-5 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-bold flex gap-2 items-start border border-red-100">
                          <AlertCircle size={16} className="shrink-0 mt-0.5"/>
                          {helpError}
                      </div>
                  )}

                  <div className="space-y-4">
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">1. 您的真實姓名</label>
                          <input 
                              type="text" 
                              className="w-full border-2 border-slate-200 p-3 rounded-lg outline-none font-bold text-slate-800 transition-colors focus:border-red-400"
                              placeholder="請輸入姓名"
                              value={helpForm.name}
                              onChange={e => setHelpForm({...helpForm, name: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">2. 您的身分證字號</label>
                          <input 
                              type="text" 
                              className="w-full border-2 border-slate-200 p-3 rounded-lg outline-none font-bold text-slate-800 transition-colors focus:border-red-400 uppercase"
                              value={helpForm.nationalId}
                              onChange={e => setHelpForm({...helpForm, nationalId: e.target.value})}
                          />
                      </div>
                      <div>
                          <label className="block text-xs font-bold text-slate-500 mb-1">3. 您希望使用的登入信箱</label>
                          <input 
                              type="email" 
                              className="w-full border-2 border-slate-200 p-3 rounded-lg outline-none font-bold text-slate-800 transition-colors focus:border-red-400"
                              value={helpForm.email}
                              onChange={e => setHelpForm({...helpForm, email: e.target.value})}
                          />
                      </div>
                      
                      <button 
                          onClick={submitHelpRequest}
                          disabled={helpLoading}
                          className="w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-black rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex justify-center items-center gap-2 mt-4"
                      >
                          {helpLoading ? <Loader2 className="animate-spin" size={20}/> : <Send size={20}/>}
                          送出救援申請
                      </button>
                      
                      <div className="pt-4 text-center">
                          <button 
                              onClick={() => setShowHelpModal(false)}
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