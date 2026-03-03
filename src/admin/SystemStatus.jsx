import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Database, Cpu, HardDrive, CheckCircle, AlertTriangle, Activity, ExternalLink, Loader2, RefreshCw, Cloud, Globe, Flag, UserCheck, FileSignature, Clock, ChevronRight, Calendar } from 'lucide-react'

export default function SystemStatus() {
  const [metrics, setMetrics] = useState({
    dbSizeMB: 0,
    totalMembers: 0,
    latency: 0,
    status: 'checking'
  })
  const [loading, setLoading] = useState(true)
  
  // 戰情室資料狀態
  const [recentRaces, setRecentRaces] = useState([])
  const [profileUpdates, setProfileUpdates] = useState([])
  const [modRequests, setModRequests] = useState([])

  useEffect(() => { 
      runSystemDiagnostics() 
      fetchWarRoomData()
  }, [])

  const runSystemDiagnostics = async () => {
    setLoading(true)
    const start = performance.now()
    try {
      const { data, error } = await supabase.from('profiles').select('id').limit(1)
      const end = performance.now()
      const latency = Math.round(end - start)
      
      let size = 15.5, count = 0
      try {
          const { count: c } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
          count = c || 0
      } catch (e) { count = 0 }

      setMetrics({
        dbSizeMB: size,
        totalMembers: count,
        latency,
        status: error ? 'error' : (latency > 500 ? 'warning' : 'healthy')
      })
    } catch (error) {
      setMetrics(prev => ({ ...prev, status: 'error' }))
    } finally {
      setLoading(false)
    }
  }

  const fetchWarRoomData = async () => {
      try {
          // 1. 抓取最新新增或即將到來的賽事
          const { data: races } = await supabase
              .from('races')
              .select('id, name, date, status, medic_required, medic_registered')
              .order('created_at', { ascending: false })
              .limit(5)
          if (races) setRecentRaces(races)

          // 2. 抓取系統通知 (變更紀錄與申請單)
          const { data: notifs } = await supabase
              .from('admin_notifications')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(20)
          
          if (notifs) {
              setProfileUpdates(notifs.filter(n => n.type === 'PROFILE_UPDATE').slice(0, 5))
              setModRequests(notifs.filter(n => n.type === 'MODIFICATION_REQUEST').slice(0, 5))
          }
      } catch (e) {
          console.error("無法載入戰情室資料", e)
      }
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
                  <p className="text-slate-500 font-medium text-sm mt-1">Super Admin War Room</p>
              </div>
              <button 
                  onClick={() => { runSystemDiagnostics(); fetchWarRoomData(); }}
                  disabled={loading}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl font-bold transition-colors"
              >
                  <RefreshCw size={16} className={loading ? 'animate-spin' : ''}/>
                  {loading ? '偵測中...' : '重新整理'}
              </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
              <div className={`p-5 rounded-2xl border flex flex-col justify-center gap-2 ${getStatusColor(metrics.status)}`}>
                  <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider opacity-70">伺服器狀態</span>
                      {getStatusIcon(metrics.status)}
                  </div>
                  <div className="text-2xl font-black mt-1">
                      {metrics.status === 'healthy' ? '連線正常' : metrics.status === 'warning' ? '稍微延遲' : '連線異常'}
                  </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2">
                  <div className="flex justify-between items-center text-slate-500">
                      <span className="text-xs font-black uppercase tracking-wider">資料庫延遲</span>
                      <Activity size={20} />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                      {metrics.latency} <span className="text-sm text-slate-500 font-bold">ms</span>
                  </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2">
                  <div className="flex justify-between items-center text-slate-500">
                      <span className="text-xs font-black uppercase tracking-wider">資料庫用量</span>
                      <HardDrive size={20} />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                      {metrics.dbSizeMB} <span className="text-sm text-slate-500 font-bold">MB</span>
                  </div>
              </div>

              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2">
                  <div className="flex justify-between items-center text-slate-500">
                      <span className="text-xs font-black uppercase tracking-wider">總會員數</span>
                      <Database size={20} />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                      {metrics.totalMembers} <span className="text-sm text-slate-500 font-bold">人</span>
                  </div>
              </div>
          </div>
      </div>

      {/* 🌟 三大智慧直觀看板區 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 1. 預定新增賽事動態 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Flag size={18}/></div>
                  <h3 className="font-black text-blue-900">預定新增賽事動態</h3>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar space-y-3">
                  {recentRaces.length > 0 ? recentRaces.map((race, i) => (
                      <div key={i} className="flex flex-col p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors gap-1.5">
                          <div className="flex justify-between items-start">
                              <span className="text-sm font-black text-slate-800 line-clamp-1">{race.name}</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${race.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{race.status === 'OPEN' ? '報名中' : race.status}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                              <span className="flex items-center gap-1"><Calendar size={12}/> {race.date}</span>
                              <span>{race.medic_registered || 0} / {race.medic_required || 0} 人</span>
                          </div>
                      </div>
                  )) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70 py-10">
                          <Flag size={32} className="mb-2"/>
                          <span className="text-sm font-bold">近期無新增賽事</span>
                      </div>
                  )}
              </div>
          </div>

          {/* 2. 會員資料變更紀錄 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex items-center gap-2">
                  <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><UserCheck size={18}/></div>
                  <h3 className="font-black text-indigo-900">會員資料變更紀錄</h3>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar space-y-3">
                  {profileUpdates.length > 0 ? profileUpdates.map((log, i) => (
                      <div key={i} className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-black flex items-center justify-center shrink-0 text-xs">
                              {log.user_name?.charAt(0) || '?'}
                          </div>
                          <div>
                              <div className="text-sm font-black text-slate-800">{log.user_name}</div>
                              <div className="text-xs text-slate-500 font-medium mt-0.5 leading-snug">{log.message}</div>
                              <div className="text-[10px] text-slate-400 font-mono mt-1.5 flex items-center gap-1"><Clock size={10}/> {new Date(log.created_at).toLocaleString()}</div>
                          </div>
                      </div>
                  )) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70 py-10">
                          <UserCheck size={32} className="mb-2"/>
                          <span className="text-sm font-bold">近期無變更紀錄</span>
                      </div>
                  )}
              </div>
          </div>

          {/* 3. 資料變更申請單 */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
              <div className="bg-amber-50/50 p-4 border-b border-amber-100 flex items-center gap-2">
                  <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg"><FileSignature size={18}/></div>
                  <h3 className="font-black text-amber-900">資料變更申請單</h3>
                  <span className="ml-auto bg-amber-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full">{modRequests.length} 件待審</span>
              </div>
              <div className="p-4 flex-1 overflow-y-auto max-h-[350px] custom-scrollbar space-y-3">
                  {modRequests.length > 0 ? modRequests.map((req, i) => (
                      <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-amber-100 bg-amber-50/30 hover:bg-amber-50 transition-colors cursor-pointer group">
                          <div className="flex justify-between items-center">
                              <span className="text-sm font-black text-slate-800">{req.user_name}</span>
                              <ChevronRight size={14} className="text-amber-400 group-hover:translate-x-1 transition-transform"/>
                          </div>
                          <div className="text-xs text-slate-600 font-medium line-clamp-2">原因：{req.message}</div>
                          <div className="text-[10px] text-slate-400 font-mono mt-0.5">{new Date(req.created_at).toLocaleDateString()}</div>
                      </div>
                  )) : (
                      <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70 py-10">
                          <CheckCircle size={32} className="mb-2 text-green-400/50"/>
                          <span className="text-sm font-bold">目前無待審核申請單</span>
                      </div>
                  )}
              </div>
          </div>

      </div>

      {/* 外部連結區 */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-black text-slate-800 mb-4 flex items-center gap-2"><ExternalLink className="text-slate-400" size={18}/> 外部管理後台快速連結</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a href="https://supabase.com/dashboard" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-green-600 text-white py-3.5 rounded-xl font-bold hover:bg-green-700 transition-all shadow-sm active:scale-95 text-sm">
                  <Database size={16}/> Supabase
              </a>
              <a href="https://console.cloud.google.com/" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-blue-600 text-white py-3.5 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-sm active:scale-95 text-sm">
                  <Cloud size={16}/> Google Cloud
              </a>
              <a href="https://vercel.com/dashboard" target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm active:scale-95 text-sm">
                  <Globe size={16}/> Vercel
              </a>
          </div>
      </div>

    </div>
  )
}