import { useState, useEffect, useRef } from 'react'
import { 
    Medal, Calendar, ShieldCheck, AlertTriangle, Clock, MapPin, ChevronRight, ChevronLeft, 
    Activity, Crown, Sprout, Loader2, CreditCard, LogOut, QrCode, CheckCircle, 
    XCircle, ShieldAlert, Bell, X, Flag, User, Phone, HeartPulse, Shirt, Car, 
    Award, Fingerprint, Target, MousePointerClick, Edit3, Send, Check, Save, 
    ListOrdered, Trash2, Zap
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

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

// 🌟 欄位中文翻譯對照表
const FIELD_NAMES_MAP = {
    full_name: '中文姓名', english_name: '英文姓名', national_id: '身分證字號',
    gender: '生理性別', birthday: '出生年月日', phone: '手機號碼',
    contact_email: '聯絡信箱', address: '通訊地址', emergency_name: '緊急聯絡人',
    emergency_relation: '關係', emergency_phone: '緊急電話',
    medical_license: '醫護證照種類', license_expiry: '證照有效期限',
    blood_type: '血型', shirt_size: '賽事衣服尺寸', medical_history: '特殊病史註記',
    transport_pref: '交通需求', stay_pref: '住宿安排'
};

export default function DigitalID() {
  const navigate = useNavigate()
  const [showQR, setShowQR] = useState(false)
  
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifTab, setNotifTab] = useState('system') 
  const [notifications, setNotifications] = useState([])
  
  const [profile, setProfile] = useState(null)
  const [myRaces, setMyRaces] = useState([]) 
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [isCanceling, setIsCanceling] = useState(false)

  const [activeModal, setActiveModal] = useState(null) 
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const [saving, setSaving] = useState(false)

  const notifChannelRef = useRef(null)

  useEffect(() => {
    fetchData();
    return () => {
        if (notifChannelRef.current) supabase.removeChannel(notifChannelRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 🌟 雙引擎抓取個人與全域通報
  const fetchNotifs = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: pData } = await supabase.from('user_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
          let allNotifs = pData ? pData.map(n => ({...n, date: n.created_at})) : [];

          const { data: prof } = await supabase.from('profiles').select('role').eq('email', user.email).maybeSingle();
          const isAdmin = prof && ['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'RACE_ADMIN', 'ADMIN', '管理員', '總監'].some(r => (prof.role || '').toUpperCase().includes(r));

          if (isAdmin) {
              const { data: aData } = await supabase.from('admin_notifications').select('*').order('created_at', { ascending: false }).limit(50);
              if (aData) {
                  const adminMapped = aData.map(n => ({
                      id: `admin_${n.id}`, 
                      user_id: user.id, 
                      tab: 'system',
                      category: 'bell',
                      message: n.message,
                      date: n.created_at,
                      is_read: n.is_read || false 
                  }));
                  allNotifs = [...allNotifs, ...adminMapped].sort((a,b) => new Date(b.date) - new Date(a.date));
              }
          }
          setNotifications(allNotifs);

          // Realtime 監聽
          const channel = supabase.channel('digital-id-notifs')
              .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` }, () => { fetchNotifs(); })
              .subscribe()
          notifChannelRef.current = channel;
      } catch (e) { console.log('通知載入異常', e) }
  }

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
        await fetchNotifs();
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
          let usedPass = false; 

          updatedWaitlist = updatedWaitlist.filter(w => {
              if (w.id === profile.id || w.name === profile.full_name) {
                  if (w.usedPass) usedPass = true;
                  return false;
              }
              return true;
          });

          updatedSlots = updatedSlots.map(s => {
              if (s.assignee) {
                  const assigneesArray = s.assignee.split('|').map(str => {
                      try { return JSON.parse(str); } catch(e) { return { id: str, name: str, isLegacy: true }; }
                  });
                  
                  const initialLength = assigneesArray.length;
                  const newAssigneesArray = assigneesArray.filter(p => {
                      if (p.id === profile.id || p.name === profile.full_name) {
                          if (p.usedPass) usedPass = true;
                          return false;
                      }
                      return true;
                  });
                  
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
          
          if (usedPass) {
              const restoredPasses = Math.min(3, (profile.newbie_passes ?? 3) + 1);
              await supabase.from('profiles').update({ newbie_passes: restoredPasses }).eq('id', profile.id);
              setProfile(prev => ({ ...prev, newbie_passes: restoredPasses }));
          }

          try {
              if (profile && profile.id && profile.id !== 'unknown') {
                  const { error: notifError } = await supabase.from('user_notifications').insert({
                      user_id: profile.id,
                      tab: 'personal',
                      category: 'race',
                      message: `您已成功取消報名【${raceName}】，名額已釋出。${usedPass ? '(已退還 1 次新人優先報名權利)' : ''}`,
                      is_read: false
                  })
                  if (notifError) console.error("通知寫入失敗:", notifError);
              }
          } catch(e) { console.error("發送退賽通知異常", e); }

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

  const generateDiffMessage = (oldData, newData, section) => {
      let changes = [];
      const keysToCheck = section === 'basic' 
          ? ['full_name', 'english_name', 'national_id', 'gender', 'birthday', 'phone', 'contact_email', 'address', 'emergency_name', 'emergency_relation', 'emergency_phone']
          : ['medical_license', 'license_expiry', 'blood_type', 'shirt_size', 'medical_history', 'transport_pref', 'stay_pref'];
      
      keysToCheck.forEach(key => {
          const oldVal = String(oldData[key] || '').trim();
          const newVal = String(newData[key] || '').trim();
          if (oldVal !== newVal) {
              const displayOld = oldVal === '' ? '(空)' : oldVal;
              const displayNew = newVal === '' ? '(空)' : newVal;
              changes.push(`[${FIELD_NAMES_MAP[key] || key}] ${displayOld} ➔ ${displayNew}`);
          }
      });
      return changes.length > 0 ? `\n\n📝 異動明細：\n${changes.join('\n')}` : '';
  };

  const handleSaveChanges = async (section) => {
      setSaving(true)
      try {
          const updatePayload = { ...formData }
          let sectionName = section === 'basic' ? '核心基本資料' : '醫護與裝備';

          const diffString = generateDiffMessage(profile, formData, section);

          const { data: { user } } = await supabase.auth.getUser()
          
          if (user && user.email) { 
              let adminNotifyMsg = `[🔒 僅管理員可見] 人員 [${profile.full_name}] (ID: ${user.id}) 申請修改「${sectionName}」${diffString}`;
              if (!diffString) adminNotifyMsg += `\n(系統未偵測到實質欄位變更)`;

              let personalNotifyMsg = `您的「${sectionName}」已成功更新並送出審核。${diffString ? diffString : ''}`;

              if (section === 'basic') updatePayload.basic_edit_count = (profile.basic_edit_count || 0) + 1;
              else if (section === 'medical') updatePayload.med_edit_count = (profile.med_edit_count || 0) + 1;

              const { basic_edit_count, med_edit_count, ...safeDbPayload } = updatePayload;

              const { error: upsertError } = await supabase.from('profiles').upsert({ ...safeDbPayload, email: user.email.toLowerCase() }, { onConflict: 'email' })
              if (upsertError) throw upsertError;

              try {
                  const { data: adminProfiles } = await supabase.from('profiles').select('id, role');
                  const admins = (adminProfiles || []).filter(p => {
                      const r = (p.role || '').toUpperCase();
                      return ['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'RACE_ADMIN', 'ADMIN', '賽事總監', '系統管理員', '管理員'].some(k => r.includes(k));
                  });
                  
                  if (admins && admins.length > 0) {
                      const adminNotifs = admins.map(a => ({
                          user_id: a.id,
                          tab: 'system',
                          category: 'bell',
                          message: adminNotifyMsg,
                          is_read: false
                      }));
                      await supabase.from('user_notifications').insert(adminNotifs);
                  }
                  
                  try {
                      await supabase.from('admin_notifications').insert({
                          user_id: user.id, 
                          user_name: profile.full_name || safeDbPayload.full_name,
                          type: 'PROFILE_UPDATE', 
                          message: adminNotifyMsg
                      });
                  } catch (e) { /* 若表不存在則略過 */ }

                  await supabase.from('user_notifications').insert({
                      user_id: user.id,
                      tab: 'personal',
                      category: 'bell',
                      message: personalNotifyMsg,
                      is_read: false
                  });
              } catch (e) {
                  console.error("發送通知失敗", e)
              }
          }

          setProfile(updatePayload)
          setIsEditing(false)
          alert(`✅ 資料更新成功！\n系統已發送詳細修改通知給超級管理員。`)

      } catch (error) {
          alert('儲存失敗：' + error.message)
      } finally {
          setSaving(false)
      }
  }

  const deleteNotification = async (id) => { 
      setNotifications(prev => prev.filter(n => n.id !== id)); 
      try { 
          if (String(id).startsWith('admin_')) {
              await supabase.from('admin_notifications').delete().eq('id', id.replace('admin_', ''));
          } else {
              await supabase.from('user_notifications').delete().eq('id', id);
          }
      } catch(e){}
  }
  
  // 🌟 已讀分流與記憶儲存引擎
  const markAllAsRead = async () => {
      setNotifications(prev => {
          return prev.map(n => {
              if (notifTab === 'personal' && n.tab === 'personal') return { ...n, is_read: true, isRead: true };
              if (notifTab === 'system' && n.tab !== 'personal') return { ...n, is_read: true, isRead: true };
              return n;
          });
      });

      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
              if (notifTab === 'personal') {
                  await supabase.from('user_notifications')
                      .update({ is_read: true })
                      .eq('user_id', user.id)
                      .eq('tab', 'personal')
                      .eq('is_read', false);
              } else {
                  await supabase.from('user_notifications')
                      .update({ is_read: true })
                      .eq('user_id', user.id)
                      .neq('tab', 'personal')
                      .eq('is_read', false);
                  
                  const isAdmin = profile && ['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'RACE_ADMIN', 'ADMIN', '管理員', '總監'].some(r => (profile.role || '').toUpperCase().includes(r));
                  if (isAdmin) {
                       await supabase.from('admin_notifications')
                           .update({ is_read: true })
                           .eq('is_read', false);
                  }
              }
          }
      } catch(e){ console.error('標示已讀失敗:', e) }
  }

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

  // 🌟 補回缺失的 UI 工具函數
  const getInitials = (name) => {
      if (!name) return 'IM';
      return name.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '').substring(0, 2).toUpperCase();
  }

  const getStatusBadge = () => {
      if (profile?.is_current_member === 'Y') return <div className="flex items-center gap-1.5 bg-green-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[11px] font-black border border-green-400 shadow-sm"><CheckCircle size={14}/> 本屆有效會員</div>
      return <div className="flex items-center gap-1.5 bg-red-500/90 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[11px] font-black border border-red-400 shadow-sm"><XCircle size={14}/> 權限不足/非當屆</div>
  }

  const getRoleBadge = () => {
      const role = profile?.role || 'USER'
      if (['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'RACE_ADMIN', 'ADMIN'].includes(role)) return <span className="bg-indigo-600 text-white text-[10px] px-2 py-0.5 rounded font-black border border-indigo-400 flex items-center gap-1 shadow-sm"><ShieldAlert size={10}/> 系統管理員</span>
      if (profile?.is_vip === 'Y') return <span className="bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded font-black border border-amber-300 flex items-center gap-1 shadow-sm"><Crown size={10}/> 核心 VIP</span>
      if (profile?.is_team_leader === 'Y') return <span className="bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded font-black border border-blue-400 flex items-center gap-1 shadow-sm"><Flag size={10}/> 帶隊教官</span>
      if (profile?.is_new_member === 'Y') return <span className="bg-emerald-500 text-white text-[10px] px-2 py-0.5 rounded font-black border border-emerald-400 flex items-center gap-1 shadow-sm"><Sprout size={10}/> 當屆新人</span>
      return <span className="bg-slate-200 text-slate-600 text-[10px] px-2 py-0.5 rounded font-black border border-slate-300 flex items-center gap-1 shadow-sm"><Activity size={10}/> 醫護鐵人</span>
  }

  const isLicenseValid = () => {
      if (!profile?.license_expiry) return false
      const expiry = new Date(profile.license_expiry)
      return expiry > new Date()
  }

  const displayUser = profile;

  if (loadingProfile || !displayUser) {
      return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-500" size={48}/></div>
  }

  const genderTag = getGenderFromID(displayUser.national_id);
  const today = new Date();
  today.setHours(0,0,0,0);
  const pastRaces = myRaces.filter(r => new Date(r.date) < today);
  
  const futureRaces = myRaces.filter(r => new Date(r.date) >= today);

  const finishedCount = pastRaces.length;
  const totalEnrolledCount = myRaces.length;
  const attendanceRate = pastRaces.length > 0 ? '100%' : 'N/A';
  
  const unreadCountReal = notifications.filter(n => !(n.isRead || n.is_read)).length;

  const hasTrainingStatus = ['Y', 'y', 'true', true, '1', 1].includes(displayUser.training_status);

  const detailedRaces = [...pastRaces].sort((a,b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 animate-fade-in flex flex-col relative overflow-x-hidden">
      
      <div className="bg-slate-900 pt-16 md:pt-20 pb-36 px-4 relative overflow-hidden shrink-0">
          <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center"></div>
          <div className="relative z-10 max-w-2xl mx-auto flex items-center justify-between">
              <button onClick={() => navigate('/races')} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors active:scale-95">
                  <ChevronLeft size={22}/>
              </button>
              <h1 className="text-xl md:text-2xl font-black text-white tracking-widest">個人數位 ID 卡</h1>
              
              <button onClick={() => { fetchNotifs(); setShowNotifPanel(true); }} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-full text-white backdrop-blur-sm transition-colors cursor-pointer group active:scale-95 relative">
                  <Bell size={22} className="group-hover:animate-wiggle"/>
                  {unreadCountReal > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white border-2 border-slate-900 shadow-sm animate-pulse">
                          {unreadCountReal > 99 ? '99+' : unreadCountReal}
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
                          {getInitials(profile.full_name)}
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
                  
                  {displayUser.is_new_member === 'Y' && (
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1">
                          <Sprout size={12}/> 新人 (額度: {displayUser.newbie_passes ?? 3})
                      </span>
                  )}
                  
                  {hasTrainingStatus && (
                      <span className="bg-purple-500 text-white text-xs font-black px-3 py-1 rounded-full flex items-center gap-1 shadow-lg shadow-purple-500/30">
                          <Zap size={12} className="text-purple-100"/> 當屆訓練
                      </span>
                  )}
                  
                  {displayUser.is_current_member === 'Y' ? 
                      <span className="bg-green-500/20 text-green-400 border border-green-500/50 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1"><CheckCircle size={12}/> 有效會員</span> : 
                      <span className="bg-red-500/20 text-red-400 border border-red-500/50 text-xs font-black px-3 py-1 rounded-full flex items-center gap-1"><XCircle size={12}/> 非當屆會員</span>
                  }
              </div>
          </div>

          <div>
              <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-black text-slate-800 flex items-center gap-1.5"><Flag className="text-blue-600" size={18}/> 我報名的賽事 (當前任務)</h3>
              </div>
              <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar snap-x">
                  {futureRaces.length > 0 ? (
                      futureRaces.map(race => (
                          <div key={race.id} className="bg-white min-w-[260px] md:min-w-[300px] p-4 rounded-[1.5rem] shadow-sm border border-slate-200 hover:shadow-md transition-all snap-start flex flex-col justify-between">
                              <div onClick={() => navigate(`/race-detail/${race.id}`)} className="cursor-pointer active:scale-95 flex-1">
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
                                      className="text-[10px] font-black bg-red-50 hover:bg-red-100 text-red-600 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors border border-red-200 disabled:opacity-50 active:scale-95 z-10"
                                  >
                                      {isCanceling ? <Loader2 size={12} className="animate-spin"/> : <XCircle size={12}/>} 
                                      取消報名
                                  </button>
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="bg-white w-full p-6 rounded-[1.5rem] border border-dashed border-slate-300 text-center text-slate-400 font-medium text-sm shadow-sm">
                          目前沒有即將到來的賽事任務
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
                      <h4 className="font-black text-slate-800 text-[13px] sm:text-sm">參賽明細 (歷史紀錄)</h4>
                      <div className="text-[10px] font-bold text-slate-500 mt-0.5">已累積 {finishedCount} 場紀錄</div>
                  </div>
              </div>

          </div>

          <button onClick={async () => { await supabase.auth.signOut(); navigate('/login'); }} className="w-full py-4 bg-slate-200 hover:bg-red-100 text-slate-600 hover:text-red-600 font-black rounded-[1.5rem] flex items-center justify-center gap-2 transition-colors active:scale-95 border border-slate-300 hover:border-red-200 mt-8 mb-6">
              <LogOut size={18}/> 登出系統
          </button>
      </div>

      {/* 🌟 雷達連動通知面板 */}
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
                          notifications.filter(n => n.tab === notifTab).map(notif => {
                              const isItemRead = notif.isRead || notif.is_read;
                              return (
                              <div key={notif.id} 
                                   onClick={() => {
                                       const match = notif.message.match(/\(ID:\s*(.*?)\)/);
                                       if (match) {
                                           navigate(`/admin/members?view=ALL&targetId=${match[1]}`);
                                           setShowNotifPanel(false);
                                       }
                                   }}
                                   className={`p-4 rounded-2xl border transition-all relative group ${notif.message.includes('(ID:') ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : ''} ${isItemRead ? 'bg-slate-100/50 border-slate-200 opacity-80' : 'bg-white border-blue-200 shadow-sm'}`}>
                                  <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                      <Trash2 size={14}/>
                                  </button>
                                  <div className="flex gap-3">
                                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isItemRead ? 'bg-slate-200' : 'bg-blue-50'}`}>
                                          {getNotifIcon(notif.category)}
                                      </div>
                                      <div className="flex-1 pr-6">
                                          <div className="text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1">
                                              <Clock size={10}/> {new Date(notif.date).toLocaleDateString()}
                                          </div>
                                          <p className={`text-sm leading-relaxed whitespace-pre-wrap break-words ${isItemRead ? 'text-slate-600' : 'text-slate-800 font-bold'}`}>
                                              {notif.message}
                                          </p>
                                          {notif.message.includes('(ID:') && (
                                              <div className="mt-2 text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded inline-block">👆 點擊前往審核異動</div>
                                          )}
                                      </div>
                                  </div>
                              </div>
                          )})
                      ) : (
                          <div className="text-center py-10 text-slate-400 font-medium text-sm">目前沒有任何通知</div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {activeModal && (
          <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-end sm:items-center justify-center sm:p-4 animate-fade-in backdrop-blur-sm" onClick={() => !isEditing && setActiveModal(null)}>
              <div className="bg-white rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh] sm:max-h-[90vh] overflow-hidden animate-slide-up sm:animate-bounce-in" onClick={e => e.stopPropagation()}>
                  
                  <div className="w-full flex justify-center pt-3 pb-1 sm:hidden">
                      <div className="w-12 h-1.5 bg-slate-200 rounded-full"></div>
                  </div>

                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          {activeModal === 'stats' && <><Activity className="text-blue-600"/> 賽事參與統計</>}
                          {activeModal === 'basic' && <><User className="text-indigo-600"/> 核心基本資料</>}
                          {activeModal === 'medical' && <><HeartPulse className="text-rose-600"/> 醫護與裝備</>}
                          {activeModal === 'system' && <><ListOrdered className="text-amber-600"/> 參賽明細 (歷史紀錄)</>}
                      </h3>
                      {!isEditing && <button onClick={() => setActiveModal(null)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors active:scale-95"><X size={20}/></button>}
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 sm:bg-white">
                      
                      {activeModal === 'stats' && (
                          <div className="space-y-4 bg-white p-5 rounded-2xl border border-slate-100">
                              <InfoRow label="真實完賽場次" value={`${finishedCount} 場`} icon={CheckCircle} />
                              <InfoRow label="總報名場次" value={`${totalEnrolledCount} 場`} icon={Flag} />
                              <InfoRow label="出席達成率" value={attendanceRate} icon={Target} />
                              {displayUser.is_new_member === 'Y' && (
                                  <InfoRow label="新人優先登記額度" value={`剩餘 ${displayUser.newbie_passes ?? 3} 次`} icon={Sprout} />
                              )}
                          </div>
                      )}

                      {activeModal === 'system' && (
                          <div className="space-y-3">
                              {detailedRaces.length > 0 ? detailedRaces.map(race => (
                                  <div key={race.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:bg-slate-50 transition-colors">
                                      <div>
                                          <div className="flex items-center gap-2 mb-1">
                                              <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 text-slate-500">歷史紀錄</span>
                                              <span className="text-xs font-bold text-slate-500">{race.date}</span>
                                          </div>
                                          <div className="font-black text-slate-800 text-sm mb-1">{race.name}</div>
                                          <div className="text-xs font-medium text-slate-500">{race.slotName} | {race.role}</div>
                                      </div>
                                      <CheckCircle size={20} className="text-green-500 opacity-60"/>
                                  </div>
                              )) : (
                                  <div className="text-center py-10 text-slate-400 font-medium bg-white rounded-2xl border border-dashed border-slate-200">
                                      目前沒有任何過往參賽紀錄
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
                              <button onClick={() => handleSaveChanges(activeModal)} disabled={saving} className="flex-[2] py-3.5 bg-blue-600 text-white font-black rounded-xl hover:bg-blue-700 shadow-md shadow-blue-600/30 flex justify-center items-center gap-2 transition-colors disabled:opacity-50 active:scale-95">
                                  {saving ? <Loader2 className="animate-spin" size={18}/> : <Check size={18}/>} 儲存並發送通知
                              </button>
                          </div>
                      ) : activeModal === 'system' ? (
                          <button onClick={() => setActiveModal(null)} className="w-full py-4 bg-slate-100 text-slate-600 font-bold rounded-xl transition-colors active:scale-95 flex justify-center items-center gap-1">
                              <X size={16}/> 關閉歷史紀錄大賽
                          </button>
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

    </div>
  )
}