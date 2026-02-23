import { useState, useEffect } from 'react'
import { Calendar, MapPin, Users, Clock, ChevronRight, Activity, Flame, ShieldAlert, Timer, CheckCircle, X, Loader2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function RaceEvents() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('ALL')
  const [previewRace, setPreviewRace] = useState(null)
  const navigate = useNavigate()

  // 🌟 核心改變：從 Supabase 抓取真實賽事資料
  useEffect(() => {
    fetchRaces()
  }, [])

  const fetchRaces = async () => {
    setLoading(true)
    try {
      // 只撈取狀態不是 'UPCOMING' (預備中) 的賽事，或者您可以根據需求調整
      const { data, error } = await supabase
        .from('races')
        .select('*')
        // .neq('status', 'UPCOMING') // 如果不想顯示「即將開放」的賽事，可以取消註解這行
        .order('date', { ascending: true }) // 按日期從早到晚排序

      if (error) throw error
      setRaces(data || [])
    } catch (error) {
      console.error("無法載入賽事:", error)
      // 這裡可以考慮用更友善的 UI 提示使用者
    } finally {
      setLoading(false)
    }
  }

  const renderStatusBadge = (status, isHot) => {
    switch (status) {
      case 'OPEN':
        return (
          <div className="absolute top-4 left-4 flex gap-2">
            <span className="bg-green-500/90 backdrop-blur text-white text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1">
              <Activity size={12} className="animate-pulse" /> 招募中
            </span>
            {isHot && <span className="bg-red-500/90 backdrop-blur text-white text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1"><Flame size={12} /> 火熱</span>}
          </div>
        )
      case 'FULL':
        return <div className="absolute top-4 left-4"><span className="bg-slate-800/90 backdrop-blur text-white text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1"><CheckCircle size={12} /> 滿編</span></div>
      case 'UPCOMING':
        return <div className="absolute top-4 left-4"><span className="bg-amber-500/90 backdrop-blur text-white text-xs font-black px-3 py-1 rounded-full shadow-md flex items-center gap-1"><Timer size={12} /> 預備</span></div>
      default: return null
    }
  }

  // 暫時用假資料模擬參與者，未來需從資料庫關聯撈取
  const getMockParticipants = (race) => {
      if (race.medic_registered === 0) return [];
      return Array.from({ length: race.medic_registered }, (_, i) => `隊員 ${i + 1}`);
  }

  const getInitial = (name) => name ? name.charAt(0) : '?'

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans">
      <div className="bg-slate-900 pt-16 pb-24 px-4 md:px-8 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center"></div>
          <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-wider">醫護鐵人賽事任務</h1>
              <p className="text-slate-300 text-sm md:text-base font-medium max-w-2xl mx-auto">選擇您的戰場，發揮您的專業。每一場賽事，都因為有您的守護而更加安全。</p>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-14 relative z-20">
          <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-lg p-2 flex gap-2 mb-8 w-fit mx-auto border border-white/50 overflow-x-auto">
              <button onClick={() => setFilter('ALL')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === 'ALL' ? 'bg-slate-900 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>全部賽事</button>
              <button onClick={() => setFilter('OPEN')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${filter === 'OPEN' ? 'bg-green-500 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>招募中</button>
          </div>

          {loading ? (
              <div className="flex justify-center items-center h-64">
                  <Loader2 className="animate-spin text-slate-400" size={40} />
              </div>
          ) : races.length === 0 ? (
              <div className="text-center text-slate-500 py-12 font-bold text-lg">
                  目前沒有可用的賽事任務
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {races.filter(r => filter === 'ALL' || r.status === filter).map((race, idx) => {
                      const progress = race.medic_required > 0 ? Math.round((race.medic_registered / race.medic_required) * 100) : 0
                      const isAlmostFull = race.status === 'OPEN' && progress >= 80
                      const participants = getMockParticipants(race); // 使用模擬參與者資料

                      return (
                      <div key={race.id} className="bg-white rounded-[2rem] shadow-sm hover:shadow-2xl hover:-translate-y-1 border border-slate-100 overflow-hidden transition-all duration-300 group flex flex-col h-full animate-fade-in-up" style={{ animationDelay: `${(idx % 6) * 100}ms` }}>
                          <div className="h-48 relative overflow-hidden bg-slate-200 shrink-0">
                              <img src={race.image_url || 'https://via.placeholder.com/800x400?text=No+Image'} alt={race.name} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${race.status === 'FULL' ? 'grayscale opacity-70' : ''}`} onError={(e) => e.target.src = 'https://via.placeholder.com/800x400?text=Image+Error'} />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-transparent to-transparent"></div>
                              {renderStatusBadge(race.status, race.is_hot)}
                              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                                  <span className="bg-white/20 backdrop-blur-md text-white text-xs font-bold px-2.5 py-1 rounded-lg border border-white/30">{race.type}</span>
                              </div>
                          </div>

                          <div className="p-6 flex flex-col flex-1">
                              <h3 className="text-xl font-black text-slate-800 mb-4 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{race.name}</h3>
                              
                              <div className="space-y-3 mb-6 flex-1">
                                  <div className="flex items-center text-slate-600 text-sm font-medium bg-slate-50 p-2 rounded-lg"><Calendar size={16} className="text-blue-500 mr-3 shrink-0"/><span>{race.date}</span></div>
                                  <div className="flex items-center text-slate-600 text-sm font-medium bg-slate-50 p-2 rounded-lg"><MapPin size={16} className="text-red-500 mr-3 shrink-0"/><span className="truncate">{race.location}</span></div>
                              </div>

                              <div className="mb-6">
                                  <div className="flex justify-between items-end mb-2">
                                      <div className="flex items-center cursor-pointer hover:bg-slate-100 p-1.5 -ml-1.5 rounded-xl transition-colors active:scale-95" onClick={() => setPreviewRace({...race, participants})} title="點擊查看已就位名單">
                                          <div className="flex -space-x-3">
                                              {participants.slice(0, 4).map((p, i) => (
                                                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-sm" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>{getInitial(p)}</div>
                                              ))}
                                          </div>
                                          <span className="text-xs text-slate-500 font-bold ml-3 flex items-center gap-1">{race.medic_registered} 人已就位 <ChevronRight size={12}/></span>
                                      </div>
                                      
                                      {/* 暫時隱藏候補人數，等後端候補機制建立後再接上 */}
                                      {/* <div className="flex flex-col items-end">
                                          {race.waitlisted > 0 && <span className="bg-amber-100 text-amber-600 text-[10px] px-2 py-0.5 rounded-md font-bold mb-1 border border-amber-200">🔥 候補 {race.waitlisted} 人</span>}
                                          <div className="text-xs font-black text-slate-400">總需 {race.medic_required} 人</div>
                                      </div> */}
                                      <div className="text-xs font-black text-slate-400">總需 {race.medic_required} 人</div>
                                  </div>
                                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                      <div className={`h-full rounded-full transition-all duration-1000 ${race.status === 'FULL' || progress >= 100 ? 'bg-slate-700' : isAlmostFull ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(progress, 100)}%` }}></div>
                                  </div>
                              </div>

                              <button onClick={() => navigate(`/race-detail/${race.id}`)} disabled={race.status === 'UPCOMING'}
                                  className={`w-full py-4 rounded-2xl font-black flex items-center justify-center gap-2 transition-all active:scale-95
                                      ${race.status === 'OPEN' ? 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-600/30' 
                                      : race.status === 'FULL' ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' 
                                      : 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100'}`}
                              >
                                  {race.status === 'OPEN' ? '進入陣型佈署 / 報名' : race.status === 'FULL' ? '查看任務名單 / 候補' : '敬請期待'}
                                  {race.status !== 'UPCOMING' && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
                              </button>
                          </div>
                      </div>
                  )})}
              </div>
          )}
      </div>

      {/* 智能名單預覽 Modal (維持原樣，使用傳入的 participants) */}
      {previewRace && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setPreviewRace(null)}>
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm w-full p-6 animate-bounce-in" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> 戰友就位名單</h3>
                      <button onClick={() => setPreviewRace(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="text-sm font-bold text-slate-500 mb-4 pb-4 border-b border-slate-100 leading-snug">{previewRace.name}</div>
                  <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-2">
                      {previewRace.participants?.map((p, i) => (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-all cursor-default">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>{getInitial(p)}</div>
                              <div><div className="font-bold text-slate-800">{p}</div><div className="text-xs text-green-600 font-bold">已確認參戰</div></div>
                          </div>
                      ))}
                      {previewRace.participants?.length === 0 && <div className="text-center text-slate-400 py-4 font-medium">目前尚無人員就位</div>}
                  </div>
                  <button onClick={() => setPreviewRace(null)} className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors active:scale-95">關閉名單</button>
              </div>
          </div>
      )}
    </div>
  )
}