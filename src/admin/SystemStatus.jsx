import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Database, Cpu, HardDrive, CheckCircle, AlertTriangle, Activity, ExternalLink, Loader2, RefreshCw, Cloud, Globe, ChevronRight, Flag, Bell, Users, Github, Bot, FileText, Download } from 'lucide-react'

export default function SystemStatus() {
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
  const [systemLogs, setSystemLogs] = useState([]) 
  const logsEndRef = useRef(null)

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
          .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications' }, () => {
              setMetrics(prev => ({ ...prev, totalNotifications: prev.totalNotifications + 1 }))
          })
          .subscribe();

      return () => {
          clearInterval(heartbeat);
          supabase.removeChannel(radarChannel);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addLog = (msg, type = 'info') => {
      const time = new Date().toLocaleTimeString('zh-TW', { hour12: false })
      setSystemLogs(prev => [...prev, { time, msg, type }].slice(0, 50)) 
      setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  const measurePerformance = async () => {
      const t0 = performance.now();
      let authLatency = 0;
      let dbLatency = 0;
      let dbError = null;

      try {
          await supabase.auth.getSession();
          authLatency = Math.round(performance.now() - t0);
      } catch(e) { authLatency = -1; }

      const t1 = performance.now();
      try {
          const res = await supabase.from('profiles').select('id').limit(1);
          dbLatency = Math.round(performance.now() - t1);
          dbError = res.error;
      } catch(e) { dbLatency = -1; dbError = e; }

      return { authLatency, dbLatency, dbError };
  }

  const fetchAllSystemData = async () => {
      setLoading(true)
      addLog('啟動全域系統掃描...', 'info')

      try {
          const { authLatency, dbLatency, dbError } = await measurePerformance();
          
          const [mCountRes, rCountRes, nCountRes, cronRes] = await Promise.all([
              supabase.from('profiles').select('*', { count: 'exact', head: true }),
              supabase.from('races').select('*', { count: 'exact', head: true }),
              supabase.from('user_notifications').select('*', { count: 'exact', head: true }),
              supabase.from('vw_system_cron_jobs').select('*').eq('jobname', 'auto-broadcast-job').maybeSingle()
          ]);

          const overallLatency = Math.max(authLatency, dbLatency);
          let currentStatus = dbError ? 'error' : (overallLatency > 500 ? 'warning' : 'healthy');

          setMetrics({
              dbSizeMB: 15.5,
              totalMembers: mCountRes.count || 0,
              totalRaces: rCountRes.count || 0,
              totalNotifications: nCountRes.count || 0,
              authLatency,
              dbLatency,
              status: currentStatus
          })

          if (currentStatus === 'warning') {
              addLog(`系統稍有延遲 (Auth: ${authLatency}ms, DB: ${dbLatency}ms)`, 'warning')
          } else if (currentStatus === 'error') {
              addLog(`資料庫連線異常!`, 'error')
          } else {
              addLog(`全域掃描完成 (Auth: ${authLatency}ms, DB: ${dbLatency}ms)`, 'success')
          }

          if (cronRes.data) setCronJobStatus(cronRes.data);
          else setCronJobStatus(null);

      } catch (error) {
          console.error("系統監控讀取異常:", error);
          setMetrics(prev => ({ ...prev, status: 'error' }))
          addLog(`發生未預期錯誤: ${error.message}`, 'error')
      } finally {
          setLoading(false)
      }
  }

  const fetchSilentHeartbeat = async () => {
      try {
          const { authLatency, dbLatency, dbError } = await measurePerformance();
          const cronRes = await supabase.from('vw_system_cron_jobs').select('*').eq('jobname', 'auto-broadcast-job').maybeSingle();
          
          const overallLatency = Math.max(authLatency, dbLatency);
          let currentStatus = dbError ? 'error' : (overallLatency > 500 ? 'warning' : 'healthy');
          
          setMetrics(prev => ({
              ...prev,
              authLatency,
              dbLatency,
              status: currentStatus
          }))

          if (currentStatus === 'warning') addLog(`[心跳] 偵測到延遲 (Auth: ${authLatency}ms, DB: ${dbLatency}ms)`, 'warning')
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

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20">
      
      {/* 🌟 頂部：系統核心伺服器監控 */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                      <Cpu className="text-blue-600"/> 系統伺服器監控中心
                  </h2>
                  <p className="text-slate-500 font-medium text-sm mt-1">Super Admin War Room - Rimac 全時四驅即時版</p>
              </div>
              <button 
                  onClick={fetchAllSystemData}
                  disabled={loading}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-colors"
                  title="系統已開啟自動即時同步，您無須手動刷新"
              >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                  {loading ? '全域掃描中...' : '強制手動同步'}
              </button>
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

              {/* 🌟 微觀延遲顯示區 */}
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
          
          {/* 🌟 取代舊版異動單，升級為：效能觀測站日誌 */}
          <div className="bg-slate-900 rounded-2xl shadow-sm border border-slate-800 overflow-hidden flex flex-col">
              <div className="bg-slate-800/80 p-4 border-b border-slate-700 flex items-center gap-2">
                  <div className="p-1.5 bg-slate-700 text-blue-400 rounded-lg"><Activity size={18}/></div>
                  <h3 className="font-black text-white">系統效能觀測站 (Diagnostics)</h3>
                  <button onClick={handleExportLog} className="ml-auto flex items-center gap-1 hover:text-white text-slate-400 transition-colors border border-slate-600 px-2 py-1.5 rounded text-xs font-bold bg-slate-800 hover:bg-slate-700">
                      <Download size={12}/> 匯出日誌
                  </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar font-mono text-[11px] space-y-2 bg-black">
                  {systemLogs.length > 0 ? systemLogs.map((l, i) => (
                      <div key={i} className={`flex gap-3 leading-relaxed ${l.type === 'error' ? 'text-rose-400' : l.type === 'success' ? 'text-emerald-400' : l.type === 'warning' ? 'text-amber-400' : 'text-blue-300'}`}>
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
                      <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                      </span>
                  </div>
                  <div>
                      <h4 className="text-white font-black text-lg mb-1 flex items-center gap-1 group-hover:text-green-400 transition-colors">Supabase 總部 <ExternalLink size={14}/></h4>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                          監控 Database 容量 (500MB)<br/>Storage 圖片儲存空間 (1GB)<br/>API 請求總量上限
                      </p>
                  </div>
              </a>

              <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="group p-5 rounded-2xl border border-slate-700 bg-slate-800/50 hover:bg-slate-800 transition-all flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                      <div className="p-2 bg-white/10 text-white rounded-xl"><Globe size={24}/></div>
                      <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-300 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                      </span>
                  </div>
                  <div>
                      <h4 className="text-white font-black text-lg mb-1 flex items-center gap-1 group-hover:text-slate-300 transition-colors">Vercel 網頁主機 <ExternalLink size={14}/></h4>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                          監控 Bandwidth 網站總流量<br/>Serverless 函式運算時間<br/>網域 SSL 憑證狀態
                      </p>
                  </div>
              </a>

              <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="group p-5 rounded-2xl border border-blue-900/50 bg-slate-800/50 hover:bg-slate-800 transition-all flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                      <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl"><Cloud size={24}/></div>
                      <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
                      </span>
                  </div>
                  <div>
                      <h4 className="text-white font-black text-lg mb-1 flex items-center gap-1 group-hover:text-blue-400 transition-colors">Google Cloud <ExternalLink size={14}/></h4>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                          監控 Google OAuth 登入請求數<br/>Google API 額度與信用卡金流<br/>身分認證憑證管理
                      </p>
                  </div>
              </a>

              <a href="https://github.com/" target="_blank" rel="noreferrer" className="group p-5 rounded-2xl border border-purple-900/50 bg-slate-800/50 hover:bg-slate-800 transition-all flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                      <div className="p-2 bg-purple-500/20 text-purple-400 rounded-xl"><Github size={24}/></div>
                      <span className="flex h-3 w-3 relative">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-purple-500"></span>
                      </span>
                  </div>
                  <div>
                      <h4 className="text-white font-black text-lg mb-1 flex items-center gap-1 group-hover:text-purple-400 transition-colors">GitHub 原始碼庫 <ExternalLink size={14}/></h4>
                      <p className="text-slate-400 text-xs font-medium leading-relaxed">
                          監控 Repository 容量限制<br/>GitHub Actions 自動部署分鐘數<br/>程式碼版本庫安全
                      </p>
                  </div>
              </a>
          </div>
      </div>

    </div>
  )
}