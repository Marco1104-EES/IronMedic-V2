import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Clock, ShieldAlert, CheckCircle, XCircle, Crown, Sprout, Timer, AlertTriangle, Activity, Users, ChevronLeft, Flag, Edit3, Zap, UserCheck, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient' // 🌟 加入 Supabase

const CURRENT_USER = {
    id: 'admin001', full_name: '測試指揮官', role: 'SUPER_ADMIN', 
    is_current_member: 'Y', license_expiry: '2028-01-01', shirt_expiry_25: '2025-12-31', 
    is_vip: 'Y', total_races: 50, is_team_leader: 'Y', gender: 'M' 
}

// 模擬候補池 
const INITIAL_WAITLIST = [
    { id: 'u1', name: '王大同', tier: 5, isVip: false, isNew: false, timestamp: '10:00:00:000', slot: 's1' },
    { id: 'u2', name: '李新人', tier: 2, isVip: false, isNew: true, timestamp: '10:05:00:000', slot: 's1' }
]

export default function RaceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  // 🌟 狀態改為從資料庫抓取
  const [activeRace, setActiveRace] = useState(null)
  const [loading, setLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [waitlist, setWaitlist] = useState(INITIAL_WAITLIST) 
  const [testCounter, setTestCounter] = useState(1)
  
  useEffect(() => { 
      fetchRaceDetail(id)
  }, [id])

  // 🌟 從 Supabase 抓取指定 ID 的賽事資料
  const fetchRaceDetail = async (raceId) => {
      setLoading(true)
      try {
          const { data, error } = await supabase
              .from('races')
              .select('*')
              .eq('id', raceId)
              .single()

          if (error) throw error
          if (data) {
              // 為了兼容原本的寫法，我們將資料庫的欄位轉一下
              setActiveRace({
                  id: data.id,
                  title: data.name,
                  date: data.date,
                  gatherTime: data.gather_time,
                  location: data.location,
                  type: data.type,
                  status: data.status,
                  imageUrl: data.image_url,
                  slots: data.slots_data || [] // 陣型資料在這裡！
              })
          } else {
              alert("找不到該賽事任務！")
              navigate('/races')
          }
      } catch (error) {
          console.error("載入詳情失敗", error)
          alert("載入賽事詳情失敗，請稍後再試。")
      } finally {
          setLoading(false)
      }
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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={48}/></div>
  if (!activeRace) return null

  const targetSlotData = activeRace.slots.find(s => s.id === selectedSlot);
  const isSelectedSlotFull = targetSlotData ? targetSlotData.filled >= targetSlotData.capacity : false; // 注意：這裡改用 capacity 判斷

  const handleRegister = async () => {
      if (!selectedSlot) return alert("請先選擇您要報名的賽段/棒次！")
      if (!allPassed && !isGodMode) return alert("資格審查未通過，無法報名！")

      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}:${now.getMilliseconds().toString().padStart(3,'0')}`;
      const entryName = `${CURRENT_USER.full_name} #${testCounter}`;
      const newEntry = { id: `${CURRENT_USER.id}-${testCounter}`, name: entryName, tier: getUserTier(CURRENT_USER), isVip: CURRENT_USER.is_vip === 'Y', isNew: CURRENT_USER.total_races < 2, timestamp: timestamp, slot: selectedSlot, isMe: true };

      if (!isSelectedSlotFull) {
          const updatedSlots = activeRace.slots.map(s => {
              if (s.id === selectedSlot) {
                  const currentFilled = s.filled || 0;
                  const newAssignee = s.assignee ? `${s.assignee}, ${entryName}` : entryName;
                  return { ...s, filled: currentFilled + 1, assignee: newAssignee };
              }
              return s;
          });

          // 🌟 真實更新到 Supabase
          try {
              const { error } = await supabase
                  .from('races')
                  .update({ slots_data: updatedSlots })
                  .eq('id', activeRace.id);
              if (error) throw error;
              setActiveRace({ ...activeRace, slots: updatedSlots });
              alert(`✅ 報名成功！您已直接錄取【${targetSlotData.name}】\n(資料已寫入資料庫)`);
          } catch(e) {
              alert("報名寫入失敗：" + e.message)
          }

      } else {
          const newWaitlist = [...waitlist, newEntry].sort((a, b) => a.tier !== b.tier ? a.tier - b.tier : a.timestamp.localeCompare(b.timestamp));
          setWaitlist(newWaitlist);
          alert(`⚠️ 該棒次已滿編，您已自動進入「候補池」依階級排隊等待釋出。`);
      }
      setTestCounter(prev => prev + 1);
  }

  const handleApproveFromWaitlist = async (user) => {
      if (!isGodMode) return;
      const updatedSlots = activeRace.slots.map(s => {
          if (s.id === user.slot) {
              const currentFilled = s.filled || 0;
              const newAssignee = s.assignee ? `${s.assignee}, ${user.name}` : user.name;
              return { ...s, filled: currentFilled + 1, assignee: newAssignee } 
          }
          return s;
      })
      // 🌟 真實更新到 Supabase
      try {
          const { error } = await supabase.from('races').update({ slots_data: updatedSlots }).eq('id', activeRace.id);
          if (error) throw error;
          setActiveRace({ ...activeRace, slots: updatedSlots });
          setWaitlist(waitlist.filter(q => q.id !== user.id));
      } catch(e) { alert("核准寫入失敗：" + e.message) }
  }

  const groupedSlots = activeRace.slots.reduce((acc, slot) => {
      const groupName = slot.group || '一般組別';
      if (!acc[groupName]) acc[groupName] = [];
      acc[groupName].push(slot);
      return acc;
  }, {});

  return (
    <div className="min-h-screen bg-slate-50 pb-32 md:pb-24 font-sans animate-fade-in relative">
      <div className="relative h-[40vh] md:h-[50vh] bg-slate-900 flex items-end pb-8">
          <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url(${activeRace.imageUrl || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=1920'})` }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
          
          <div className="absolute top-6 left-6 right-6 flex justify-between z-20">
              <button onClick={() => navigate('/races')} className="text-white flex items-center gap-2 hover:text-blue-400 transition-colors bg-black/30 px-4 py-2 rounded-full backdrop-blur-md border border-white/10"><ChevronLeft size={18}/> 返回</button>
              {/* 🌟 修正：確保把這場真實賽事的 ID 傳過去編輯 */}
              {isGodMode && <button onClick={() => navigate(`/admin/race-builder?id=${activeRace.id}`)} className="text-amber-400 flex items-center gap-2 hover:text-amber-300 transition-colors bg-black/40 px-4 py-2 rounded-full backdrop-blur-md border border-amber-500/30 font-bold text-sm shadow-lg shadow-amber-900/50"><Edit3 size={16}/> 編輯賽事 (Admin)</button>}
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                  <span className="bg-blue-600/90 backdrop-blur text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg mb-4 inline-block tracking-widest border border-blue-400/50">{activeRace.type}</span>
                  <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-wider drop-shadow-lg leading-tight">{activeRace.title}</h1>
                  <div className="flex flex-wrap items-center text-slate-200 text-sm font-medium gap-x-6 gap-y-3 bg-black/20 p-3 rounded-2xl backdrop-blur-sm border border-white/10 w-fit">
                      <div className="flex items-center gap-2"><Calendar size={16} className="text-blue-400"/> {activeRace.date}</div>
                      <div className="flex items-center gap-2"><Clock size={16} className="text-amber-400"/> {activeRace.gatherTime}</div>
                      <div className="flex items-center gap-2"><MapPin size={16} className="text-red-400"/> {activeRace.location}</div>
                  </div>
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
          
          <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
                  <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2"><Flag className="text-blue-600"/> 任務陣型佈署 (Slot Allocation)</h2>
                  
                  <div className="space-y-8">
                      {Object.entries(groupedSlots).map(([groupName, slotsInGroup]) => (
                          <div key={groupName} className="space-y-3">
                              <h3 className="font-black text-slate-700 bg-slate-100 px-4 py-2 rounded-lg inline-block text-sm border border-slate-200">{groupName}</h3>
                              
                              {slotsInGroup.map(slot => {
                                  const filledCount = slot.filled || 0;
                                  const isFull = filledCount >= slot.capacity;
                                  const isSelected = selectedSlot === slot.id;
                                  return (
                                      <div key={slot.id} onClick={() => setSelectedSlot(slot.id)}
                                          className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4
                                              ${isSelected ? 'bg-blue-50 border-blue-500 shadow-md ring-4 ring-blue-500/10' 
                                              : isFull ? 'bg-slate-50 border-slate-100 hover:border-slate-300' 
                                              : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'}`}>
                                          <div>
                                              <h3 className={`font-bold text-lg flex items-center gap-2 ${isFull && !isSelected ? 'text-slate-500' : 'text-slate-800'}`}>
                                                  {slot.name}
                                                  {slot.genderLimit === 'F' && <span className="bg-pink-100 text-pink-600 text-[10px] px-2.5 py-1 rounded-full border border-pink-200 font-black tracking-widest">限定女性</span>}
                                              </h3>
                                              {slot.assignee && <div className="text-sm text-green-700 font-bold mt-1.5 flex items-center gap-1 bg-green-50 w-fit px-2 py-0.5 rounded border border-green-200"><ShieldAlert size={14}/> 守護者: {slot.assignee}</div>}
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <div className={`text-sm font-black px-4 py-2 rounded-xl border ${isFull ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                                                  名額 {filledCount} / {slot.capacity}
                                              </div>
                                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>{isSelected && <CheckCircle size={14}/>}</div>
                                              {isFull && !isSelected && <span className="text-xs font-black text-amber-600 bg-amber-100 px-3 py-1.5 rounded-lg border border-amber-200">已滿 / 可候補</span>}
                                          </div>
                                      </div>
                                  )
                              })}
                          </div>
                      ))}
                  </div>
              </div>

              {/* 候補池 */}
              <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 p-6 md:p-8">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h2 className="text-xl font-black text-slate-800 flex items-center gap-2"><Users className="text-amber-500"/> 任務候補池 (Waitlist)</h2>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1 border border-slate-200"><Timer size={12}/> 依階級與時間排序</span>
                  </div>
                  
                  <div className="space-y-3">
                      {waitlist.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 font-medium bg-slate-50 rounded-2xl border border-dashed border-slate-200">目前尚無人員候補</div>
                      ) : (
                          waitlist.map((user, idx) => {
                              const targetSlot = activeRace.slots.find(s => s.id === user.slot);
                              return (
                              <div key={idx} className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${user.isMe ? 'bg-amber-50 border-amber-300 shadow-md ring-2 ring-amber-500/20' : 'bg-white border-slate-200 hover:bg-slate-50'}`}>
                                  <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg shadow-inner ${idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 text-white shadow-yellow-500/50' : idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400 text-white' : 'bg-gradient-to-br from-orange-300 to-orange-400 text-white'}`}>{idx + 1}</div>
                                      <div>
                                          <div className="font-black text-slate-800 flex items-center gap-2 text-base">
                                              {user.name}
                                              {user.isMe && <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-md border border-amber-300">我</span>}
                                              {user.isVip && <span className="flex items-center text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black"><Crown size={10} className="mr-1"/> VIP</span>}
                                          </div>
                                          <div className="text-xs text-slate-500 mt-1 font-bold">排隊等待：{targetSlot?.group} - {targetSlot?.name}</div>
                                      </div>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <div className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">Tier {user.tier}</div>
                                      {isGodMode && (
                                          <button onClick={() => handleApproveFromWaitlist(user)} title="強制安插上陣" className="bg-green-500 hover:bg-green-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1 transition-all active:scale-95">
                                              <UserCheck size={14}/> 核准
                                          </button>
                                      )}
                                  </div>
                              </div>
                          )})
                      )}
                  </div>
              </div>
          </div>

          <div className="lg:col-span-4">
              <div className="bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-800 p-6 md:p-8 lg:sticky lg:top-8 text-white z-30">
                  <h3 className="text-lg font-black mb-6 border-b border-slate-700 pb-4 flex items-center gap-2"><Activity className="text-blue-400"/> 系統資格審查 (ID Check)</h3>
                  
                  {isGodMode && <div className="bg-amber-500/20 border-2 border-dashed border-amber-500/50 text-amber-400 p-3 rounded-xl text-sm font-bold flex items-center gap-2 mb-6 animate-pulse"><Zap size={18} className="shrink-0 text-amber-400"/> 上帝模式：無限模擬報名已開啟</div>}

                  <div className={`space-y-4 mb-8 ${isGodMode ? 'opacity-50 grayscale' : ''}`}>
                      <div className="flex items-center justify-between"><span className="text-sm text-slate-400 font-medium">當屆會員身分</span>{checks.isCurrentMember ? <CheckCircle size={20} className="text-green-400"/> : <XCircle size={20} className="text-red-500"/>}</div>
                      <div className="flex items-center justify-between"><span className="text-sm text-slate-400 font-medium">醫護證照效期</span>{checks.isLicenseValid ? <CheckCircle size={20} className="text-green-400"/> : <XCircle size={20} className="text-red-500"/>}</div>
                      {['鐵人三項', '二鐵', '路跑接力', '游泳'].includes(activeRace.type) && (
                          <div className="flex items-center justify-between bg-blue-900/30 p-3 rounded-xl border border-blue-800/50">
                              <div><div className="text-sm text-blue-300 font-bold">三鐵戰袍檢核</div><div className="text-[10px] text-slate-500 mt-1">本賽事強制要求著三鐵衣</div></div>
                              {checks.isTriShirtValid ? <CheckCircle size={20} className="text-green-400"/> : <XCircle size={20} className="text-red-500"/>}
                          </div>
                      )}
                      {!checks.genderMatch && <div className="flex items-center justify-between bg-pink-900/30 p-3 rounded-xl border border-pink-800/50 mt-2"><span className="text-sm text-pink-300 font-bold">生理性別限制</span><XCircle size={20} className="text-red-500"/></div>}
                  </div>

                  {!allPassed && !isGodMode && <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-4 rounded-xl text-sm font-bold flex gap-3 mb-6"><AlertTriangle size={20} className="shrink-0"/>資料不符作戰規定，按鈕已鎖定。</div>}

                  <div className="fixed bottom-0 left-0 right-0 p-4 bg-white md:bg-slate-900 border-t border-slate-200 md:border-none md:relative md:p-0 z-50 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] md:shadow-none">
                      <button onClick={handleRegister} disabled={(!allPassed && !isGodMode) || !selectedSlot}
                          className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 disabled:bg-slate-200 md:disabled:bg-slate-800 disabled:text-slate-400 md:disabled:text-slate-600 disabled:cursor-not-allowed disabled:shadow-none
                              ${isSelectedSlotFull && selectedSlot ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-slate-900 shadow-[0_0_20px_rgba(245,158,11,0.4)]' : 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg md:shadow-[0_0_20px_rgba(37,99,235,0.4)]'}`}
                      >
                          {isSelectedSlotFull && selectedSlot ? '⚡ 滿編：登記進入候補池' : '✅ 核准並直接錄取上陣'}
                      </button>
                  </div>
              </div>
          </div>
      </div>
    </div>
  )
}