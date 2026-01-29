import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'

// 引入元件
import Navbar from './components/Navbar'          // 剛剛做的新導覽列
import AdminDashboard from './components/AdminDashboard' // 您的帥氣後台
import Login from './components/Login'            // 您的登入頁
import EventCard from './components/EventCard'    // 您的賽事卡片

// --- 前台首頁：顯示賽事列表 ---
function PublicHome() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchEvents()
  }, [])

  const fetchEvents = async () => {
    // 從資料庫抓取賽事 (假設您的表叫 events)
    // 如果還沒建 events 表，這裡可能會空的，沒關係
    const { data, error } = await supabase
      .from('events') 
      .select('*')
      .order('date', { ascending: true })
    
    if (data) setEvents(data)
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar /> {/* 這裡放導覽列 */}
      
      {/* 英雄區塊 (Hero Section) */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-16 px-4 text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">醫護鐵人賽事報名</h1>
        <p className="text-blue-100 max-w-2xl mx-auto">
          守護賽道，榮耀同行。立即報名您感興趣的賽事，加入我們的行列。
        </p>
      </div>

      {/* 賽事列表區 */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 border-l-4 border-blue-600 pl-3">近期賽事</h2>
        </div>

        {loading ? (
          <div className="text-center py-20 text-gray-500">載入賽事中...</div>
        ) : events.length === 0 ? (
          // 如果沒有賽事資料，顯示一些假資料給您看個感覺
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {/* 假資料卡片 1 */}
             <EventCard 
               event={{
                 id: 1, 
                 title: '2026 大佳河濱馬拉松', 
                 date: '2026-04-18', 
                 location: '台北市大佳河濱公園',
                 image: 'https://images.unsplash.com/photo-1552674605-46d50bd49660' 
               }} 
             />
             {/* 假資料卡片 2 */}
             <EventCard 
               event={{
                 id: 2, 
                 title: '2026 泳渡日月潭', 
                 date: '2026-09-20', 
                 location: '南投日月潭',
                 image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635' 
               }} 
             />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(event => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// --- 主程式路由設定 ---
function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 🏠 前台首頁 (一般人看的) */}
        <Route path="/" element={<PublicHome />} />
        
        {/* 🔑 登入頁 */}
        <Route path="/login" element={<Login />} />
        
        {/* ⚙️ 企業後台 (管理員看的) - 不需要 Navbar，因為後台有自己的側邊欄 */}
        <Route path="/admin/*" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App