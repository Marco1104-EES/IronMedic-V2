import { useState, useEffect } from 'react'
import { Activity, ShieldAlert, FileText, CheckCircle, Smartphone, AlertTriangle, Calendar, MapPin, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function DigitalIdCard({ member }) {
  const [activeTab, setActiveTab] = useState('ID_CARD') // 'ID_CARD' 或 'MISSIONS'
  const [myRaces, setMyRaces] = useState([])
  const [loadingMissions, setLoadingMissions] = useState(false)
  const [isCanceling, setIsCanceling] = useState(false)

  // 當切換到「任務派遣令」時，才去撈真實資料
  useEffect(() => {
      if (activeTab === 'MISSIONS' && member) {
          fetchMyRealRaces()
      }
  }, [activeTab, member])

  const fetchMyRealRaces = async () => {
      setLoadingMissions(true)
      try {
          // 撈取所有未結案的賽事來比對
          const { data: races, error } = await supabase
              .from('races')
              .select('id, name, date, status, slots_data, waitlist_data')
              .neq('status', 'CANCELLED')
              .order('date', { ascending: true })

          if (error) throw error

          const foundMissions = []

          if (races) {
              races.forEach(race => {
                  let isEnrolled = false;
                  let targetSlotName = '';
                  let currentStatus = '已報名';
                  let slotId = null;
                  let isWaitlist = false;

                  // 1. 檢查是否在正式名單 (slots_data)
                  if (race.slots_data && Array.isArray(race.slots_data)) {
                      for (const slot of race.slots_data) {
                          if (slot.assignee) {
                              // 把 assignee 字串拆開比對
                              const assigneesArray = slot.assignee.split('|').map(str => {
                                  try { return JSON.parse(str); } catch(e) { return { id: str, name: str }; }
                              });
                              
                              // 比對 ID 或 Name
                              const match = assigneesArray.find(p => p.id === member.id || p.name === member.full_name);
                              if (match) {
                                  isEnrolled = true;
                                  targetSlotName = `${slot.group} - ${slot.name}`;
                                  slotId = slot.id;
                                  if (race.status === 'NEGOTIATING') currentStatus = '洽談中 (預備)';
                                  else if (race.status === 'SUBMITTED') currentStatus = '名單已送出';
                                  else currentStatus = '已報名成功';
                                  break; // 找到就跳出迴圈
                              }
                          }
                      }
                  }

                  // 2. 如果不在正式名單，檢查是否在候補名單 (waitlist_data)
                  if (!isEnrolled && race.waitlist_data && Array.isArray(race.waitlist_data)) {
                      const waitMatch = race.waitlist_data.find(w => w.id === member.id || w.id.startsWith(member.id));
                      if (waitMatch) {
                          isEnrolled = true;
                          isWaitlist = true;
                          currentStatus = '候補中';
                          // 嘗試找出他候補的組別名稱
                          const waitSlot = race.slots_data?.find(s => s.id === waitMatch.slot);
                          targetSlotName = waitSlot ? `${waitSlot.group} - ${waitSlot.name} (候補)` : '候補名單';
                      }
                  }

                  if (isEnrolled) {
                      foundMissions.push({
                          id: race.id,
                          title: race.name,
                          date: race.date,
                          slot: targetSlotName,
                          slotId: slotId,
                          status: currentStatus,
                          isWaitlist: isWaitlist,
                          raceStatus: race.status // 原本的賽事狀態，用來判斷能不能取消
                      })
                  }
              })
          }

          setMyRaces(foundMissions)

      } catch (error) {
          console.error('抓取任務失敗:', error)
      } finally {
          setLoadingMissions(false)
      }
  }

  // 🚨 真實取消報名邏輯
  const handleCancelRace = async (mission) => {
      if (mission.raceStatus === 'SUBMITTED') {
          return alert("❌ 該賽事名單已送出，無法自行取消，請聯繫賽事總監。");
      }

      if(!window.confirm(`確定要取消【${mission.title}】的報名並釋出名額嗎？\n\n(此操作無法復原)`)) return;

      setIsCanceling(true)
      try {
          // 1. 先把最新的該場賽事資料抓下來，避免覆蓋別人剛報名的資料
          const { data: currentRace, error: fetchError } = await supabase
              .from('races')
              .select('slots_data, waitlist_data')
              .eq('id', mission.id)
              .single()

          if (fetchError) throw fetchError

          let updatedSlots = currentRace.slots_data || [];
          let updatedWaitlist = currentRace.waitlist_data || [];

          if (mission.isWaitlist) {
              // 拔除候補名單
              updatedWaitlist = updatedWaitlist.filter(w => w.id !== member.id && !w.id.startsWith(member.id));
          } else {
              // 拔除正式名單
              updatedSlots = updatedSlots.map(s => {
                  if (s.id === mission.slotId && s.assignee) {
                      const assigneesArray = s.assignee.split('|').map(str => {
                          try { return JSON.parse(str); } catch(e) { return { id: str, name: str, isLegacy: true }; }
                      });
                      
                      // 濾掉登入者
                      const newAssigneesArray = assigneesArray.filter(p => p.id !== member.id && p.name !== member.full_name);
                      
                      const newAssigneeString = newAssigneesArray.map(p => p.isLegacy ? p.name : JSON.stringify(p)).join('|');
                      
                      return { ...s, filled: Math.max(0, s.filled - 1), assignee: newAssigneeString };
                  }
                  return s;
              });
          }

          // 2. 寫回資料庫
          const { error: updateError } = await supabase
              .from('races')
              .update({ slots_data: updatedSlots, waitlist_data: updatedWaitlist })
              .eq('id', mission.id)

          if (updateError) throw updateError

          // 3. 成功後，更新畫面
          setMyRaces(myRaces.filter(r => r.id !== mission.id))
          alert("✅ 退賽成功，名額已釋出！")

      } catch (error) {
          alert("取消報名失敗：" + error.message)
      } finally {
          setIsCanceling(false)
      }
  }

  if (!member) return null

  const renderFieldValue = (value) => {
    return value && value.trim() !== '' ? value : <span className="text-slate-500 italic font-normal text-xs">無資料</span>
  }

  return (
    <div className="w-80 h-[36rem] rounded-[2rem] overflow-hidden shadow-2xl relative bg-slate-900 border border-slate-700 flex flex-col animate-fade-in-up font-sans">
      
      {/* 頂部雙頁籤切換器 */}
      <div className="flex bg-slate-800 p-1 m-4 rounded-xl relative z-20 shadow-inner border border-slate-700 shrink-0">
          <button 
              onClick={() => setActiveTab('ID_CARD')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'ID_CARD' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
              醫療識別證
          </button>
          <button 
              onClick={() => setActiveTab('MISSIONS')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all flex items-center justify-center gap-1 ${activeTab === 'MISSIONS' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
              任務派遣令 {activeTab === 'MISSIONS' && !loadingMissions && <span className="bg-slate-900 text-amber-500 px-1.5 rounded-full text-[10px]">{myRaces.length}</span>}
          </button>
      </div>

      {/* 頁面內容區 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6 relative">
          
          {/* ========================================= */}
          {/* 頁籤 1：原始醫療識別卡 (ID Card)          */}
          {/* ========================================= */}
          {activeTab === 'ID_CARD' && (
              <div className="px-6 animate-fade-in">
                  <div className="text-center mb-6">
                      <h2 className="text-white font-black text-2xl tracking-wider">{member.full_name}</h2>
                      <div className="text-blue-400 text-xs font-bold mt-1 tracking-widest">{member.english_name || 'IRON MEDIC'}</div>
                  </div>

                  <div className="space-y-4">
                      {/* 血型與證照 */}
                      <div className="flex gap-3">
                          <div className="flex-1 bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/50 flex flex-col justify-center items-center">
                              <span className="text-[10px] text-slate-400 font-bold mb-1">血型 Blood</span>
                              <span className="text-2xl font-black text-red-500">{member.blood_type || '-'}</span>
                          </div>
                          <div className="flex-1 bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/50 flex flex-col justify-center items-center">
                              <span className="text-[10px] text-slate-400 font-bold mb-1 text-center">醫護證照 License</span>
                              {member.license_expiry && new Date(member.license_expiry) >= new Date() 
                                  ? <CheckCircle size={24} className="text-green-500 mt-1"/> 
                                  : <AlertTriangle size={24} className="text-amber-500 mt-1"/>}
                          </div>
                      </div>

                      {/* 緊急醫療資訊 */}
                      <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                          <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-3 border-b border-slate-700 pb-2">
                              <Activity size={14} className="text-blue-400"/> 緊急醫療資訊
                          </h3>
                          <div className="text-sm text-slate-200 font-medium leading-relaxed min-h-[3rem]">
                              {renderFieldValue(member.medical_history)}
                          </div>
                      </div>

                      {/* 緊急聯絡人 */}
                      <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-4 border border-slate-700/50 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600"></div>
                          <h3 className="text-[10px] font-bold text-slate-400 mb-1 ml-2">緊急聯絡人 Contact</h3>
                          <div className="text-sm text-white font-bold ml-2">
                              {renderFieldValue(member.emergency_name)} 
                              {member.emergency_relation && <span className="text-xs text-slate-400 font-normal ml-2">({member.emergency_relation})</span>}
                          </div>
                          <div className="text-sm font-mono text-red-400 mt-1 ml-2 flex items-center gap-1">
                              <Smartphone size={12}/> {renderFieldValue(member.emergency_phone)}
                          </div>
                      </div>

                      {/* QR Code */}
                      <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center mt-6 mb-4">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${member.id}`} alt="ID QR" className="w-32 h-32 rounded-lg" />
                          <div className="text-[10px] text-slate-400 font-mono mt-2">ID: {member.id?.substring(0,8).toUpperCase()}</div>
                      </div>
                  </div>
              </div>
          )}

          {/* ========================================= */}
          {/* 頁籤 2：真・任務派遣令 (Real Races & Cancellation) */}
          {/* ========================================= */}
          {activeTab === 'MISSIONS' && (
              <div className="px-6 animate-fade-in space-y-4">
                  
                  {loadingMissions ? (
                      <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                          <Loader2 size={32} className="animate-spin mb-3 text-amber-500"/>
                          <p className="text-xs font-bold">正在掃描您的任務資料...</p>
                      </div>
                  ) : myRaces.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                          <ShieldAlert size={40} className="mb-3 opacity-50"/>
                          <p className="text-sm font-bold">目前無待命的任務</p>
                          <p className="text-xs mt-1">請至賽事大廳進行佈署</p>
                      </div>
                  ) : (
                      myRaces.map((race, idx) => (
                          <div key={race.id} className={`bg-slate-800 rounded-2xl p-4 border transition-colors relative overflow-hidden group ${race.isWaitlist ? 'border-amber-700/50' : 'border-slate-700 hover:border-slate-500'}`}>
                              {/* 狀態標籤 */}
                              <div className={`absolute top-0 right-0 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl ${race.isWaitlist ? 'bg-amber-600' : race.raceStatus === 'SUBMITTED' ? 'bg-slate-600' : 'bg-blue-600'}`}>
                                  {race.status}
                              </div>
                              
                              <h4 className="font-bold text-white text-sm pr-16 mb-2 leading-snug">{race.title}</h4>
                              
                              <div className="space-y-1.5 mb-4">
                                  <div className="flex items-center text-xs text-slate-400 font-medium">
                                      <Calendar size={12} className="text-amber-400 mr-2"/> {race.date}
                                  </div>
                                  <div className="flex items-center text-xs text-slate-400 font-medium">
                                      <Flag size={12} className="text-green-400 mr-2"/> 棒次：{race.slot}
                                  </div>
                              </div>

                              {/* 🚨 釋出名額按鈕 */}
                              {race.raceStatus !== 'SUBMITTED' ? (
                                  <button 
                                      onClick={() => handleCancelRace(race)}
                                      disabled={isCanceling}
                                      className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-500/10 hover:text-red-300 transition-all active:scale-95 disabled:opacity-50"
                                  >
                                      {isCanceling ? <Loader2 size={14} className="animate-spin"/> : <XCircle size={14}/>} 
                                      {isCanceling ? '處理中...' : '取消報名 (釋出名額)'}
                                  </button>
                              ) : (
                                  <div className="w-full py-2.5 rounded-xl bg-slate-900/50 text-slate-500 text-xs font-bold flex items-center justify-center border border-slate-800">
                                      名單已送出，請聯繫總監
                                  </div>
                              )}
                          </div>
                      ))
                  )}

                  {!loadingMissions && myRaces.length > 0 && (
                      <div className="mt-8 pt-4 border-t border-slate-700 text-center text-[10px] text-slate-500 leading-relaxed pb-4">
                          💡 當您取消報名，系統會立即空出賽事名額，<br/>並在未來自動推播至 Line 官方任務群組。
                      </div>
                  )}
              </div>
          )}

      </div>
    </div>
  )
}