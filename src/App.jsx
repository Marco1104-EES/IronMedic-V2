import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import { Activity, Footprints, Trophy, Mountain, Bike, Waves, Filter } from 'lucide-react'

import Navbar from './components/Navbar'
// 🔴 關鍵修正：這裡改成指向 src/admin/AdminDashboard
import AdminDashboard from './admin/AdminDashboard' 
import Login from './components/Login'
import UserProfile from './components/UserProfile'
import EventCard from './components/EventCard' 
import RegistrationModal from './components/RegistrationModal'

function PublicHome() {
  const [activeFilter, setActiveFilter] = useState('全部')
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [initialTab, setInitialTab] = useState('register') 
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
        .order('date', { ascending: true })

      if (error) throw error
      setEvents(data || [])
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenModal = (event, tab = 'register') => {
    setSelectedEvent(event)
    setInitialTab(tab)
  }

  const categories = [
    { name: '全部', icon: <Activity size={16}/> },
    { name: '馬拉松', icon: <Footprints size={16}/> },
    { name: '鐵人三項', icon: <Trophy size={16}/> },
    { name: '越野賽', icon: <Mountain size={16}/> },
    { name: '單車', icon: <Bike size={16}/> },
    { name: '游泳', icon: <Waves size={16}/> },
  ]

  const filteredEvents = activeFilter === '全部' 
    ? events 
    : events.filter(e => {
        const cat = Array.isArray(e.category) ? e.category[0] : e.category
        return cat && (cat.includes(activeFilter) || activeFilter === '全部')
      })

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
      <Navbar />
      
      <div className="bg-slate-900 text-white pt-8 pb-20 px-4 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-end relative z-10">
           <div>
             <h1 className="text-3xl font-bold tracking-wider">醫護鐵人賽事報名</h1>
             <p className="text-slate-400 text-sm mt-2">守護賽道，榮耀同行</p>
           </div>
        </div>
      </div>

      <div className="sticky top-0 z-40 px-4 -mt-10 transition-all duration-300">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-3 flex items-center overflow-x-auto no-scrollbar">
            <div className="flex items-center text-gray-400 text-sm font-bold mr-4 border-r pr-4 flex-shrink-0">
               <Filter size={18} className="mr-2 text-blue-600"/> 賽事篩選
            </div>
            <div className="flex gap-2">
               {categories.map((cat) => (
                  <button
                    key={cat.name}
                    onClick={() => setActiveFilter(cat.name)}
                    className={`
                      flex items-center px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap
                      ${activeFilter === cat.name 
                        ? 'bg-blue-600 text-white shadow-md transform scale-105' 
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-900'}
                    `}
                  >
                    <span className="mr-2">{cat.icon}</span>
                    {cat.name}
                  </button>
                ))}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-8 px-4 mt-2">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 border-l-4 border-blue-600 pl-3">
             {activeFilter === '全部' ? '所有賽事' : activeFilter}
             <span className="ml-2 text-xs font-normal text-white bg-slate-400 px-2 py-0.5 rounded-full">
               {filteredEvents.length}
             </span>
          </h2>
        </div>

        {loading ? (
           <div className="text-center py-20 text-gray-400">載入中...</div>
        ) : filteredEvents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-400">目前暫無此類別賽事</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredEvents.map(event => (
              <EventCard 
                key={event.id} 
                event={event} 
                onRegister={handleOpenModal} 
              />
            ))}
          </div>
        )}
      </div>

      {selectedEvent && (
        <RegistrationModal 
          event={selectedEvent} 
          initialTab={initialTab}
          onClose={() => setSelectedEvent(null)}
          onConfirm={() => setSelectedEvent(null)}
        />
      )}
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<Login />} />
        <Route path="/profile" element={<UserProfile />} />
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App