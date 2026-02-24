import { useState, useEffect } from 'react'
import { Medal, Calendar, ShieldCheck, AlertTriangle, Clock, MapPin, ChevronRight, Activity, Zap, Crown, Sprout, Loader2, CreditCard, LogOut, QrCode, CheckCircle, ShieldAlert, Bell, MessageSquareWarning, X, Flag, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// 🌟 淨化：測試帳號名稱
const CURRENT_USER = {
    id: 'admin001', 
    full_name: '測試管理員', 
    role: 'SUPER_ADMIN', 
    is_current_member: 'Y', 
    license_expiry: '2028-01-01', 
    shirt_expiry_25: '2025-12-31', 
    is_vip: 'Y', 
    total_races: 52, 
    is_team_leader: 'Y', 
    gender: 'M',
    blood_type: 'O+',
    member_id: 'IM-2024-001'
}

const MOCK_NOTIFICATIONS = [
    { id: 1, type: 'system', category: 'race', message: '新賽事「2026 渣打台北公益馬拉松」已開放招募！', timestamp: new Date(Date.now() - 86400000).toLocaleString(), isRead: false },
    { id: 2, type: 'system', category: 'race', message: '歡迎啟用全新醫護鐵人數位 ID 系統！', timestamp: new Date(Date.now() - 172800000).toLocaleString(), isRead: true }
]

export default function DigitalID() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [myRaces, setMyRaces] = useState([])
  
  const [isNotificationOpen, setIsNotificationOpen] = useState(false)
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)
  const [activeTab, setActiveTab] = useState('personal') 

  const getUserTier = (user) => {
      if (user.is_vip === 'Y') return { level: 1, label: '核心幹部 VIP', color: 'from-amber-400 to-yellow-600', text: 'text-amber-500' };
      if (user.total_races < 2) return { level: 2, label: '新進夥伴', color: 'from-green-400 to-emerald-600', text: 'text-green-500' };
      if (user.is_team_leader === 'Y') return { level: 3, label: '小隊長', color: 'from-blue-400 to-indigo-600', text: 'text-blue-500' };
      if (user.is_current_member === 'Y') return { level: 4, label: '活躍會員', color: 'from-slate-400 to-slate-600', text: 'text-slate-500' };
      return { level: 5, label: '一般會員', color: 'from-slate-300 to-slate-400', text: 'text-slate-400' };
  }

  const userTier = getUserTier(CURRENT_USER)
  const isLicenseValid = new Date(CURRENT_USER.license_expiry) >= new Date()

  const totalUnreadCount = notifications.filter(n => !n.isRead).length
  const personalUnread = notifications.filter(n => !n.isRead && n.category === 'personal').length
  const raceUnread = notifications.filter(n => !n.isRead && n.category === 'race').length

  const displayedNotifications = notifications.filter(n => n.category === activeTab)

  useEffect(() => {
    fetchMyMissions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchMyMissions = async () => {
    setLoading(true)
    try {
      const { data: races, error } = await supabase.from('races').select('*').order('date', { ascending: true })
      if (error) throw error

      const upcomingMissions = []
      
      races.forEach(race => {
          if (race.slots_data && Array.isArray(race.slots_data)) {
              race.slots_data.forEach(slot => {
                  if (slot.assignee) {
                      const rawAssignees = slot.assignee.split('|');
                      rawAssignees.forEach(item => {
                          let participantName = "";
                          try { participantName = JSON.parse(item).name; } catch(e) { participantName = item.trim(); }
                          if (participantName.includes(CURRENT_USER.full_name)) {
                               upcomingMissions.push({
                                  ...race, uniqueMissionId: `${race.id}-${slot.id}-${participantName}`, 
                                  mySlotId: slot.id, mySlotGroup: slot.group, mySlotName: slot.name, exactMatchString: item 
                              })
                          }
                      });
                  }
              })
          }
      })
      
      setMyRaces(upcomingMissions)

      const historyNotifs = upcomingMissions.map((race) => ({
          id: `hist-${race.uniqueMissionId}`,
          type: 'system',
          category: 'personal',
          message: `✅ 報名確認：您已成功加入「${race.name}」的報名名單！負責組別為 ${race.mySlotGroup} - ${race.mySlotName}。`,
          timestamp: '歷史紀錄',
          isRead: true 
      }));

      setNotifications(prev => {
          const existingIds = new Set(prev.map(n => n.id));
          const newNotifs = historyNotifs.filter(n => !existingIds.has(n.id));
          return [...prev, ...newNotifs];
      });

    } catch (error) { console.error("載入失敗:", error) } finally { setLoading(false) }
  }

  const markAllAsRead = () => {
      setNotifications(notifications.map(n => n.category === activeTab ? { ...n, isRead: true } : n))
  }

  const handleWithdraw = async (raceId, slotId, exactMatchString, raceName) => {
      if (!window.confirm(`⚠️ 確定要取消報名「${raceName}」嗎？\n退賽後若要重新加入，需視名額狀況重新排隊。`)) { return; }

      try {
          const { data: raceData, error: fetchError } = await supabase.from('races').select('slots_data, waitlist_data').eq('id', raceId).single();
          if (fetchError) throw fetchError;

          let waitlist = raceData.waitlist_data || [];
          let promotedUser = null;
          const waitlistIndex = waitlist.findIndex(user => user.slot === slotId);
          
          if (waitlistIndex !== -1) {
              promotedUser = waitlist[waitlistIndex];
              waitlist.splice(waitlistIndex, 1); 
          }

          const updatedSlots = raceData.slots_data.map(slot => {
              if (slot.id === slotId) {
                  let currentFilled = slot.filled || 0;
                  let assignees = slot.assignee ? slot.assignee.split('|') : [];
                  const newAssignees = [];
                  let removed = false;
                  
                  assignees.forEach(item => {
                      if (item === exactMatchString && !removed) { removed = true; } else { newAssignees.push(item); }
                  });

                  if (promotedUser) {
                      newAssignees.push(JSON.stringify(promotedUser));
                      
                      if (promotedUser.name.includes(CURRENT_USER.full_name.split(' ')[0])) {
                           const newNotif = {
                              id: Date.now(),
                              type: 'promotion',
                              category: 'personal', 
                              // 🌟 淨化：遞補上陣 -> 遞補成功
                              message: `🎉 恭喜！您在「${raceName}」的候補順位已遞補成功！負責賽段為：${slot.group}-${slot.name}。請確認您的相關裝備。`,
                              timestamp: new Date().toLocaleString(),
                              isRead: false
                          }
                          setNotifications(prev => [newNotif, ...prev])
                      }
                      alert(`📣 退賽成功。\n您的位置已由候補名單中的【${promotedUser.name}】遞補成功！\n系統已發送站內通知給該夥伴。`);
                  } else {
                      currentFilled = Math.max(0, currentFilled - 1);
                      
                      const withdrawNotif = {
                          id: Date.now(), type: 'system', category: 'personal',
                          message: `✅ 您已成功取消「${raceName}」的報名。`,
                          timestamp: new Date().toLocaleString(), isRead: false
                      }
                      setNotifications(prev => [withdrawNotif, ...prev])

                      alert("✅ 退賽手續已完成！期待您下次的參與。");
                  }
                  return { ...slot, filled: currentFilled, assignee: newAssignees.join('|') };
              }
              return slot;
          });

          const { error: updateError } = await supabase.from('races').update({ slots_data: updatedSlots, waitlist_data: waitlist }).eq('id', raceId);
          if (updateError) throw updateError;
          fetchMyMissions();

      } catch (error) { alert("退賽失敗：" + error.message); }
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 animate-fade-in relative overflow-x-hidden">
      
      <div className="bg-slate-900 text-white p-4 sticky top-0 z-40 shadow-md flex justify-between items-center">
          <div className="flex items-center gap-3 font-black tracking-wider">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">I</div>
              <span>IRON MEDIC</span>
          </div>
          
          <div className="flex items-center gap-4">
              <button onClick={() => setIsNotificationOpen(true)} className="relative p-2 text-slate-300 hover:text-white transition-colors bg-slate-800 rounded-full">
                  <Bell size={20} />
                  {totalUnreadCount > 0 && (
                      <span className="absolute top-0 right-0 -mt-1 -mr-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-slate-900">
                          {totalUnreadCount}
                      </span>
                  )}
              </button>
              <button onClick={() => navigate('/races')} className="text-sm font-bold text-slate-300 hover:text-white transition-colors bg-slate-800 px-4 py-2 rounded-full hidden sm:block">
                  前往賽事大廳
              </button>
          </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 lg:mt-12 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
              
              <div className="lg:col-span-5 space-y-6">
                  <div className={`relative rounded-3xl p-8 overflow-hidden shadow-2xl shadow-${userTier.color.split('-')[1]}/30 bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700`}>
                      <div className={`absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br ${userTier.color} rounded-full blur-3xl opacity-20 pointer-events-none`}></div>
                      
                      <div className="relative z-10 flex justify-between items-start mb-10">
                          <div>
                              <div className="text-slate-400 text-xs font-black tracking-widest uppercase mb-1 flex items-center gap-1.5">
                                  <CreditCard size={14}/> DIGITAL ID
                              </div>
                              <div className="font-mono text-sm text-slate-300 tracking-widest">{CURRENT_USER.member_id}</div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-xs font-black bg-gradient-to-r ${userTier.color} shadow-lg flex items-center gap-1`}>
                              {CURRENT_USER.is_vip === 'Y' && <Crown size={12}/>}
                              {userTier.label}
                          </div>
                      </div>

                      <div className="relative z-10 flex items-center gap-6 mb-10">
                          <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${userTier.color} p-1 shadow-inner`}>
                              <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center text-3xl font-black border-2 border-slate-900">
                                  {CURRENT_USER.full_name.charAt(0)}
                              </div>
                          </div>
                          <div>
                              <h2 className="text-3xl font-black tracking-tight">{CURRENT_USER.full_name}</h2>
                              <div className="text-slate-400 text-sm mt-1 flex items-center gap-3">
                                  <span className="flex items-center gap-1"><Activity size={14}/> 血型: {CURRENT_USER.blood_type}</span>
                              </div>
                          </div>
                      </div>

                      <div className="relative z-10 grid grid-cols-2 gap-4 border-t border-slate-700/50 pt-6">
                          <div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">醫護證照效期</div>
                              <div className={`text-sm font-black flex items-center gap-1.5 ${isLicenseValid ? 'text-green-400' : 'text-red-400'}`}>
                                  {isLicenseValid ? <ShieldCheck size={16}/> : <AlertTriangle size={16}/>}
                                  {CURRENT_USER.license_expiry}
                              </div>
                          </div>
                          <div>
                              <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold mb-1">三鐵衣資格</div>
                              <div className="text-sm font-black text-blue-300 flex items-center gap-1.5">
                                  <CheckCircle size={16}/>
                                  {CURRENT_USER.shirt_expiry_25}
                              </div>
                          </div>
                      </div>

                      <div className="absolute bottom-6 right-6 opacity-30 pointer-events-none">
                          <QrCode size={48} />
                      </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mb-3">
                              <Medal size={24}/>
                          </div>
                          {/* 🌟 淨化：任務 -> 賽事 */}
                          <div className="text-3xl font-black text-slate-800">{CURRENT_USER.total_races}</div>
                          <div className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">總完賽場次</div>
                      </div>
                      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center mb-3">
                              <Zap size={24}/>
                          </div>
                          <div className="text-3xl font-black text-slate-800">100%</div>
                          <div className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">出席達成率</div>
                      </div>
                  </div>
              </div>

              <div className="lg:col-span-7">
                  <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-100 p-6 md:p-8 min-h-full">
                      <div className="flex justify-between items-center mb-8 border-b border-slate-100 pb-5">
                          <div>
                              {/* 🌟 淨化：任務雷達 -> 我的賽事紀錄 */}
                              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                                  <Calendar className="text-blue-600"/> 我的賽事紀錄 (My Races)
                              </h2>
                              <p className="text-sm text-slate-500 mt-1">系統自動追蹤您已報名的所有賽事。</p>
                          </div>
                      </div>

                      {loading ? (
                          <div className="flex flex-col justify-center items-center h-64 text-slate-400">
                              <Loader2 className="animate-spin mb-4" size={40} />
                              <span className="font-bold">名單掃描中...</span>
                          </div>
                      ) : myRaces.length === 0 ? (
                          <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                              <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                  <MapPin size={32}/>
                              </div>
                              <h3 className="text-lg font-black text-slate-700 mb-2">目前無報名紀錄</h3>
                              <p className="text-slate-500 text-sm mb-6">您尚未報名任何賽事。</p>
                              <button onClick={() => navigate('/races')} className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all active:scale-95">
                                  前往賽事大廳尋找活動
                              </button>
                          </div>
                      ) : (
                          <div className="space-y-5">
                              {myRaces.map((race) => (
                                  <div key={race.uniqueMissionId} className="group relative p-5 md:p-6 rounded-2xl border-2 border-slate-100 bg-white hover:border-blue-300 hover:shadow-lg transition-all flex flex-col md:flex-row md:items-center justify-between gap-5">
                                      
                                      <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 mb-2">
                                              <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-2.5 py-1 rounded-md tracking-widest">{race.type}</span>
                                              <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Clock size={12}/> {race.date}</span>
                                          </div>
                                          <h3 className="text-lg font-black text-slate-800 mb-3 truncate group-hover:text-blue-600 transition-colors">
                                              {race.name}
                                          </h3>
                                          
                                          <div className="bg-blue-50/80 p-3 rounded-xl border border-blue-100 w-fit">
                                              {/* 🌟 淨化：防守位置 -> 負責賽段 */}
                                              <div className="text-xs text-blue-600 font-bold mb-0.5">您的報名賽段：</div>
                                              <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                                                  <ShieldAlert size={16} className="text-blue-500"/>
                                                  {race.mySlotGroup} - {race.mySlotName}
                                              </div>
                                          </div>
                                      </div>

                                      <div className="flex flex-row md:flex-col justify-end items-end gap-3 shrink-0">
                                          <button onClick={() => navigate(`/race-detail/${race.id}`)} className="flex-1 md:flex-none w-full md:w-auto px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-md">
                                              查看詳情 <ChevronRight size={16}/>
                                          </button>
                                          <button 
                                              onClick={() => handleWithdraw(race.id, race.mySlotId, race.exactMatchString, race.name)}
                                              className="flex-1 md:flex-none w-full md:w-auto px-5 py-2.5 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 text-sm font-bold rounded-xl transition-all border border-red-200 hover:border-red-500"
                                          >
                                              申請退賽
                                          </button>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>

          </div>
      </div>

      {isNotificationOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-end z-[100] animate-fade-in" onClick={() => setIsNotificationOpen(false)}>
              <div 
                  className="bg-slate-50 w-full max-w-md h-full shadow-2xl flex flex-col animate-slide-in-right border-l border-white/20"
                  onClick={e => e.stopPropagation()}
              >
                  <div className="bg-slate-900 text-white p-6 flex justify-between items-center shrink-0">
                      <div className="flex items-center gap-3">
                          <div className="bg-blue-600/30 p-2 rounded-xl text-blue-400">
                              <Bell size={20} />
                          </div>
                          <div>
                              <h3 className="font-black text-lg">系統通知中心</h3>
                              {/* 🌟 淨化：派班動態 -> 賽事動態 */}
                              <p className="text-xs text-slate-400">您的個人訊息與賽事動態</p>
                          </div>
                      </div>
                      <button onClick={() => setIsNotificationOpen(false)} className="text-slate-400 hover:text-white hover:bg-slate-800 p-2 rounded-full transition-colors">
                          <X size={20} />
                      </button>
                  </div>

                  <div className="flex bg-white border-b border-slate-200 shrink-0">
                      <button 
                          onClick={() => setActiveTab('personal')}
                          className={`flex-1 py-4 text-sm font-bold flex justify-center items-center gap-2 relative ${activeTab === 'personal' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                      >
                          <User size={16}/> 個人參賽
                          {personalUnread > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{personalUnread}</span>}
                          {activeTab === 'personal' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                      </button>
                      <button 
                          onClick={() => setActiveTab('race')}
                          className={`flex-1 py-4 text-sm font-bold flex justify-center items-center gap-2 relative ${activeTab === 'race' ? 'text-blue-600' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
                      >
                          <Flag size={16}/> 賽事資訊
                          {raceUnread > 0 && <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">{raceUnread}</span>}
                          {activeTab === 'race' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"></div>}
                      </button>
                  </div>

                  <div className="flex justify-between items-center px-6 py-3 bg-slate-50 border-b border-slate-100 shrink-0">
                      <span className="text-xs font-bold text-slate-500">{displayedNotifications.length} 則通知</span>
                      {displayedNotifications.some(n => !n.isRead) && (
                          <button onClick={markAllAsRead} className="text-xs font-bold text-blue-600 hover:text-blue-800 px-3 py-1.5 bg-blue-100/50 rounded-lg hover:bg-blue-100 transition-colors">
                              全部標示為已讀
                          </button>
                      )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      {displayedNotifications.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
                              <MessageSquareWarning size={48} className="opacity-20"/>
                              <p className="font-medium text-sm">目前沒有任何{activeTab === 'personal' ? '個人' : '賽事'}通知</p>
                          </div>
                      ) : (
                          displayedNotifications.map(notif => (
                              <div key={notif.id} className={`p-4 rounded-2xl border transition-all ${notif.isRead ? 'bg-white border-slate-100 opacity-70' : 'bg-white border-blue-200 shadow-md shadow-blue-900/5'}`}>
                                  <div className="flex gap-3">
                                      <div className={`mt-0.5 shrink-0 w-8 h-8 rounded-full flex items-center justify-center
                                          ${notif.type === 'promotion' ? 'bg-amber-100 text-amber-600' : 'bg-blue-100 text-blue-600'}`}>
                                          {notif.type === 'promotion' ? <Crown size={16}/> : <Activity size={16}/>}
                                      </div>
                                      
                                      <div className="flex-1">
                                          <div className="flex justify-between items-start gap-4 mb-1">
                                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${notif.type === 'promotion' ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}>
                                                  {notif.type === 'promotion' ? '遞補通知' : '系統紀錄'}
                                              </span>
                                              <span className="text-xs text-slate-400 font-mono shrink-0">{notif.timestamp}</span>
                                          </div>
                                          <p className={`text-sm mt-2 leading-relaxed ${notif.isRead ? 'text-slate-600' : 'text-slate-800 font-bold'}`}>
                                              {notif.message}
                                          </p>
                                      </div>
                                  </div>
                                  
                                  {notif.type === 'promotion' && !notif.isRead && (
                                      <div className="mt-4 flex justify-end border-t border-slate-100 pt-3">
                                          <button 
                                              onClick={() => setNotifications(notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n))}
                                              className="text-xs font-bold bg-amber-500 text-white px-4 py-2 rounded-xl shadow-sm hover:bg-amber-600 transition-colors flex items-center gap-1"
                                          >
                                              <CheckCircle size={14}/> 收到，已確認
                                          </button>
                                      </div>
                                  )}
                                  {notif.type !== 'promotion' && !notif.isRead && (
                                       <div className="mt-3 flex justify-end">
                                           <button 
                                              onClick={() => setNotifications(notifications.map(n => n.id === notif.id ? { ...n, isRead: true } : n))}
                                              className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors underline decoration-dotted"
                                          >
                                              標示已讀
                                          </button>
                                       </div>
                                  )}
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}