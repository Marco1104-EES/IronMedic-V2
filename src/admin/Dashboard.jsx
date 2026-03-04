import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Users, Activity, Award, ShieldAlert, History, Map as MapIcon, UserCircle, Loader2, AlertTriangle } from 'lucide-react'

// 修正 Leaflet icon
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// 台灣縣市座標對應表
const cityCoordinates = {
    "台北": [25.0330, 121.5654], "新北": [25.0172, 121.4625], "桃園": [24.9936, 121.3010],
    "台中": [24.1477, 120.6736], "台南": [22.9997, 120.2270], "高雄": [22.6273, 120.3014],
    "基隆": [25.1276, 121.7392], "新竹": [24.8138, 120.9675], "嘉義": [23.4801, 120.4491],
    "苗栗": [24.5606, 120.8214], "彰化": [24.0518, 120.5161], "南投": [23.9610, 120.6967],
    "雲林": [23.7092, 120.4313], "屏東": [22.6745, 120.4880], "宜蘭": [24.7021, 121.7377],
    "花蓮": [23.9872, 121.6016], "台東": [22.7663, 121.1448], "澎湖": [23.5712, 119.5793],
    "金門": [24.3255, 118.3167], "連江": [26.1505, 119.9265]
}

const taiwanBounds = [
    [21.5, 119.0], 
    [25.5, 122.5]  
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState(null)
  
  // 🌟 人員數據狀態
  const [memberStats, setMemberStats] = useState({
      total: 0,
      genderData: [],
      cityData: []
  })

  // 🌟 賽事數據狀態
  const [raceStats, setRaceStats] = useState({
      currentYearTotal: 0,
      pastTotal: 0,
      currentYearTypes: [],
      historicalTotalRegistered: 0
  })

  useEffect(() => {
      fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
      setLoading(true)
      setErrorMsg(null)
      try {
          const { data: profiles, error: profileError } = await supabase
              .from('profiles')
              .select('national_id, address')
              .limit(5000)

          if (profileError) throw profileError;

          let maleCount = 0;
          let femaleCount = 0;
          let unknownGender = 0;
          const cityCounts = {};

          if (profiles) {
              profiles.forEach(p => {
                  let gender = '未知';
                  if (p.national_id && typeof p.national_id === 'string' && p.national_id.length >= 2) {
                      const secondChar = p.national_id.charAt(1);
                      if (secondChar === '1') gender = '男';
                      else if (secondChar === '2') gender = '女';
                  }

                  if (gender === '男') maleCount++;
                  else if (gender === '女') femaleCount++;
                  else unknownGender++;

                  if (p.address && typeof p.address === 'string' && p.address.length >= 2) {
                      const city = p.address.substring(0, 2);
                      if (cityCoordinates[city]) {
                          cityCounts[city] = (cityCounts[city] || 0) + 1;
                      }
                  }
              });
          }

          setMemberStats({
              total: profiles?.length || 0,
              genderData: [
                  { name: '男性', value: maleCount, color: '#3b82f6' },
                  { name: '女性', value: femaleCount, color: '#ec4899' },
                  { name: '未填寫/無效', value: unknownGender, color: '#cbd5e1' }
              ].filter(g => g.value > 0), 
              cityData: Object.keys(cityCounts).map(k => ({
                  name: k,
                  count: cityCounts[k],
                  pos: cityCoordinates[k]
              }))
          });

          const currentYear = new Date().getFullYear();
          const { data: races, error: raceError } = await supabase
              .from('races')
              .select('date, type, medic_registered, status')
              .limit(5000)

          if (raceError) throw raceError;

          let cyTotal = 0;
          let pTotal = 0;
          const cyTypes = {};
          let histTotalReg = 0;

          if (races) {
              races.forEach(r => {
                  if (!r.date) return;
                  const raceYear = new Date(r.date).getFullYear();
                  
                  if (raceYear === currentYear) {
                      cyTotal++;
                      const rType = r.type || '其他';
                      cyTypes[rType] = (cyTypes[rType] || 0) + 1;
                  } else if (raceYear < currentYear) {
                      pTotal++;
                      histTotalReg += (r.medic_registered || 0);
                  }
              });
          }

          setRaceStats({
              currentYearTotal: cyTotal,
              pastTotal: pTotal,
              currentYearTypes: Object.keys(cyTypes).map(k => ({ name: k, count: cyTypes[k] })),
              historicalTotalRegistered: histTotalReg
          });

      } catch (error) {
          console.error('戰情室資料載入失敗', error)
          setErrorMsg(error.message)
      } finally {
          setLoading(false)
      }
  }

  const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  if (loading) return (
      <div className="p-8 text-center text-slate-500 font-bold animate-pulse flex flex-col items-center justify-center min-h-[50vh]">
          <Loader2 className="animate-spin mb-4 text-blue-500" size={40}/> 
          <div className="text-lg">智慧戰情室數據演算中...</div>
          <div className="text-sm font-normal mt-2 opacity-70">正在分析 1000+ 筆跨年度資料，請稍候</div>
      </div>
  )

  if (errorMsg) return (
      <div className="p-8 text-center flex flex-col items-center justify-center min-h-[50vh]">
          <AlertTriangle className="mb-4 text-red-500" size={48}/> 
          <div className="text-xl font-black text-red-600 mb-2">資料庫連線或讀取失敗</div>
          <div className="text-sm font-bold text-slate-500 bg-slate-100 p-4 rounded-xl">{errorMsg}</div>
          <button onClick={fetchDashboardData} className="mt-6 px-6 py-2 bg-slate-800 text-white font-bold rounded-xl hover:bg-slate-700">重新嘗試</button>
      </div>
  )

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in-up pb-20 w-full overflow-x-hidden">
      
      {/* 🚀 區塊一：核心指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Users size={120} /></div>
            <div className="relative z-10">
                <h3 className="text-slate-300 font-bold mb-2 flex items-center gap-2"><Users size={20}/> 實際會員狀態</h3>
                <div className="text-5xl md:text-6xl font-black tracking-tight">{memberStats.total} <span className="text-xl text-slate-400 font-medium">人</span></div>
            </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><History size={120} /></div>
            <div className="relative z-10">
                <h3 className="text-blue-200 font-bold mb-2 flex items-center gap-2"><History size={20}/> 歷年完賽場次</h3>
                <div className="text-5xl md:text-6xl font-black tracking-tight">{raceStats.pastTotal} <span className="text-xl text-blue-300 font-medium">場</span></div>
            </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Activity size={120} /></div>
            <div className="relative z-10">
                <h3 className="text-amber-200 font-bold mb-2 flex items-center gap-2"><Activity size={20}/> 今年度賽事</h3>
                <div className="text-5xl md:text-6xl font-black tracking-tight">{raceStats.currentYearTotal} <span className="text-xl text-amber-200 font-medium">場</span></div>
            </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-500 to-green-600 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Award size={120} /></div>
            <div className="relative z-10">
                <h3 className="text-green-100 font-bold mb-2 flex items-center gap-2"><Award size={20}/> 歷史累積動員</h3>
                <div className="text-5xl md:text-6xl font-black tracking-tight">{raceStats.historicalTotalRegistered} <span className="text-xl text-green-200 font-medium">人次</span></div>
            </div>
        </div>
      </div>

      {/* 🚀 區塊二：人員輪廓深度解析 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex flex-col overflow-hidden">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800"><MapIcon className="text-blue-600"/> 戰力分佈 (台灣戰區)</h3>
              <div className="w-full h-[400px] rounded-xl overflow-hidden z-0 relative border border-slate-200 bg-slate-50">
                  <MapContainer 
                    center={[23.7, 120.95]} 
                    zoom={7.5} 
                    minZoom={7} 
                    maxBounds={taiwanBounds} 
                    maxBoundsViscosity={1.0} 
                    style={{ height: '100%', width: '100%' }}
                  >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {memberStats.cityData.map((city, idx) => (
                          <Marker key={idx} position={city.pos}>
                              <Popup><div className="font-bold text-center">{city.name}</div><div className="text-center text-blue-600 font-black">{city.count} 人</div></Popup>
                          </Marker>
                      ))}
                  </MapContainer>
              </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex flex-col overflow-hidden">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800"><UserCircle className="text-pink-500"/> 會員生理性別比例</h3>
              {/* 🌟 終極防護：加入 style={{ height: 400 }} 絕對高度 */}
              <div className="w-full flex items-center justify-center bg-slate-50 rounded-xl border border-slate-100" style={{ height: 400, minHeight: 400 }}>
                  {memberStats.genderData.length > 0 ? (
                      // 🌟 終極防護：加入 minWidth={1} minHeight={1}
                      <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                          <PieChart>
                              <Pie
                                  data={memberStats.genderData}
                                  cx="50%" cy="50%"
                                  labelLine={false}
                                  label={renderCustomizedLabel}
                                  outerRadius={130}
                                  dataKey="value" stroke="none"
                              >
                                  {memberStats.genderData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                  ))}
                              </Pie>
                              <Tooltip formatter={(value, name) => [`${value} 人`, name]} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                              <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                          </PieChart>
                      </ResponsiveContainer>
                  ) : (
                      <div className="text-slate-400 font-bold">尚無足夠性別數據</div>
                  )}
              </div>
          </div>
      </div>

      {/* 🚀 區塊三：今年度賽事動向 */}
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100 flex flex-col overflow-hidden">
          <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-slate-800"><Activity className="text-purple-600"/> 今年度賽事類型分佈 ({new Date().getFullYear()})</h3>
          {/* 🌟 終極防護：加入 style={{ height: 320 }} 絕對高度 */}
          <div className="w-full bg-slate-50 rounded-xl border border-slate-100 p-2" style={{ height: 320, minHeight: 320 }}>
              {raceStats.currentYearTypes.length > 0 ? (
                  // 🌟 終極防護：加入 minWidth={1} minHeight={1}
                  <ResponsiveContainer width="100%" height="100%" minWidth={1} minHeight={1}>
                      <BarChart data={raceStats.currentYearTypes} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0"/>
                          <XAxis dataKey="name" tick={{fontWeight: 'bold', fill: '#64748b'}} axisLine={false} tickLine={false} />
                          <YAxis tick={{fill: '#64748b'}} axisLine={false} tickLine={false}/>
                          <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="count" name="場次" radius={[6, 6, 0, 0]} barSize={60}>
                              {raceStats.currentYearTypes.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 font-bold">
                      今年度尚未建檔任何賽事
                  </div>
              )}
          </div>
      </div>

    </div>
  )
}