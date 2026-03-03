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
      { name: '鐵人三項', count: 8, lat: 22.7562, lng: 121.1503 },
      { name: '長泳', count: 2, lat: 23.8622, lng: 120.9048 }
  ]

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      // 🌟 修正：精準抓取總數 1086 人
      const { count: totalMembers, error: countError } = await supabase
        .from('profiles')
        .select('id', { count: 'exact' })
        .limit(1)
      
      if (countError) throw countError

      setStats({
        totalMembers: totalMembers || 0,
        licenseStats: [],
        priorityStats: []
      })
    } catch (error) {
      console.error('載入統計資料失敗', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-8 text-center text-slate-500 font-bold animate-pulse">數據防線掃描中...</div>

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in-up pb-20">
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Users size={120} /></div>
            <div className="relative z-10">
                <h3 className="text-slate-300 font-bold mb-2 flex items-center gap-2"><Users size={20}/> 實際會員狀態</h3>
                <div className="text-5xl md:text-6xl font-black tracking-tight">{stats.totalMembers} <span className="text-xl text-slate-400 font-medium">人</span></div>
            </div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Activity size={120} /></div>
            <div className="relative z-10">
                <h3 className="text-blue-200 font-bold mb-2 flex items-center gap-2"><Activity size={20}/> 執勤覆蓋率</h3>
                <div className="text-5xl md:text-6xl font-black tracking-tight">85 <span className="text-xl text-blue-300 font-medium">%</span></div>
            </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 md:p-8 rounded-[2rem] shadow-xl text-white relative overflow-hidden group hover:scale-[1.02] transition-transform">
            <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform"><Award size={120} /></div>
            <div className="relative z-10">
                <h3 className="text-amber-200 font-bold mb-2 flex items-center gap-2"><Award size={20}/> 當年度完賽總數</h3>
                <div className="text-5xl md:text-6xl font-black tracking-tight">120 <span className="text-xl text-amber-200 font-medium">場</span></div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
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
              {/* 🌟 關鍵修復：給定絕對高度 320px，徹底消滅 Recharts 負高度崩潰問題 */}
              <div style={{ width: '100%', height: 320 }}>
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