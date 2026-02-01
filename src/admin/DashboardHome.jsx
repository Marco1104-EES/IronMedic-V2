import { Activity, Database, Shield, Server, ArrowUp, BarChart3, Users, Clock } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

// 模擬 24H 流量數據 (讓圖表會動)
const trafficData = [
  { time: '00:00', load: 40 }, { time: '04:00', load: 30 },
  { time: '08:00', load: 120 }, { time: '12:00', load: 200 },
  { time: '16:00', load: 180 }, { time: '20:00', load: 90 },
  { time: '23:59', load: 50 },
]

export default function DashboardHome() {
  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* 1. 頂部狀態列 (黑底綠光) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 shadow-lg text-white flex items-center justify-between overflow-hidden relative group">
              <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">System Status</div>
                  <div className="text-xl font-black text-green-400 flex items-center">
                      <Activity size={20} className="mr-2 animate-pulse"/> 正常運作 (OPERATIONAL)
                  </div>
              </div>
              <div className="absolute right-0 top-0 h-full w-2 bg-green-500 shadow-[0_0_15px_#22c55e]"></div>
          </div>

          <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 shadow-lg text-white flex items-center justify-between">
              <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Database Load</div>
                  <div className="text-xl font-black text-blue-400 flex items-center">
                      <Database size={20} className="mr-2"/> 0.39%
                  </div>
              </div>
              <Server size={32} className="text-slate-600 opacity-20"/>
          </div>

          <div className="bg-[#0f172a] p-4 rounded-xl border border-slate-700 shadow-lg text-white flex items-center justify-between">
              <div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Security Level</div>
                  <div className="text-xl font-black text-purple-400 flex items-center">
                      <Shield size={20} className="mr-2"/> Grade A+
                  </div>
              </div>
              <div className="flex gap-1">
                  <div className="w-1.5 h-6 bg-green-500 rounded-sm"></div>
                  <div className="w-1.5 h-6 bg-green-500 rounded-sm"></div>
                  <div className="w-1.5 h-6 bg-green-500 rounded-sm"></div>
                  <div className="w-1.5 h-6 bg-green-900 rounded-sm"></div>
              </div>
          </div>
      </div>

      {/* 2. 中段：流量圖表與身分驗證 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左側：大圖表 */}
          <div className="lg:col-span-2 bg-[#0f172a] rounded-2xl border border-slate-700 p-6 shadow-xl relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                  <h3 className="text-white font-bold flex items-center">
                      <Activity className="mr-2 text-green-400" size={18}/> 資料庫請求量 (24H)
                  </h3>
                  <span className="text-xs bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-600">即時監控</span>
              </div>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trafficData}>
                    <defs>
                      <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="time" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                    <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false}/>
                    <Tooltip 
                        contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#fff' }}
                        itemStyle={{ color: '#10b981' }}
                    />
                    <Area type="monotone" dataKey="load" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorLoad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
          </div>

          {/* 右側：狀態條 */}
          <div className="bg-[#0f172a] rounded-2xl border border-slate-700 p-6 shadow-xl flex flex-col justify-between">
               <div>
                  <h3 className="text-white font-bold mb-4 flex items-center">
                      <Shield className="mr-2 text-blue-400" size={18}/> 身份驗證狀態 (Auth)
                  </h3>
                  <div className="flex items-end space-x-2 h-32 mb-4 justify-center">
                      <div className="w-8 bg-green-600 h-[20%] rounded-t-sm animate-pulse"></div>
                      <div className="w-8 bg-green-600 h-[30%] rounded-t-sm"></div>
                      <div className="w-8 bg-green-500 h-[50%] rounded-t-sm"></div>
                      <div className="w-8 bg-green-500 h-[80%] rounded-t-sm shadow-[0_0_15px_#22c55e]"></div>
                      <div className="w-8 bg-green-500 h-[60%] rounded-t-sm"></div>
                      <div className="w-8 bg-green-600 h-[25%] rounded-t-sm"></div>
                      <div className="w-8 bg-green-600 h-[15%] rounded-t-sm"></div>
                  </div>
               </div>
               <div className="text-right">
                   <div className="text-3xl font-black text-white">100%</div>
                   <div className="text-xs text-green-400 font-bold uppercase">Health Score</div>
               </div>
          </div>
      </div>

      {/* 3. 底部：年度分析卡片 */}
      <div className="bg-[#0f172a] rounded-2xl border border-slate-700 p-6 shadow-xl">
          <div className="flex items-center mb-4 border-b border-slate-700 pb-4">
              <BarChart3 className="mr-2 text-blue-400"/>
              <h3 className="text-white font-bold">2026 年度營運分析</h3>
          </div>
          <div className="grid grid-cols-3 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                  <div className="text-xs text-slate-400 mb-1">會員總數</div>
                  <div className="text-2xl font-black text-white">908</div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl text-center">
                  <div className="text-xs text-slate-400 mb-1">舉辦賽事</div>
                  <div className="text-2xl font-black text-white">12</div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-xl text-center border border-green-900/50">
                  <div className="text-xs text-green-400 mb-1">年度成長</div>
                  <div className="text-2xl font-black text-green-400 flex justify-center items-center">
                      +15% <ArrowUp size={16} className="ml-1"/>
                  </div>
              </div>
          </div>
      </div>

      {/* 4. SEO 流量情報 (白色區塊 - 復刻您截圖下半部) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
              <h3 className="text-slate-800 font-black flex items-center">
                  <Users className="mr-2 text-blue-600"/> SEO 與流量情報 (Traffic)
              </h3>
              <button className="text-xs text-blue-600 font-bold bg-blue-50 px-3 py-1 rounded-full">查看報表</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-xs text-slate-500 font-bold mb-2">SEO 健康分數</div>
                  <div className="text-3xl font-black text-slate-800">92 <span className="text-sm font-normal text-green-600">優異</span></div>
                  <div className="w-full h-1 bg-slate-200 mt-3 rounded-full overflow-hidden">
                      <div className="w-[92%] h-full bg-green-500"></div>
                  </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-xs text-slate-500 font-bold mb-2">資源使用率</div>
                  <div className="text-3xl font-black text-slate-800">0.4% <span className="text-sm font-normal text-green-600">安全</span></div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-xs text-slate-500 font-bold mb-2">搜尋排名 (Avg)</div>
                  <div className="text-3xl font-black text-slate-800">8.4 <span className="text-sm font-normal text-blue-600">-0.2</span></div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                  <div className="text-xs text-slate-500 font-bold mb-2">累積報名總數</div>
                  <div className="text-3xl font-black text-blue-600">49 <span className="text-sm font-normal text-slate-400 text-black">人次</span></div>
              </div>
          </div>
      </div>

    </div>
  )
}