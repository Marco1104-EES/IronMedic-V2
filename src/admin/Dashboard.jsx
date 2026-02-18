import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, LabelList } from 'recharts'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Users, Activity, Award, ShieldAlert } from 'lucide-react'

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

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalMembers: 0,
    licenseStats: [],
    priorityStats: [],
    cityStats: []
  })

  // 模擬賽事數據
  const eventStats = [
      { name: '路跑/越野', count: 12, lat: 25.0330, lng: 121.5654 }, 
      { name: '單車', count: 5, lat: 24.1477, lng: 120.6736 },      
      { name: '游泳', count: 3, lat: 22.9997, lng: 120.2270 },      
      { name: '三鐵', count: 8, lat: 22.7663, lng: 121.1448 }       
  ]

  // 台灣縣市座標 (用於將地址轉為地圖點)
  const cityCoordinates = {
      "台北": [25.0330, 121.5654], "新北": [25.0172, 121.4625], "桃園": [24.9936, 121.3010],
      "台中": [24.1477, 120.6736], "台南": [22.9997, 120.2270], "高雄": [22.6273, 120.3014],
      "基隆": [25.1276, 121.7392], "新竹": [24.8138, 120.9675], "嘉義": [23.4801, 120.4491],
      "苗栗": [24.5606, 120.8214], "彰化": [24.0518, 120.5161], "南投": [23.9610, 120.6967],
      "雲林": [23.7092, 120.4313], "屏東": [22.6745, 120.4880], "宜蘭": [24.7021, 121.7377],
      "花蓮": [23.9872, 121.6016], "台東": [22.7663, 121.1448], "澎湖": [23.5712, 119.5793],
      "金門": [24.3255, 118.3167], "連江": [26.1505, 119.9265]
  }

  // 🔒 台灣戰略鎖定邊界 (SouthWest, NorthEast)
  const taiwanBounds = [
    [21.5, 119.0], // 西南角 (海域)
    [25.5, 122.5]  // 東北角 (海域)
  ];

  useEffect(() => { fetchStats() }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('profiles').select('*')
      if (error) throw error

      const totalMembers = data.length
      const licCounts = { 'EMT-1': 0, 'EMT-2': 0, 'EMT-P': 0, '護理師': 0, '醫師': 0, '其他': 0 }
      const priCounts = { '帶隊官': 0, '新人': 0, '年度會員': 0 }
      const cityCounts = {}

      data.forEach(m => {
          const lic = m.medical_license || '其他'
          if (lic.includes('EMT-1')) licCounts['EMT-1']++
          else if (lic.includes('EMT-2')) licCounts['EMT-2']++
          else if (lic.includes('EMT-P') || lic.includes('TP')) licCounts['EMT-P']++
          else if (lic.includes('護理')) licCounts['護理師']++
          else if (lic.includes('醫')) licCounts['醫師']++
          else licCounts['其他']++

          if (m.is_team_leader === 'Y') priCounts['帶隊官']++
          if (m.is_new_member === 'Y') priCounts['新人']++
          if (m.is_current_member === 'Y') priCounts['年度會員']++

          const city = m.address ? m.address.substring(0, 2) : '未知'
          if (cityCoordinates[city]) {
              cityCounts[city] = (cityCounts[city] || 0) + 1
          }
      })

      setStats({
          totalMembers,
          licenseStats: Object.keys(licCounts).map(k => ({ name: k, count: licCounts[k] })),
          priorityStats: Object.keys(priCounts).map(k => ({ name: k, count: priCounts[k] })),
          cityStats: Object.keys(cityCounts).map(k => ({ name: k, count: cityCounts[k], pos: cityCoordinates[k] }))
      })

    } catch (error) { console.error(error) } finally { setLoading(false) }
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  if (loading) return <div className="p-10 text-center">戰情數據加載中...</div>

  return (
    <div className="space-y-6 pb-20 animate-fade-in">
      {/* 1. 營運總覽 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white p-6 rounded-2xl shadow-lg flex items-center justify-between">
              <div><div className="text-blue-100 font-bold mb-1">全人員總覽</div><div className="text-4xl font-black">{stats.totalMembers}</div></div>
              <Users size={48} className="opacity-50"/>
          </div>
          {stats.priorityStats.map((item, idx) => (
             <div key={idx} className="bg-white p-6 rounded-2xl shadow border border-slate-100">
                <div className="text-slate-500 font-bold text-xs uppercase mb-2">{item.name}</div>
                <div className="text-3xl font-black text-slate-800">{item.count}</div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2"><div className={`h-2 rounded-full ${idx===0?'bg-green-500':idx===1?'bg-amber-500':'bg-purple-500'}`} style={{width: `${Math.min(100, item.count*2)}%`}}></div></div>
             </div>
          ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 2. 地圖分布 (直立式 & 鎖定台灣) */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="text-blue-600"/> 全人員戰略分布 (台灣戰區)</h3>
              {/* 高度加高到 500px (直立式) */}
              <div className="h-[500px] rounded-xl overflow-hidden z-0 relative border border-slate-100">
                  <MapContainer 
                    center={[23.7, 120.95]} // 台灣地理中心
                    zoom={7.5} 
                    minZoom={7} // 禁止縮太小
                    maxBounds={taiwanBounds} // 🔒 鎖定邊界
                    maxBoundsViscosity={1.0} // 彈性黏滯度 (拖不出去)
                    style={{ height: '100%', width: '100%' }}
                  >
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OSM' />
                      {stats.cityStats.map((city, idx) => (
                          <Marker key={idx} position={city.pos}><Popup><div className="font-bold">{city.name}</div>人數: {city.count}</Popup></Marker>
                      ))}
                  </MapContainer>
              </div>
          </div>

          {/* 3. 醫療證照 (直向柱狀圖) */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Award className="text-green-600"/> 醫療戰力證照分布</h3>
              {/* 高度配合地圖拉高 */}
              <div className="h-[500px]">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.licenseStats} margin={{top: 20, right: 30, left: 0, bottom: 20}}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false}/>
                          <XAxis dataKey="name" tick={{fontWeight: 'bold', fontSize: 12}} />
                          <YAxis />
                          <Tooltip cursor={{fill: '#f0f9ff'}}/>
                          {/* 移除 Legend，改用 Label 直接顯示數字 */}
                          <Bar dataKey="count" fill="#82ca9d" radius={[4, 4, 0, 0]} barSize={50}>
                             {stats.licenseStats.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                             ))}
                             {/* 在柱子上方顯示數字 */}
                             <LabelList dataKey="count" position="top" style={{ fill: '#666', fontWeight: 'bold' }} />
                          </Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>

      {/* 賽事圖表 (保持不變) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShieldAlert className="text-red-600"/> 賽事戰區分布 (模擬)</h3>
              <div className="h-80 rounded-xl overflow-hidden z-0 relative">
                  <MapContainer center={[23.7, 120.95]} zoom={7.5} style={{ height: '100%', width: '100%' }}>
                      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      {eventStats.map((event, idx) => ( <Marker key={idx} position={[event.lat, event.lng]}><Popup>{event.name}: {event.count}</Popup></Marker> ))}
                  </MapContainer>
              </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-slate-100">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><Activity className="text-purple-600"/> 賽事類型統計</h3>
              <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={eventStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="count" fill="#8884d8"><Cell fill="#0088FE"/><Cell fill="#00C49F"/><Cell fill="#FFBB28"/><Cell fill="#FF8042"/></Bar>
                      </BarChart>
                  </ResponsiveContainer>
              </div>
          </div>
      </div>
    </div>
  )
}