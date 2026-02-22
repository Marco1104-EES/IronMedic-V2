import { useState } from 'react'
import { Calendar, MapPin, Users, Clock, ChevronRight, Activity, Flame, ShieldAlert, Timer, CheckCircle } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

// 📌 擴充版：模擬賽事資料 (準備好接軌未來的 Supabase 資料庫)
const MOCK_RACES = [
  {
    id: 1,
    title: '2026 渣打台北公益馬拉松',
    date: '2026-02-28', gatherTime: '04:30 AM', location: '台北市・總統府前',
    type: '馬拉松', status: 'OPEN', medicRequired: 40, medicRegistered: 32,
    imageUrl: 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=800', isHot: true
  },
  {
    id: 2,
    title: '2026 普悠瑪國際鐵人三項賽',
    date: '2026-03-15', gatherTime: '05:00 AM', location: '台東縣・活水湖',
    type: '鐵人三項', status: 'OPEN', medicRequired: 30, medicRegistered: 28,
    imageUrl: 'https://images.unsplash.com/photo-1532454258191-49cb370f8713?auto=format&fit=crop&q=80&w=800', isHot: true
  },
  {
    id: 3,
    title: '2026 新北市鐵道馬拉松接力賽 (追火車)',
    date: '2026-04-19', gatherTime: '05:30 AM', location: '新北市・福隆',
    type: '路跑接力', status: 'OPEN', medicRequired: 50, medicRegistered: 46,
    imageUrl: 'https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&q=80&w=800', isHot: true
  },
  {
    id: 4,
    title: '2026 戀戀197 秋季自行車聯賽',
    date: '2026-05-10', gatherTime: '06:00 AM', location: '台東縣・卑南鄉',
    type: '自行車', status: 'OPEN', medicRequired: 20, medicRegistered: 8,
    imageUrl: 'https://images.unsplash.com/photo-1541625602330-2277a4c46182?auto=format&fit=crop&q=80&w=800', isHot: false
  },
  {
    id: 5,
    title: '2026 萬金石馬拉松',
    date: '2026-03-22', gatherTime: '04:00 AM', location: '新北市・萬里',
    type: '馬拉松', status: 'FULL', medicRequired: 50, medicRegistered: 50,
    imageUrl: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800', isHot: false
  },
  {
    id: 6,
    title: '2026 台北星光夜跑',
    date: '2026-06-20', gatherTime: '17:30 PM', location: '台北市・大佳河濱公園',
    type: '路跑', status: 'OPEN', medicRequired: 15, medicRegistered: 10,
    imageUrl: 'https://images.unsplash.com/photo-1505051508008-923feaf90180?auto=format&fit=crop&q=80&w=800', isHot: false
  },
  {
    id: 7,
    title: '2026 台灣米倉田中馬拉松',
    date: '2026-11-08', gatherTime: '05:00 AM', location: '彰化縣・田中鎮',
    type: '馬拉松', status: 'FULL', medicRequired: 40, medicRegistered: 40,
    imageUrl: 'https://images.unsplash.com/photo-1516643038628-98e6c78e1d51?auto=format&fit=crop&q=80&w=800', isHot: false
  },
  {
    id: 8,
    title: '2026 國家地理頻道世界地球日路跑',
    date: '2026-04-26', gatherTime: '05:30 AM', location: '台北市・凱達格蘭大道',
    type: '路跑', status: 'OPEN', medicRequired: 25, medicRegistered: 12,
    imageUrl: 'https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&q=80&w=800', isHot: false
  },
  {
    id: 9,
    title: '2026 台北馬拉松',
    date: '2026-12-20', gatherTime: '04:30 AM', location: '台北市・市民廣場',
    type: '馬拉松', status: 'UPCOMING', medicRequired: 100, medicRegistered: 0,
    imageUrl: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?auto=format&fit=crop&q=80&w=800', isHot: false
  },
  {
    id: 10,
    title: '2026 太魯閣峽谷馬拉松',
    date: '2026-11-01', gatherTime: '04:00 AM', location: '花蓮縣・太魯閣',
    type: '馬拉松', status: 'OPEN', medicRequired: 35, medicRegistered: 25,
    imageUrl: 'https://images.unsplash.com/photo-1510414696678-2415ad8474aa?auto=format&fit=crop&q=80&w=800', isHot: true
  },
  {
    id: 11,
    title: '2026 時代騎輪節',
    date: '2026-10-15', gatherTime: '05:00 AM', location: '台中市・市政府',
    type: '自行車', status: 'UPCOMING', medicRequired: 30, medicRegistered: 0,
    imageUrl: 'https://images.unsplash.com/photo-1507035895480-2b3156c31fc8?auto=format&fit=crop&q=80&w=800', isHot: false
  }
]

export default function RaceEvents() {
  const [filter, setFilter] = useState('ALL') // ALL, OPEN, FULL
  const navigate = useNavigate()

  // 渲染狀態標籤
  const renderStatusBadge = (status, isHot) => {
    switch (status) {
      case 'OPEN':
        return (
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-green-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Activity size={12} className="animate-pulse" /> 招募中
            </span>
            {isHot && (
              <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                <Flame size={12} /> 火熱報名
              </span>
            )}
          </div>
        )
      case 'FULL':
        return (
          <div className="absolute top-4 left-4">
            <span className="bg-slate-800 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <CheckCircle size={12} /> 任務滿編
            </span>
          </div>
        )
      case 'UPCOMING':
        return (
          <div className="absolute top-4 left-4">
            <span className="bg-amber-500 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
              <Timer size={12} /> 即將開放
            </span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      
      {/* 頂部視覺區 */}
      <div className="bg-slate-900 pt-16 pb-20 px-4 md:px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center"></div>
          <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-wider">醫護鐵人賽事任務</h1>
              <p className="text-slate-300 text-sm md:text-base font-medium max-w-2xl mx-auto">
                  選擇您的戰場，發揮您的專業。每一場賽事，都因為有您的守護而更加安全。
              </p>
          </div>
      </div>

      {/* 主內容區 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-10 relative z-20">
          
          {/* 過濾器 */}
          <div className="bg-white rounded-2xl shadow-md p-2 flex gap-2 mb-8 w-fit mx-auto border border-slate-100 overflow-x-auto">
              <button 
                  onClick={() => setFilter('ALL')} 
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === 'ALL' ? 'bg-slate-900 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                  全部賽事
              </button>
              <button 
                  onClick={() => setFilter('OPEN')} 
                  className={`px-6 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === 'OPEN' ? 'bg-green-500 text-white shadow' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                  招募中
              </button>
          </div>

          {/* 賽事卡片網格 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {MOCK_RACES.filter(r => filter === 'ALL' || r.status === filter).map((race, idx) => {
                  const progress = Math.round((race.medicRegistered / race.medicRequired) * 100)
                  const isAlmostFull = race.status === 'OPEN' && progress >= 80

                  return (
                  <div key={race.id} className="bg-white rounded-3xl shadow-sm hover:shadow-xl border border-slate-200 overflow-hidden transition-all duration-300 group animate-fade-in-up" style={{ animationDelay: `${(idx % 6) * 100}ms` }}>
                      
                      {/* 上半部：圖片與標籤 */}
                      <div className="h-48 relative overflow-hidden bg-slate-200">
                          <img 
                              src={race.imageUrl} 
                              alt={race.title} 
                              className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${race.status === 'FULL' ? 'grayscale opacity-80' : ''}`}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
                          {renderStatusBadge(race.status, race.isHot)}
                          
                          {/* 賽事類型 */}
                          <div className="absolute bottom-4 left-4">
                              <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded border border-white/30">
                                  {race.type}
                              </span>
                          </div>
                      </div>

                      {/* 下半部：資訊區 */}
                      <div className="p-6">
                          <h3 className="text-xl font-black text-slate-800 mb-4 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                              {race.title}
                          </h3>
                          
                          <div className="space-y-2.5 mb-6">
                              <div className="flex items-center text-slate-600 text-sm font-medium">
                                  <Calendar size={16} className="text-blue-500 mr-3 shrink-0"/>
                                  <span>{race.date}</span>
                              </div>
                              <div className="flex items-center text-slate-600 text-sm font-medium">
                                  <Clock size={16} className="text-amber-500 mr-3 shrink-0"/>
                                  <span>{race.gatherTime} 集合</span>
                              </div>
                              <div className="flex items-center text-slate-600 text-sm font-medium">
                                  <MapPin size={16} className="text-red-500 mr-3 shrink-0"/>
                                  <span className="truncate">{race.location}</span>
                              </div>
                          </div>

                          {/* 招募進度條 */}
                          <div className="mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <div className="flex justify-between items-end mb-2">
                                  <div className="text-xs font-bold text-slate-500 flex items-center gap-1.5">
                                      <ShieldAlert size={14} className={isAlmostFull ? 'text-red-500' : 'text-slate-400'}/>
                                      醫護人力需求
                                  </div>
                                  <div className="text-sm font-black text-slate-800">
                                      {race.medicRegistered} <span className="text-slate-400 font-medium">/ {race.medicRequired}</span>
                                  </div>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2.5 overflow-hidden">
                                  <div 
                                      className={`h-2.5 rounded-full transition-all duration-1000 ${race.status === 'FULL' ? 'bg-slate-700' : isAlmostFull ? 'bg-red-500' : 'bg-blue-500'}`}
                                      style={{ width: `${progress}%` }}
                                  ></div>
                              </div>
                              {isAlmostFull && race.status !== 'FULL' && (
                                  <p className="text-[10px] text-red-500 font-bold mt-2 text-right">🔥 即將額滿，剩餘 {race.medicRequired - race.medicRegistered} 個名額</p>
                              )}
                          </div>

                          {/* 行動按鈕 */}
                          <button 
                              onClick={() => navigate('/race-detail')}
                              disabled={race.status === 'FULL' || race.status === 'UPCOMING'}
                              className={`w-full py-3.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all active:scale-95
                                  ${race.status === 'OPEN' 
                                      ? 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-lg hover:shadow-blue-600/30' 
                                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
                          >
                              {race.status === 'OPEN' ? '查看任務詳情 / 報名' : race.status === 'FULL' ? '任務已滿編' : '敬請期待'}
                              {race.status === 'OPEN' && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                          </button>
                      </div>
                  </div>
              )})}
          </div>
      </div>
    </div>
  )
}