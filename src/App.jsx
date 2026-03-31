import React, { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'
import { Loader2, X, BellRing, AlertOctagon, RefreshCw } from 'lucide-react'

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
import RaceBroadcast from './admin/RaceBroadcast'

// ==========================================
// 🌟 防黑畫面裝甲：React Error Boundary 終極防護網
// ==========================================
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("🚨 系統發生崩潰，防護罩已攔截 (Error Boundary):", error, errorInfo);
  }

  handleForceUpdate = () => {
      if ('caches' in window) {
          caches.keys().then((names) => {
              names.forEach((name) => {
                  caches.delete(name);
              });
          });
      }
      
      localStorage.removeItem('iron_medic_races_cache');
      window.location.reload(true);
  }

  render() {
    if (this.state.hasError) {
      const isEnabled = localStorage.getItem('enable_error_boundary') !== 'false';
      
      if (!isEnabled) {
          return (
              <div className="min-h-screen bg-white p-10 font-sans">
                  <h2 className="text-2xl font-black text-red-600 mb-4">系統發生致命異常 (防護網已手動停用)</h2>
                  <p className="text-slate-600 font-bold">請檢查開發者工具 Console 以獲取詳細資訊。</p>
              </div>
          );
      }

      return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans">
            <div className="bg-slate-800 rounded-[2rem] shadow-2xl w-full max-w-md p-8 text-center border border-slate-700 relative overflow-hidden animate-fade-in-up">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-amber-400 to-amber-600"></div>
                
                <div className="w-20 h-20 bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-slate-700">
                    <AlertOctagon size={40} className="text-amber-500 animate-pulse" />
                </div>
                
                <h2 className="text-2xl font-black text-white mb-3 tracking-tight">系統已發布更新</h2>
                <p className="text-slate-400 text-sm mb-8 leading-relaxed font-medium">
                    為了提供更流暢的體驗，系統已進行核心升級。<br/>請點擊下方按鈕獲取最新版本，排除異常。
                </p>
                
                <button 
                    onClick={this.handleForceUpdate}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-black py-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                >
                    <RefreshCw size={20} />
                    立即更新並重新載入
                </button>
            </div>
        </div>
      );
    }

    return this.props.children; 
  }
}

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
              new Notification('賽事大廳通知', {
                body: payload.new.message,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: 'system-notify'
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

    // ==========================================
    // 🌟 全系統版控中心：自動變更計數與廣播監聽
    // ==========================================
    window.logSystemChange = (actionName) => {
        const currentCount = parseInt(localStorage.getItem('system_update_count') || '0', 10);
        const newCount = currentCount + 1;
        localStorage.setItem('system_update_count', newCount);

        const logs = JSON.parse(localStorage.getItem('system_update_logs') || '[]');
        logs.unshift({ time: new Date().toLocaleString(), action: actionName });
        if (logs.length > 20) logs.pop(); 
        localStorage.setItem('system_update_logs', JSON.stringify(logs));

        window.dispatchEvent(new Event('system_update_changed'));
    };

    const globalUpdateChannel = supabase.channel('global_system_updates')
      .on('broadcast', { event: 'force_reload' }, () => {
          console.log('接收到全域強制更新指令！');
          if ('caches' in window) {
              caches.keys().then((names) => {
                  names.forEach((name) => caches.delete(name));
              });
          }
          localStorage.removeItem('iron_medic_races_cache');
          window.location.reload(true);
      })
      .subscribe();

    return () => {
      if (subscription) supabase.removeChannel(subscription);
      authListener?.subscription.unsubscribe();
      supabase.removeChannel(globalUpdateChannel);
      delete window.logSystemChange;
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
    <ErrorBoundary>
      <BrowserRouter>
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
    </ErrorBoundary>
  )
}

export default App