import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import { ChevronDown, ChevronUp, History, Calendar, Trophy, Archive, Bike, Waves, Mountain, Footprints, Activity } from 'lucide-react'

// 引入您的元件
import Navbar from './components/Navbar'
import AdminDashboard from './components/AdminDashboard'
import Login from './components/Login'
import UserProfile from './components/UserProfile'
import EventCard from './components/EventCard' 

// --- 模擬龐大的資料庫 (Mock Data) - 加入 'category' 欄位 ---
const UPCOMING_EVENTS = [
  { id: 101, category: '馬拉松', title: '2026 金門大橋馬拉松', date: '2026-01-25', location: '金門縣', status: 'open', participants: 1250, image: 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&q=80', description: '跨越金門大橋，飽覽海景風光。' },
  { id: 102, category: '馬拉松', title: '2026 臺北國道馬拉松', date: '2026-03-08', location: '臺北市', status: 'closing', participants: 5800, image: 'https://images.unsplash.com/photo-1533561098132-75088e84ac93?w=800&q=80', description: '全台唯一封閉國道賽事。' },
  { id: 103, category: '鐵人三項', title: '2026 IRONMAN 70.3 Kenting', date: '2026-04-12', location: '屏東恆春', status: 'full', participants: 2100, image: 'https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?w=800&q=80', description: '挑戰國境之南，體驗頂級鐵人三項。' },
  { id: 104, category: '鐵人三項', title: '2026 Challenge Taiwan', date: '2026-04-25', location: '台東縣', status: 'open', participants: 4500, image: 'https://images.unsplash.com/photo-1599580136952-4589d380e95c?w=800&q=80', description: '亞洲最大鐵人三項嘉年華。' },
  { id: 105, category: '越野賽', title: '2026 棲蘭林道越野', date: '2026-05-02', location: '宜蘭縣', status: 'open', participants: 800, image: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?w=800&q=80', description: '穿梭神木群，探索迷霧森林。' },
  { id: 106, category: '馬拉松', title: '2026 澎湖花火節路跑', date: '2026-05-20', location: '澎湖縣', status: 'open', participants: 3000, image: 'https://images.unsplash.com/photo-1533230323381-80c10397554b?w=800&q=80', description: '夜跑賞煙火，最浪漫的賽事。' },
  { id: 107, category: '鐵人三項', title: '2026 秀姑巒溪泛舟鐵人', date: '2026-06-14', location: '花蓮縣', status: '筹备中', participants: 0, image: 'https://images.unsplash.com/photo-1520638023360-6def43369781?w=800&q=80', description: '結合泛舟、路跑、單車的極限挑戰。' },
  { id: 108, category: '游泳', title: '2026 泳渡日月潭', date: '2026-09-20', location: '南投縣', status: '筹备中', participants: 0, image: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=800&q=80', description: '萬人泳渡，台灣人必做三件事之一。' },
  { id: 109, category: '單車', title: '2026 台灣 KOM 登山王', date: '2026-10-25', location: '花蓮/南投', status: 'open', participants: 600, image: 'https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800&q=80', description: '從海拔0到3275公尺，世界級登山車賽。' },
  { id: 110, category: '單車', title: '2026 環花東自行車賽', date: '2026-04-18', location: '花蓮/台東', status: 'open', participants: 1500, image: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?w=800&q=80', description: '享受太平洋海風，經典兩日賽。' },
  { id: 111, category: '越野賽', title: '2026 阿里山日出越野', date: '2026-12-25', location: '嘉義縣', status: '筹备中', participants: 0, image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=800&q=80', description: '迎接第一道曙光，雲端上的奔跑。' },
  { id: 112, category: '馬拉松', title: '2026 高雄富邦馬拉松', date: '2026-01-11', location: '高雄市', status: 'full', participants: 15000, image: 'https://images.unsplash.com/photo-1552674605-46d50bd49660?w=800&q=80', description: '港都熱情，全城動起來。' },
]

// 2025 歷史資料
const EVENTS_2025 = Array.from({ length: 20 }, (_, i) => ({
  id: 2000 + i, title: `2025 第 ${i+1} 屆 台灣巡迴錦標賽`, date: `2025-${String(Math.floor(i/2)+1).padStart(2,'0')}-15`, location: '台北市', participants: 2000 + (i * 150), status: 'ended'
}))
// 2024 歷史資料
const EVENTS_2024 = Array.from({ length: 30 }, (_, i) => ({
  id: 3000 + i, title: `2024 榮耀回顧賽事 Vol.${i+1}`, date: `2024-${String(Math.floor(i/3)+1).padStart(2,'0')}-20`, location: '新北市', participants: 1500 + (i * 100), status: 'ended'
}))

// --- 內部小元件：歷史賽事摺疊列表 ---
function ArchiveSection({ year, events, isOpen, onToggle }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden mb-4 bg-white shadow-sm hover:shadow-md transition-shadow">
      <button onClick={onToggle} className="w-full flex items-center justify-between p-5 bg-gray-50 hover:bg-gray-100 transition-colors">
        <div className="flex items-center space-x-4">
          <div className="bg-slate-800 text-white p-2 rounded-lg"><Archive size={20} /></div>
          <div className="text-left"><h3 className="text-lg font-bold text-gray-800">{year} 年度賽事回顧</h3><p className="text-sm text-gray-500">共 {events.length} 場紀錄</p></div>
        </div>
        <div className="flex items-center text-blue-600 font-medium">{isOpen ? '收合' : '展開'} {isOpen ? <ChevronUp className="ml-2"/> : <ChevronDown className="ml-2"/>}</div>
      </button>
      {isOpen && (
        <div className="bg-white p-2 animate-fade-in">
          <table className="w-full text-left text-sm"><thead className="bg-gray-50 text-gray-500 border-b"><tr><th className="p-3 pl-4">賽事名稱</th><th className="p-3">日期</th><th className="p-3">地點</th><th className="p-3 text-right pr-4">人數</th></tr></thead><tbody className="divide-y divide-gray-100">{events.map((evt) => (<tr key={evt.id} className="hover:bg-blue-50 cursor-pointer"><td className="p-3 pl-4 font-medium">{evt.title}</td><td className="p-3 text-gray-500">{evt.date}</td><td className="p-3 text-gray-500">{evt.location}</td><td className="p-3 text-right pr-4">{evt.participants.toLocaleString()}</td></tr>))}</tbody></table>
        </div>
      )}
    </div>
  )
}

// --- 前台首頁 (PublicHome) ---
function PublicHome() {
  const [open2025, setOpen2025] = useState(false)
  const [open2024, setOpen2024] = useState(false)
  
  // ✨ 1. 新增篩選狀態 (預設顯示全部)
  const [activeFilter, setActiveFilter] = useState('全部')

  // ✨ 2. 定義五大分類 (包含圖示)
  const categories = [
    { name: '全部', icon: <Activity size={18}/> },
    { name: '馬拉松', icon: <Footprints size={18}/> },
    { name: '鐵人三項', icon: <Trophy size={18}/> },
    { name: '越野賽', icon: <Mountain size={18}/> },
    { name: '單車', icon: <Bike size={18}/> },
    { name: '游泳', icon: <Waves size={18}/> },
  ]

  // ✨ 3. 真實篩選邏輯
  const filteredEvents = activeFilter === '全部' 
    ? UPCOMING_EVENTS 
    : UPCOMING_EVENTS.filter(e => e.category === activeFilter)

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      <Navbar />
      
      {/* Hero Banner */}
      <div className="bg-[#0f172a] text-white py-24 px-4 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-2/3 h-full bg-blue-600 opacity-10 transform -skew-x-12 translate-x-32"></div>
        <div className="max-w-7xl mx-auto relative z-10">
           <div className="inline-block px-3 py-1 mb-6 border border-blue-400/30 rounded-full bg-blue-500/10 text-blue-300 text-xs font-bold tracking-wider">
              2026 SEASON
           </div>
           <h1 className="text-4xl md:text-6xl font-extrabold mb-6 leading-tight">守護賽道，<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">榮耀同行</span></h1>
           <p className="text-slate-300 text-lg md:text-xl max-w-2xl mb-10">加入醫護鐵人，成為賽道上最溫暖且堅定的守護力量。</p>
           <div className="flex gap-4">
             <button className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3.5 rounded-lg font-bold transition-all shadow-lg hover:shadow-blue-500/30">立即加入會員</button>
           </div>
        </div>
      </div>

      {/* ✨ 4. 專業篩選工具列 (取代原本的搜尋列) */}
      <div className="sticky top-16 z-30 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex overflow-x-auto no-scrollbar py-0">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveFilter(cat.name)}
                className={`
                  flex items-center px-6 py-5 text-sm font-bold border-b-2 transition-all whitespace-nowrap
                  ${activeFilter === cat.name 
                    ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'}
                `}
              >
                <span className="mr-2">{cat.icon}</span>
                {cat.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto py-12 px-4 space-y-16">
        
        {/* 本年度賽事列表 (Card Grid) */}
        <section>
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 flex items-center">
                <Calendar className="mr-3 text-blue-600"/> 
                {activeFilter === '全部' ? '近期賽事' : `${activeFilter}賽事`}
              </h2>
              <p className="text-gray-500 mt-2 ml-1">
                {activeFilter === '全部' ? '2026 年度重點推廣賽事' : `精選 ${activeFilter} 類別賽事，立即報名`}
              </p>
            </div>
            <span className="text-sm font-mono text-gray-400 hidden md:block bg-gray-100 px-3 py-1 rounded-full">
              Showing {filteredEvents.length} events
            </span>
          </div>

          {/* 如果篩選後沒資料 */}
          {filteredEvents.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
              <p className="text-gray-400 text-lg">目前尚無此類別賽事</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredEvents.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>

        {/* 歷史賽事 (Accordion) */}
        <section className="max-w-5xl mx-auto pt-8 border-t border-gray-200">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold text-gray-800 flex items-center justify-center"><History className="mr-2 text-slate-500"/> 歷年賽事回顧</h2>
          </div>
          <ArchiveSection year="2025" events={EVENTS_2025} isOpen={open2025} onToggle={() => setOpen2025(!open2025)} />
          <ArchiveSection year="2024" events={EVENTS_2024} isOpen={open2024} onToggle={() => setOpen2024(!open2024)} />
        </section>

      </div>

      {/* Footer */}
      <footer className="bg-[#0f172a] text-slate-400 py-12 mt-12 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 text-center text-xs">
          <p>&copy; 2026 IRON MEDIC 醫護鐵人. All rights reserved.</p>
        </div>
      </footer>
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