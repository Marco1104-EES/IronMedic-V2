import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Loader2, X, BellRing } from 'lucide-react'

// 🌟 引入 PWA 註冊與自動更新監聽模組
import { useRegisterSW } from 'virtual:pwa-register/react'

import Login from "./pages/Login";
import AdminLayout from './layouts/AdminLayout'
import MemberCRM from './admin/MemberCRM'
import Dashboard from './admin/Dashboard'
import SystemStatus from './admin/SystemStatus'
import DataImportCenter from './admin/DataImportCenter' 
import RaceEvents from './pages/RaceEvents' 
import RaceDetail from './pages/RaceDetail' 
import RaceBuilder from './admin/RaceBuilder' 
import RaceManager from './admin/RaceManager' 
import DigitalID from './pages/DigitalID'

// 🌟 推播金鑰轉換工具函數
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// 🌟 定義四大後台通行權限
const VALID_ADMIN_ROLES = ['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'RACE_ADMIN', 'ADMIN'];

const AdminRoute = ({ children, requiredRole = 'ANY_ADMIN' }) => {
  const [authStatus, setAuthStatus] = useState('LOADING') 

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user || !user.email) {
        setAuthStatus('DENIED')
        return
      }
      
      try {
          const { data } = await supabase.from('profiles').select('role').eq('email', user.email.toLowerCase()).maybeSingle()
          const userRole = data?.role?.toUpperCase() || 'USER'
          
          if (requiredRole === 'SUPER_ADMIN' && userRole !== 'SUPER_ADMIN') {
              setAuthStatus('DENIED') 
          } else if (VALID_ADMIN_ROLES.includes(userRole)) {
              setAuthStatus('AUTHORIZED')
          } else {
              setAuthStatus('DENIED')
          }
      } catch (error) {
          console.error("查無管理員權限:", error)
          setAuthStatus('DENIED')
      }
    }
    checkAdmin()
  }, [requiredRole])

  if (authStatus === 'LOADING') {
    return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={48}/></div>
  }

  if (authStatus === 'DENIED') {
    return <Navigate to="/races" replace />
  }
  return children
}

function App() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) { console.log('🚀 PWA Service Worker 已成功註冊') },
    onRegisterError(error) { console.error('❌ PWA Service Worker 註冊失敗:', error) },
  })

  const [notificationPermission, setNotificationPermission] = useState('default');

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    let subscription = null;

    // 🌟 保留原有的「線上」廣播，確保 App 打開時依然能即時反應
    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      subscription = supabase.channel('user_notifications_channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            console.log('🔔 攔截到線上通知！', payload);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('醫護鐵人賽事大廳', {
                body: payload.new.message,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'iron-medic-notify'
              });
            }
          }
        )
        .subscribe();
    };

    setupRealtime();

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') { setupRealtime(); }
    });

    return () => {
      if (subscription) supabase.removeChannel(subscription);
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // 🌟 終極升級版：請求通知權限並將金鑰存入資料庫
  const requestNotificationPermission = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
        alert('🍎 蘋果 iOS 系統安全限制：\n\n要開啟推播通知，請先點擊瀏覽器下方分享按鈕 [↑]，選擇「加入主畫面」。\n\n然後回到桌面，點開專屬的「醫護鐵人 App」即可順利開啟通知！');
        return;
    }

    if (!('Notification' in window)) {
        alert('抱歉，您的裝置或瀏覽器不支援桌面通知功能，或需更新系統版本。');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
            
            // 🚀 核心邏輯：向瀏覽器要推播金鑰並存入資料庫
            try {
                const registration = await navigator.serviceWorker.ready;
                // ⚠️ 注意：這裡的 VAPID KEY 必須等後台寄件機制準備好後，替換為您生成的真實公鑰。
                // 為了不讓系統報錯中斷，如果還是預設文字，會先優雅跳過金鑰儲存。
                const VAPID_PUBLIC_KEY = '請替換為真實VAPID公鑰'; 
                
                if (VAPID_PUBLIC_KEY !== '請替換為真實VAPID公鑰') {
                    const subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                    });
                    
                    const subJSON = subscription.toJSON();
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    if (user) {
                        await supabase.from('push_subscriptions').upsert({
                           user_id: user.id,
                           endpoint: subJSON.endpoint,
                           p256dh: subJSON.keys.p256dh,
                           auth: subJSON.keys.auth
                        }, { onConflict: 'user_id, endpoint' });
                        console.log("✅ 離線推播金鑰已存入基地台！");
                    }
                }
            } catch (subError) {
                console.warn("離線推播訂閱暫緩 (需等待 VAPID Key)：", subError);
            }

            new Notification('✅ 授權成功', {
                body: '未來有新的賽事候補或重要異動，將會即時推播給您！',
                icon: '/pwa-192x192.png'
            });
        } else {
            alert('⚠️ 您已拒絕通知權限。如果改變心意，請至系統設定中允許通知。');
        }
    } catch (e) {
        console.error("請求通知權限失敗", e);
        alert('請求通知發生異常，請確認系統是否允許網頁推播。');
    }
  };

  return (
    <BrowserRouter>
      {/* 🌟 PWA 更新提示橫幅 */}
      {needRefresh && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-bounce-in">
            <div>
                <h4 className="font-black text-sm mb-0.5">系統已發布新版本！</h4>
                <p className="text-[10px] text-slate-400 font-medium">點擊更新以獲取最順暢的系統體驗。</p>
            </div>
            <button onClick={() => updateServiceWorker(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors shadow-md active:scale-95">立即更新</button>
            <button onClick={() => setNeedRefresh(false)} className="text-slate-400 hover:text-white p-1 ml-1 transition-colors"><X size={16}/></button>
        </div>
      )}

      {/* 🌟 請求推播授權橫幅 */}
      {notificationPermission === 'default' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-white text-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-4 animate-fade-in-down w-[95%] max-w-md">
            <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl shrink-0 shadow-inner"><BellRing size={24} className="animate-pulse" /></div>
            <div className="flex-1 min-w-0">
                <h4 className="font-black text-sm mb-1 text-slate-800 truncate">開啟賽事即時通知</h4>
                <p className="text-xs text-slate-500 font-medium leading-tight">候補成功、神之手安插等重要訊息，將第一時間推播給您！</p>
            </div>
            <button onClick={requestNotificationPermission} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-black px-4 py-2.5 rounded-xl transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 shrink-0">開啟</button>
            <button onClick={() => setNotificationPermission('denied')} className="text-slate-400 hover:text-slate-600 p-1.5 transition-colors shrink-0 bg-slate-50 rounded-lg" title="暫時不要"><X size={16}/></button>
        </div>
      )}

      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/races" element={<RaceEvents />} />
        <Route path="/race-detail/:id" element={<RaceDetail />} />
        <Route path="/my-id" element={<DigitalID />} />
        
        <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<MemberCRM />} />
          <Route path="races" element={<RaceManager />} />        
          <Route path="race-builder" element={<RaceBuilder />} /> 
          <Route path="import" element={<DataImportCenter />} />
          <Route path="system-status" element={<AdminRoute requiredRole="SUPER_ADMIN"><SystemStatus /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App