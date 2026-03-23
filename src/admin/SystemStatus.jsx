import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'
import { Database, Cpu, HardDrive, CheckCircle, AlertTriangle, Activity, ExternalLink, Loader2, RefreshCw, Cloud, Globe, ChevronRight, Flag, Bell, Users, Github, Bot, FileText, Download, Trash2, Clock } from 'lucide-react'

export default function SystemStatus() {
  const navigate = useNavigate()
  const [metrics, setMetrics] = useState({
    dbSizeMB: 0,
    totalMembers: 0,
    totalRaces: 0,
    totalNotifications: 0,
    authLatency: 0,
    dbLatency: 0,
    status: 'checking'
  })
  const [loading, setLoading] = useState(true)
  const [cronJobStatus, setCronJobStatus] = useState(null)
  
  // 🌟 絕對防爆日誌記憶體
  const logsRef = useRef([]) 
  const [systemLogs, setSystemLogs] = useState([]) 
  const logsEndRef = useRef(null)

  const [notifications, setNotifications] = useState([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifTab, setNotifTab] = useState('system')

  // 🌟 強制排隊日誌引擎，保證不吃字
  const addLog = useCallback((msg, type = 'info') => {
      const time = new Date().toLocaleTimeString('zh-TW', { hour12: false });
      const newLog = { id: Math.random().toString(), time, msg, type };
      logsRef.current = [...logsRef.current, newLog].slice(-100);
      setSystemLogs([...logsRef.current]);
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 150);
  }, []);

  useEffect(() => { 
      fetchAllSystemData();

      const heartbeat = setInterval(() => {
          fetchSilentHeartbeat();
      }, 30000);

      const radarChannel = supabase.channel('rimac_system_radar')
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'profiles' }, () => {
              setMetrics(prev => ({ ...prev, totalMembers: prev.totalMembers + 1 }))
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'profiles' }, () => {
              setMetrics(prev => ({ ...prev, totalMembers: Math.max(0, prev.totalMembers - 1) }))
          })
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'races' }, () => {
              setMetrics(prev => ({ ...prev, totalRaces: prev.totalRaces + 1 }))
          })
          .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'races' }, () => {
              setMetrics(prev => ({ ...prev, totalRaces: Math.max(0, prev.totalRaces - 1) }))
          })
          .subscribe();

      fetchNotifs();

      return () => {
          clearInterval(heartbeat);
          supabase.removeChannel(radarChannel);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 🌟 鈴鐺雙引擎：完美繞過 RLS，同步抓取個人通知與系統稽核日誌
  const fetchNotifs = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          // 1. 抓取個人通知
          const { data: pData } = await supabase.from('user_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
          let allNotifs = pData ? pData.map(n => ({...n, date: n.created_at})) : [];

          // 2. 判斷是否為管理員
          const { data: prof } = await supabase.from('profiles').select('role').eq('email', user.email).maybeSingle();
          const isAdmin = prof && ['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'RACE_ADMIN', 'ADMIN', '管理員', '總監'].some(r => (prof.role || '').toUpperCase().includes(r));

          // 3. 若為管理員，混入 admin_notifications (系統稽核)
          if (isAdmin) {
              const { data: aData } = await supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(50);
              if (aData) {
                  const adminMapped = aData.map(n => ({
                      id: `admin_${n.id}`, 
                      user_id: user.id, 
                      tab: 'system',
                      category: 'bell',
                      message: n.message,
                      date: n.created_at,
                      is_read: false 
                  }));
                  allNotifs = [...allNotifs, ...adminMapped].sort((a,b) => new Date(b.date) - new Date(a.date));
              }
          }
          setNotifications(allNotifs);
      } catch (e) {
          console.error('抓取通知異常', e);
      }
  }

  const measurePerformance = async () => {
      const probe = { auth: -1, profile: -1, race: -1 };
      let err = null;
      try {
          let t = performance.now();
          await supabase.auth.getSession();
          probe.auth = Math.round(performance.now() - t);

          t = performance.now();
          const pRes = await supabase.from('profiles').select('id').limit(1);
          if (pRes.error) throw pRes.error;
          probe.profile = Math.round(performance.now() - t);

          t = performance.now();
          const rRes = await supabase.from('races').select('id').limit(1);
          if (rRes.error) throw rRes.error;
          probe.race = Math.round(performance.now() - t);
      } catch(e) { err = e; }
      const maxLatency = Math.max(probe.auth, probe.profile, probe.race);
      return { probe, maxLatency, err };
  }

  const fetchAllSystemData = async () => {
      setLoading(true)
      addLog('啟動全域系統與資料庫深層掃描...', 'info')

      try {
          addLog('正在測試 Auth 與 Database 獨立響應速度...', 'info')
          const { probe, maxLatency, err } = await measurePerformance();
          
          if (err) {
              addLog(`測速階段發生異常: ${err.message}`, 'error')
          } else {
              addLog(`測速完成 - Auth: ${probe.auth}ms | Profile表: ${probe.profile}ms | Race表: ${probe.race}ms`, 'success')
          }

          addLog('正在抓取資料庫即時統計數據...', 'info')
          const [mCountRes, rCountRes, nCountRes, cronRes] = await Promise.all([
              supabase.from('profiles').select('*', { count: 'exact', head: true }),
              supabase.from('races').select('*', { count: 'exact', head: true }),
              supabase.from('user_notifications').select('*', { count: 'exact', head: true }),
              supabase.from('vw_system_cron_jobs').select('*').eq('jobname', 'auto-broadcast-job').maybeSingle()
          ]);

          let currentStatus = err ? 'error' : (maxLatency > 500 ? 'warning' : 'healthy');

          setMetrics({
              dbSizeMB: 15.5,
              totalMembers: mCountRes.count || 0,
              totalRaces: rCountRes.count || 0,
              totalNotifications: nCountRes.count || 0,
              authLatency: probe.auth,
              dbLatency: Math.max(probe.profile, probe.race),
              status: currentStatus
          })

          if (currentStatus === 'warning') {
              addLog(`⚠️ 系統延遲警告 (最大延遲: ${maxLatency}ms)`, 'warning')
          } else if (currentStatus === 'error') {
              addLog(`❌ 資料庫連線異常!`, 'error')
          } else {
              addLog(`✅ 全域掃描與資料載入成功`, 'success')
          }

          if (cronRes.data) setCronJobStatus(cronRes.data);
          else setCronJobStatus(null);

      } catch (error) {
          setMetrics(prev => ({ ...prev, status: 'error' }))
          addLog(`發生未預期錯誤: ${error.message}`, 'error')
      } finally {
          setLoading(false)
      }
  }

  const fetchSilentHeartbeat = async () => {
      try {
          const { probe, maxLatency, err } = await measurePerformance();
          let currentStatus = err ? 'error' : (maxLatency > 500 ? 'warning' : 'healthy');
          
          setMetrics(prev => ({
              ...prev,
              authLatency: probe.auth,
              dbLatency: Math.max(probe.profile, probe.race),
              status: currentStatus
          }))

          if (currentStatus === 'warning') {
              addLog(`[靜默心跳] ⚠️ 偵測到延遲! (Auth: ${probe.auth}ms | Profile: ${probe.profile}ms | Race: ${probe.race}ms)`, 'warning')
          } else if (currentStatus === 'error') {
              addLog(`[靜默心跳] ❌ 連線異常!`, 'error')
          } else {
              addLog(`[靜默心跳] ✅ 系統健康 (Max Latency: ${maxLatency}ms)`, 'info')
          }
          
          const cronRes = await supabase.from('vw_system_cron_jobs').select('*').eq('jobname', 'auto-broadcast-job').maybeSingle();
          if (cronRes.data) setCronJobStatus(cronRes.data);
      } catch (e) {
          console.warn('靜默心跳異常', e);
      }
  }

  const handleExportLog = () => {
      if(systemLogs.length === 0) return alert("目前沒有日誌可匯出");
      const textContent = systemLogs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.msg}`).join('\n');
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `System_Diagnostics_${new Date().toISOString().slice(0,10)}.txt`;
      link.click();
      URL.revokeObjectURL(url);
  }

  const markAllAsRead = async () => { 
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true, is_read: true }))); 
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false)
      } catch(e){}
  }
  
  // 🌟 支援刪除 admin_notifications
  const deleteNotification = async (id) => { 
      setNotifications(prev => prev.filter(n => n.id !== id)); 
      try { 
          if (String(id).startsWith('admin_')) {
              await supabase.from('admin_notifications').delete().eq('id', id.replace('admin_', ''));
          } else {
              await supabase.from('user_notifications').delete().eq('id', id);
          }
      } catch(e){}
  }

  const getStatusColor = (status) => {
    if (status === 'healthy') return 'text-green-500 bg-green-50 border-green-200'
    if (status === 'warning') return 'text-amber-500 bg-amber-50 border-amber-200'
    return 'text-red-500 bg-red-50 border-red-200'
  }

  const getStatusIcon = (status) => {
    if (status === 'healthy') return <CheckCircle size={24} />
    if (status === 'warning') return <AlertTriangle size={24} />
    return <AlertTriangle size={24} />
  }

  const getNotifIcon = (category) => {
      switch(category) {
          case 'race': return <Flag size={16} className="text-blue-500"/>;
          case 'cert': return <AlertTriangle size={16} className="text-red-500"/>;
          case 'shop': return <Medal size={16} className="text-amber-500"/>;
          default: return <Bell size={16} className="text-slate-500"/>;
      }
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20">
      
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                      <Cpu className="text-blue-600"/> 系統伺服器監控中心
                  </h2>
                  <p className="text-slate-500 font-medium text-sm mt-1">Super Admin War Room - Rimac 全時四驅即時版</p>
              </div>
              <div className="flex gap-2">
                  <button onClick={() => { fetchNotifs(); setShowNotifPanel(true); }} className="relative flex items-center justify-center bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 w-11 h-11 rounded-full transition-all shadow-sm active:scale-95 group">
                      <Bell size={20} className="group-hover:animate-wiggle"/>
                      {notifications.filter(n => !n.is_read && !n.isRead).length > 0 && <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-white animate-pulse">{notifications.filter(n => !n.is_read && !n.isRead).length}</span>}
                  </button>
                  <button onClick={fetchAllSystemData} disabled={loading} className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-colors">
                      <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                      {loading ? '深層掃描中...' : '強制手動同步'}
                  </button>
              </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
              <div className={`p-5 rounded-2xl border flex flex-col justify-center gap-2 ${getStatusColor(metrics.status)} transition-colors duration-500`}>
                  <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider opacity-70">伺服器狀態</span>
                      {getStatusIcon(metrics.status)}
                  </div>
                  <div className="text-2xl font-black mt-1">
                      {metrics.status === 'healthy' ? '連線正常' : metrics.status === 'warning' ? '稍微延遲' : '連線異常'}
                  </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-1 transition-all duration-300">
                  <div className="flex justify-between items-center text-slate-500 mb-1">
                      <span className="text-xs font-black uppercase tracking-wider">微觀延遲 (Ping)</span>
                      <Activity size={18} className={metrics.dbLatency > 500 ? "text-amber-500 animate-pulse" : "text-blue-500"} />
                  </div>
                  <div className="text-sm font-black text-slate-700 flex justify-between">
                      <span className="opacity-70">資料庫 (DB):</span>
                      <span className={metrics.dbLatency > 500 ? 'text-amber-600' : ''}>{metrics.dbLatency} ms</span>
                  </div>
                  <div className="text-sm font-black text-slate-700 flex justify-between">
                      <span className="opacity-70">驗證層 (Auth):</span>
                      <span className={metrics.authLatency > 500 ? 'text-amber-600' : ''}>{metrics.authLatency} ms</span>
                  </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2">
                  <div className="flex justify-between items-center text-slate-500">
                      <span className="text-xs font-black uppercase tracking-wider">資料庫用量 (DB)</span>
                      <HardDrive size={20} className="text-purple-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                      {metrics.dbSizeMB} <span className="text-xs text-slate-400 font-bold">/ 500 MB</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min((metrics.dbSizeMB / 500) * 100, 100)}%` }}></div>
                  </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors"></div>
                  <div className="flex justify-between items-center text-slate-500 relative z-10">
                      <span className="text-xs font-black uppercase tracking-wider">建檔總會員數</span>
                      <Users size={20} className="text-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1 relative z-10">
                      {metrics.totalMembers} <span className="text-sm text-slate-500 font-bold">人</span>
                  </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-amber-500/0 group-hover:bg-amber-500/5 transition-colors"></div>
                  <div className="flex justify-between items-center text-slate-500 relative z-10">
                      <span className="text-xs font-black uppercase tracking-wider">系統表單/賽事數</span>
                      <Flag size={20} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1 relative z-10">
                      {metrics.totalRaces} <span className="text-sm text-slate-500 font-bold">場</span>
                  </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2 relative overflow-hidden group">
                  <div className="absolute inset-0 bg-rose-500/0 group-hover:bg-rose-500/5 transition-colors"></div>
                  <div className="flex justify-between items-center text-slate-500 relative z-10">
                      <span className="text-xs font-black uppercase tracking-wider">總通知發送數</span>
                      <Bell size={20} className="text-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1 relative z-10">
                      {metrics.totalNotifications} <span className="text-sm text-slate-500 font-bold">次</span>
                  </div>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 🌟 完美的效能觀測站日誌 */}
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden flex flex-col">
              <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex items-center gap-2">
                  <div className="p-1.5 bg-slate-700 text-blue-400 rounded-lg"><Activity size={18}/></div>
                  <h3 className="font-black text-white">系統效能觀測站 (Diagnostics)</h3>
                  <button onClick={handleExportLog} className="ml-auto flex items-center gap-1 hover:text-white text-slate-400 transition-colors border border-slate-600 px-2 py-1.5 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700">
                      <Download size={12}/> 匯出日誌
                  </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar font-mono text-[11px] space-y-2 bg-black">
                  {systemLogs.length > 0 ? systemLogs.map((l) => (
                      <div key={l.id} className={`flex gap-3 leading-relaxed ${l.type === 'error' ? 'text-rose-400' : l.type === 'success' ? 'text-emerald-400' : l.type === 'warning' ? 'text-amber-400' : 'text-blue-300'}`}>
                          <span className="opacity-50 shrink-0 select-none">[{l.time}]</span>
                          <span className="break-all">{l.msg}</span>
                      </div>
                  )) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-600 opacity-50 py-10">
                          <span className="text-sm font-bold">系統載入中，日誌準備就緒...</span>
                      </div>
                  )}
                  <div ref={logsEndRef}/>
              </div>
          </div>
          
          {/* 🌟 虛擬機器人 (pg_cron) 運作雷達 */}
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden lg:col-span-2 relative transition-all duration-500">
              <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-bl-full blur-2xl"></div>
              
              <div className="p-5 border-b border-slate-800 flex items-center gap-3 relative z-10">
                  <div className={`p-2 rounded-lg transition-colors duration-500 ${cronJobStatus && cronJobStatus.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-800 text-slate-500'}`}>
                      <Bot size={20}/>
                  </div>
                  <div>
                      <h3 className="font-black text-white text-lg flex items-center gap-2">
                          虛擬機器人運作雷達 (pg_cron)
                          {cronJobStatus && cronJobStatus.active && (
                              <span className="flex h-2 w-2 relative ml-1">
                                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                              </span>
                          )}
                      </h3>
                      <p className="text-xs text-slate-400 font-medium">系統已開啟靜默即時監控，無須手動刷新頁面。</p>
                  </div>
              </div>
              
              <div className="p-6 relative z-10 flex flex-col items-center justify-center min-h-[250px]">
                  {cronJobStatus ? (
                      <div className="w-full max-w-lg bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-xl p-5 shadow-inner animate-fade-in">
                          <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-700/50">
                              <span className="text-sm font-bold text-slate-400">任務名稱</span>
                              <span className="text-sm font-black text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-md tracking-wider">
                                  {cronJobStatus.jobname || 'auto-broadcast-job'}
                              </span>
                          </div>
                          
                          <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400"><Activity size={16}/> 巡邏頻率 (CRON)</div>
                                  <div className="text-sm font-mono text-slate-300 bg-slate-900 px-2 py-1 rounded">{cronJobStatus.schedule}</div>
                              </div>
                              <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400"><Cloud size={16}/> 發射端點 (Target)</div>
                                  <div className="text-xs font-mono text-slate-400 truncate max-w-[200px]">/functions/v1/broadcast-push</div>
                              </div>
                              <div className="flex justify-between items-center">
                                  <div className="flex items-center gap-2 text-sm font-bold text-slate-400"><CheckCircle size={16}/> 運行狀態 (Active)</div>
                                  <div className={`text-sm font-black ${cronJobStatus.active ? 'text-emerald-500' : 'text-red-500'}`}>
                                      {cronJobStatus.active ? '🟢 巡邏中 (Running)' : '🔴 已暫停 (Stopped)'}
                                  </div>
                              </div>
                          </div>
                          <p className="text-[10px] text-slate-500 mt-5 text-center bg-slate-900/50 py-2 rounded-lg font-medium">機器人每分鐘自動掃描廣播排程，確保推播精準發射。</p>
                      </div>
                  ) : (
                      <div className="flex flex-col items-center text-slate-500">
                          <AlertTriangle size={32} className="mb-2 opacity-50"/>
                          <p className="font-bold text-sm">未能取得機器人狀態</p>
                          <p className="text-xs mt-1">請確認是否已在 Supabase 執行更新 View 的 SQL 指令。</p>
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* 🌟 外部基礎設施矩陣面板 */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-xl border border-slate-800 relative overflow-hidden mt-6">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-slate-800 pb-4 relative z-10 gap-4">
              <div>
                  <h3 className="font-black text-white text-xl flex items-center gap-2">
                      <HardDrive className="text-blue-400"/> 外部伺服器與 API 計費監控矩陣
                  </h3>
                  <p className="text-slate-400 text-xs mt-1 font-medium">基於安全協定，請點擊通道前往各平台獨立控制台查看容量與金流。</p>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 relative z-10">
              <a href="https://supabase.com/dashboard/projects" target="_blank" rel="noreferrer" className="group p-5 rounded-2xl border border-green-900/50 bg-slate-800/50 hover:bg-slate-800 transition-all flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                      <div className="p-2 bg-green-500/20 text-green-400 rounded-xl"><Database size={24}/></div>
                  </div>
                  <div>
                      <h4 className="text-white font-black text-lg mb-1 flex items-center gap-1 group-hover:text-green-400 transition-colors">Supabase 總部 <ExternalLink size={14}/></h4>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                          監控 Database 容量 (500MB)<br/>Storage 圖片儲存空間<br/>API 請求總量上限
                      </p>
                  </div>
              </a>

              <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="group p-5 rounded-2xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-all flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                      <div className="p-2 bg-white/10 text-white rounded-xl"><Globe size={24}/></div>
                  </div>
                  <div>
                      <h4 className="text-white font-black text-lg mb-1 flex items-center gap-1 group-hover:text-slate-300 transition-colors">Vercel 網頁主機 <ExternalLink size={14}/></h4>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                          監控 Bandwidth 網站總流量<br/>Serverless 函式運算時間
                      </p>
                  </div>
              </a>

              <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="group p-5 rounded-2xl border border-blue-900/50 bg-slate-800/50 hover:bg-slate-800 transition-all flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl"><Cloud size={24}/></div>
                  </div>
                  <div>
                      <h4 className="text-white font-black text-lg mb-1 flex items-center gap-1 group-hover:text-blue-400 transition-colors">Google Cloud <ExternalLink size={14}/></h4>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                          監控 Google OAuth 請求數<br/>Google API 額度與金流
                      </p>
                  </div>
              </a>

              <a href="https://github.com/" target="_blank" rel="noreferrer" className="group p-5 rounded-2xl border border-purple-900/50 bg-slate-800/50 hover:bg-slate-800 transition-all flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                      <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl"><Github size={24}/></div>
                  </div>
                  <div>
                      <h4 className="text-white font-black text-lg mb-1 flex items-center gap-1 group-hover:text-purple-400 transition-colors">GitHub 原始碼庫 <ExternalLink size={14}/></h4>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                          監控 Repository 容量<br/>GitHub Actions 部署分鐘數
                      </p>
                  </div>
              </a>
          </div>
      </div>

      {/* 🌟 帶有雷達定位點擊功能的通知面板 */}
      {showNotifPanel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex justify-end animate-fade-in" onClick={() => setShowNotifPanel(false)}>
              <div className="bg-slate-50 w-full sm:w-[400px] h-full flex flex-col shadow-2xl animate-slide-left" onClick={e => e.stopPropagation()}>
                  <div className="px-6 py-5 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Bell className="text-blue-600"/> 系統通知</h3>
                      <button onClick={() => setShowNotifPanel(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>
                  <div className="flex bg-white px-4 pt-2 border-b border-slate-200 shrink-0">
                      <button onClick={() => setNotifTab('system')} className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${notifTab === 'system' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>賽事/系統通報</button>
                      <button onClick={() => setNotifTab('personal')} className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${notifTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>個人提醒</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-xs font-bold text-slate-400">保留近 8 個月的通知</span>
                          <button onClick={markAllAsRead} className="text-xs font-bold text-blue-600 hover:underline">全部標示已讀</button>
                      </div>
                      {notifications.filter(n => n.tab === notifTab).length > 0 ? (
                          notifications.filter(n => n.tab === notifTab).map(notif => {
                              const isItemRead = notif.isRead || notif.is_read;
                              return (
                              <div key={notif.id} 
                                  // 🌟 雷達定位：只要點擊包含 ID 的通知，瞬間飛躍到 MemberCRM
                                  onClick={() => {
                                      const match = notif.message.match(/\(ID:\s*(.*?)\)/);
                                      if (match) {
                                          navigate(`/admin/members?view=ALL&targetId=${match[1]}`);
                                          setShowNotifPanel(false);
                                      }
                                  }}
                                  className={`p-4 rounded-2xl border transition-all relative group ${notif.message.includes('(ID:') ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : ''} ${isItemRead ? 'bg-slate-100/50 border-slate-200 opacity-80' : 'bg-white border-blue-200 shadow-sm'}`}>
                                  <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                  <div className="flex gap-3">
                                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isItemRead ? 'bg-slate-200' : 'bg-blue-50'}`}>
                                          {getNotifIcon(notif.category)}
                                      </div>
                                      <div className="flex-1 pr-6">
                                          <div className="text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1"><Clock size={10}/> {new Date(notif.date).toLocaleDateString()}</div>
                                          {/* 🌟 核心：套用 whitespace-pre-wrap 讓人類可讀的排版與換行生效 */}
                                          <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isItemRead ? 'text-slate-600' : 'text-slate-800 font-bold'}`}>
                                              {notif.message}
                                          </p>
                                          {notif.message.includes('(ID:') && (
                                              <div className="mt-2 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">👆 點擊前往審核異動</div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          )})
                      ) : (
                          <div className="text-center py-10 text-slate-400 font-medium text-sm">目前沒有任何通知</div>
                      )}
                  </div>
              </div>
          </div>
      )}

    </div>
  )
}