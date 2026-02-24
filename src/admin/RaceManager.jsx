import { useState, useEffect } from 'react'
import { Calendar, MapPin, Users, Plus, Edit, Trash2, Search, Loader2, Flag, Flame, History, CalendarClock, Handshake, Send, Activity, CheckCircle, Download } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'
import * as XLSX from 'xlsx' // 🌟 正式引入 Excel 處理套件

export default function RaceManager() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState('2026') 
  const navigate = useNavigate()
  const location = useLocation()

  const CURRENT_YEAR = new Date().getFullYear()
  const DISPLAY_YEARS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

  useEffect(() => {
    fetchRaces()
  }, [])

  useEffect(() => {
    const searchParams = new URLSearchParams(location.search)
    const view = searchParams.get('view')
    if (view === 'HISTORY') {
        setSelectedYear('HISTORY_ALL')
    } else if (view === 'FUTURE') {
        setSelectedYear('FUTURE_ALL')
    } else if (!view) {
        setSelectedYear(CURRENT_YEAR.toString())
    }
  }, [location.search, CURRENT_YEAR])

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

  // 🌟 終極升級版：智慧關聯資料庫並匯出標準 A~O Excel
  const handleExportRaceList = async (race) => {
      // 1. 收集報名者姓名，準備向資料庫要資料
      const participantsInfo = [];
      const namesToFetch = [];

      if (race.slots_data && Array.isArray(race.slots_data)) {
          race.slots_data.forEach(slot => {
              if (slot.assignee) {
                  const assignees = slot.assignee.split('|');
                  assignees.forEach(item => {
                      if(!item) return;
                      let name = item;
                      let timestamp = 'N/A';
                      try {
                          const parsed = JSON.parse(item);
                          // 去除測試帳號後面的 "#1" 以利精準比對真實姓名
                          name = parsed.name.split(' #')[0]; 
                          timestamp = parsed.timestamp;
                      } catch(e) { 
                          name = item.trim().split(' #')[0]; 
                      }

                      participantsInfo.push({
                          group: slot.group,
                          slotName: slot.name,
                          rawName: name, // 用來確保就算找不到 DB 資料也能顯示名字
                          timestamp: timestamp
                      });
                      namesToFetch.push(name);
                  });
              }
          });
      }

      if (participantsInfo.length === 0) {
          alert("這場賽事目前還沒有任何人報名喔！");
          return;
      }

      // 2. 自動去 profile 資料表撈取這些人的真實會員資料 (A~O 欄)
      let profilesMap = {};
      try {
          const { data: dbProfiles, error } = await supabase
              .from('profiles')
              .select('*')
              .in('full_name', namesToFetch); // 透過姓名去抓取
              
          if (!error && dbProfiles) {
              dbProfiles.forEach(p => {
                  profilesMap[p.full_name] = p; // 建立對照字典
              });
          }
      } catch(e) {
          console.error("撈取會員詳細資料失敗，將匯出空白欄位", e);
      }

      // 3. 完美組裝 A~O 欄位標準格式
      const exportData = participantsInfo.map(p => {
          const dbData = profilesMap[p.rawName] || {}; // 如果找不到這個人，就給空物件
          
          return {
              '報名組別': p.group,
              '報名賽段': p.slotName,
              '登記時間': p.timestamp,
              // 🌟 嚴格遵守您定義的 A~O 欄位
              '姓名(A)': dbData.full_name || p.rawName,
              '出生年月日(B)': dbData.birthday || '',
              '身分證字號(C)': dbData.national_id || '',
              '手機(D)': dbData.phone || '',
              'e-mail(E)': dbData.contact_email || dbData.email || '',
              '通訊地址(F)': dbData.address || '',
              '賽事衣服(G)': dbData.shirt_size || '',
              '緊急聯繫人(H)': dbData.emergency_name || '',
              '緊急聯繫人電話(I)': dbData.emergency_phone || '',
              '緊急聯繫人關係(J)': dbData.emergency_relation || '',
              '英文名(K)': dbData.english_name || '',
              '醫護證照繳交情況(L)': dbData.medical_license || '',
              '飲食(M)': dbData.dietary_habit || '',
              '醫鐵履歷網址(N)': dbData.resume_url || '',
              '成就徽章(O)': dbData.badges || ''
          };
      });

      // 4. 透過 XLSX 套件產出真實的 Excel 檔案
      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "賽事報名名單");
      
      // 自動加上日期戳記
      const today = new Date().toISOString().slice(0,10);
      XLSX.writeFile(wb, `醫護鐵人_${race.name}_名單匯出_${today}.xlsx`);
  }

  const filteredRaces = races.filter(race => {
    if(!race.date) return false;
    const raceYear = new Date(race.date).getFullYear()
    const matchSearch = race.name.toLowerCase().includes(searchTerm.toLowerCase()) || race.location.toLowerCase().includes(searchTerm.toLowerCase())
    
    let matchYear = false
    if (selectedYear === 'ALL') matchYear = true
    else if (selectedYear === 'HISTORY_ALL') matchYear = raceYear < CURRENT_YEAR 
    else if (selectedYear === 'FUTURE_ALL') matchYear = raceYear > CURRENT_YEAR 
    else matchYear = raceYear.toString() === selectedYear.toString() 

    return matchSearch && matchYear
  })

  const getYearButtonClass = (yearStr) => {
      const isSelected = selectedYear === yearStr;
      if (yearStr === 'ALL') return `px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap border-2 shrink-0 ${isSelected ? 'bg-slate-800 text-white border-slate-800 shadow-md' : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'}`
      if (yearStr === 'HISTORY_ALL') return `px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap border-2 shrink-0 ${isSelected ? 'bg-[#666666] text-white border-[#666666] shadow-md' : 'bg-slate-100 text-[#666666] hover:bg-slate-200 border-slate-300'}`
      if (yearStr === 'FUTURE_ALL') return `px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap border-2 shrink-0 ${isSelected ? 'bg-blue-400 text-white border-blue-400 shadow-md' : 'bg-white text-slate-400 hover:bg-slate-50 border-slate-200'}`
      
      const year = parseInt(yearStr)
      if (year < CURRENT_YEAR) return `px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap border-2 shrink-0 ${isSelected ? 'bg-[#666666] text-white border-[#666666] shadow-md' : 'bg-slate-100 text-[#666666] hover:bg-slate-200 border-slate-300'}`
      if (year === CURRENT_YEAR) return `px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap border-2 shrink-0 ${isSelected ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30' : 'bg-blue-50/50 text-blue-600 hover:bg-blue-100 border-blue-200'}`
      return `px-4 py-2 md:px-5 md:py-2.5 rounded-xl text-xs md:text-sm font-black transition-all whitespace-nowrap border-2 border-dashed shrink-0 ${isSelected ? 'bg-blue-400 text-white border-blue-400 shadow-md border-solid' : 'bg-white text-slate-400 hover:bg-slate-50 border-slate-200'}`
  }

  const renderListStatus = (status) => {
      switch(status) {
          case 'OPEN': return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-green-100 text-green-700 flex items-center w-fit gap-1"><Activity size={12}/> 招募中</span>;
          case 'NEGOTIATING': return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-amber-100 text-amber-700 flex items-center w-fit gap-1"><Handshake size={12}/> 洽談中</span>;
          case 'SUBMITTED': return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-slate-200 text-slate-700 flex items-center w-fit gap-1"><Send size={12}/> 已送名單</span>;
          case 'FULL': return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-red-100 text-red-700 flex items-center w-fit gap-1"><CheckCircle size={12}/> 滿編</span>;
          default: return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-slate-100 text-slate-500">未知狀態</span>;
      }
  }

  const calculateFilledSlots = (slots) => {
      if (!slots || !Array.isArray(slots)) return 0;
      return slots.reduce((acc, curr) => acc + (curr.filled || 0), 0);
  }

  return (
    <div className="space-y-4 md:space-y-6 pb-20 animate-fade-in text-slate-800 w-full max-w-full">
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                  {selectedYear === 'HISTORY_ALL' || (parseInt(selectedYear) < CURRENT_YEAR) ? <History className="text-slate-500"/> : selectedYear === 'FUTURE_ALL' || (parseInt(selectedYear) > CURRENT_YEAR) ? <CalendarClock className="text-blue-400"/> : <Flag className="text-blue-600"/>}
                  {selectedYear === 'HISTORY_ALL' || (parseInt(selectedYear) < CURRENT_YEAR) ? '歷史賽事結算' : selectedYear === 'FUTURE_ALL' || (parseInt(selectedYear) > CURRENT_YEAR) ? '未來賽事規劃' : '賽事總覽'}
              </h2>
              <p className="text-slate-500 text-xs md:text-sm mt-1">管理跨年度所有賽事，支援歷史結算與未來意願調查。</p>
          </div>
          <button onClick={() => navigate('/admin/race-builder')} className="w-full sm:w-auto px-5 md:px-6 py-2.5 md:py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 active:scale-95">
              <Plus size={18}/> 建立新賽事
          </button>
      </div>

      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              <button onClick={() => setSelectedYear('ALL')} className={getYearButtonClass('ALL')}>全部</button>
              {DISPLAY_YEARS.map(year => (
                  <button key={year} onClick={() => setSelectedYear(year.toString())} className={getYearButtonClass(year.toString())}>
                      {year} 年
                  </button>
              ))}
          </div>

          <div className="relative w-full xl:w-72 shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="text" placeholder="搜尋賽事名稱或地點..." className="w-full pl-10 pr-4 py-2 md:py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-xs md:text-sm font-medium bg-slate-50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
          </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full">
          <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                      <tr className="bg-slate-50 text-slate-500 text-[10px] md:text-xs uppercase tracking-wider border-b border-slate-200">
                          <th className="p-3 md:p-4 font-bold">賽事名稱</th>
                          <th className="p-3 md:p-4 font-bold">日期</th>
                          <th className="p-3 md:p-4 font-bold">地點</th>
                          <th className="p-3 md:p-4 font-bold">狀態</th>
                          <th className="p-3 md:p-4 font-bold">報名進度</th>
                          <th className="p-3 md:p-4 font-bold text-right">操作</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {loading ? (
                          <tr><td colSpan="6" className="text-center py-10 text-slate-500"><Loader2 className="animate-spin mx-auto mb-2"/> 載入資料中...</td></tr>
                      ) : filteredRaces.length === 0 ? (
                          <tr><td colSpan="6" className="text-center py-12 text-slate-500 font-medium bg-slate-50/50 text-sm">此區間無符合條件的賽事紀錄</td></tr>
                      ) : (
                          filteredRaces.map((race) => (
                              <tr key={race.id} className="hover:bg-slate-50 transition-colors group">
                                  <td className="p-3 md:p-4 w-1/3">
                                      <div className="font-bold text-slate-800 text-sm md:text-base line-clamp-2">{race.name}</div>
                                      <div className="text-[10px] md:text-xs text-slate-500 mt-1 flex items-center gap-1.5 flex-wrap">
                                          <span className="bg-slate-200 px-2 py-0.5 rounded font-black text-slate-600">{race.type}</span>
                                          {race.is_hot && <span className="text-red-500 flex items-center bg-red-50 px-1.5 py-0.5 rounded font-bold"><Flame size={12}/>火熱</span>}
                                      </div>
                                  </td>
                                  <td className="p-3 md:p-4 whitespace-nowrap">
                                      <div className="text-xs md:text-sm font-medium text-slate-700 flex items-center gap-1.5"><Calendar size={14} className="text-blue-500"/> {race.date}</div>
                                      {race.gather_time && <div className="text-[10px] md:text-xs text-slate-500 mt-1 pl-5">{race.gather_time} 鳴槍</div>}
                                  </td>
                                  <td className="p-3 md:p-4 text-xs md:text-sm text-slate-600">
                                      <div className="flex items-center gap-1.5 truncate max-w-[150px] md:max-w-[200px]" title={race.location}>
                                          <MapPin size={14} className="text-red-400 shrink-0"/> <span className="truncate">{race.location}</span>
                                      </div>
                                  </td>
                                  <td className="p-3 md:p-4">
                                      {renderListStatus(race.status)}
                                  </td>
                                  <td className="p-3 md:p-4">
                                      <div className="text-xs md:text-sm font-black text-slate-800">
                                          <span className="text-blue-600">{calculateFilledSlots(race.slots_data)}</span> 
                                          <span className="text-slate-400 font-medium mx-1">/</span> 
                                          {race.medic_required}
                                      </div>
                                  </td>
                                  <td className="p-3 md:p-4 text-right whitespace-nowrap">
                                      <button onClick={() => handleExportRaceList(race)} className="p-2 text-slate-400 hover:text-green-600 transition-colors" title="匯出報名名單 (A~O 欄位 Excel)">
                                          <Download size={18}/>
                                      </button>
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