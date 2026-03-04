import { useState, useEffect, useMemo } from 'react'
import { Calendar, MapPin, Users, Plus, Edit, Trash2, Search, Loader2, Flag, Flame, History, CalendarClock, Handshake, Send, Activity, CheckCircle, Download, FileSpreadsheet, X, Clock, Crown, Sprout, UsersRound, ChevronRight, ShieldAlert, XCircle, AlertCircle, ArrowUpDown } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useNavigate, useLocation } from 'react-router-dom'
import * as XLSX from 'xlsx' 

const MASTER_SCHEDULE_HEADERS = [
    "賽事名稱", "日期(YYYY-MM-DD)", "鳴槍時間(HH:MM)", "地點", "賽事類型(馬拉松/鐵人三項...)", 
    "海報圖片URL", "狀態(OPEN/NEGOTIATING/SUBMITTED)", "是否火熱(Y/N)", 
    "賽段配置(快速語法)", "參賽總人數", "教官", "主辦單位或承辦單位", 
    "贊助方（鐵人醫護有限公司）代表1", "贊助方（鐵人醫護有限公司）代表2", "贊助方（鐵人醫護有限公司）代表3",
    ...Array.from({length: 40}, (_, i) => `參加人員${i + 1}`)
]

export default function RaceManager() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedYear, setSelectedYear] = useState('2025') 
  const [previewRace, setPreviewRace] = useState(null)
  
  // 🌟 新增：表格智慧操作 State
  const [dateSortOrder, setDateSortOrder] = useState('desc') // 'asc' 小到大, 'desc' 大到小
  const [statusFilter, setStatusFilter] = useState('ALL') // 下拉選單的狀態過濾
  
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
    if (view === 'HISTORY') setSelectedYear('HISTORY_ALL')
    else if (view === 'FUTURE') setSelectedYear('FUTURE_ALL')
  }, [location.search])

  const fetchRaces = async () => {
    setLoading(true)
    try {
      // 在前端處理排序，所以先不依賴 supabase 的 order，確保抓取完整資料
      const { data, error } = await supabase.from('races').select('*')
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

  const extractParticipantsData = (race) => {
      let totalRegistered = 0;
      let participantDetails = [];

      if (race.slots_data && Array.isArray(race.slots_data)) {
          race.slots_data.forEach(slot => {
              if (slot.filled && slot.filled > 0) {
                  totalRegistered += slot.filled;
                  if (slot.assignee) {
                      const names = slot.assignee.split('|').map(n => n.trim());
                      names.forEach(item => {
                          if(!item) return; 
                          try {
                              const parsedUser = JSON.parse(item);
                              if(parsedUser && parsedUser.name) {
                                  participantDetails.push({
                                      id: parsedUser.id || parsedUser.name, 
                                      name: parsedUser.name,
                                      timestamp: parsedUser.timestamp || '10:00:00:000', 
                                      isVip: parsedUser.isVip || false, 
                                      isNew: parsedUser.isNew || false,
                                      roleTag: parsedUser.roleTag || null,
                                      slotGroup: slot.group,
                                      slotName: slot.name,
                                      slotId: slot.id, 
                                      isLegacy: parsedUser.isLegacy || false
                                  });
                              }
                          } catch (e) {
                              if (item.length > 0 && !item.startsWith('{')) { 
                                  const legacyName = item.split(' #')[0];
                                  participantDetails.push({
                                      id: legacyName,
                                      name: legacyName,
                                      timestamp: `舊資料匯入`, 
                                      isVip: item.includes('管理員') || item.includes('VIP'), 
                                      isNew: item.includes('新人'),
                                      slotGroup: slot.group,
                                      slotName: slot.name,
                                      slotId: slot.id,
                                      isLegacy: true
                                  });
                              }
                          }
                      })
                  }
              }
          });
      }
      return { totalRegistered, participantDetails };
  }

  const getInitial = (name) => name ? name.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '').charAt(0) || '?' : '?'

  const handleExportRaceList = async (race) => {
      const participantsInfo = [];
      const emailsToFetch = []; 
      const namesToFetch = [];  

      if (race.slots_data && Array.isArray(race.slots_data)) {
          race.slots_data.forEach(slot => {
              if (slot.assignee) {
                  const assignees = slot.assignee.split('|');
                  assignees.forEach(item => {
                      if(!item) return;
                      let name = item;
                      let email = null;
                      let timestamp = 'N/A';
                      
                      try {
                          const parsed = JSON.parse(item);
                          name = parsed.name.split(' #')[0]; 
                          email = parsed.email; 
                          timestamp = parsed.timestamp;
                      } catch(e) { 
                          name = item.trim().split(' #')[0]; 
                      }

                      participantsInfo.push({ group: slot.group, slotName: slot.name, rawName: name, email: email, timestamp: timestamp });
                      if (email) emailsToFetch.push(email);
                      else namesToFetch.push(name);
                  });
              }
          });
      }

      if (participantsInfo.length === 0) return alert("這場賽事目前還沒有任何人報名喔！");

      let profilesMap = {};
      try {
          if (emailsToFetch.length > 0) {
              const { data: dbProfilesByEmail } = await supabase.from('profiles').select('*').in('email', emailsToFetch);
              if (dbProfilesByEmail) dbProfilesByEmail.forEach(p => { profilesMap[p.email] = p; });
          }
          if (namesToFetch.length > 0) {
              const { data: dbProfilesByName } = await supabase.from('profiles').select('*').in('full_name', namesToFetch);
              if (dbProfilesByName) dbProfilesByName.forEach(p => { if (!profilesMap[p.email]) profilesMap[p.full_name] = p; });
          }
      } catch(e) { console.error("撈取會員詳細資料失敗", e); }

      const exportData = participantsInfo.map(p => {
          const dbData = (p.email ? profilesMap[p.email] : profilesMap[p.rawName]) || {}; 
          return {
              '報名組別': p.group, '報名賽段': p.slotName, '登記時間': p.timestamp,
              '姓名(A)': dbData.full_name || p.rawName, '出生年月日(B)': dbData.birthday || '',
              '身分證字號(C)': dbData.national_id || '', '手機(D)': dbData.phone || '',
              'e-mail(E)': dbData.contact_email || dbData.email || p.email || '',
              '通訊地址(F)': dbData.address || '', '賽事衣服(G)': dbData.shirt_size || '',
              '緊急聯繫人(H)': dbData.emergency_name || '', '緊急聯繫人電話(I)': dbData.emergency_phone || '',
              '緊急聯繫人關係(J)': dbData.emergency_relation || '', '英文名(K)': dbData.english_name || '',
              '醫護證照繳交情況(L)': dbData.medical_license || '', '飲食(M)': dbData.dietary_habit || '',
              '醫鐵履歷網址(N)': dbData.resume_url || '', '成就徽章(O)': dbData.badges || ''
          };
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "報名名單");
      XLSX.writeFile(wb, `醫護鐵人_${race.name}_A-O名單_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const handleExportMasterSchedule = () => {
      if (filteredAndSortedRaces.length === 0) return alert("目前沒有賽事可以匯出！");

      const exportData = filteredAndSortedRaces.map(race => {
          const extraInfo = (race.slots_data && race.slots_data[0]) ? race.slots_data[0] : {};
          
          let allAssignees = [];
          if (race.slots_data) {
              race.slots_data.forEach(slot => {
                  if (slot.assignee) {
                      const assignees = slot.assignee.split('|');
                      assignees.forEach(item => {
                          if (!item) return;
                          let pName = '';
                          try { pName = JSON.parse(item).name.split(' #')[0]; } 
                          catch(e) { pName = item.trim().split(' #')[0]; }
                          allAssignees.push(`${pName}(${slot.name})`);
                      });
                  }
              });
          }

          const configString = race.slots_data ? race.slots_data.map(s => {
              const displayName = s.group === '一般組別' ? s.name : `${s.group}-${s.name}`;
              return `${displayName} ${s.capacity}人`;
          }).join(', ') : '';

          const row = {
              "賽事名稱": race.name,
              "日期(YYYY-MM-DD)": race.date,
              "鳴槍時間(HH:MM)": race.gather_time || '',
              "地點": race.location,
              "賽事類型(馬拉松/鐵人三項...)": race.type,
              "海報圖片URL": race.image_url || '',
              "狀態(OPEN/NEGOTIATING/SUBMITTED)": race.status,
              "是否火熱(Y/N)": race.is_hot ? 'Y' : 'N',
              "賽段配置(快速語法)": configString,
              "參賽總人數": race.medic_required || 0, 
              "教官": extraInfo.instructor || '', 
              "主辦單位或承辦單位": extraInfo.organizer || '',
              "贊助方（鐵人醫護有限公司）代表1": extraInfo.sponsor1 || '',
              "贊助方（鐵人醫護有限公司）代表2": extraInfo.sponsor2 || '',
              "贊助方（鐵人醫護有限公司）代表3": extraInfo.sponsor3 || ''
          };

          for (let i = 0; i < 40; i++) {
              row[`參加人員${i + 1}`] = allAssignees[i] || '';
          }

          return row;
      });

      const ws = XLSX.utils.json_to_sheet(exportData, { header: MASTER_SCHEDULE_HEADERS });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "年度賽事總表");
      
      const yearLabel = selectedYear === 'ALL' || selectedYear.includes('ALL') ? '總覽' : selectedYear;
      XLSX.writeFile(wb, `醫護鐵人_${yearLabel}年度賽事總表_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const handleClearYearRaces = async () => {
      if (selectedYear.includes('ALL')) {
          return alert('⚠️ 為防止大範圍誤刪，請先點選上方「特定的年份 (例如 2025)」，再執行清空操作。');
      }

      if (filteredAndSortedRaces.length === 0) {
          return alert(`目前畫面上沒有 ${selectedYear} 年的賽事可以清空。`);
      }

      const confirm1 = window.confirm(`☢️ 【危險操作警告】\n\n您即將刪除目前畫面上這 ${filteredAndSortedRaces.length} 筆「${selectedYear} 年度」的賽事資料！\n\n⚠️ 刪除後該年度所有報名資料將永遠消失，確定要繼續嗎？`);
      if (!confirm1) return;

      const confirm2 = window.prompt(`🔒 安全鎖：為了防止誤觸，請在下方輸入大寫的「DELETE-${selectedYear}」以確認執行清空：`);
      if (confirm2 !== `DELETE-${selectedYear}`) {
          return alert('輸入的驗證碼不正確，已取消清空操作。');
      }

      setLoading(true);
      try {
          const idsToDelete = filteredAndSortedRaces.map(r => r.id);
          const BATCH_SIZE = 100;
          for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
              const chunk = idsToDelete.slice(i, i + BATCH_SIZE);
              const { error } = await supabase.from('races').delete().in('id', chunk);
              if (error) throw error;
          }
          alert(`✅ 成功！已徹底清空 ${idsToDelete.length} 筆 ${selectedYear} 年的賽事資料。\n現在您可以前往「資料整合中心」重新匯入乾淨的名單了。`);
          fetchRaces(); 
      } catch (error) {
          alert("批次刪除失敗：" + error.message);
      } finally {
          setLoading(false);
      }
  }

  const handleSetRoleFromModal = async (raceId, slotId, participantId, newRole) => {
      try {
          const { data: currentRace, error: fetchError } = await supabase.from('races').select('slots_data').eq('id', raceId).single();
          if (fetchError) throw fetchError;

          const updatedSlots = currentRace.slots_data.map(slot => {
              if (slot.id === slotId && slot.assignee) {
                  const assignees = slot.assignee.split('|').map(item => {
                      try {
                          const p = JSON.parse(item);
                          if (p.id === participantId) {
                              return JSON.stringify({ ...p, roleTag: newRole });
                          }
                          return item;
                      } catch(e) { 
                          if (item.trim().split(' #')[0] === participantId) {
                              return JSON.stringify({
                                  id: participantId,
                                  name: participantId,
                                  roleTag: newRole,
                                  isLegacy: true,
                                  timestamp: '舊資料匯入'
                              });
                          }
                          return item; 
                      }
                  });
                  return { ...slot, assignee: assignees.join('|') };
              }
              return slot;
          });

          const { error: updateError } = await supabase.from('races').update({ slots_data: updatedSlots }).eq('id', raceId);
          if (updateError) throw updateError;

          setRaces(races.map(r => r.id === raceId ? { ...r, slots_data: updatedSlots } : r));
          
          setPreviewRace(prev => {
              if (prev.id !== raceId) return prev;
              const newParticipants = prev.participants.map(p => {
                  if (p.id === participantId && p.slotId === slotId) {
                      return { ...p, roleTag: newRole };
                  }
                  return p;
              });
              return { ...prev, participants: newParticipants };
          });

      } catch (e) {
          alert("角色指派失敗：" + e.message);
      }
  }

  // 🌟 核心升級：加入智慧過濾與排序邏輯
  const filteredAndSortedRaces = useMemo(() => {
      // 1. 基本條件過濾 (年份、搜尋字串)
      let filtered = races.filter(race => {
          if(!race.date) return false;
          const raceYear = new Date(race.date).getFullYear()
          const matchSearch = race.name.toLowerCase().includes(searchTerm.toLowerCase()) || race.location.toLowerCase().includes(searchTerm.toLowerCase())
          
          let matchYear = false
          if (selectedYear === 'ALL') matchYear = true
          else if (selectedYear === 'HISTORY_ALL') matchYear = raceYear < CURRENT_YEAR 
          else if (selectedYear === 'FUTURE_ALL') matchYear = raceYear > CURRENT_YEAR 
          else matchYear = raceYear.toString() === selectedYear.toString() 

          // 2. 加入下拉狀態過濾
          let matchStatus = true;
          if (statusFilter !== 'ALL') {
             matchStatus = (race.status === statusFilter);
          }

          return matchSearch && matchYear && matchStatus;
      });

      // 3. 日期排序 (小到大 or 大到小)
      filtered.sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateSortOrder === 'asc') return dateA - dateB;
          return dateB - dateA;
      });

      return filtered;
  }, [races, searchTerm, selectedYear, statusFilter, dateSortOrder, CURRENT_YEAR]);

  const statusCounts = races.reduce((acc, race) => {
      // 在統計上方方塊數字時，我們只看「目前選定年份」的數量，不受下拉過濾影響
      if (!race.date) return acc;
      const raceYear = new Date(race.date).getFullYear();
      let matchYear = false;
      if (selectedYear === 'ALL') matchYear = true;
      else if (selectedYear === 'HISTORY_ALL') matchYear = raceYear < CURRENT_YEAR;
      else if (selectedYear === 'FUTURE_ALL') matchYear = raceYear > CURRENT_YEAR;
      else matchYear = raceYear.toString() === selectedYear.toString();
      
      if (matchYear) {
          const status = race.status || 'OPEN';
          acc[status] = (acc[status] || 0) + 1;
      }
      return acc;
  }, { 'OPEN': 0, 'NEGOTIATING': 0, 'SUBMITTED': 0, 'FULL': 0, 'CANCELLED': 0, 'SHORTAGE': 0 });

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
          case 'NEGOTIATING': return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-blue-100 text-blue-700 flex items-center w-fit gap-1"><Handshake size={12}/> 洽談中</span>;
          case 'SUBMITTED': return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-slate-200 text-slate-700 flex items-center w-fit gap-1"><Send size={12}/> 已送名單</span>;
          case 'FULL': return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-emerald-100 text-emerald-800 flex items-center w-fit gap-1"><CheckCircle size={12}/> 滿編</span>;
          case 'CANCELLED': return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-slate-800 text-slate-200 flex items-center w-fit gap-1"><XCircle size={12}/> 無合作/停辦</span>;
          case 'SHORTAGE': return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-red-100 text-red-700 flex items-center w-fit gap-1"><AlertCircle size={12}/> 招不到人</span>;
          default: return <span className="px-2.5 py-1 rounded-full text-[10px] md:text-xs font-bold bg-slate-100 text-slate-500">未知狀態</span>;
      }
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

          <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap xl:flex-nowrap">
              {!selectedYear.includes('ALL') && (
                  <button onClick={handleClearYearRaces} className="flex items-center gap-2 text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:text-red-700 border border-red-200 px-4 py-2.5 rounded-xl transition-colors shrink-0">
                      <Trash2 size={16}/> 清空 {selectedYear} 年
                  </button>
              )}
              <button onClick={handleExportMasterSchedule} className="flex items-center gap-2 text-sm font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-4 py-2.5 rounded-xl transition-colors shrink-0">
                  <FileSpreadsheet size={16}/> 匯出年度總表
              </button>
              <div className="relative w-full xl:w-72 shrink-0">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input type="text" placeholder="搜尋賽事名稱或地點..." className="w-full pl-10 pr-4 py-2 md:py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-xs md:text-sm font-medium bg-slate-50" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}/>
              </div>
          </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
          <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-green-300 transition-colors">
              <div className="text-[10px] md:text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Activity size={14} className="text-green-500"/> 招募中</div>
              <div className="text-xl md:text-2xl font-black text-slate-800">{statusCounts['OPEN']}</div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors">
              <div className="text-[10px] md:text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Handshake size={14} className="text-blue-500"/> 洽談中</div>
              <div className="text-xl md:text-2xl font-black text-slate-800">{statusCounts['NEGOTIATING']}</div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-400 transition-colors">
              <div className="text-[10px] md:text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><Send size={14} className="text-slate-600"/> 已送名單</div>
              <div className="text-xl md:text-2xl font-black text-slate-800">{statusCounts['SUBMITTED']}</div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-emerald-300 transition-colors">
              <div className="text-[10px] md:text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><CheckCircle size={14} className="text-emerald-500"/> 滿編</div>
              <div className="text-xl md:text-2xl font-black text-slate-800">{statusCounts['FULL']}</div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-600 transition-colors">
              <div className="text-[10px] md:text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><XCircle size={14} className="text-slate-800"/> 無合作/停辦</div>
              <div className="text-xl md:text-2xl font-black text-slate-800">{statusCounts['CANCELLED']}</div>
          </div>
          <div className="bg-white p-3 md:p-4 rounded-2xl shadow-sm border border-slate-200 hover:border-red-300 transition-colors">
              <div className="text-[10px] md:text-xs font-bold text-slate-500 mb-1 flex items-center gap-1"><AlertCircle size={14} className="text-red-500"/> 招不到人</div>
              <div className="text-xl md:text-2xl font-black text-slate-800">{statusCounts['SHORTAGE']}</div>
          </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden w-full flex flex-col max-h-[70vh]">
          <div className="overflow-x-auto overflow-y-auto w-full flex-1 custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[800px] relative">
                  <thead className="bg-slate-50 text-slate-500 text-[10px] md:text-xs uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                      <tr>
                          <th className="p-3 md:p-4 font-bold bg-slate-50 w-1/3">賽事名稱</th>
                          
                          {/* 🌟 智慧排序標題：日期 */}
                          <th className="p-3 md:p-4 font-bold bg-slate-50 hover:bg-slate-100 cursor-pointer select-none transition-colors group" onClick={() => setDateSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}>
                              <div className="flex items-center gap-1.5">
                                  日期
                                  <ArrowUpDown size={14} className={`text-slate-300 group-hover:text-blue-500 transition-colors ${dateSortOrder === 'asc' ? 'text-blue-500' : ''}`} />
                              </div>
                          </th>
                          
                          <th className="p-3 md:p-4 font-bold bg-slate-50">地點</th>
                          
                          {/* 🌟 智慧過濾標題：狀態下拉選單 */}
                          <th className="p-3 md:p-4 font-bold bg-slate-50">
                              <select 
                                  className="bg-transparent border-none text-[10px] md:text-xs font-bold text-slate-500 uppercase cursor-pointer outline-none hover:text-blue-600 focus:text-blue-600 transition-colors -ml-1"
                                  value={statusFilter}
                                  onChange={(e) => setStatusFilter(e.target.value)}
                              >
                                  <option value="ALL">狀態 (全部)</option>
                                  <option value="OPEN">招募中</option>
                                  <option value="NEGOTIATING">洽談中</option>
                                  <option value="SUBMITTED">已送名單</option>
                                  <option value="FULL">滿編</option>
                                  <option value="CANCELLED">無合作/停辦</option>
                                  <option value="SHORTAGE">招不到人</option>
                              </select>
                          </th>
                          
                          <th className="p-3 md:p-4 font-bold bg-slate-50">報名進度</th>
                          <th className="p-3 md:p-4 font-bold text-right bg-slate-50">操作</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {loading ? (
                          <tr><td colSpan="6" className="text-center py-10 text-slate-500"><Loader2 className="animate-spin mx-auto mb-2"/> 載入資料中...</td></tr>
                      ) : filteredAndSortedRaces.length === 0 ? (
                          <tr><td colSpan="6" className="text-center py-12 text-slate-500 font-medium bg-slate-50/50 text-sm">此區間無符合條件的賽事紀錄</td></tr>
                      ) : (
                          filteredAndSortedRaces.map((race) => {
                              const { totalRegistered, participantDetails } = extractParticipantsData(race);
                              const isFull = totalRegistered >= race.medic_required && race.medic_required > 0;
                              
                              return (
                              <tr key={race.id} className={`transition-colors group ${['CANCELLED', 'SHORTAGE'].includes(race.status) ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50'}`}>
                                  <td className="p-3 md:p-4 w-1/3">
                                      <div className={`font-bold text-sm md:text-base line-clamp-2 ${['CANCELLED', 'SHORTAGE'].includes(race.status) ? 'text-slate-500' : 'text-slate-800'}`}>{race.name}</div>
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
                                      <div 
                                          className="flex items-center cursor-pointer hover:bg-slate-100 p-1.5 -ml-1.5 rounded-xl transition-colors active:scale-95" 
                                          onClick={() => setPreviewRace({...race, participants: participantDetails})} 
                                          title="點擊查看名單"
                                      >
                                          {participantDetails.length > 0 ? (
                                              <div className="flex -space-x-3">
                                                  {participantDetails.slice(0, 3).map((p, i) => (
                                                      <div key={i} className="w-7 h-7 rounded-full border border-white flex items-center justify-center text-[10px] font-bold text-white shadow-sm" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>{getInitial(p.name)}</div>
                                                  ))}
                                              </div>
                                          ) : (
                                              <div className="w-7 h-7 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                                                  <UsersRound size={12}/>
                                              </div>
                                          )}
                                          <div className="text-xs md:text-sm font-black text-slate-800 ml-3 flex items-center gap-1">
                                              <span className={`${isFull ? 'text-green-600' : 'text-blue-600'}`}>{totalRegistered}</span> 
                                              <span className="text-slate-400 font-medium mx-0.5">/</span> 
                                              {race.medic_required}
                                              <ChevronRight size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors"/>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="p-3 md:p-4 text-right whitespace-nowrap">
                                      <button onClick={() => handleExportRaceList(race)} className="p-2 text-slate-400 hover:text-green-600 transition-colors" title="匯出單場詳細報名名單 (Excel)">
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
                          )})
                      )}
                  </tbody>
              </table>
          </div>
      </div>

      {previewRace && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setPreviewRace(null)}>
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-lg w-full p-6 md:p-8 animate-bounce-in flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4 shrink-0">
                      <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> 已報名夥伴名單</h3>
                      <button onClick={() => setPreviewRace(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="text-sm font-bold text-slate-500 mb-4 pb-4 border-b border-slate-100 leading-snug shrink-0">{previewRace.name}</div>
                  
                  <div className="overflow-y-auto space-y-3 custom-scrollbar pr-2 flex-1">
                      {previewRace.participants?.map((p, i) => {
                          const cleanName = p.name.split('#')[0].trim();
                          return (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-default">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>
                                      {getInitial(cleanName)}
                                  </div>
                                  <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                          {cleanName}
                                          {!p.roleTag && p.isVip && <span className="flex items-center text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black"><Crown size={10} className="mr-1"/> VIP</span>}
                                          {p.isLegacy && <span className="flex items-center text-[10px] bg-slate-100 text-slate-600 border border-slate-300 px-1.5 py-0.5 rounded font-black">舊名單</span>}
                                      </div>
                                      <div className="text-xs text-slate-500 font-bold mt-1">
                                          📍 {p.slotGroup} - {p.slotName}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                          <Clock size={10}/> 登記: {p.timestamp}
                                      </div>
                                  </div>
                              </div>

                              <div className="flex items-center gap-2 sm:ml-auto">
                                  <select 
                                      className={`text-xs font-bold p-1.5 rounded-lg border outline-none cursor-pointer transition-colors ${p.roleTag ? 'bg-amber-50 text-amber-700 border-amber-300 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-blue-400'}`}
                                      value={p.roleTag || ""}
                                      onChange={(e) => handleSetRoleFromModal(previewRace.id, p.slotId, p.id, e.target.value)}
                                  >
                                      <option value="">無特殊職務</option>
                                      <option value="帶隊教官">🛡️ 帶隊教官</option>
                                      <option value="賽道教官">🚩 賽道教官</option>
                                      <option value="醫護教官">🏥 醫護教官</option>
                                      <option value="官方代表">👑 官方代表</option>
                                  </select>
                              </div>
                          </div>
                      )})}
                      {(!previewRace.participants || previewRace.participants.length === 0) && <div className="text-center text-slate-400 py-10 font-medium">目前尚無人員報名</div>}
                  </div>
                  <button onClick={() => setPreviewRace(null)} className="w-full mt-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors active:scale-95 shrink-0">關閉視窗</button>
              </div>
          </div>
      )}
    </div>
  )
}