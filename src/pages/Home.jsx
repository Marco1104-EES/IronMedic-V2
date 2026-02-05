import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, MapPin, Calendar, ArrowRight, Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'

// 內嵌 EventCard 元件，確保不因路徑問題報錯
function EventCard({ event }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden hover:shadow-xl transition-all duration-300 group flex flex-col h-full">
      <div className="relative h-48 overflow-hidden">
        <img 
          src={event.image_url || 'https://images.unsplash.com/photo-1533561052604-c3bebbdc768d?w=800&q=80'} 
          alt={event.title} 
          className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute top-3 left-3 bg-red-600 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
          🔥 報名中
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center text-xs font-bold text-blue-600 mb-2">
          <Calendar size={14} className="mr-1"/> {event.event_date || '近期舉行'}
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-2 line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors">
          {event.title}
        </h3>
        <div className="flex items-center text-slate-500 text-xs font-bold mb-4">
          <MapPin size={14} className="mr-1"/> {event.location || '台灣'}
        </div>
        
        <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
          <div className="flex -space-x-2">
             {[...Array(3)].map((_,i) => (
                <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[8px] text-slate-500 font-bold">
                   U
                </div>
             ))}
             <div className="w-6 h-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] text-slate-500 font-bold">+99</div>
          </div>
          <Link to={`/event/${event.id}`} className="text-blue-600 font-bold text-sm flex items-center group-hover:translate-x-1 transition-transform">
             立即報名 <ArrowRight size={16} className="ml-1"/>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function Home() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    try {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('event_date', { ascending: true })
      
      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('讀取賽事失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-20">
      {/* Hero Section */}
      <div className="bg-[#0f172a] text-white py-16 px-4 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600 rounded-full blur-[100px] opacity-20"></div>
         <div className="max-w-7xl mx-auto relative z-10 text-center">
            <h1 className="text-4xl md:text-5xl font-black mb-4 tracking-tight">
               醫護鐵人賽事報名
            </h1>
            <p className="text-slate-400 font-bold tracking-widest text-sm md:text-base">
               守護賽道，榮耀同行
            </p>
         </div>
      </div>

      {/* Filter Bar */}
      <div className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
         <div className="bg-white p-2 rounded-2xl shadow-xl border border-slate-100 flex overflow-x-auto scrollbar-hide">
            <button className="px-6 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm whitespace-nowrap shadow-lg shadow-blue-200">
               🏁 全部賽事
            </button>
            <button className="px-6 py-3 rounded-xl text-slate-500 font-bold text-sm whitespace-nowrap hover:bg-slate-50">
               🏃 馬拉松
            </button>
            <button className="px-6 py-3 rounded-xl text-slate-500 font-bold text-sm whitespace-nowrap hover:bg-slate-50">
               🚴 鐵人三項
            </button>
         </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-4 mt-12">
         <div className="flex items-center mb-6">
            <div className="w-1 h-6 bg-blue-600 mr-3 rounded-full"></div>
            <h2 className="text-xl font-black text-slate-800">所有賽事</h2>
            <span className="ml-3 bg-slate-100 text-slate-500 px-2 py-1 rounded-md text-xs font-bold">
               {events.length}
            </span>
         </div>

         {loading ? (
            <div className="flex justify-center py-20">
               <Loader2 className="animate-spin text-blue-600" size={40}/>
            </div>
         ) : events.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
               {events.map(event => (
                  <EventCard key={event.id} event={event} />
               ))}
            </div>
         ) : (
            <div className="text-center py-20 bg-white rounded-3xl border border-slate-100">
               <div className="text-4xl mb-4">📭</div>
               <p className="text-slate-400 font-bold">目前沒有賽事</p>
            </div>
         )}
      </div>
    </div>
  )
}