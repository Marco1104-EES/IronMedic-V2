import { useState, useEffect } from 'react'
import { Calendar, MapPin, Users, Plus, Edit, Trash2, Search, Loader2, Flag, Flame, History, CalendarClock } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'

export default function RaceManager() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  // 🌟 預設選中 2026
  const [selectedYear, setSelectedYear] = useState('2026') 
  const navigate = useNavigate()
  const location = useLocation()

  const CURRENT_YEAR = 2026
  // 我們強制列出這些年份供按鈕產生
  const DISPLAY_YEARS = [2027, 2026, 2025, 2024]

  useEffect(() => {
    fetchRaces()
  }, [])

  // 🌟 修正：接收側邊欄點擊的 URL 參數
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const view = searchParams.get('view')
    if (view === 'HISTORY') {
        setSelectedYear('HISTORY_ALL')
    } else if (view === 'FUTURE') {
        setSelectedYear('FUTURE_ALL')
    } else if (!view) {
        setSelectedYear('2026')
    }
  }, [location.search])

  const fetchRaces = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('races').select('*').order('date', { ascending: false }) 
      if (error) throw error
      setRaces(data || [])
    } catch (error) {
      alert("載入賽事清單失敗！")
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, title) => {
    if (window.confirm(`確定要刪除賽事「${title}」嗎？此操作無法復原。`)) {
      try {
        const { error } = await supabase.from('races').delete().eq('id', id)
        if (error) throw error
        setRaces(races.filter(r => r.id !== id))
        alert("賽事已刪除！")
      } catch (error) {
        alert("刪除失敗：" + error.message)
      }
    }
  }

  // 🌟 核心過濾邏輯
  const filteredRaces = races.filter(race => {
    // 防呆：確保 date 存在才轉年份
    if(!race.date) return false;

    const raceYear = new Date(race.date).getFullYear()
    const matchSearch = race.name.toLowerCase().includes(searchTerm.toLowerCase()) || race.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchYear = false
    if (selectedYear === 'ALL') {
        matchYear = true
    } else if (selectedYear === 'HISTORY_ALL') {
        matchYear = raceYear < CURRENT_YEAR // 歷史
    } else if (selectedYear === 'FUTURE_ALL') {
        matchYear = raceYear > CURRENT_YEAR // 未來
    } else {
        matchYear = raceYear.toString() === selectedYear.toString() // 特定年份
    }

    return matchSearch && matchYear
  })

  // 🌟 精準顏色控制 (根據您的要求：過去 #666666，今年鮮豔)
  const getYearButtonClass = (yearStr) => {
      const isSelected = selectedYear === yearStr;
      
      if (yearStr === 'ALL') {
          return `px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap border-2 ${isSelected ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'}`
      }

      if (yearStr === 'HISTORY_ALL') {
           return `px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap border-2 ${isSelected ? 'bg-[#666666] text-white border-[#666666] shadow-md' : 'bg-slate-100 text-[#666666] hover:bg-slate-200 border-slate-300'}`
      }
      if (yearStr === 'FUTURE_ALL') {
          return `px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap border-2 ${isSelected ? 'bg-blue-400 text-white border-blue-400 shadow-md' : 'bg-white text-slate-400 hover:bg-slate-50 border-slate-200'}`
      }

      // 如果是單獨的年份數字
      const year = parseInt(yearStr)
      if (year < CURRENT_YEAR) {
          // 過去年度
          return `px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap border-2 ${isSelected ? 'bg-[#666666] text-white border-[#666666] shadow-md' : 'bg-slate-100 text-[#666666] hover:bg-slate-200 border-slate-300'}`
      }
      if (year === CURRENT_YEAR) {
          // 當年度：最鮮豔
          return `px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap border-2 ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30' : 'bg-blue-50/50 text-blue-600 hover:bg-blue-100 border-blue-200'}`
      }
      // 未來年度：不要太搶眼
      return `px-5 py-2.5 rounded-xl text-sm font-black transition-all whitespace-nowrap border-2 border-dashed ${isSelected ? 'bg-blue-400 text-white border-blue-400 shadow-md border-solid' : 'bg-white text-slate-400 hover:bg-slate-50 border-slate-200'}`
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-800 w-full">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  {selectedYear === 'HISTORY_ALL' || (parseInt(selectedYear) < CURRENT_YEAR) ? <History className="text-slate-500"/> : selectedYear === 'FUTURE_ALL' || (parseInt(selectedYear) > CURRENT_YEAR) ? <CalendarClock className="text-blue-400"/> : <Flag className="text-blue-600"/>}
                  {selectedYear === 'HISTORY_ALL' || (parseInt(selectedYear) < CURRENT_YEAR) ? '歷史任務結算' : selectedYear === 'FUTURE_ALL' || (parseInt(selectedYear) > CURRENT_YEAR) ? '未來任務規劃' : '賽事任務總覽'}
              </h2>
              <p className="text-slate-500 text-sm mt-1">管理跨年度所有賽事，支援歷史結算與未來意願調查。</p>
          </div>
          <button onClick={() => navigate('/admin/race-builder')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 active:scale-95">
              <Plus size={18}/> 建立新任務
          </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex gap-2.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 custom-scrollbar">
              <button onClick={() => setSelectedYear('ALL')} className={getYearButtonClass('ALL')}>全部</button>
              
              {/* 🌟 按鈕列：未來、現在、過去 */}
              {DISPLAY_YEARS.map(year => (
                  <button key={year} onClick={() => setSelectedYear(year.toString())} className={getYearButtonClass(year.toString())}>
                      {year} 年
                  </button>
              ))}
          </div>

          <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="搜尋賽事名稱或地點..." className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium bg-slate-50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
          </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                  <thead>
                      <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider border-b border-slate-200">
                          <th className="p-4 font-bold">賽事名稱</th>
                          <th className="p-4 font-bold">日期</th>
                          <th className="p-4 font-bold">地點</th>
                          <th className="p-4 font-bold">狀態</th>
                          <th className="p-4 font-bold">人力需求</th>
                          <th className="p-4 font-bold text-right">操作</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {loading ? (
                          <tr><td colSpan="6" className="text-center py-10 text-slate-500"><Loader2 className="animate-spin mx-auto mb-2"/> 載入資料中...</td></tr>
                      ) : filteredRaces.length === 0 ? (
                          <tr><td colSpan="6" className="text-center py-12 text-slate-500 font-medium bg-slate-50/50">此區間無符合條件的賽事紀錄</td></tr>
                      ) : (
                          filteredRaces.map((race) => (
                              <tr key={race.id} className="hover:bg-slate-50 transition-colors group">
                                  <td className="p-4">
                                      <div className="font-bold text-slate-800">{race.name}</div>
                                      <div className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                                          <span className="bg-slate-200 px-2 py-0.5 rounded text-[10px] font-black text-slate-600">{race.type}</span>
                                          {race.is_hot && <span className="text-red-500 flex items-center"><Flame size={12}/>火熱</span>}
                                      </div>
                                  </td>
                                  <td className="p-4 whitespace-nowrap">
                                      <div className="text-sm font-medium text-slate-700 flex items-center gap-1"><Calendar size={14} className="text-blue-500"/> {race.date}</div>
                                      {race.gather_time && <div className="text-xs text-slate-500 mt-1">{race.gather_time} 鳴槍</div>}
                                  </td>
                                  <td className="p-4 text-sm text-slate-600"><div className="flex items-center gap-1"><MapPin size={14} className="text-red-400"/> {race.location}</div></td>
                                  <td className="p-4">
                                      <span className={`px-3 py-1 rounded-full text-xs font-bold
                                          ${race.status === 'OPEN' ? 'bg-green-100 text-green-700' : 
                                            race.status === 'FULL' ? 'bg-slate-200 text-slate-700' : 
                                            'bg-amber-100 text-amber-700'}`}>
                                          {race.status === 'OPEN' ? '🟢 招募中' : race.status === 'FULL' ? '⚫ 滿編' : '🟡 即將開放'}
                                      </span>
                                  </td>
                                  <td className="p-4">
                                      <div className="text-sm font-black text-slate-800">
                                          {race.medic_registered || 0} <span className="text-slate-400 font-medium">/ {race.medic_required}</span>
                                      </div>
                                  </td>
                                  <td className="p-4 text-right whitespace-nowrap">
                                      <button onClick={() => navigate(`/admin/race-builder?id=${race.id}`)} className="p-2 text-slate-400 hover:text-blue-600 transition-colors" title="編輯這場賽事">
                                          <Edit size={18}/>
                                      </button>
                                      <button onClick={() => handleDelete(race.id, race.name)} className="p-2 text-slate-400 hover:text-red-600 transition-colors" title="刪除賽事">
                                          <Trash2 size={18}/>
                                      </button>
                                  </td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  )
}