import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import EventCard from '../components/EventCard' 
import { Search, Filter, Trophy, Bike, Waves, Mountain, Activity, LayoutGrid } from 'lucide-react'

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        // .eq('status', 'open') // 先註解掉這行，避免如果沒有 open 狀態的賽事會全空，方便您除錯
        .order('date', { ascending: true }) // 🟢 修正：欄位改回 'date'
      
      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('讀取失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  // 前端篩選邏輯
  const filteredEvents = filterType === 'all' 
    ? events 
    : events.filter(e => {
        const term = filterType === '鐵人三項' ? 'Triathlon' : filterType
        return (e.title || e.name || '').includes(term) || (e.category || '').includes(term)
      })

  const categories = [
    { id: 'all', label: '全部', icon: LayoutGrid },
    { id: '馬拉松', label: '馬拉松', icon: Activity },
    { id: '鐵人三項', label: '鐵人三項', icon: Trophy },
    { id: '越野賽', label: '越野賽', icon: Mountain },
    { id: '單車', label: '單車', icon: Bike },
    { id: '游泳', label: '游泳', icon: Waves },
  ]

  return (
    <div className="min-h-screen bg-slate-50 pb-20 animate-fade-in">
      {/* Hero Header */}
      <div className="bg-[#0f172a] text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-lg">
        <div className="max-w-7xl mx-auto relative z-10 text-center md:text-left">
          <h1 className="text-4xl font-black tracking-tight mb-3 text-white">醫護鐵人賽事報名</h1>
          <p className="text-blue-200 font-bold tracking-wide text-sm uppercase">守護賽道，榮耀同行</p>
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        {/* 篩選控制列 */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
           <div className="flex items-center gap-2 overflow-x-auto w-full p-1 no-scrollbar mask-gradient-right">
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => setFilterType(cat.id)}
                  className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${
                    filterType === cat.id 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                      : 'bg-white text-gray-600 border-transparent hover:bg-gray-50 hover:border-gray-200'
                  }`}
                >
                  <cat.icon size={16} className="mr-2"/>
                  {cat.label}
                </button>
              ))}
           </div>
        </div>

        {/* 賽事列表 */}
        <div className="mb-6 flex items-center pl-2">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></div>
            <h2 className="text-xl font-bold text-gray-800">{filterType === 'all' ? '所有賽事' : filterType}</h2>
            <span className="ml-3 px-2.5 py-0.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">{filteredEvents.length}</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => <div key={i} className="h-96 bg-gray-200 rounded-2xl animate-pulse"></div>)}
          </div>
        ) : filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <Trophy size={64} className="mx-auto text-gray-200 mb-4"/>
            <h3 className="text-lg font-bold text-gray-500">目前沒有相關賽事</h3>
            <p className="text-sm text-gray-400 mt-1">資料庫欄位名稱: date (請確認 Supabase 欄位是否正確)</p>
          </div>
        )}
      </div>
    </div>
  )
}