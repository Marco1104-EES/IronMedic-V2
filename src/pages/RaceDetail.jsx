import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Clock, CheckCircle, XCircle, Crown, Sprout, Timer, AlertTriangle, Activity, Users, ChevronLeft, Flag, Edit3, Zap, UserCheck, Loader2, ChevronRight, X } from 'lucide-react'
import { supabase } from '../supabaseClient'

// 🌟 修正：換成資料庫裡真實存在的名字！這樣匯出時才能關聯到資料。
const CURRENT_USER = {
    id: 'marco_real_id', // 理想情況下這裡要塞您的真實 UUID
    full_name: '陳霖毅',    // 🚨 注意：這個名字必須和您 profiles 裡面的姓名一模一樣！
    role: 'SUPER_ADMIN', 
    is_current_member: 'Y', 
    license_expiry: '2028-01-01', 
    shirt_expiry_25: '2025-12-31', 
    is_vip: 'Y', 
    total_races: 52, 
    is_team_leader: 'Y', 
    gender: 'M' 
}

export default function RaceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const [activeRace, setActiveRace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [previewSlot, setPreviewSlot] = useState(null) 
  const [waitlist, setWaitlist] = useState([]) 
  const [testCounter, setTestCounter] = useState(1)
  
  useEffect(() => { fetchRaceDetail(id) }, [id])

  const fetchRaceDetail = async (raceId) => {
      setLoading(true)
      try {
          const { data, error } = await supabase.from('races').select('*').eq('id', raceId).single()
          if (error) throw error
          if (data) {
              setActiveRace({
                  id: data.id, title: data.name, date: data.date, gatherTime: data.gather_time,
                  location: data.location, type: data.type, status: data.status,
                  imageUrl: data.image_url, slots: data.slots_data || [],
                  waitlist_data: data.waitlist_data || [] 
              })
              setWaitlist(data.waitlist_data || [])
          } else { navigate('/races') }
      } catch (error) {
          alert("載入賽事詳情失敗。")
      } finally { setLoading(false) }
  }

  const getUserTier = (user) => {
      if (user.is_vip === 'Y') return 1;
      if (user.total_races < 2) return 2; return user.is_team_leader === 'Y' ? 3 : user.is_current_member === 'Y' ? 4 : 5; 
  }

  const checkEligibility = () => {
      if (!activeRace) return { allPassed: false, isGodMode: false, checks: {} }
      const isGodMode = CURRENT_USER.role === 'SUPER_ADMIN';
      const checks = { isCurrentMember: CURRENT_USER.is_current_member === 'Y', isLicenseValid: new Date(CURRENT_USER.license_expiry) >= new Date(activeRace.date), isTriShirtValid: true, genderMatch: true }
      if (['鐵人三項', '二鐵', '游泳'].includes(activeRace.type)) checks.isTriShirtValid = !!CURRENT_USER.shirt_expiry_25;
      if (selectedSlot) {
          const slotInfo = activeRace.slots.find(s => s.id === selectedSlot)
          if (slotInfo?.genderLimit === 'F' && CURRENT_USER.gender === 'M') checks.genderMatch = false;
      }
      if (isGodMode) return { checks: { isCurrentMember: true, isLicenseValid: true, isTriShirtValid: true, genderMatch: true }, allPassed: true, isGodMode: true };
      return { checks, allPassed: Object.values(checks).every(v => v === true), isGodMode: false };
  }

  const { checks, allPassed, isGodMode } = checkEligibility();

  const getInitial = (name) => name ? name.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '').charAt(0) || '?' : '?'

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={48}/></div>
  if (!activeRace) return null

  const targetSlotData = activeRace.slots.find(s => s.id === selectedSlot);
  const isSelectedSlotFull = targetSlotData ? (targetSlotData.filled || 0) >= (targetSlotData.capacity || 1) : false;

  const handleRegister = async () => {
      if (!selectedSlot) return alert("請先選擇您要報名的賽段！")
      if (!allPassed && !isGodMode) return alert("報名資格審查未通過，無法報名！")

      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}:${now.getMilliseconds().toString().padStart(3,'0')}`;
      
      // 🌟 我們保留後面的 #數字，但匯出時只會抓前面的名字去比對
      const entryName = `${CURRENT_USER.full_name} #${testCounter}`;
      
      const participantInfo = {
          id: `${CURRENT_USER.id}-${testCounter}`,
          name: entryName,
          tier: getUserTier(CURRENT_USER),
          isVip: CURRENT_USER.is_vip === 'Y',
          isNew: CURRENT_USER.total_races < 2,
          timestamp: timestamp,
          slot: selectedSlot,
          isMe: true 
      };

      if (!isSelectedSlotFull) {
          const updatedSlots = activeRace.slots.map(s => {
              if (s.id === selectedSlot) {
                  const currentFilled = s.filled || 0;
                  const newAssignee = s.assignee ? `${s.assignee}|${JSON.stringify(participantInfo)}` : JSON.stringify(participantInfo);
                  return { ...s, filled: currentFilled + 1, assignee: newAssignee };
              }
              return s;
          });

          try {
              const { error } = await supabase.from('races').update({ slots_data: updatedSlots }).eq('id', activeRace.id);
              if (error) throw error;
              setActiveRace({ ...activeRace, slots: updatedSlots });
              alert(`✅ 報名成功！您已正式加入【${targetSlotData.name}】`);
          } catch(e) { alert("報名寫入失敗：" + e.message) }

      } else {
          const newWaitlist = [...waitlist, participantInfo].sort((a, b) => a.tier !== b.tier ? a.tier - b.tier : a.timestamp.localeCompare(b.timestamp));
          setWaitlist(newWaitlist);

          try {
              const { error } = await supabase.from('races').update({ waitlist_data: newWaitlist }).eq('id', activeRace.id);
              if (error) throw error;
              setActiveRace({ ...activeRace, waitlist_data: newWaitlist });
              alert(`⚠️ 該名額已滿，您已自動進入「候補池」。`);
          } catch(e) { alert("候補寫入失敗：" + e.message) }
      }
      setTestCounter(prev => prev + 1);
  }

  const handleApproveFromWaitlist = async (user) => {
      if (!isGodMode) return;
      const updatedSlots = activeRace.slots.map(s => {
          if (s.id === user.slot) {
              const currentFilled = s.filled || 0;
              const newAssignee = s.assignee ? `${s.assignee}|${JSON.stringify(user)}` : JSON.stringify(user);
              return { ...s, filled: currentFilled + 1, assignee: newAssignee } 
          }
          return s;
      })
      
      const newWaitlist = waitlist.filter(q => q.id !== user.id);

      try {
          const { error } = await supabase.from('races').update({ slots_data: updatedSlots, waitlist_data: newWaitlist }).eq('id', activeRace.id);
          if (error) throw error;
          setActiveRace({ ...activeRace, slots: updatedSlots, waitlist_data: newWaitlist });
          setWaitlist(newWaitlist);
          alert(`✅ 已將 ${user.name} 遞補報名成功！系統已發送通知。`);
      } catch(e) { alert("核准寫入失敗：" + e.message) }
  }

  const groupedSlots = activeRace.slots.reduce((acc, slot) => {
      const groupName = slot.group || '一般組別';
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(slot);
      return acc;
  }, {});

  const parseAssignees = (assigneeString) => {
      if (!assigneeString) return [];
      const rawAssignees = assigneeString.split('|');
      return rawAssignees.map(item => {
          try {
              return JSON.parse(item); 
          } catch (e) {
              return { name: item.trim(), timestamp: '10:00:00:000', isVip: false, isNew: false };
          }
      });
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans animate-fade-in flex flex-col">
      
      <div className="relative w-full bg-slate-900 pt-8 pb-48 lg:pb-56">
          <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url(${activeRace.imageUrl || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=1920'})` }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
          
          <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex justify-between items-center mb-10 lg:mb-16">
              <button onClick={() => navigate('/races')} className="text-white flex items-center gap-2 hover:text-blue-400 transition-colors bg-white/10 px-5 py-2.5 rounded-full backdrop-blur-md border border-white/20 font-bold text-sm">
                  <ChevronLeft size={18}/> 返回任務大廳
              </button>
              {isGodMode && (
                  <button onClick={() => navigate(`/admin/race-builder?id=${activeRace.id}`)} className="text-amber-400 flex items-center gap-2 hover:bg-amber-400/20 transition-colors bg-slate-900/80 px-5 py-2.5 rounded-full backdrop-blur-md border border-amber-500/50 font-bold text-sm shadow-lg shadow-amber-900/50">
                      <Edit3 size={16}/> 編輯賽事
                  </button>
              )}
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
              <span className="bg-blue-600/90 backdrop-blur text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-lg mb-4 inline-block tracking-widest border border-blue-400/50">
                  {activeRace.type}
              </span>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-2xl leading-tight max-w-5xl">
                  {activeRace.title}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-sm font-medium shadow-lg">
                      <Calendar size={16} className="text-blue-400"/> {activeRace.date}
                  </span>
                  <span className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-sm font-medium shadow-lg">
                      <Clock size={16} className="text-amber-400"/> {activeRace.gatherTime} 鳴槍
                  </span>
                  <span className="flex items-center gap-2 bg-slate-800/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-700 text-slate-200 text-sm font-medium shadow-lg">
                      <MapPin size={16} className="text-red-400"/> {activeRace.location}
                  </span>
              </div>
          </div>
      </div>

      <div className="relative z-30 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full -mt-32 lg:-mt-40 pb-24">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
              
              <div className="lg:col-span-8 space-y-6 lg:space-y-8">
                  
                  <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8">
                      <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                          <Flag className="text-blue-600"/> 任務名額配置 (Slot Allocation)
                      </h2>
                      
                      <div className="space-y-8">
                          {Object.entries(groupedSlots).map(([groupName, slotsInGroup]) => (
                              <div key={groupName} className="space-y-4">
                                  <div className="flex items-center gap-4 mb-2">
                                      <h3 className="font-black text-slate-600 bg-slate-50 px-4 py-2 rounded-xl text-sm border border-slate-200 shadow-sm">{groupName}</h3>
                                      <div className="h-px bg-slate-200 flex-1"></div>
                                  </div>
                                  
                                  {slotsInGroup.map(slot => {
                                      const filledCount = slot.filled || 0;
                                      const slotCapacity = slot.capacity || 1; 
                                      const isFull = filledCount >= slotCapacity;
                                      const isSelected = selectedSlot === slot.id;
                                      
                                      const assignees = parseAssignees(slot.assignee);
                                      const displayAssignees = assignees.slice(0, 5);
                                      const extraCount = assignees.length - 5;

                                      return (
                                          <div key={slot.id} onClick={() => setSelectedSlot(slot.id)}
                                              className={`relative p-5 md:p-6 rounded-2xl border-2 transition-all cursor-pointer flex flex-col xl:flex-row xl:items-start justify-between gap-5
                                                  ${isSelected ? 'bg-blue-50/50 border-blue-500 shadow-lg ring-4 ring-blue-500/10' 
                                                  : isFull ? 'bg-slate-50/80 border-slate-200 hover:border-slate-300' 
                                                  : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md'}`}>
                                              
                                              <div className="flex-1 min-w-0">
                                                  <div className="flex items-center gap-3 flex-wrap mb-1">
                                                      <h3 className={`font-black text-lg ${isFull && !isSelected ? 'text-slate-500' : 'text-slate-800'}`}>
                                                          {slot.name}
                                                      </h3>
                                                      {slot.genderLimit === 'F' && <span className="bg-pink-50 text-pink-600 text-[10px] px-2.5 py-1 rounded-full border border-pink-200 font-black tracking-widest">限定女性</span>}
                                                  </div>
                                                  
                                                  {assignees.length > 0 && (
                                                      <div className="mt-4">
                                                          <div className="text-xs font-bold text-slate-500 mb-2 flex items-center gap-1">
                                                              <CheckCircle size={14} className="text-green-500"/> 已報名名單:
                                                          </div>
                                                          <div 
                                                              className="flex items-center cursor-pointer hover:opacity-80 transition-opacity w-fit group/list"
                                                              onClick={(e) => {
                                                                  e.stopPropagation();
                                                                  setPreviewSlot({ ...slot, assignees }); 
                                                              }}
                                                          >
                                                              <div className="flex items-center -space-x-2.5">
                                                                  {displayAssignees.map((participant, idx) => {
                                                                      const hue = (idx * 60 + 200) % 360;
                                                                      const cleanName = participant.name.split('#')[0].trim();
                                                                      return (
                                                                          <div key={idx} 
                                                                              className="w-9 h-9 rounded-full border-[3px] border-white flex items-center justify-center text-sm font-black text-white shadow-sm ring-1 ring-slate-100"
                                                                              style={{ backgroundColor: `hsl(${hue}, 70%, 50%)` }}
                                                                          >
                                                                              {getInitial(cleanName)}
                                                                          </div>
                                                                      )
                                                                  })}
                                                                  {extraCount > 0 && (
                                                                      <div className="w-9 h-9 rounded-full border-[3px] border-white flex items-center justify-center text-xs font-black bg-slate-100 text-slate-600 shadow-sm ring-1 ring-slate-100">
                                                                          +{extraCount}
                                                                      </div>
                                                                  )}
                                                              </div>
                                                              <span className="text-xs font-bold ml-3 text-blue-600 flex items-center gap-1 bg-blue-50 px-2.5 py-1.5 rounded-lg group-hover/list:bg-blue-100 transition-colors">
                                                                  查看完整名單 <ChevronRight size={14}/>
                                                              </span>
                                                          </div>
                                                      </div>
                                                  )}
                                              </div>
                                              
                                              <div className="flex items-center gap-4 shrink-0 xl:pt-1">
                                                  <div className={`text-sm font-black px-4 py-2.5 rounded-xl border flex flex-col items-center justify-center min-w-[5.5rem]
                                                      ${isFull ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200 shadow-inner'}`}>
                                                      <span className="text-[10px] uppercase tracking-wider text-slate-400 mb-0.5 font-bold">名額</span>
                                                      <span>{filledCount} <span className="text-slate-400 mx-0.5">/</span> {slotCapacity}</span>
                                                  </div>
                                                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-colors 
                                                      ${isSelected ? 'border-blue-600 bg-blue-600 text-white shadow-md' : 'border-slate-300 bg-white'}`}>
                                                      {isSelected && <CheckCircle size={16}/>}
                                                  </div>
                                              </div>
                                          </div>
                                      )
                                  })}
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8">
                      <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                          <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Users className="text-amber-500"/> 任務候補池 (Waitlist)</h2>
                          <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full flex items-center gap-1 border border-slate-200 shadow-inner"><Timer size={12}/> 依階級與時間排序</span>
                      </div>
                      
                      <div className="space-y-4">
                          {waitlist.length === 0 ? (
                              <div className="text-center py-12 text-slate-400 font-medium bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                                  目前尚無人員候補
                              </div>
                          ) : (
                              waitlist.map((user, idx) => {
                                  const targetSlot = activeRace.slots.find(s => s.id === user.slot);
                                  return (
                                  <div key={user.id} className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 rounded-2xl border transition-all gap-4 
                                      ${user.isMe ? 'bg-amber-50 border-amber-300 shadow-md ring-4 ring-amber-500/10' : 'bg-white border-slate-200 hover:bg-slate-50 hover:shadow-md'}`}>
                                      
                                      <div className="flex items-start gap-4 w-full sm:w-auto">
                                          <div className={`w-12 h-12 shrink-0 rounded-full flex items-center justify-center font-black text-xl shadow-inner border-2 border-white
                                              ${idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-yellow-500/50' 
                                              : idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' 
                                              : 'bg-gradient-to-br from-orange-300 to-orange-400 text-white'}`}>
                                              {idx + 1}
                                          </div>
                                          
                                          <div className="flex-1 min-w-0 pt-0.5">
                                              <div className="font-black text-slate-800 flex flex-wrap items-center gap-2 text-lg mb-1">
                                                  <span className="truncate">{user.name}</span>
                                                  {user.isMe && <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-md border border-amber-400 shrink-0 font-bold shadow-sm">我</span>}
                                                  {user.isVip && <span className="flex items-center text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-2 py-0.5 rounded font-black shrink-0"><Crown size={12} className="mr-1"/> VIP</span>}
                                              </div>
                                              
                                              <div className="flex flex-col gap-1 mt-2">
                                                  <span className="text-xs text-slate-600 font-bold bg-slate-100 w-fit px-2.5 py-1 rounded-md truncate">
                                                      預約組別：{targetSlot?.group} - {targetSlot?.name}
                                                  </span>
                                                  <span className="text-xs text-slate-500 font-mono flex items-center gap-1.5 ml-1 mt-0.5">
                                                      <Clock size={12}/> 登記時間：{user.timestamp}
                                                  </span>
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex items-center justify-end gap-3 w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                          <div className="text-xs font-black text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
                                              Tier {user.tier}
                                          </div>
                                          {isGodMode && (
                                              <button onClick={() => handleApproveFromWaitlist(user)} title="手動核准報名" className="bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-4 py-2 rounded-xl shadow-md shadow-green-600/20 flex items-center gap-1.5 transition-all active:scale-95">
                                                  <UserCheck size={16}/> 遞補
                                              </button>
                                          )}
                                      </div>
                                  </div>
                              )})
                          )}
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-4 lg:sticky lg:top-8">
                  <div className="bg-slate-900 rounded-[2rem] shadow-2xl shadow-slate-900/30 border border-slate-800 p-6 md:p-8 text-white z-30 flex flex-col">
                      <h3 className="text-xl font-black mb-8 border-b border-slate-700 pb-5 flex items-center gap-2">
                          <Activity className="text-blue-400"/> 系統資格審查 (ID Check)
                      </h3>
                      
                      <div className="flex-1">
                          {isGodMode && (
                              <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-xl text-sm font-bold flex items-start gap-3 mb-8 shadow-inner">
                                  <Zap size={20} className="shrink-0 text-amber-400 mt-0.5"/> 
                                  <div>
                                      <div className="mb-1 text-amber-300">系統管理員模式啟用</div>
                                      <div className="text-xs font-normal opacity-80 leading-relaxed">無限模擬報名已開啟，系統將忽略所有防呆限制。</div>
                                  </div>
                              </div>
                          )}

                          <div className={`space-y-5 ${isGodMode ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                              <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
                                  <span className="text-sm text-slate-300 font-medium">當屆會員身分</span>
                                  {checks.isCurrentMember ? <CheckCircle size={20} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"/> : <XCircle size={20} className="text-red-500"/>}
                              </div>
                              <div className="flex items-center justify-between pb-3 border-b border-slate-800/50">
                                  <span className="text-sm text-slate-300 font-medium">醫護證照效期</span>
                                  {checks.isLicenseValid ? <CheckCircle size={20} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"/> : <XCircle size={20} className="text-red-500"/>}
                              </div>
                              {['鐵人三項', '二鐵', '路跑接力', '游泳'].includes(activeRace.type) && (
                                  <div className="flex items-center justify-between bg-blue-900/20 p-4 rounded-xl border border-blue-800/30 mt-4">
                                      <div>
                                          <div className="text-sm text-blue-300 font-bold mb-1">三鐵戰袍檢核</div>
                                          <div className="text-[10px] text-slate-400">本賽事強制要求著三鐵衣</div>
                                      </div>
                                      {checks.isTriShirtValid ? <CheckCircle size={20} className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]"/> : <XCircle size={20} className="text-red-500"/>}
                                  </div>
                              )}
                              {!checks.genderMatch && (
                                  <div className="flex items-center justify-between bg-pink-900/20 p-4 rounded-xl border border-pink-800/30 mt-4">
                                      <span className="text-sm text-pink-300 font-bold">生理性別限制</span>
                                      <XCircle size={20} className="text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]"/>
                                  </div>
                              )}
                          </div>
                      </div>

                      <div className="mt-8 pt-6 border-t border-slate-800">
                          {!allPassed && !isGodMode && (
                              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-sm font-bold flex gap-3 mb-6">
                                  <AlertTriangle size={20} className="shrink-0"/>
                                  資料不符報名規定，按鈕已鎖定。
                              </div>
                          )}

                          <button onClick={handleRegister} disabled={(!allPassed && !isGodMode) || !selectedSlot}
                              className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all duration-300 active:scale-95 
                                  disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed disabled:shadow-none disabled:border-transparent
                                  ${isSelectedSlotFull && selectedSlot 
                                      ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:shadow-[0_0_25px_rgba(245,158,11,0.5)]' 
                                      : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)] hover:shadow-[0_0_25px_rgba(37,99,235,0.6)]'}`}
                          >
                              {isSelectedSlotFull && selectedSlot ? '⚡ 滿編：登記進入候補池' : '✅ 資格核准，立即報名'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {previewSlot && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-fade-in" onClick={() => setPreviewSlot(null)}>
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm md:max-w-md w-full p-6 animate-bounce-in" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> 已報名夥伴名單</h3>
                      <button onClick={() => setPreviewSlot(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="text-sm font-bold text-slate-500 mb-4 pb-4 border-b border-slate-100 leading-snug">
                      {previewSlot.group} - {previewSlot.name}
                  </div>
                  <div className="max-h-80 overflow-y-auto space-y-3 custom-scrollbar pr-2">
                      {previewSlot.assignees.map((participant, i) => {
                          const cleanName = participant.name.split('#')[0].trim();
                          
                          return (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-default">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>
                                      {getInitial(cleanName)}
                                  </div>
                                  <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                          {participant.name}
                                          {participant.isVip && <span className="flex items-center text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black"><Crown size={10} className="mr-1"/> VIP</span>}
                                          {participant.isNew && <span className="flex items-center text-[10px] bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded font-black"><Sprout size={10} className="mr-1"/> 新人</span>}
                                      </div>
                                      <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
                                          <Clock size={10}/> 登記時間: {participant.timestamp}
                                      </div>
                                  </div>
                              </div>
                              <div className="mt-2 sm:mt-0 sm:ml-auto text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded w-fit">已確認報名</div>
                          </div>
                      )})}
                  </div>
                  <button onClick={() => setPreviewSlot(null)} className="w-full mt-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors active:scale-95">關閉名單</button>
              </div>
          </div>
      )}
    </div>
  )
}