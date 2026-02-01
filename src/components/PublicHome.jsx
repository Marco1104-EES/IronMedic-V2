import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import EventCard from './EventCard' // 🟢 請確認您的目錄裡有 EventCard.jsx
import { Search, Filter, Trophy, Bike, Waves, Mountain, Activity, LayoutGrid } from 'lucide-react'

export default function PublicHome() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterType, setFilterType] = useState('all')

  // 讀取賽事資料
  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      // 讀取狀態為 'open' (報名中) 的賽事
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('status', 'open')
        .order('date', { ascending: true })
      
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
        // 簡單的模糊搜尋，比對名稱或組別
        const term = filterType === '鐵人三項' ? 'Triathlon' : filterType
        return (e.name || '').includes(term) || (e.category || '').includes(term)
      })

  // 篩選按鈕設定
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
      
      {/* 1. Hero Header (深藍色區塊 - 復刻截圖風格) */}
      <div className="bg-[#0f172a] text-white pt-16 pb-24 px-4 sm:px-6 lg:px-8 relative overflow-hidden shadow-lg">
        <div className="max-w-7xl mx-auto relative z-10 text-center md:text-left">
          <h1 className="text-4xl font-black tracking-tight mb-3 text-white">
            醫護鐵人賽事報名
          </h1>
          <p className="text-blue-200 font-bold tracking-wide text-sm uppercase">
            守護賽道，榮耀同行
          </p>
        </div>
        
        {/* 背景光暈裝飾 */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600 rounded-full mix-blend-multiply filter blur-[80px] opacity-20 translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-600 rounded-full mix-blend-multiply filter blur-[60px] opacity-20 -translate-x-1/2 translate-y-1/2"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
        
        {/* 2. 篩選控制列 (白色懸浮卡片) */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
           
           {/* 分類按鈕區 */}
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

        {/* 3. 賽事列表區 */}
        <div className="mb-6 flex items-center pl-2">
            <div className="w-1.5 h-6 bg-blue-600 rounded-full mr-3"></div>
            <h2 className="text-xl font-bold text-gray-800">
              {filterType === 'all' ? '所有賽事' : filterType}
            </h2>
            <span className="ml-3 px-2.5 py-0.5 bg-gray-200 text-gray-600 text-xs font-bold rounded-full">
              {filteredEvents.length}
            </span>
        </div>

        {loading ? (
          // 載入中骨架屏
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1,2,3].map(i => (
              <div key={i} className="h-96 bg-gray-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : filteredEvents.length > 0 ? (
          // 賽事卡片列表
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          // 查無資料
          <div className="text-center py-24 bg-white rounded-2xl border-2 border-dashed border-gray-200">
            <Trophy size={64} className="mx-auto text-gray-200 mb-4"/>
            <h3 className="text-lg font-bold text-gray-500">目前沒有相關賽事</h3>
            <p className="text-sm text-gray-400 mt-1">請稍後再回來查看，或調整篩選條件</p>
          </div>
        )}

      </div>
    </div>
  )
}