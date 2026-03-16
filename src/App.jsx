import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Loader2, X, BellRing } from 'lucide-react'

// 引入 PWA 註冊與自動更新監聽模組
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
// 引入賽事任務群體廣播頁面
import RaceBroadcast from './admin/RaceBroadcast'

// 推播金鑰轉換工具函數
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

// 定義四大後台通行權限
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
    onRegistered(r) { console.log('PWA Service Worker 已成功註冊') },
    onRegisterError(error) { console.error('PWA Service Worker 註冊失敗:', error) },
  })

  const [notificationPermission, setNotificationPermission] = useState('default');

  // 自動向瀏覽器請求推播金鑰並存入資料庫
  const subscribeToPushAndSave = async () => {
    try {
        const registration = await navigator.serviceWorker.ready;
        const VAPID_PUBLIC_KEY = 'BLcSYfjSIdYX_rnN7YVeTo_OrXSDkIXoqLAz59I_2AxP_w-tAWZID3iZFVzCTFxogTibrL7-LiiirNcLslRf5b8'; 
        
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
            console.log("離線推播金鑰已成功存入資料庫");
        }
    } catch (subError) {
        console.warn("推播訂閱異常：", subError);
    }
  };

  useEffect(() => {
    if ('Notification' in window) {
      setNotificationPermission(Notification.permission);
    }

    let subscription = null;

    const setupRealtime = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 如果使用者以前就允許過通知，登入時直接更新金鑰
      if ('Notification' in window && Notification.permission === 'granted') {
          subscribeToPushAndSave();
      }

      subscription = supabase.channel('user_notifications_channel')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            console.log('接收到系統通知', payload);
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

  const requestNotificationPermission = async () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches;

    if (isIOS && !isStandalone) {
        alert('蘋果 iOS 系統限制：\n\n如需啟用推播通知，請點擊瀏覽器下方分享按鈕 [↑]，選擇「加入主畫面」。\n\n透過主畫面開啟應用程式即可啟用通知功能。');
        return;
    }

    if (!('Notification' in window)) {
        alert('抱歉，您的裝置或瀏覽器目前不支援桌面通知功能。');
        return;
    }

    try {
        const permission = await Notification.requestPermission();
        setNotificationPermission(permission);
        
        if (permission === 'granted') {
            await subscribeToPushAndSave();

            new Notification('通知授權成功', {
                body: '系統將會即時發送賽事與重要異動通知。',
                icon: '/pwa-192x192.png'
            });
        } else {
            alert('您已拒絕通知權限。如需接收通知，請至系統設定中開啟。');
        }
    } catch (e) {
        console.error("請求通知權限失敗", e);
        alert('請求通知權限發生異常，請確認系統設定。');
    }
  };

  return (
    <BrowserRouter>
      {/* PWA 更新提示橫幅 */}
      {needRefresh && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-4 animate-bounce-in">
            <div>
                <h4 className="font-black text-sm mb-0.5">系統更新</h4>
                <p className="text-[10px] text-slate-400 font-medium">發現新版本，點擊以更新系統。</p>
            </div>
            <button onClick={() => updateServiceWorker(true)} className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-black px-4 py-2 rounded-xl transition-colors shadow-md active:scale-95">立即更新</button>
            <button onClick={() => setNeedRefresh(false)} className="text-slate-400 hover:text-white p-1 ml-1 transition-colors"><X size={16}/></button>
        </div>
      )}

      {/* 請求推播授權橫幅 */}
      {notificationPermission === 'default' && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] bg-white text-slate-800 p-4 rounded-2xl shadow-2xl border border-slate-200 flex items-center gap-4 animate-fade-in-down w-[95%] max-w-md">
            <div className="bg-blue-100 text-blue-600 p-2.5 rounded-xl shrink-0 shadow-inner"><BellRing size={24} className="animate-pulse" /></div>
            <div className="flex-1 min-w-0">
                <h4 className="font-black text-sm mb-1 text-slate-800 truncate">啟用賽事通知</h4>
                <p className="text-xs text-slate-500 font-medium leading-tight">開啟通知以接收賽事候補及重要訊息。</p>
            </div>
            <button onClick={requestNotificationPermission} className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-black px-4 py-2.5 rounded-xl transition-colors shadow-[0_0_15px_rgba(37,99,235,0.3)] active:scale-95 shrink-0">開啟</button>
            <button onClick={() => setNotificationPermission('denied')} className="text-slate-400 hover:text-slate-600 p-1.5 transition-colors shrink-0 bg-slate-50 rounded-lg" title="稍後再說"><X size={16}/></button>
        </div>
      )}

      {/* 系統除錯按鈕 (測試用) */}
      <div className="fixed bottom-24 left-6 z-[9999]">
          <button 
              onClick={async () => {
                  try {
                      alert('系統處理中，請稍候...');
                      const registration = await navigator.serviceWorker.ready;
                      
                      // 移除舊訂閱
                      const oldSubscription = await registration.pushManager.getSubscription();
                      if (oldSubscription) {
                          await oldSubscription.unsubscribe();
                      }
                      
                      // 重新申請訂閱
                      const VAPID_PUBLIC_KEY = 'BLcSYfjSIdYX_rnN7YVeTo_OrXSDkIXoqLAz59I_2AxP_w-tAWZID3iZFVzCTFxogTibrL7-LiiirNcLslRf5b8'; 
                      const subscription = await registration.pushManager.subscribe({
                          userVisibleOnly: true,
                          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
                      });
                      
                      // 寫入資料庫
                      const subJSON = subscription.toJSON();
                      const { data: { user } } = await supabase.auth.getUser();
                      
                      if (user) {
                          const { error } = await supabase.from('push_subscriptions').upsert({
                             user_id: user.id,
                             endpoint: subJSON.endpoint,
                             p256dh: subJSON.keys.p256dh,
                             auth: subJSON.keys.auth
                          }, { onConflict: 'user_id, endpoint' });
                          
                          if (error) throw error;
                          alert('系統訊息：推播金鑰已成功更新。');
                      } else {
                          alert('請先登入系統。');
                      }
                  } catch (e) {
                      alert('系統更新異常：\n' + e.message);
                  }
              }}
              className="bg-slate-700 hover:bg-slate-600 text-white text-sm font-bold px-4 py-3 rounded-full shadow-lg border border-slate-500 transition-colors"
          >
              更新推播金鑰
          </button>
      </div>

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
          <Route path="race-broadcast" element={<RaceBroadcast />} />
          <Route path="system-status" element={<AdminRoute requiredRole="SUPER_ADMIN"><SystemStatus /></AdminRoute>} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App