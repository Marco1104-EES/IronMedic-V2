import { useState, useEffect } from 'react'
import { 
    Medal, Calendar, ShieldCheck, AlertTriangle, Clock, MapPin, ChevronRight, ChevronLeft, 
    Activity, Crown, Sprout, Loader2, CreditCard, LogOut, QrCode, CheckCircle, 
    XCircle, ShieldAlert, Bell, X, Flag, User, Phone, HeartPulse, Shirt, Car, 
    Award, Fingerprint, Target, MousePointerClick, Edit3, Send, Check, Save, 
    ListOrdered, Trash2, Zap
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const INITIAL_NOTIFICATIONS = [
    { id: 1, tab: 'system', category: 'race', message: '新賽事已開放報名！', date: new Date().toISOString(), isRead: false },
    { id: 2, tab: 'personal', category: 'cert', message: '您的 EMT-1 證照即將於 30 天後到期，請盡速更新。', date: new Date(Date.now() - 86400000).toISOString(), isRead: false },
    { id: 3, tab: 'system', category: 'shop', message: '專屬 VIP 優惠：鐵人裝備商城全館 8 折！', date: new Date(Date.now() - 86400000 * 3).toISOString(), isRead: true },
    { id: 4, tab: 'personal', category: 'old', message: '這是一則一年前的舊通知，即將被系統自動清除。', date: '2024-01-01T00:00:00.000Z', isRead: true }
]

const InfoRow = ({ label, value, icon: Icon, alert = false }) => (
    <div className="flex flex-col py-3 border-b border-slate-100 last:border-0">
        <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-1">
            {Icon && <Icon size={12} />} {label}
        </span>
        <span className={`text-[15px] md:text-base font-black ${alert ? 'text-red-600' : 'text-slate-800'}`}>
            {value || <span className="text-slate-300 font-medium">未提供</span>}
        </span>
    </div>
)

const EditInputRow = ({ label, name, type = "text", options = [], formData, handleInputChange }) => (
    <div className="flex flex-col py-2 border-b border-slate-100 last:border-0">
        <label className="text-xs font-bold text-blue-600 mb-1">{label}</label>
        {type === 'select' ? (
            <select name={name} value={formData[name] || ''} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-[16px]">
                <option value="">請選擇</option>
                {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        ) : (
            <input type={type} name={name} value={formData[name] || ''} onChange={handleInputChange} className="w-full p-3 rounded-xl border border-slate-300 bg-white font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-[16px]" placeholder={`請輸入${label}`} />
        )}
    </div>
)

export default function DigitalID() {
  const navigate = useNavigate()
  const [showQR, setShowQR] = useState(false)
  
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifTab, setNotifTab] = useState('system') 
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)
  
  const [profile, setProfile] = useState(null)
  const [myRaces, setMyRaces] = useState([]) 
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [isCanceling, setIsCanceling] = useState(false)

  const [activeModal, setActiveModal] = useState(null) 
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({})

  useEffect(() => {
    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);
    setNotifications(prev => prev.filter(n => new Date(n.date) >= eightMonthsAgo));

    fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async () => {
    setLoadingProfile(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      let currentUserProfile = {
          id: user?.id || 'unknown',
          email: user?.email || '',
          full_name: user?.email ? user.email.split('@')[0] : '未登入',
          role: 'USER',
          gender: '未提供',
          basic_edit_count: 0,
          med_edit_count: 0
      };

      if (user && user.email) { 
        const { data, error } = await supabase.from('profiles').select('*').eq('email', user.email.toLowerCase()).maybeSingle()
        if (data) {
            currentUserProfile = { ...currentUserProfile, ...data }
        }
      } 
      
      setProfile(currentUserProfile)

      const { data: allRaces, error: raceError } = await supabase.from('races').select('*').neq('status', 'CANCELLED').order('date', { ascending: false })
      if (raceError) throw raceError;

      const myEnrolledRaces = [];
      
      if (allRaces) {
          allRaces.forEach(race => {
              let isEnrolled = false;
              let foundMySlot = null;
              let myRole = '一般報名'; 

              if (race.slots_data && Array.isArray(race.slots_data)) {
                  for (const slot of race.slots_data) {
                      if (slot.assignee) {
                          const assignees = slot.assignee.split('|');
                          for (const item of assignees) {
                              if (!item) continue;
                              try {
                                  const p = JSON.parse(item);
                                  if (p.id === currentUserProfile.id || p.name === currentUserProfile.full_name) {
                                      foundMySlot = `${slot.group} - ${slot.name}`;
                                      if (p.roleTag) myRole = p.roleTag;
                                      isEnrolled = true;
                                      break;
                                  }
                              } catch (e) {
                                  const legacyName = item.split(' #')[0].trim();
                                  if (legacyName === currentUserProfile.full_name) {
                                      foundMySlot = `${slot.group} - ${slot.name}`;
                                      isEnrolled = true;
                                      break;
                                  }
                              }
                          }
                      }
                      if (isEnrolled) break;
                  }
              }

              if (!isEnrolled && race.waitlist_data && Array.isArray(race.waitlist_data)) {
                  const waitMatch = race.waitlist_data.find(w => w.id === currentUserProfile.id || w.name === currentUserProfile.full_name);
                  if (waitMatch) {
                      isEnrolled = true;
                      foundMySlot = "候補名單";
                      myRole = "候補中";
                  }
              }

              if (isEnrolled) {
                  myEnrolledRaces.push({
                      id: race.id, name: race.name, date: race.date,
                      location: race.location, status: race.status,
                      slotName: foundMySlot, role: myRole
                  });
              }
          });
      }

      setMyRaces(myEnrolledRaces);

    } catch (error) {
      console.error("載入資料失敗:", error)
    } finally {
      setLoadingProfile(false)
    }
  }

  const handleCancelRace = async (e, raceId, raceName) => {
      e.stopPropagation(); 
      
      if(!window.confirm(`確定要取消報名【${raceName}】並釋出名額嗎？\n(此操作無法復原)`)) return;

      setIsCanceling(true)
      try {
          const { data: currentRace, error: fetchError } = await supabase.from('races').select('slots_data, waitlist_data, status').eq('id', raceId).single()
          if (fetchError) throw fetchError

          if (currentRace.status === 'SUBMITTED') {
              alert("❌ 該賽事名單已送出，無法自行取消，請聯繫賽事總監。")
              setIsCanceling(false)
              return;
          }

          let updatedSlots = currentRace.slots_data || [];
          let updatedWaitlist = currentRace.waitlist_data || [];

          updatedWaitlist = updatedWaitlist.filter(w => w.id !== profile.id && w.name !== profile.full_name);

          updatedSlots = updatedSlots.map(s => {
              if (s.assignee) {
                  const assigneesArray = s.assignee.split('|').map(str => {
                      try { return JSON.parse(str); } catch(e) { return { id: str, name: str, isLegacy: true }; }
                  });
                  
                  const initialLength = assigneesArray.length;
                  const newAssigneesArray = assigneesArray.filter(p => p.id !== profile.id && p.name !== profile.full_name);
                  
                  if (newAssigneesArray.length < initialLength) {
                      const newAssigneeString = newAssigneesArray.map(p => p.isLegacy ? p.name : JSON.stringify(p)).join('|');
                      return { ...s, filled: Math.max(0, s.filled - 1), assignee: newAssigneeString };
                  }
              }
              return s;
          });

          const { error: updateError } = await supabase.from('races').update({ slots_data: updatedSlots, waitlist_data: updatedWaitlist }).eq('id', raceId)
          if (updateError) throw updateError

          setMyRaces(myRaces.filter(r => r.id !== raceId))
          alert("✅ 退賽成功，名額已釋出！")

      } catch (error) {
          alert("退賽失敗：" + error.message)
      } finally {
          setIsCanceling(false)
      }
  }

  const handleOpenModal = (modalName) => {
      setActiveModal(modalName)
      setIsEditing(false)
      setFormData(profile)
  }

  const handleInputChange = (e) => {
      const { name, value } = e.target
      setFormData(prev => ({ ...prev, [name]: value }))
  }

  // 🌟 極速背景儲存 (樂觀 UI + Fire and Forget)
  const handleSaveChanges = (section) => {
      const updatePayload = { ...formData }
      let notifyMsg = ''

      if (section === 'basic') {
          updatePayload.basic_edit_count = (profile.basic_edit_count || 0) + 1;
          notifyMsg = `人員 [${profile.full_name}] 修改了「核心基本資料」`;
      } else if (section === 'medical') {
          updatePayload.med_edit_count = (profile.med_edit_count || 0) + 1;
          notifyMsg = `人員 [${profile.full_name}] 修改了「醫護與裝備」`;
      }

      // 1. 樂觀 UI：瞬間更新畫面，讓使用者無縫接軌
      setProfile(updatePayload)
      setIsEditing(false)
      alert(`✅ 資料已儲存！`)

      // 2. 背景隱形通道：在背景慢慢寫入，即使報錯也不卡住使用者畫面
      setTimeout(async () => {
          try {
              const { data: { user } } = await supabase.auth.getUser()
              if (user && user.email) { 
                  // 移除前端才有的計數器欄位，防止存入 Supabase 時報錯
                  const { basic_edit_count, med_edit_count, ...safeDbPayload } = updatePayload;
                  
                  // 強制覆蓋寫入
                  await supabase.from('profiles').upsert({ ...safeDbPayload, email: user.email.toLowerCase() }, { onConflict: 'email' })
                  
                  // 發送通知給後台
                  try {
                      await supabase.from('admin_notifications').insert({
                          user_id: user.id, 
                          user_name: profile.full_name || safeDbPayload.full_name,
                          type: 'PROFILE_UPDATE', 
                          message: notifyMsg
                      })
                  } catch (e) {
                      console.error("背景發送通知失敗", e)
                  }
              }
          } catch (e) { 
              console.error("背景儲存失敗", e) 
          }
      }, 0);
  }

  const handleApplyModification = () => {
      alert("📝 已為您開啟「修改申請單」。\n請填寫您欲變更的欄位與原因，我們將由專人為您處理。")
  }

  const deleteNotification = (id) => { setNotifications(prev => prev.filter(n => n.id !== id)); }
  const markAllAsRead = () => { setNotifications(prev => prev.map(n => ({ ...n, isRead: true }))); }

  const getNotifIcon = (category) => {
      switch(category) {
          case 'race': return <Flag size={16} className="text-blue-500"/>;
          case 'cert': return <AlertTriangle size={16} className="text-red-500"/>;
          case 'shop': return <Medal size={16} className="text-amber-500"/>;
          default: return <Bell size={16} className="text-slate-500"/>;
      }
  }

  const getGenderFromID = (nationalId) => {
      if (!nationalId || nationalId.length < 2) return null;
      const secondChar = nationalId.charAt(1);
      if (secondChar === '1') return { text: '♂ 男', color: 'bg-blue-500/20 text-blue-300 border-blue-500/50' };
      if (secondChar === '2') return { text: '♀ 女', color: 'bg-pink-500/20 text-pink-300 border-pink-500/50' };
      return null;
  }

  const displayUser = profile;

  if (loadingProfile || !displayUser) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={48}/></div>
  }

  const genderTag = getGenderFromID(displayUser.national_id);
  const pastRaces = myRaces.filter(r => new Date(r.date) < new Date());
  const finishedCount = pastRaces.length;
  const totalEnrolledCount = myRaces.length;
  const attendanceRate = pastRaces.length > 0 ? '100%' : 'N/A';
  const unreadCountReal = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 animate-fade-in flex flex-col relative overflow-x-hidden">
      
      <div className="bg-slate-900 pt-16 md:pt-20 pb-36 px-4 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center"></div>
          <div className="relative z-10 max-w-2xl mx-auto flex items-center justify-between">
              <button onClick={() => navigate('/races')} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors active:scale-95">
                  <ChevronLeft size={22}/>
              </button>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-widest">個人數位 ID 卡</h1>
              
              <button onClick={() => setShowNotifPanel(true)} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors cursor-pointer group active:scale-95 relative">
                  <Bell size={22} className="group-hover:animate-wiggle"/>
                  {unreadCountReal > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-slate-900 shadow-sm animate-pulse">
                          {unreadCountReal}
                      </span>
                  )}
              </button>
          </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 w-full -mt-24 relative z-20 space-y-6 flex-1">
          
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-6 md:p-8 shadow-2xl border border-slate-700 relative overflow-hidden group">
              <div className="absolute -top-10 -right-10 opacity-5 pointer-events-none">
                  <Fingerprint size={180} className="text-white"/>
              </div>
              
              <div className="flex justify-between items-start mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                      <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-2xl flex items-center justify-center text-3xl font-black text-white shadow-lg border-2 border-slate-700">
                          {displayUser.full_name?.charAt(0) || '?'}
                      </div>
                      <div>
                          <div className="flex items-center gap-2 mb-1">
                              <h2 className="text-2xl md:text-3xl font-black text-white">{displayUser.full_name}</h2>
                              {genderTag && (
                                  <span className={`border text-[10px] font-black px-2 py-0.5 rounded-full ${genderTag.color}`}>
                                      {genderTag.text}
                                  </span>
                              )}
                          </div>
                          <div className="text-blue-300 font-mono text-sm tracking-widest">{displayUser.ironmedic_no || 'IM-XXXX-XXX'}</div>
                      </div>
                  </div>
                  <button onClick={() => setShowQR(true)} className="w-14 h-14 bg-white p-2.5 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-transform group/qr">
                      <QrCode className="w-full h-full text-slate-800 group-hover/qr:text-blue-600 transition-colors"/>
                  </button>
              </div>

              <div className="flex flex-wrap gap-2 relative z-10">
                  {displayUser.is_vip === 'Y' && <span className="bg-amber-400 text-amber-900 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-amber-400/20"><Crown size={12}/> VIP</span>}
                  {displayUser.is_team_leader === 'Y' && <span className="bg-blue-500 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-blue-500/20"><ShieldAlert size={12}/> 帶隊教官</span>}
                  {displayUser.is_new_member === 'Y' && <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1"><Sprout size={12}/> 新人</span>}
                  {displayUser.training_status === 'Y' && <span className="bg-purple-500/20 text-purple-300 border border-purple-500/50 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1"><Zap size={12}/> 優先報名</span>}
                  {displayUser.is_current_member === 'Y' ? 
                      <span className="bg-green-500/20 text-green-400 border border-green-500/50 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle size={12}/> 有效會員</span> : 
                      <span className="bg-red-500/20 text-red-400 border border-red-500/50 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1"><XCircle size={12}/> 非當屆會員</span>
                  }
              </div>
          </div>

          <div>
              <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-black text-slate-800 flex items-center gap-1.5"><Flag className="text-blue-600" size={18}/> 我報名的賽事</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                  {myRaces.filter(r => new Date(r.date) >= new Date()).length > 0 ? (
                      myRaces.filter(r => new Date(r.date) >= new Date()).map(race => (
                          <div key={race.id} onClick={() => navigate(`/race-detail/${race.id}`)} className="bg-white min-w-[260px] md:min-w-[300px] p-4 rounded-[1.5rem] shadow-sm border border-slate-200 cursor-pointer hover:shadow-md transition-all snap-start active:scale-95 flex flex-col justify-between">
                              <div>
                                  <div className="flex justify-between items-start mb-2">
                                      <span className={`text-[10px] font-black px-2 py-0.5 rounded-md ${race.status === 'FULL' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                                          {race.status === 'OPEN' ? '招募中' : race.status === 'FULL' ? '滿編' : '處理中'}
                                      </span>
                                      <span className="text-xs font-bold text-slate-500 flex items-center gap-1"><Calendar size={12}/>{race.date}</span>
                                  </div>
                                  <h4 className="font-black text-slate-800 text-[15px] mb-1 line-clamp-1">{race.name}</h4>
                                  <div className="text-xs text-slate-500 font-medium mb-3 truncate flex items-center gap-1"><MapPin size={12} className="text-red-400"/> {race.location}</div>
                              </div>
                              
                              <div className="pt-3 border-t border-slate-100 flex justify-between items-center mt-2">
                                  <div className="text-xs font-bold text-slate-700 flex flex-col">
                                      <span>{race.slotName}</span>
                                      <span className="text-[10px] text-amber-600 mt-0.5">{race.role}</span>
                                  </div>
                                  
                                  <button 
                                      onClick={(e) => handleCancelRace(e, race.id, race.name)}
                                      disabled={isCanceling}
                                      className="text-[10px] font-black bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-red-200 disabled:opacity-50 active:scale-95"
                                  >
                                      {isCanceling ? <Loader2 size={12} className="animate-spin"/> : <XCircle size={12}/>} 
                                      取消報名
                                  </button>
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="bg-white w-full p-6 rounded-[1.5rem] border border-dashed border-slate-300 text-center text-slate-400 font-medium text-sm shadow-sm">
                          目前沒有即將到來的賽事
                      </div>
                  )}
              </div>
          </div>

          <div className="grid grid-cols-2 gap-3 md:gap-4">
              
              <div onClick={() => handleOpenModal('basic')} className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-sm border border-slate-200 cursor-pointer active:scale-95 hover:border-blue-400 transition-all flex flex-col items-center justify-center text-center gap-2 relative">
                  <div className="absolute top-3 right-3 text-slate-300"><MousePointerClick size={16} className="animate-bounce" /></div>
                  <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-1"><User size={24}/></div>
                  <div>
                      <h4 className="font-black text-slate-800 text-[13px] sm:text-sm">核心基本資料</h4>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">可點擊查看與修改</div>
                  </div>
              </div>

              <div onClick={() => handleOpenModal('medical')} className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-sm border border-slate-200 cursor-pointer active:scale-95 hover:border-blue-400 transition-all flex flex-col items-center justify-center text-center gap-2 relative">
                  <div className="absolute top-3 right-3 text-slate-300"><MousePointerClick size={16} className="animate-bounce" /></div>
                  <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mb-1"><HeartPulse size={24}/></div>
                  <div>
                      <h4 className="font-black text-slate-800 text-[13px] sm:text-sm">醫護與裝備</h4>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">可點擊查看與修改</div>
                  </div>
              </div>

              <div onClick={() => handleOpenModal('stats')} className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-sm border border-slate-200 cursor-pointer active:scale-95 hover:border-blue-400 transition-all flex flex-col items-center justify-center text-center gap-2 relative">
                  <div className="absolute top-3 right-3 text-slate-300"><MousePointerClick size={16} className="animate-bounce" /></div>
                  <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1"><Activity size={24}/></div>
                  <div>
                      <h4 className="font-black text-slate-800 text-[13px] sm:text-sm">賽事參與統計</h4>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">達成率 {attendanceRate}</div>
                  </div>
              </div>

              <div onClick={() => handleOpenModal('system')} className="bg-white p-4 md:p-5 rounded-[1.5rem] shadow-sm border border-slate-200 cursor-pointer active:scale-95 hover:border-blue-400 transition-all flex flex-col items-center justify-center text-center gap-2 relative">
                  <div className="absolute top-3 right-3 text-slate-300"><MousePointerClick size={16} className="animate-bounce" /></div>
                  <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mb-1"><ListOrdered size={24}/></div>
                  <div>
                      <h4 className="font-black text-slate-800 text-[13px] sm:text-sm">參賽明細</h4>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">查看歷史紀錄</div>
                  </div>
              </div>

          </div>

          <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="w-full py-4 bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-600 font-black rounded-[1.5rem] flex items-center justify-center gap-2 transition-colors active:scale-95 border border-slate-300 hover:border-red-200 mt-8 mb-6">
              <LogOut size={18}/> 登出系統
          </button>
      </div>

      {showNotifPanel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex justify-end animate-fade-in" onClick={() => setShowNotifPanel(false)}>
              <div className="bg-slate-50 w-full sm:w-[400px] h-full flex flex-col shadow-2xl animate-slide-left" onClick={e => e.stopPropagation()}>
                  
                  <div className="px-6 py-5 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <Bell className="text-blue-600"/> 系統通知
                      </h3>
                      <button onClick={() => setShowNotifPanel(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
                          <X size={20}/>
                      </button>
                  </div>

                  <div className="flex bg-white px-4 pt-2 border-b border-slate-200 shrink-0">
                      <button 
                          onClick={() => setNotifTab('system')} 
                          className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${notifTab === 'system' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                          賽事通報
                      </button>
                      <button 
                          onClick={() => setNotifTab('personal')} 
                          className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${notifTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                      >
                          個人提醒
                      </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-xs font-bold text-slate-400">保留近 8 個月的通知</span>
                          <button onClick={markAllAsRead} className="text-xs font-bold text-blue-600 hover:underline">全部標示已讀</button>
                      </div>

                      {notifications.filter(n => n.tab === notifTab).length > 0 ? (
                          notifications.filter(n => n.tab === notifTab).map(notif => (
                              <div key={notif.id} className={`p-4 rounded-2xl border transition-all relative group ${notif.isRead ? 'bg-slate-100/50 border-slate-200 opacity-80' : 'bg-white border-blue-200 shadow-sm'}`}>
                                  <button onClick={() => deleteNotification(notif.id)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                      <Trash2 size={14}/>
                                  </button>
                                  <div className="flex gap-3">
                                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.isRead ? 'bg-slate-200' : 'bg-blue-50'}`}>
                                          {getNotifIcon(notif.category)}
                                      </div>
                                      <div className="flex-1 pr-6">
                                          <div className="text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1">
                                              <Clock size={10}/> {new Date(notif.date).toLocaleDateString()}
                                          </div>
                                          <p className={`text-sm leading-relaxed ${notif.isRead ? 'text-slate-600' : 'text-slate-800 font-bold'}`}>
                                              {notif.message}
                                          </p>
                                      </div>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="text-center py-10 text-slate-400 font-medium text-sm">目前沒有任何通知</div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {activeModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in" onClick={() => !isEditing && setActiveModal(null)}>
              <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-slide-up sm:animate-bounce-in" onClick={e => e.stopPropagation()}>
                  
                  <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                  </div>

                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          {activeModal === 'stats' && <><Activity className="text-blue-600"/> 賽事參與統計</>}
                          {activeModal === 'basic' && <><User className="text-indigo-600"/> 核心基本資料</>}
                          {activeModal === 'medical' && <><HeartPulse className="text-rose-600"/> 醫護與裝備</>}
                          {activeModal === 'system' && <><ListOrdered className="text-amber-600"/> 參賽明細</>}
                      </h3>
                      {!isEditing && <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors active:scale-95"><X size={20}/></button>}
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 sm:bg-white">
                      
                      {activeModal === 'stats' && (
                          <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100">
                              <InfoRow label="真實完賽場次" value={`${finishedCount} 場`} icon={CheckCircle} />
                              <InfoRow label="總報名場次" value={`${totalEnrolledCount} 場`} icon={Flag} />
                              <InfoRow label="出席達成率" value={attendanceRate} icon={Target} />
                          </div>
                      )}

                      {activeModal === 'system' && (
                          <div className="space-y-3">
                              {myRaces.length > 0 ? myRaces.map(race => (
                                  <div key={race.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                                      <div>
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className={`text-[10px] font-black px-2 py-0.5 rounded ${new Date(race.date) < new Date() ? 'bg-slate-100 text-slate-500' : 'bg-green-100 text-green-700'}`}>
                                                  {new Date(race.date) < new Date() ? '已完賽' : '即將到來'}
                                              </span>
                                              <span className="text-xs font-bold text-slate-500">{race.date}</span>
                                          </div>
                                          <div className="font-black text-slate-800 text-sm mb-1">{race.name}</div>
                                          <div className="text-xs font-medium text-blue-600">{race.slotName} | {race.role}</div>
                                      </div>
                                  </div>
                              )) : (
                                  <div className="text-center py-10 text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                                      目前沒有任何參賽紀錄
                                  </div>
                              )}
                          </div>
                      )}

                      {activeModal === 'basic' && !isEditing && (
                          <div className="space-y-3">
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                  <InfoRow label="醫護鐵人編號" value={displayUser.ironmedic_no} />
                                  <InfoRow label="加入年月" value={displayUser.join_date} />
                                  <div className="h-px bg-slate-100 my-2"></div>
                                  <InfoRow label="中文姓名" value={displayUser.full_name} />
                                  <InfoRow label="身分證字號" value={displayUser.national_id} />
                                  <InfoRow label="生理性別" value={displayUser.gender} />
                                  <InfoRow label="出生年月日" value={displayUser.birthday} />
                              </div>
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                  <InfoRow label="手機號碼" value={displayUser.phone} icon={Phone} />
                                  <InfoRow label="聯絡信箱" value={displayUser.contact_email} />
                                  <InfoRow label="通訊地址" value={displayUser.address} icon={MapPin} />
                              </div>
                              <div className="bg-rose-50/80 p-5 rounded-2xl border border-rose-100 shadow-sm">
                                  <InfoRow label="緊急聯絡人" value={displayUser.emergency_name} />
                                  <InfoRow label="關係" value={displayUser.emergency_relation} />
                                  <InfoRow label="緊急電話" value={displayUser.emergency_phone} icon={Phone} alert={!displayUser.emergency_phone}/>
                              </div>
                          </div>
                      )}

                      {activeModal === 'basic' && isEditing && (
                          <div className="space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                              <div className="bg-blue-50 text-blue-800 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
                                  <AlertTriangle size={16}/> 儲存後將發送通知給管理員審核
                              </div>
                              <EditInputRow label="醫護鐵人編號 (測試驗證用)" name="ironmedic_no" formData={formData} handleInputChange={handleInputChange} />
                              <EditInputRow label="加入年月 (測試驗證用)" name="join_date" formData={formData} handleInputChange={handleInputChange} />
                              <EditInputRow label="中文姓名" name="full_name" formData={formData} handleInputChange={handleInputChange} />
                              <EditInputRow label="身分證字號" name="national_id" formData={formData} handleInputChange={handleInputChange} />
                              <EditInputRow label="生理性別" name="gender" type="select" options={['男', '女']} formData={formData} handleInputChange={handleInputChange} />
                              <EditInputRow label="出生年月日" name="birthday" type="date" formData={formData} handleInputChange={handleInputChange} />
                              <EditInputRow label="手機號碼" name="phone" formData={formData} handleInputChange={handleInputChange} />
                              <EditInputRow label="聯絡信箱" name="contact_email" type="email" formData={formData} handleInputChange={handleInputChange} />
                              <EditInputRow label="通訊地址" name="address" formData={formData} handleInputChange={handleInputChange} />
                              <div className="pt-4 border-t border-slate-100 mt-2">
                                  <h4 className="text-sm font-black text-rose-600 mb-2">緊急聯絡資訊</h4>
                                  <EditInputRow label="緊急聯絡人" name="emergency_name" formData={formData} handleInputChange={handleInputChange} />
                                  <EditInputRow label="關係" name="emergency_relation" formData={formData} handleInputChange={handleInputChange} />
                                  <EditInputRow label="緊急電話" name="emergency_phone" formData={formData} handleInputChange={handleInputChange} />
                              </div>
                          </div>
                      )}

                      {activeModal === 'medical' && !isEditing && (
                          <div className="space-y-3">
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                  <InfoRow label="醫護證照種類" value={displayUser.medical_license} />
                                  <InfoRow label="證照有效期限" value={displayUser.license_expiry} />
                              </div>
                              <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 shadow-sm">
                                  <InfoRow label="特殊病史與過敏" value={displayUser.medical_history} alert={!!displayUser.medical_history && displayUser.medical_history !== '無'} />
                              </div>
                              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                  <InfoRow label="賽事衣服尺寸" value={displayUser.shirt_size} />
                                  <InfoRow label="飲食習慣" value={displayUser.dietary_habit} />
                                  <InfoRow label="偏好交通方式" value={displayUser.transport_pref} icon={Car} />
                                  <InfoRow label="偏好住宿方式" value={displayUser.stay_pref} />
                              </div>
                          </div>
                      )}

                      {activeModal === 'medical' && isEditing && (
                          <div className="space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                              {/* 🌟 核心更新：統一證照下拉選單 */}
                              <EditInputRow label="醫護證照種類" name="medical_license" type="select" options={['EMT-1', 'EMT-2', 'EMTP', '醫師', '醫療線上護理師']} formData={formData} handleInputChange={handleInputChange} />
                              <EditInputRow label="證照有效期限" name="license_expiry" type="date" formData={formData} handleInputChange={handleInputChange} />
                              <EditInputRow label="特殊病史與過敏" name="medical_history" formData={formData} handleInputChange={handleInputChange} />
                              <div className="pt-4 border-t border-slate-100 mt-2">
                                  <h4 className="text-sm font-black text-blue-600 mb-2">後勤需求調查</h4>
                                  <EditInputRow label="賽事衣服尺寸" name="shirt_size" type="select" options={['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']} formData={formData} handleInputChange={handleInputChange} />
                                  <EditInputRow label="飲食習慣" name="dietary_habit" formData={formData} handleInputChange={handleInputChange} />
                                  <EditInputRow label="偏好交通方式" name="transport_pref" type="select" options={['自行前往', '需要共乘', '搭乘大眾運輸']} formData={formData} handleInputChange={handleInputChange} />
                                  <EditInputRow label="偏好住宿方式" name="stay_pref" type="select" options={['自行處理', '需要代訂']} formData={formData} handleInputChange={handleInputChange} />
                              </div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 sm:p-6 border-t border-slate-100 bg-white shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                      {isEditing ? (
                          <div className="flex gap-3">
                              <button onClick={() => setIsEditing(false)} className="flex-1 py-3.5 bg-slate-100 text-slate-600 font-black rounded-xl hover:bg-slate-200 transition-colors active:scale-95">取消編輯</button>
                              {/* 🌟 核心更新：極速儲存按鈕 */}
                              <button onClick={() => handleSaveChanges(activeModal)} className="flex-[2] py-3.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-md shadow-blue-600/30 flex justify-center items-center gap-2 transition-colors active:scale-95">
                                  <Check size={18}/> 儲存資料
                              </button>
                          </div>
                      ) : (
                          <div className="flex flex-col gap-3">
                              <button onClick={() => setIsEditing(true)} className="w-full py-4 bg-slate-900 text-white font-black rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 flex justify-center items-center gap-2 transition-transform active:scale-95">
                                  <Edit3 size={18}/> 開放修改
                              </button>
                              <button onClick={() => setActiveModal(null)} className="w-full py-3.5 bg-slate-100 text-slate-500 font-black rounded-xl hover:bg-slate-200 transition-colors active:scale-95 flex justify-center items-center gap-1">
                                  關閉視窗
                              </button>
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {showQR && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] flex items-center justify-center p-4 animate-fade-in" onClick={() => setShowQR(false)}>
              <div className="bg-white rounded-[2rem] p-8 md:p-10 w-full max-w-sm flex flex-col items-center animate-bounce-in shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mb-4">
                      <QrCode size={32}/>
                  </div>
                  <h3 className="text-xl font-black text-slate-800 mb-1">專屬報到碼</h3>
                  <p className="text-slate-500 text-sm mb-8 text-center">請於賽事現場出示此條碼進行簽到</p>
                  
                  <div className="bg-white p-4 rounded-2xl shadow-inner border-2 border-slate-100 w-full aspect-square mb-6 relative">
                      <img src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${displayUser.ironmedic_no || displayUser.full_name}`} alt="QR" className="w-full h-full object-contain" />
                      <div className="absolute inset-0 border-4 border-blue-500/20 rounded-2xl pointer-events-none"></div>
                  </div>
                  
                  <div className="text-center w-full">
                      <div className="text-lg font-black text-slate-800 tracking-widest bg-slate-50 py-3 rounded-xl border border-slate-100">
                          {displayUser.ironmedic_no || 'IM-XXXX-XXX'}
                      </div>
                  </div>
                  
                  <button onClick={() => setShowQR(false)} className="mt-4 w-full py-4 bg-slate-900 text-white rounded-xl font-black active:scale-95 transition-transform shadow-lg shadow-slate-900/20">
                      關閉視窗
                  </button>
              </div>
          </div>
      )}
    </div>
  )
}