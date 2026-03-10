import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Database, Cpu, HardDrive, CheckCircle, AlertTriangle, Activity, ExternalLink, Loader2, RefreshCw, Cloud, Globe, FileSignature, ChevronRight, Flag, Bell, Users, Github } from 'lucide-react'

export default function SystemStatus() {
  const [metrics, setMetrics] = useState({
    dbSizeMB: 0,
    totalMembers: 0,
    totalRaces: 0,
    totalNotifications: 0,
    latency: 0,
    status: 'checking'
  })
  const [loading, setLoading] = useState(true)
  
  // 戰情室資料狀態 (已將近期賽事與變更紀錄移至 Dashboard，保留變更申請單)
  const [modRequests, setModRequests] = useState([])

  useEffect(() => { 
      runSystemDiagnostics() 
      fetchWarRoomData()
  }, [])

  const runSystemDiagnostics = async () => {
    setLoading(true)
    const start = performance.now()
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1)
      const end = performance.now()
      const latency = Math.round(end - start)
      
      let size = 15.5; // 模擬基礎資料庫大小 (MB)
      let mCount = 0, rCount = 0, nCount = 0;

      // 1. 抓取總會員數
      try {
          const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
          mCount = count || 0
      } catch (e) { mCount = 0 }

      // 2. 抓取總賽事數
      try {
          const { count } = await supabase.from('races').select('*', { count: 'exact', head: true })
          rCount = count || 0
      } catch (e) { rCount = 0 }

      // 3. 抓取總通知發送量 (代表系統活躍負載)
      try {
          const { count } = await supabase.from('user_notifications').select('*', { count: 'exact', head: true })
          nCount = count || 0
      } catch (e) { nCount = 0 }

      setMetrics({
        dbSizeMB: size,
        totalMembers: mCount,
        totalRaces: rCount,
        totalNotifications: nCount,
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
          // 抓取系統通知 (申請單) 邏輯
          const { data: notifs } = await supabase
              .from('admin_notifications')
              .select('*')
              .order('created_at', { ascending: false })
              .limit(20)
          
          if (notifs) {
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
      
      {/* 🌟 頂部：系統核心伺服器監控 (上帝視角黑盒子數據) */}
      <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-sm border border-slate-200 relative overflow-hidden">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                  <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                      <Cpu className="text-blue-600"/> 系統伺服器監控中心
                  </h2>
                  <p className="text-slate-500 font-medium text-sm mt-1">Super Admin War Room - 內部即時數據庫</p>
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

          {/* 🌟 網格調整：改為 xl:grid-cols-6，完美容納 6 張卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 md:gap-6">
              {/* 1. 狀態指示 */}
              <div className={`p-5 rounded-2xl border flex flex-col justify-center gap-2 ${getStatusColor(metrics.status)}`}>
                  <div className="flex justify-between items-center">
                      <span className="text-xs font-black uppercase tracking-wider opacity-70">伺服器狀態</span>
                      {getStatusIcon(metrics.status)}
                  </div>
                  <div className="text-2xl font-black mt-1">
                      {metrics.status === 'healthy' ? '連線正常' : metrics.status === 'warning' ? '稍微延遲' : '連線異常'}
                  </div>
              </div>

              {/* 2. 資料庫延遲 */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2">
                  <div className="flex justify-between items-center text-slate-500">
                      <span className="text-xs font-black uppercase tracking-wider">資料庫延遲</span>
                      <Activity size={20} />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                      {metrics.latency} <span className="text-sm text-slate-500 font-bold">ms</span>
                  </div>
              </div>

              {/* 3. 資料庫用量與限制 (強勢回歸並升級！) */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2">
                  <div className="flex justify-between items-center text-slate-500">
                      <span className="text-xs font-black uppercase tracking-wider">資料庫用量 (DB)</span>
                      <HardDrive size={20} className="text-purple-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                      {metrics.dbSizeMB} <span className="text-xs text-slate-400 font-bold">/ 500 MB</span>
                  </div>
                  {/* 極簡容量進度條 */}
                  <div className="w-full bg-slate-200 rounded-full h-1.5 mt-1 overflow-hidden">
                      <div className="bg-purple-500 h-1.5 rounded-full" style={{ width: `${Math.min((metrics.dbSizeMB / 500) * 100, 100)}%` }}></div>
                  </div>
              </div>

              {/* 4. 總會員數 */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2">
                  <div className="flex justify-between items-center text-slate-500">
                      <span className="text-xs font-black uppercase tracking-wider">建檔總會員數</span>
                      <Users size={20} className="text-blue-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                      {metrics.totalMembers} <span className="text-sm text-slate-500 font-bold">人</span>
                  </div>
              </div>

              {/* 5. 總賽事數 */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2">
                  <div className="flex justify-between items-center text-slate-500">
                      <span className="text-xs font-black uppercase tracking-wider">系統表單/賽事數</span>
                      <Flag size={20} className="text-amber-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                      {metrics.totalRaces} <span className="text-sm text-slate-500 font-bold">場</span>
                  </div>
              </div>

              {/* 6. 總通知量 (負載指標) */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-slate-50 flex flex-col justify-center gap-2">
                  <div className="flex justify-between items-center text-slate-500">
                      <span className="text-xs font-black uppercase tracking-wider">總通知發送數</span>
                      <Bell size={20} className="text-rose-500" />
                  </div>
                  <div className="text-2xl font-black text-slate-800 mt-1 flex items-baseline gap-1">
                      {metrics.totalNotifications} <span className="text-sm text-slate-500 font-bold">次</span>
                  </div>
              </div>
          </div>
      </div>

      {/* 🌟 看板區：保留 3 欄網格設定，確保變更申請單尺寸不變形 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* 資料變更申請單 */}
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
          
          {/* 預留空間給未來其他的黑盒子監控圖表 (例如：流量折線圖) */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 lg:col-span-2 flex flex-col items-center justify-center text-slate-400 border-dashed border-2">
              <Activity size={48} className="mb-4 opacity-50"/>
              <h3 className="font-black text-lg text-slate-600 mb-2">系統流量軌跡圖 (Audit Log)</h3>
              <p className="text-sm font-medium text-center">未來可在此區塊串接進階分析圖表<br/>呈現進出人數與點擊畫面的次數</p>
          </div>
      </div>

      {/* 🌟 外部基礎設施矩陣面板 (無金鑰深層連結) */}
      <div className="bg-slate-900 p-6 md:p-8 rounded-[2rem] shadow-xl border border-slate-800 relative overflow-hidden">
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
              {/* Supabase */}
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

              {/* Vercel */}
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

              {/* Google Cloud */}
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

              {/* GitHub */}
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