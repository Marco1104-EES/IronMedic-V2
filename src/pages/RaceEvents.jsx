import { useState, useEffect, useRef, useMemo } from 'react'
import { Calendar, MapPin, Users, Clock, ChevronRight, Activity, Flame, ShieldAlert, Timer, CheckCircle, X, Loader2, UsersRound, Crown, Sprout, Handshake, Send, Flag, Settings, Bell, ChevronDown, ChevronUp, Trash2, AlertTriangle, Medal, ServerCrash, Menu, User, Edit3, Zap, Plus, Save, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function RaceEvents() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('OPEN') 
  const [timeFilter, setTimeFilter] = useState('CURRENT_YEAR') 

  const [previewRace, setPreviewRace] = useState(null)
  
  // 🌟 上帝捷徑：快速編輯狀態
  const [quickEditRace, setQuickEditRace] = useState(null)
  const [isQuickSaving, setIsQuickSaving] = useState(false)
  const [insertForms, setInsertForms] = useState({})
  const [allMembers, setAllMembers] = useState([])

  const [userRole, setUserRole] = useState(() => localStorage.getItem('iron_medic_user_role') || 'USER') 
  const [currentUserProfile, setCurrentUserProfile] = useState(null)

  const [onlineCount, setOnlineCount] = useState(1) 
  const [newcomersOnline, setNewcomersOnline] = useState([])

  const [notifications, setNotifications] = useState([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifTab, setNotifTab] = useState('system')

  const [showStats, setShowStats] = useState(false)
  
  const [serverStatus, setServerStatus] = useState('checking') 
  const [serverLatency, setServerLatency] = useState(0)

  const [showAdminMenu, setShowAdminMenu] = useState(false) 

  const navigate = useNavigate()
  const CURRENT_YEAR = new Date().getFullYear()
  const channelRef = useRef(null)
  const notifChannelRef = useRef(null)
  const adminMenuRef = useRef(null)

  const ADMIN_ROLES = ['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'RACE_ADMIN', 'ADMIN', '賽事總監', '系統管理員', '管理員'];

  // 🌟 全局無塵室字串淨化解析器
  const parseAssignees = (assigneeString) => {
      if (!assigneeString || typeof assigneeString !== 'string') return [];
      const rawAssignees = assigneeString.split('|').filter(s => s.trim() !== '');
      return rawAssignees.map(item => {
          try {
              const obj = JSON.parse(item);
              if (obj && obj.name && String(obj.name).trim() !== '') return obj;
              return null;
          } catch (e) {
              const trimmed = item.trim();
              if (!trimmed) return null;
              return { id: trimmed, name: trimmed, timestamp: '舊資料匯入', isLegacy: true };
          }
      }).filter(Boolean);
  }

  const getUserTier = (user) => {
      if (!user) return 6;
      if (user.is_vip === 'Y') return 1;
      if (user.is_team_leader === 'Y') return 2;
      if (user.is_new_member === 'Y' || user.total_races < 2) return 3;
      if (user.training_status === 'Y' || user.training_status === true || user.training_status === 'true' || user.training_status === 1) return 4;
      if (user.is_current_member === 'Y') return 5;
      return 6;
  }

  useEffect(() => {
    const cachedRaces = localStorage.getItem('iron_medic_races_cache');
    if (cachedRaces) {
        try {
            setRaces(JSON.parse(cachedRaces));
            setLoading(false); 
        } catch (e) { console.log('快取讀取失敗'); }
    }
    
    fetchUserDataAndRaces()
    setupRealtimePresence()
    
    const role = localStorage.getItem('iron_medic_user_role') || 'USER';
    
    if (ADMIN_ROLES.some(r => role.toUpperCase().includes(r))) {
        checkServerHealth();
        const healthInterval = setInterval(checkServerHealth, 300000);
        return () => clearInterval(healthInterval);
    }
    
    let idleTimer;
    const resetIdleTimer = () => {
        clearTimeout(idleTimer);
        idleTimer = setTimeout(() => {
            alert('您已閒置超過 30 分鐘，為了保護資料安全，系統已自動登出。');
            supabase.auth.signOut();
            localStorage.removeItem('iron_medic_user_role'); 
            navigate('/login');
        }, 30 * 60 * 1000); 
    };
    
    window.addEventListener('mousemove', resetIdleTimer);
    window.addEventListener('keypress', resetIdleTimer);
    window.addEventListener('scroll', resetIdleTimer);
    window.addEventListener('click', resetIdleTimer);
    resetIdleTimer();

    const handleClickOutside = (event) => {
        if (adminMenuRef.current && !adminMenuRef.current.contains(event.target)) {
            setShowAdminMenu(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => {
        clearTimeout(idleTimer);
        window.removeEventListener('mousemove', resetIdleTimer);
        window.removeEventListener('keypress', resetIdleTimer);
        window.removeEventListener('scroll', resetIdleTimer);
        window.removeEventListener('click', resetIdleTimer);
        document.removeEventListener('mousedown', handleClickOutside);
        if (notifChannelRef.current) supabase.removeChannel(notifChannelRef.current);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkServerHealth = async () => {
      const start = performance.now();
      try {
          const { error } = await supabase.from('profiles').select('id').limit(1);
          const latency = Math.round(performance.now() - start);
          setServerLatency(latency);
          if (error) throw error;
          if (latency > 1500) setServerStatus('warning'); 
          else setServerStatus('healthy'); 
      } catch (err) {
          setServerStatus('error'); 
      }
  }

  const setupRealtimePresence = () => {
      const channel = supabase.channel('room_1', {
          config: { presence: { key: 'user_' + Math.random().toString(36).substr(2, 9) } }
      });
      channelRef.current = channel;

      channel
        .on('presence', { event: 'sync' }, () => {
          const state = channel.presenceState();
          let count = 0;
          const newcomers = [];

          for (const id in state) {
              count += state[id].length;
              state[id].forEach(u => {
                  if (u.is_new_member && u.name) {
                      if (!newcomers.some(n => n.name === u.name)) newcomers.push(u);
                  }
              });
          }
          setOnlineCount(count > 0 ? count : 1);
          setNewcomersOnline(newcomers);
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
              await channel.track({ online_at: new Date().toISOString() })
          }
        });
  }

  // 🌟 鈴鐺雙引擎同步化：精準抓取個人通知 + 系統稽核日誌
  const fetchNotifs = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) return;

          const { data: pData } = await supabase.from('user_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50);
          let allNotifs = pData ? pData.map(n => ({...n, date: n.created_at})) : [];

          const role = localStorage.getItem('iron_medic_user_role') || 'USER';
          const isAdmin = ADMIN_ROLES.some(r => role.toUpperCase().includes(r));

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
                      is_read: false 
                  }));
                  allNotifs = [...allNotifs, ...adminMapped].sort((a,b) => new Date(b.date) - new Date(a.date));
              }
          }
          setNotifications(allNotifs);

          if (!notifChannelRef.current) {
              const channel = supabase.channel('race-events-notifs')
                  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${user.id}` }, () => { fetchNotifs(); })
                  .subscribe();
              notifChannelRef.current = channel;
          }
      } catch (e) {
          console.log('通知載入異常', e);
      }
  }

  const fetchUserDataAndRaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user && user.email) {
          try {
              const { data: profile } = await supabase.from('profiles').select('id, role, full_name, is_new_member, is_current_member, license_expiry, newbie_passes, total_races').eq('email', user.email).maybeSingle()
              if (profile) {
                  const role = profile.role ? profile.role.toUpperCase().trim() : 'USER';
                  setUserRole(role);
                  setCurrentUserProfile(profile); 
                  localStorage.setItem('iron_medic_user_role', role); 

                  // 🌟 如果是管理員，自動抓取當屆會員名單供「快速安插」使用
                  if (ADMIN_ROLES.some(r => role.includes(r))) {
                      const { data: membersData } = await supabase.from('profiles').select('*').eq('is_current_member', 'Y');
                      if (membersData) setAllMembers(membersData);
                  }

                  if (channelRef.current) {
                      channelRef.current.track({
                          online_at: new Date().toISOString(),
                          is_new_member: profile.is_new_member === 'Y',
                          name: profile.full_name,
                          avatar: profile.full_name ? profile.full_name.charAt(0) : '?'
                      });
                  }

                  // 🌟 呼叫雙引擎抓取通知
                  await fetchNotifs();
              }
          } catch (e) { console.log("獲取身分失敗，略過", e) }
      }

      const { data: racesData, error } = await supabase.from('races').select('*').order('date', { ascending: true })

      if (error) throw error
      if (racesData) {
          setRaces(racesData);
          localStorage.setItem('iron_medic_races_cache', JSON.stringify(racesData));
      }
    } catch (error) {
      console.error("無法載入資料:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAllAsRead = async () => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true, isRead: true })));
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      } catch(e){}
  }

  // 🌟 支援刪除 admin_notifications (與 DigitalID 保持一致)
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

  const getNotifIcon = (category) => {
      switch(category) {
          case 'race': return <Flag size={16} className="text-blue-500"/>;
          case 'cert': return <AlertTriangle size={16} className="text-red-500"/>;
          case 'shop': return <Medal size={16} className="text-amber-500"/>;
          default: return <Bell size={16} className="text-slate-500"/>;
      }
  }

  const handleTimeFilterChange = (newTimeFilter) => {
      const hasRacesInThatTime = races.some(race => {
          if (!race.date) return false;
          const year = new Date(race.date).getFullYear();
          if (newTimeFilter === 'PAST') return year < CURRENT_YEAR;
          if (newTimeFilter === 'FUTURE') return year > CURRENT_YEAR;
          return year === CURRENT_YEAR;
      });

      if (hasRacesInThatTime) {
          setTimeFilter(newTimeFilter);
      } else {
          const timeLabel = newTimeFilter === 'PAST' ? '過去' : '未來';
          alert(`目前沒有${timeLabel}的賽事紀錄！`);
      }
  }

  const isSuperAdmin = ADMIN_ROLES.some(r => userRole.toUpperCase().includes(r));
  const unreadCountReal = notifications.filter(n => !(n.isRead || n.is_read)).length;

  const showWarning = useMemo(() => {
      if (!currentUserProfile) return null;
      if (isSuperAdmin) return null; 
      
      if (currentUserProfile.is_current_member !== 'Y') {
          return { type: 'danger', title: '尚未開通當屆身分', msg: '您目前為非當屆會員，無法報名賽事。' };
      }

      if (!currentUserProfile.license_expiry) {
          return { type: 'danger', title: '缺少醫護證照', msg: '尚未登錄醫護證照，目前無法報名賽事。' };
      }

      const expiry = new Date(currentUserProfile.license_expiry);
      const now = new Date();
      const sixMonthsLater = new Date();
      sixMonthsLater.setMonth(now.getMonth() + 6);

      if (expiry < now) {
          return { type: 'danger', title: '醫護證照已過期', msg: '醫護證照已過期，請盡速更新以免影響報名權益。' };
      }
      
      if (expiry < sixMonthsLater) {
          return { type: 'warning', title: '證照效期倒數', msg: `您的醫護證照即將於 ${currentUserProfile.license_expiry} 到期！` };
      }

      return null;
  }, [currentUserProfile, isSuperAdmin]);

  const renderStatusBadge = (status, isHot, isFull, isPast) => {
    if (isPast) return <div className="absolute top-3 left-3 md:top-4 md:left-4 flex gap-2"><span className="bg-slate-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><CheckCircle size={12} /> 賽事已結束</span></div>
    if (isFull) return <div className="absolute top-3 left-3 md:top-4 md:left-4 flex gap-2"><span className="bg-red-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><CheckCircle size={12} /> 滿編 / 可候補</span></div>
    switch (status) {
      case 'OPEN': return <div className="absolute top-3 left-3 md:top-4 md:left-4 flex gap-2"><span className="bg-green-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><Activity size={12} className="animate-pulse" /> 招募中</span>{isHot && <span className="bg-red-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><Flame size={12} /> 火熱</span>}</div>
      case 'NEGOTIATING': return <div className="absolute top-3 left-3 md:top-4 md:left-4 flex gap-2"><span className="bg-amber-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><Handshake size={12} /> 洽談中</span></div>
      case 'SUBMITTED': return <div className="absolute top-3 left-3 md:top-4 md:left-4 flex gap-2"><span className="bg-slate-700/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><Send size={12} /> 名單已送出</span></div>
      case 'FULL': return <div className="absolute top-3 left-3 md:top-4 md:left-4"><span className="bg-slate-800/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><CheckCircle size={12} /> 滿編</span></div>
      case 'UPCOMING': return <div className="absolute top-3 left-3 md:top-4 md:left-4"><span className="bg-amber-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><Timer size={12} /> 預備</span></div>
      default: return null
    }
  }

  const extractParticipantsData = (race) => {
      let totalRegistered = 0;
      let newcomerCount = 0; 
      let participantDetails = [];

      if (race.slots_data && Array.isArray(race.slots_data)) {
          race.slots_data.forEach(slot => {
              if (slot.filled && slot.filled > 0) {
                  totalRegistered += slot.filled;
                  if (slot.assignee) {
                      const parsedAssignees = parseAssignees(slot.assignee);
                      parsedAssignees.forEach(parsedUser => {
                          if (parsedUser.name === '測試者' || parsedUser.id === 'test') return;
                          if (parsedUser.isNew) newcomerCount++; 
                          participantDetails.push({ 
                              name: parsedUser.name, 
                              timestamp: parsedUser.timestamp || '10:00:00:000', 
                              isVip: parsedUser.isVip || false, 
                              isNew: parsedUser.isNew || false, 
                              roleTag: parsedUser.roleTag || null, 
                              slotGroup: slot.group, 
                              slotName: slot.name 
                          });
                      });
                  }
              }
          });
      }
      return { totalRegistered, newcomerCount, participantDetails };
  }

  const getInitial = (name) => name ? name.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '').charAt(0) || '?' : '?'

  const filteredRaces = races.filter(race => {
      if (!race.date) return false;
      const today = new Date();
      today.setHours(0,0,0,0);
      const raceDate = new Date(race.date);
      const raceYear = raceDate.getFullYear();
      
      let matchTime = false;
      if (timeFilter === 'CURRENT_YEAR') matchTime = raceYear === CURRENT_YEAR;
      else if (timeFilter === 'PAST') matchTime = raceYear < CURRENT_YEAR;
      else if (timeFilter === 'FUTURE') matchTime = raceYear > CURRENT_YEAR;

      const isPastRace = raceDate < today || ['COMPLETED', 'CANCELLED', 'CLOSED'].includes(race.status);
      let effectiveStatus = race.status;
      if (isPastRace) {
          effectiveStatus = 'SUBMITTED';
      }

      let matchStatus = false;
      if (statusFilter === 'ALL') matchStatus = true;
      else matchStatus = effectiveStatus === statusFilter;

      return matchTime && matchStatus;
  });

  const renderRoleBadge = (roleTag) => {
      if (!roleTag) return null;
      if (roleTag === '帶隊教官') return <span className="flex items-center text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-300 px-1.5 py-0.5 rounded font-black"><ShieldAlert size={10} className="mr-1"/> 帶隊教官</span>;
      if (roleTag === '賽道教官') return <span className="flex items-center text-[10px] bg-orange-100 text-orange-700 border border-orange-300 px-1.5 py-0.5 rounded font-black"><Flag size={10} className="mr-1"/> 賽道教官</span>;
      if (roleTag === '醫護教官') return <span className="flex items-center text-[10px] bg-rose-100 text-rose-700 border border-rose-300 px-1.5 py-0.5 rounded font-black"><Activity size={10} className="mr-1"/> 醫護教官</span>;
      if (roleTag === '官方代表') return <span className="flex items-center text-[10px] bg-slate-800 text-amber-400 border border-slate-600 px-1.5 py-0.5 rounded font-black"><Crown size={10} className="mr-1"/> 官方代表</span>;
      return null;
  }

  const raceStats = useMemo(() => {
    let total = races.length;
    let currentYearCount = 0;
    let pastCount = 0;
    let futureCount = 0;
    let openCount = 0;
    let negotiatingCount = 0;
    let submittedCount = 0;
    let upcomingCount = 0;

    const today = new Date();
    today.setHours(0,0,0,0);

    races.forEach(race => {
      if (!race.date) return;
      const raceDate = new Date(race.date);
      const raceYear = raceDate.getFullYear();
      if (raceYear === CURRENT_YEAR) currentYearCount++;
      else if (raceYear < CURRENT_YEAR) pastCount++;
      else if (raceYear > CURRENT_YEAR) futureCount++;

      const isPastRace = raceDate < today || ['COMPLETED', 'CANCELLED', 'CLOSED'].includes(race.status);
      let effectiveStatus = race.status;
      if (isPastRace) {
          effectiveStatus = 'SUBMITTED';
      }

      if (effectiveStatus === 'OPEN') openCount++;
      else if (effectiveStatus === 'NEGOTIATING') negotiatingCount++;
      else if (effectiveStatus === 'SUBMITTED') submittedCount++;
      else if (effectiveStatus === 'UPCOMING') upcomingCount++;
    });

    return { total, currentYearCount, pastCount, futureCount, openCount, negotiatingCount, submittedCount, upcomingCount };
  }, [races, CURRENT_YEAR]);

  const getRegistrationPhase = (openTimeStr) => {
      if (!openTimeStr) return { phase: 2, label: '全面開放' }; 
      const now = new Date();
      const openTime = new Date(openTimeStr);
      if (now < openTime) return { phase: -1, label: '尚未開放' }; 

      const midnight1 = new Date(openTime);
      midnight1.setHours(24, 0, 0, 0); 

      const midnight2 = new Date(midnight1);
      midnight2.setDate(midnight2.getDate() + 1); 

      if (now < midnight1) return { phase: 0, label: '教官鎖定' }; 
      if (now < midnight2) return { phase: 1, label: '幹部與新人' }; 
      return { phase: 2, label: '全面開放' }; 
  }

  const isNewbieUser = !isSuperAdmin && (currentUserProfile?.is_new_member === 'Y' || currentUserProfile?.total_races < 2);
  const newbiePassesLeft = currentUserProfile?.newbie_passes ?? 3;

  // ==========================================
  // ⚡ 快速編輯 (Quick Edit) 上帝捷徑引擎功能
  // ==========================================
  
  const handleOpenQuickEdit = (e, race) => {
      e.stopPropagation();
      setQuickEditRace(JSON.parse(JSON.stringify(race))); 
      setInsertForms({});
  }

  const handleQuickSlotChange = (slotId, field, value) => {
      const updatedSlots = quickEditRace.slots_data.map(s => s.id === slotId ? { ...s, [field]: value } : s);
      setQuickEditRace({ ...quickEditRace, slots_data: updatedSlots });
  }

  const handleAddQuickSlot = () => {
      const newSlot = { id: Date.now(), group: '一般組別', name: '新賽段', capacity: 1, filled: 0, assignee: '' };
      setQuickEditRace({ ...quickEditRace, slots_data: [...(quickEditRace.slots_data || []), newSlot] });
  }

  const handleDeleteQuickSlot = (slotId) => {
      const targetSlot = quickEditRace.slots_data.find(s => s.id === slotId);
      if (targetSlot && targetSlot.filled > 0) {
          return alert('❌ 防呆攔截：該賽段已有人員報名，無法刪除！請先將人員移出。');
      }
      if (window.confirm('確定要刪除此賽段嗎？')) {
          setQuickEditRace({ ...quickEditRace, slots_data: quickEditRace.slots_data.filter(s => s.id !== slotId) });
      }
  }

  const handleQuickSaveAll = async () => {
      setIsQuickSaving(true);
      try {
          const { error } = await supabase.from('races').update({ 
              status: quickEditRace.status,
              slots_data: quickEditRace.slots_data 
          }).eq('id', quickEditRace.id);

          if (error) throw error;
          
          setRaces(prev => prev.map(r => r.id === quickEditRace.id ? quickEditRace : r));
          setQuickEditRace(null);
          alert('✅ 賽事狀態與名額配置已儲存成功！');
      } catch (err) {
          alert('儲存失敗：' + err.message);
      } finally {
          setIsQuickSaving(false);
      }
  }

  const handleQuickInsert = async (slotId) => {
      const formData = insertForms[slotId] || { name: '', roleTag: '' };
      const trimmedName = formData.name.trim();
      if(!trimmedName) return alert("請輸入或選擇要安插的人員姓名！");
      
      const matchedMember = allMembers.find(m => m.full_name === trimmedName);
      if (!matchedMember) {
          return alert("❌ 系統防呆攔截：請從下拉提示清單中選擇「當年度有效會員」。查無此人或非當屆會員無法安插！");
      }

      let isAlreadyInRace = false;
      let existingSlotName = "";
      for (const slot of quickEditRace.slots_data) {
          const parsedAssignees = parseAssignees(slot.assignee);
          for (const p of parsedAssignees) {
              if (p.id === matchedMember.id || p.name === matchedMember.full_name) {
                  isAlreadyInRace = true;
                  existingSlotName = slot.name;
              }
          }
      }

      if (isAlreadyInRace) {
          const confirmTest = window.confirm(`⚠️ 系統提醒：【${matchedMember.full_name}】已經在【${existingSlotName}】名單中了！\n\n請問這是一次「測試報名」或「特殊重複安插」嗎？\n點擊「確定」將無視限制強制安插，點擊「取消」放棄操作。`);
          if (!confirmTest) return;
      }

      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}`;
      
      const rawRole = matchedMember.role ? matchedMember.role.toUpperCase().trim() : 'USER';
      const isMatchedAdmin = ADMIN_ROLES.some(r => rawRole.includes(r));
      
      const isNewbie = !isMatchedAdmin && (matchedMember.is_new_member === 'Y' || matchedMember.total_races < 2);
      const newbiePassesLeft = matchedMember.newbie_passes ?? 3;
      const willBurnNewbiePass = isNewbie && newbiePassesLeft > 0;

      const newParticipant = {
          id: matchedMember.id,
          name: matchedMember.full_name,
          email: matchedMember.email,
          tier: getUserTier(matchedMember),
          timestamp: timestamp,
          roleTag: formData.roleTag || null,
          isVip: matchedMember.is_vip === 'Y',
          isNew: isNewbie,
          usedPass: willBurnNewbiePass, 
          isMe: false
      };

      const updatedSlots = quickEditRace.slots_data.map(s => {
          if (s.id === slotId) {
              const assigneesArray = parseAssignees(s.assignee);
              assigneesArray.push(newParticipant);
              const newAssigneeString = assigneesArray.map(p => p.isLegacy ? p.name : JSON.stringify(p)).join('|');
              return { ...s, filled: assigneesArray.length, assignee: newAssigneeString };
          }
          return s;
      });

      const updatedRace = { ...quickEditRace, slots_data: updatedSlots };
      setQuickEditRace(updatedRace);

      try {
          const { error } = await supabase.from('races').update({ slots_data: updatedSlots }).eq('id', quickEditRace.id);
          if (error) throw error;

          if (willBurnNewbiePass) {
              const newPasses = Math.max(0, newbiePassesLeft - 1);
              await supabase.from('profiles').update({ newbie_passes: newPasses }).eq('id', matchedMember.id);
              setAllMembers(prev => prev.map(m => m.id === matchedMember.id ? { ...m, newbie_passes: newPasses } : m));
          }
          
          setRaces(prevRaces => prevRaces.map(r => r.id === quickEditRace.id ? updatedRace : r));
          setInsertForms(prev => ({...prev, [slotId]: {name: '', roleTag: ''}}));
          alert(`✅ 已成功將【${matchedMember.full_name}】安插至名單內。`);
      } catch(e) { alert("安插寫入失敗：" + e.message) }
  }

  const handleQuickKick = async (slotId, userIdToKick, userName) => {
      if(!window.confirm(`⚠️ 賽事總監警告 ⚠️\n確定要強制將【${userName}】從此賽段踢除嗎？`)) return;

      let kickedUserUsedPass = false;

      const updatedSlots = quickEditRace.slots_data.map(s => {
          if (s.id === slotId && s.assignee) {
              const assigneesArray = parseAssignees(s.assignee);
              const newAssigneesArray = assigneesArray.filter(p => {
                  if (p.id === userIdToKick || p.name === userIdToKick) {
                      if (p.usedPass) kickedUserUsedPass = true;
                      return false;
                  }
                  return true;
              });
              
              const newAssigneeString = newAssigneesArray.map(p => p.isLegacy ? p.name : JSON.stringify(p)).join('|');
              return { ...s, filled: newAssigneesArray.length, assignee: newAssigneeString };
          }
          return s;
      });

      const updatedRace = { ...quickEditRace, slots_data: updatedSlots };
      setQuickEditRace(updatedRace);

      try {
          const { error } = await supabase.from('races').update({ slots_data: updatedSlots }).eq('id', quickEditRace.id);
          if (error) throw error;
          
          if (kickedUserUsedPass && userIdToKick && !String(userIdToKick).startsWith('force_')) {
              try {
                  const { data: kUser } = await supabase.from('profiles').select('newbie_passes').eq('id', userIdToKick).single();
                  if (kUser) {
                      const restoredPasses = Math.min(3, (kUser.newbie_passes ?? 3) + 1);
                      await supabase.from('profiles').update({ newbie_passes: restoredPasses }).eq('id', userIdToKick);
                      setAllMembers(prev => prev.map(m => m.id === userIdToKick ? { ...m, newbie_passes: restoredPasses } : m));
                  }
              } catch(e) { console.error("退還次數失敗", e) }
          }

          if (userIdToKick && !String(userIdToKick).startsWith('force_')) {
              try {
                  await supabase.from('user_notifications').insert([{
                      user_id: userIdToKick,
                      tab: 'personal',
                      category: 'alert',
                      message: `您在【${quickEditRace.name}】的名額已被賽事總監異動，如有疑問請聯繫賽事總監。`,
                      is_read: false
                  }]);
              } catch(e) { console.error("發送踢除通知失敗", e) }
          }
          
          setRaces(prevRaces => prevRaces.map(r => r.id === quickEditRace.id ? updatedRace : r));
      } catch(e) { alert("踢除寫入失敗：" + e.message) }
  }


  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-24 flex flex-col relative overflow-x-hidden">
      
      <div className="bg-slate-900 pt-24 md:pt-28 pb-32 px-4 md:px-8 text-center relative overflow-hidden shrink-0 animate-fade-in">
          
          <div className="absolute top-4 left-4 md:top-6 md:left-8 z-40 flex flex-col gap-2">
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-700 shadow-lg w-fit">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                  <span className="text-xs md:text-sm font-bold text-slate-200 tracking-wide">目前在線：{onlineCount}</span>
              </div>
              
              {newcomersOnline.length > 0 && (
                  <div className="flex items-center gap-2 bg-amber-900/40 backdrop-blur-sm border border-amber-600 px-3 py-1.5 md:px-4 md:py-2 rounded-full w-fit">
                      <Sprout size={14} className="text-amber-400 shrink-0"/> 
                      <span className="text-xs md:text-sm font-bold text-amber-400 whitespace-nowrap mr-1">
                          新人上線
                      </span>
                      <div className="flex -space-x-1.5">
                          {newcomersOnline.slice(0, 3).map((nc, idx) => (
                              <div key={idx} className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center text-[9px] md:text-[10px] font-black border-2 border-slate-800 shadow-sm" title={`歡迎 ${nc.name}！`}>
                                  {nc.avatar}
                              </div>
                          ))}
                          {newcomersOnline.length > 3 && <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-600 text-amber-100 flex items-center justify-center text-[8px] font-bold border-2 border-slate-800">+{newcomersOnline.length - 3}</div>}
                      </div>
                  </div>
              )}
          </div>

          <div className="absolute top-4 right-4 md:top-6 md:right-8 z-40 flex items-center gap-2 md:gap-3">
              {isSuperAdmin && (
                  <div className="relative" ref={adminMenuRef}>
                      <button 
                          onClick={() => setShowAdminMenu(!showAdminMenu)}
                          className={`w-9 h-9 md:w-11 md:h-11 rounded-full flex items-center justify-center transition-all shadow-lg active:scale-95 border backdrop-blur-md
                              ${showAdminMenu ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800/80 border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white'}`}
                          title="管理員控制台"
                      >
                          {serverStatus === 'error' ? <ServerCrash size={18} className="text-red-400 animate-pulse"/> : <Settings size={18} className={showAdminMenu ? 'animate-spin-slow' : ''}/>}
                      </button>

                      {showAdminMenu && (
                          <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in-down origin-top-right z-50">
                              <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Admin Hub</span>
                                  <div className={`w-2 h-2 rounded-full ${serverStatus === 'healthy' ? 'bg-green-500' : serverStatus === 'warning' ? 'bg-amber-500' : 'bg-red-500'}`}></div>
                              </div>
                              <div className="p-2 space-y-1">
                                  <button onClick={() => navigate('/admin/system-status')} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-100 transition-colors">
                                      <Activity size={16} className="text-blue-500"/> 伺服器監控
                                  </button>
                                  <button onClick={() => navigate('/admin/dashboard')} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-black text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors">
                                      <Menu size={16} className="text-indigo-600"/> 進入管理後台
                                  </button>
                              </div>
                          </div>
                      )}
                  </div>
              )}

              <button 
                  onClick={() => setShowNotifPanel(true)} 
                  className="relative flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 w-9 h-9 md:w-11 md:h-11 rounded-full text-white transition-all shadow-lg shadow-black/20 active:scale-95 group shrink-0"
                  title="系統通知"
              >
                  <Bell size={18} className="sm:w-[22px] sm:h-[22px] text-white group-hover:text-amber-400 transition-colors group-hover:animate-wiggle"/> 
                  {unreadCountReal > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-full bg-red-500 text-[9px] sm:text-[10px] font-black text-white border-2 border-slate-900 shadow-sm animate-pulse">
                          {unreadCountReal > 99 ? '99+' : unreadCountReal}
                      </span>
                  )}
              </button>

              <button 
                  onClick={() => navigate('/my-id')} 
                  className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-3 py-2 md:px-4 md:py-2.5 rounded-full text-white text-[11px] sm:text-xs md:text-sm font-bold transition-all shadow-lg shadow-black/20 active:scale-95 shrink-0"
              >
                  <User size={16} className="hidden sm:block"/>
                  <span className="whitespace-nowrap">數位 ID</span>
              </button>
          </div>

          <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center"></div>
          <div className="relative z-10 pt-4 sm:pt-0">
              <h1 className="text-3xl md:text-5xl font-black text-white mb-3 md:mb-4 tracking-wider leading-tight drop-shadow-lg">醫護鐵人賽事大廳</h1>
              <p className="text-slate-300 text-xs md:text-base font-medium max-w-2xl mx-auto px-4 drop-shadow-md">選擇您的賽事，發揮您的專業。每一場賽事，都因為有您的參與而更加安全。</p>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 w-full flex-1">
          
          <div className="space-y-4 mb-4">
              {showWarning && (
                  <div className={`p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 shadow-xl border animate-fade-in-down 
                      ${showWarning.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                      <AlertTriangle size={28} className={`shrink-0 ${showWarning.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
                      <div>
                          <h4 className={`font-black text-lg sm:text-xl mb-1 ${showWarning.type === 'danger' ? 'text-red-700' : 'text-amber-800'}`}>
                              {showWarning.title}
                          </h4>
                          <p className="text-sm font-bold opacity-90 leading-relaxed">{showWarning.msg}</p>
                      </div>
                      <button onClick={() => navigate('/my-id')} className={`mt-3 sm:mt-0 sm:ml-auto w-full sm:w-auto whitespace-nowrap px-5 py-2.5 rounded-xl font-black text-sm shadow-md transition-transform active:scale-95 border
                          ${showWarning.type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white border-red-700' : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'}`}>
                          前往更新資料
                      </button>
                  </div>
              )}

              {isNewbieUser && newbiePassesLeft > 0 && (
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-2xl p-4 md:p-5 shadow-xl shadow-emerald-500/20 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-down border border-emerald-400/50">
                      <div className="flex items-center gap-3">
                          <div className="bg-white/20 p-2.5 rounded-xl backdrop-blur-sm shrink-0">
                              <Sprout size={24} className="text-emerald-50 drop-shadow-sm" />
                          </div>
                          <div>
                              <h3 className="font-black text-lg drop-shadow-sm flex items-center gap-2">
                                  新人專屬優先報名權利
                              </h3>
                              <p className="text-emerald-50 text-sm font-medium mt-0.5 leading-snug">
                                  您目前尚有 <span className="font-black text-2xl text-yellow-300 mx-1.5 drop-shadow-md">{newbiePassesLeft}</span> 次優先登記額度，請把握 Day 2 專屬階段報名！
                              </p>
                          </div>
                      </div>
                      <button onClick={() => { setStatusFilter('OPEN'); setTimeFilter('CURRENT_YEAR'); }} className="shrink-0 bg-white text-emerald-600 hover:bg-emerald-50 px-5 py-2.5 rounded-xl font-black text-sm transition-colors shadow-sm active:scale-95 w-full sm:w-auto text-center border-b-2 border-emerald-200">
                          立即尋找招募賽事
                      </button>
                  </div>
              )}
          </div>

          <div className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-[2rem] shadow-xl p-3 md:p-4 flex flex-col xl:flex-row justify-between items-center gap-3 md:gap-4 mb-4 border border-slate-100/50 animate-fade-in-up">
              <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x">
                  <button onClick={() => setStatusFilter('ALL')} className={`shrink-0 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap snap-start ${statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 bg-slate-50/50'}`}>全部賽事</button>
                  <button onClick={() => setStatusFilter('OPEN')} className={`shrink-0 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 snap-start ${statusFilter === 'OPEN' ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'text-slate-500 hover:bg-slate-100 bg-slate-50/50'}`}><Activity size={14} className="hidden sm:block"/> 招募中</button>
                  <button onClick={() => setStatusFilter('NEGOTIATING')} className={`shrink-0 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 snap-start ${statusFilter === 'NEGOTIATING' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-100 bg-slate-50/50'}`}><Handshake size={14} className="hidden sm:block"/> 洽談中</button>
                  <button onClick={() => setStatusFilter('SUBMITTED')} className={`shrink-0 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 snap-start ${statusFilter === 'SUBMITTED' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 bg-slate-50/50'}`}><Send size={14} className="hidden sm:block"/> 已送名單/其他結案</button>
              </div>

              <div className="flex bg-slate-100/80 p-1 md:p-1.5 rounded-xl md:rounded-2xl w-full xl:w-auto border border-slate-200 shadow-inner">
                  <button onClick={() => handleTimeFilterChange('PAST')} className={`flex-1 xl:flex-none px-2 sm:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${timeFilter === 'PAST' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600'}`}>過去賽事</button>
                  <button onClick={() => handleTimeFilterChange('CURRENT_YEAR')} className={`flex-1 xl:flex-none px-2 sm:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${timeFilter === 'CURRENT_YEAR' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-slate-600'}`}>{CURRENT_YEAR} 年</button>
                  <button onClick={() => handleTimeFilterChange('FUTURE')} className={`flex-1 xl:flex-none px-2 sm:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${timeFilter === 'FUTURE' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600'}`}>未來賽事</button>
              </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 mb-8 overflow-hidden transition-all duration-300 animate-fade-in-up">
              <div 
                  className="px-6 py-4 flex justify-between items-center cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
                  onClick={() => setShowStats(!showStats)}
              >
                  <div className="flex items-center gap-2">
                      <Flag className="text-blue-600" size={20} />
                      <h3 className="font-black text-slate-800">賽事總表統計</h3>
                      <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">全部 {raceStats.total} 場</span>
                  </div>
                  {showStats ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
              </div>
              
              {showStats && (
                  <div className="p-6 pt-2 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-down">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <h4 className="text-xs font-black text-slate-500 mb-3 flex items-center gap-1.5"><Calendar size={14}/> 年度統計</h4>
                          <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-center text-sm"><span className="text-slate-600 font-bold">過去賽事</span><span className="font-black text-slate-800">{raceStats.pastCount}</span></div>
                              <div className="flex justify-between items-center text-sm bg-blue-50/50 p-1.5 -mx-1.5 rounded-lg"><span className="text-blue-700 font-black">當屆 ({CURRENT_YEAR})</span><span className="font-black text-blue-700">{raceStats.currentYearCount}</span></div>
                              <div className="flex justify-between items-center text-sm"><span className="text-slate-600 font-bold">未來賽事</span><span className="font-black text-slate-800">{raceStats.futureCount}</span></div>
                          </div>
                      </div>
                      
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                          <h4 className="text-xs font-black text-slate-500 mb-3 flex items-center gap-1.5"><Activity size={14}/> 招募狀態</h4>
                          <div className="flex flex-col gap-2">
                              <div className="flex justify-between items-center text-sm"><span className="text-green-600 font-bold flex items-center gap-1"><Activity size={12}/> 招募中</span><span className="font-black text-green-700">{raceStats.openCount}</span></div>
                              <div className="flex justify-between items-center text-sm"><span className="text-amber-600 font-bold flex items-center gap-1"><Handshake size={12}/> 洽談中</span><span className="font-black text-amber-700">{raceStats.negotiatingCount}</span></div>
                              <div className="flex justify-between items-center text-sm"><span className="text-slate-600 font-bold flex items-center gap-1"><Send size={12}/> 已送名單/其他結案</span><span className="font-black text-slate-800">{raceStats.submittedCount}</span></div>
                              <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold flex items-center gap-1"><Timer size={12}/> 預備中</span><span className="font-black text-slate-500">{raceStats.upcomingCount}</span></div>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {loading ? (
              <div className="flex justify-center items-center h-64">
                  <Loader2 className="animate-spin text-slate-400" size={40} />
              </div>
          ) : filteredRaces.length === 0 ? (
              <div className="text-center text-slate-400 py-16 md:py-20 font-bold text-base md:text-lg bg-white/50 rounded-3xl border border-dashed border-slate-200">
                  此區間目前沒有符合條件的賽事卡片
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 lg:gap-8 pb-10">
                  {/* 🌟 完整未刪減的賽事卡片渲染區塊 */}
                  {filteredRaces.map((race, idx) => {
                      const { totalRegistered, newcomerCount, participantDetails } = extractParticipantsData(race);
                      const required = race.medic_required || 0;
                      let progressPercentage = 0;
                      if (required > 0) {
                          progressPercentage = Math.round((totalRegistered / required) * 100);
                          progressPercentage = Math.max(2, Math.min(progressPercentage, 100)); 
                      }
                      const isFull = totalRegistered >= required && required > 0;
                      const waitlistCount = race.waitlist_data ? race.waitlist_data.length : 0;
                      
                      const today = new Date();
                      today.setHours(0,0,0,0);
                      const isPastRace = new Date(race.date) < today || ['COMPLETED', 'CANCELLED', 'CLOSED'].includes(race.status);

                      const getButtonConfig = () => {
                          if (isPastRace) return { text: '賽事已結束 / 檢視名單', class: 'bg-slate-200 text-slate-500 border border-slate-300' }
                          if (race.status === 'SUBMITTED') return { text: '名單已送出 / 檢視', class: 'bg-slate-700 text-white hover:bg-slate-800' }
                          if (race.status === 'NEGOTIATING') return { text: '賽事洽談中 / 預覽', class: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' }
                          if (race.status === 'UPCOMING') return { text: '敬請期待', class: 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100' }
                          if (isFull || race.status === 'FULL') return { text: '查看報名名單 / 候補', class: 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200' }
                          return { text: '進入名額配置 / 報名', class: 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-600/30' }
                      }
                      const btnConfig = getButtonConfig();

                      const phaseInfo = getRegistrationPhase(race.open_time);

                      return (
                      <div key={race.id} 
                           onClick={() => race.status !== 'UPCOMING' && navigate(`/race-detail/${race.id}`)}
                           className={`group bg-white rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 overflow-hidden flex flex-col relative animate-fade-in-up
                           ${race.status === 'UPCOMING' ? 'opacity-80 grayscale-[20%]' : 'cursor-pointer hover:-translate-y-1'}`}
                           style={{ animationDelay: `${(idx % 6) * 50}ms` }}>
                          
                          <div className="relative h-48 md:h-52 overflow-hidden shrink-0">
                              <div className="absolute inset-0 bg-slate-900/20 group-hover:bg-transparent transition-colors z-10"></div>
                              <img 
                                  src={race.image_url || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=600'} 
                                  alt={race.name} 
                                  onError={(e) => {
                                      e.target.onerror = null; 
                                      e.target.src = 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=600';
                                  }}
                                  className={`w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-700 ease-out ${isFull || race.status === 'SUBMITTED' || isPastRace ? 'grayscale opacity-70' : ''}`} 
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                              {renderStatusBadge(race.status, race.is_hot, isFull, isPastRace)}
                              
                              {/* 🌟 快速編輯 (Quick Edit) 上帝按鈕 */}
                              {isSuperAdmin && (
                                  <button 
                                      onClick={(e) => handleOpenQuickEdit(e, race)}
                                      className="absolute top-3 right-3 md:top-4 md:right-4 bg-amber-500 hover:bg-amber-400 text-white p-2 rounded-full shadow-lg z-20 transition-transform active:scale-95"
                                      title="⚡ 賽事快速編輯"
                                  >
                                      <Edit3 size={16} />
                                  </button>
                              )}

                              <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 flex items-center gap-2">
                                  <span className="bg-white/20 backdrop-blur-md text-white text-[10px] md:text-xs font-bold px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg border border-white/30">{race.type}</span>
                              </div>
                          </div>

                          <div className="p-5 md:p-6 flex flex-col flex-1">
                              <h3 className="text-lg md:text-xl font-black text-slate-800 mb-4 md:mb-5 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">
                                  {race.name}
                              </h3>
                              
                              <div className="space-y-2 md:space-y-2.5 mb-4 flex-1">
                                  <div className="flex items-center text-slate-600 text-xs md:text-sm font-medium bg-slate-50 p-2 md:p-2.5 rounded-xl"><Calendar size={14} className="text-blue-500 mr-2.5 shrink-0"/><span>{race.date}</span></div>
                                  <div className="flex items-center text-slate-600 text-xs md:text-sm font-medium bg-slate-50 p-2 md:p-2.5 rounded-xl"><MapPin size={14} className="text-red-500 mr-2.5 shrink-0"/><span className="truncate">{race.location}</span></div>
                                  
                                  <div className="flex items-center text-[11px] font-bold text-slate-500 bg-slate-50 px-2 md:px-2.5 py-1.5 rounded-xl border border-slate-100 gap-1.5">
                                      <Timer size={14} className="text-amber-500 shrink-0"/> 
                                      開放報名: {race.open_time ? new Date(race.open_time).toLocaleString('zh-TW', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '未設定'}
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black shrink-0 ${phaseInfo.phase === -1 ? 'bg-slate-200 text-slate-500' : phaseInfo.phase === 0 ? 'bg-indigo-100 text-indigo-700' : phaseInfo.phase === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                                          {phaseInfo.label}
                                      </span>
                                  </div>
                              </div>

                              <div className="mt-auto pt-5 border-t border-slate-100 flex items-end justify-between">
                                  <div className="flex-1 pr-4">
                                      <div className="flex justify-between items-center mb-2">
                                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">招募進度</span>
                                          <span className="text-xs font-black text-slate-700">{totalRegistered} / {required}</span>
                                      </div>
                                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden border border-slate-200 shadow-inner">
                                          <div className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${progressPercentage >= 100 ? 'bg-gradient-to-r from-amber-400 to-amber-500' : 'bg-gradient-to-r from-blue-500 to-blue-400'}`} style={{ width: `${progressPercentage}%` }}>
                                              <div className="absolute inset-0 bg-white/20 w-full h-full" style={{ backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent)', backgroundSize: '1rem 1rem' }}></div>
                                          </div>
                                      </div>
                                      <div className="flex justify-between items-center mt-1.5">
                                          <span className="text-[10px] text-slate-400 font-bold">{progressPercentage}% 達成</span>
                                          {waitlistCount > 0 && <span className="text-[10px] text-amber-600 font-bold">候補: {waitlistCount} 人</span>}
                                      </div>
                                  </div>

                                  <div 
                                      className="flex items-center -space-x-2 shrink-0 cursor-pointer hover:scale-110 transition-transform bg-slate-50 p-1.5 rounded-full border border-slate-100 shadow-sm"
                                      onClick={(e) => { e.stopPropagation(); setPreviewRace({...race, participants: participantDetails}); }}
                                      title="點擊查看名單"
                                  >
                                      {participantDetails.length > 0 ? (
                                          <>
                                              {participantDetails.slice(0, 4).map((p, i) => (
                                                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black text-white shadow-sm ring-1 ring-slate-200/50 z-10" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>
                                                      {getInitial(p.name.split('#')[0].trim())}
                                                  </div>
                                              ))}
                                              {participantDetails.length > 4 && (
                                                  <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black bg-slate-100 text-slate-500 shadow-sm z-0">
                                                      +{participantDetails.length - 4}
                                                  </div>
                                              )}
                                          </>
                                      ) : (
                                          <div className="w-8 h-8 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-300">
                                              <UsersRound size={14}/>
                                          </div>
                                      )}
                                      
                                      {newcomerCount > 0 && (
                                          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-green-500 border-2 border-white flex items-center justify-center z-20 shadow-sm">
                                              <Sprout size={10} className="text-white"/>
                                          </div>
                                      )}
                                  </div>
                              </div>
                              
                              <button onClick={() => navigate(`/race-detail/${race.id}`)} disabled={race.status === 'UPCOMING'} className={`w-full mt-5 py-3 md:py-4 rounded-xl font-black text-[13px] md:text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95 ${btnConfig.class}`}>
                                  {btnConfig.text}
                                  {race.status !== 'UPCOMING' && <ChevronRight size={16} md:size={18} className="group-hover:translate-x-1 transition-transform" />}
                              </button>
                          </div>
                      </div>
                  )})}
              </div>
          )}
      </div>

      {showNotifPanel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex justify-end animate-fade-in" onClick={() => setShowNotifPanel(false)}>
              <div className="bg-slate-50 w-full sm:w-[400px] h-full flex flex-col shadow-2xl animate-slide-left" onClick={e => e.stopPropagation()}>
                  <div className="px-6 py-5 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Bell className="text-blue-600"/> 系統通知</h3>
                      <button onClick={() => setShowNotifPanel(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>
                  <div className="flex bg-white px-4 pt-2 border-b border-slate-200 shrink-0">
                      <button onClick={() => setNotifTab('system')} className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${notifTab === 'system' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>賽事/系統通報</button>
                      <button onClick={() => setNotifTab('personal')} className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${notifTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>個人提醒</button>
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
                                  // 🌟 點擊通知的雷達觸發器
                                  onClick={() => {
                                      const match = notif.message.match(/\(ID:\s*(.*?)\)/);
                                      if (match) {
                                          navigate(`/admin/members?view=ALL&targetId=${match[1]}`);
                                          setShowNotifPanel(false);
                                      }
                                  }}
                                  className={`p-4 rounded-2xl border transition-all relative group ${notif.message.includes('(ID:') ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : ''} ${isItemRead ? 'bg-slate-100/50 border-slate-200 opacity-80' : 'bg-white border-blue-200 shadow-sm'}`}>
                                  <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
                                  <div className="flex gap-3">
                                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isItemRead ? 'bg-slate-200' : 'bg-blue-50'}`}>
                                          {getNotifIcon(notif.category)}
                                      </div>
                                      <div className="flex-1 pr-6">
                                          <div className="text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1"><Clock size={10}/> {new Date(notif.date).toLocaleDateString()}</div>
                                          {/* 🌟 加上 whitespace-pre-wrap 讓明細完美換行 */}
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

      {previewRace && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setPreviewRace(null)}>
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm md:max-w-md w-full p-6 animate-bounce-in flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> 已報名夥伴名單</h3>
                      <button onClick={() => setPreviewRace(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="text-sm font-bold text-slate-500 mb-4 pb-4 border-b border-slate-100 leading-snug">{previewRace.name}</div>
                  <div className="max-h-[60vh] overflow-y-auto space-y-3 custom-scrollbar pr-2">
                      {previewRace.participants?.map((p, i) => {
                          const cleanName = p.name.split('#')[0].trim();
                          return (
                          <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-200 transition-all cursor-default">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>{getInitial(cleanName)}</div>
                                  <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                          {cleanName}
                                          {p.isLegacy && <span className="flex items-center text-[10px] bg-slate-100 text-slate-600 border border-slate-300 px-1.5 py-0.5 rounded font-black">舊名單</span>}
                                          {renderRoleBadge(p.roleTag)}
                                          {!p.roleTag && p.isVip && <span className="flex items-center text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black"><Crown size={10} className="mr-1"/> VIP</span>}
                                          {p.isNew && <span className="flex items-center text-[10px] bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded font-black"><Sprout size={10} className="mr-1"/> 新人</span>}
                                      </div>
                                      <div className="text-xs text-slate-500 font-bold mt-1">📍 {p.slotGroup} - {p.slotName}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1"><Clock size={10}/> 登記時間: {p.timestamp}</div>
                                  </div>
                              </div>
                          </div>
                      )})}
                      {(!previewRace.participants || previewRace.participants.length === 0) && <div className="text-center text-slate-400 py-10 font-medium">目前尚無人員報名</div>}
                  </div>
                  <button onClick={() => setPreviewRace(null)} className="w-full mt-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors active:scale-95">關閉名單</button>
              </div>
          </div>
      )}

      {/* 🌟 快速編輯 (Quick Edit) 上帝捷徑彈窗 */}
      {quickEditRace && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-fade-in" onClick={() => setQuickEditRace(null)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] animate-bounce-in" onClick={e => e.stopPropagation()}>
                  
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center rounded-t-[2rem] shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Zap className="text-amber-500"/> 賽事快速編輯 (Quick Edit)</h3>
                      <button onClick={() => setQuickEditRace(null)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 space-y-6">
                      
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-2">
                          <div className="text-sm font-bold text-slate-500 flex items-center gap-2"><Flag size={14} className="text-blue-500"/> {quickEditRace.name}</div>
                          <div className="flex gap-4 text-xs font-bold text-slate-400">
                              <span className="flex items-center gap-1"><Calendar size={12}/> {quickEditRace.date}</span>
                              <span className="flex items-center gap-1"><Clock size={12}/> {quickEditRace.gather_time}</span>
                              <span className="flex items-center gap-1"><MapPin size={12}/> {quickEditRace.location}</span>
                          </div>
                      </div>

                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <label className="block text-sm font-black text-slate-700 mb-2">賽事狀態切換</label>
                          <select
                              className="w-full border border-slate-300 p-2.5 rounded-lg font-bold bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-shadow"
                              value={quickEditRace.status}
                              onChange={e => setQuickEditRace({...quickEditRace, status: e.target.value})}
                          >
                              <option value="OPEN">🟢 招募中 (OPEN)</option>
                              <option value="NEGOTIATING">🟡 洽談中 (NEGOTIATING)</option>
                              <option value="SUBMITTED">🔵 已送名單 (SUBMITTED)</option>
                              <option value="FULL">🔴 滿編 (FULL)</option>
                              <option value="UPCOMING">🟠 預備中 (UPCOMING)</option>
                              <option value="COMPLETED">✅ 已完賽 (COMPLETED)</option>
                              <option value="CANCELLED">❌ 取消/停辦 (CANCELLED)</option>
                              <option value="CLOSED">🔒 關閉 (CLOSED)</option>
                          </select>
                      </div>

                      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                          <div className="flex justify-between items-center mb-2">
                              <h4 className="font-black text-slate-800 flex items-center gap-2"><Users size={18} className="text-blue-500"/> 賽事組別與人員變動</h4>
                              <button onClick={handleAddQuickSlot} className="text-xs font-bold bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 flex items-center gap-1 transition-colors">
                                  <Plus size={14}/> 新增組別
                              </button>
                          </div>

                          {quickEditRace.slots_data?.map((slot, index) => (
                              <div key={slot.id} className="border-2 border-slate-100 rounded-xl p-4 bg-slate-50/50 relative">
                                  <div className="flex flex-wrap gap-3 mb-4 pr-10">
                                      <div className="flex-1 min-w-[120px]">
                                          <label className="text-[10px] font-bold text-slate-500 block mb-1">組別名稱</label>
                                          <input type="text" value={slot.name} onChange={e => handleQuickSlotChange(slot.id, 'name', e.target.value)} className="w-full border border-slate-300 p-2 rounded-lg bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"/>
                                      </div>
                                      <div className="w-24">
                                          <label className="text-[10px] font-bold text-slate-500 block mb-1">需求人數</label>
                                          <input type="number" value={slot.capacity} onChange={e => handleQuickSlotChange(slot.id, 'capacity', parseInt(e.target.value)||1)} className="w-full border border-slate-300 p-2 rounded-lg bg-white text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none text-center"/>
                                      </div>
                                  </div>
                                  
                                  <div className="absolute top-4 right-4">
                                      <button onClick={() => handleDeleteQuickSlot(slot.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-200 transition-colors" title="刪除此組別">
                                          <Trash2 size={16}/>
                                      </button>
                                  </div>

                                  <div className="space-y-2 mb-4 bg-slate-100 p-3 rounded-xl border border-slate-200 shadow-inner">
                                      {parseAssignees(slot.assignee).map((p, i) => (
                                          <div key={i} className="flex justify-between items-center bg-white p-2.5 rounded-lg shadow-sm border border-slate-100">
                                              <div className="flex items-center gap-2">
                                                  <span className="font-bold text-sm text-slate-800">{p.name.split('#')[0].trim()}</span>
                                                  {p.roleTag && <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-black border border-indigo-200">{p.roleTag}</span>}
                                                  {!p.roleTag && p.isVip && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-black border border-amber-200">VIP</span>}
                                                  {p.isNew && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-black border border-green-200">新人</span>}
                                              </div>
                                              <button onClick={() => handleQuickKick(slot.id, p.id || p.name, p.name)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors"><X size={14}/></button>
                                          </div>
                                      ))}
                                      {parseAssignees(slot.assignee).length === 0 && <div className="text-xs text-slate-400 font-bold text-center py-2">該組別目前無人員</div>}
                                  </div>

                                  <div className="flex flex-wrap gap-2 items-center bg-amber-50 p-3 rounded-xl border border-amber-200 shadow-sm">
                                      <input 
                                          type="text" 
                                          list="member-autocomplete"
                                          className="flex-1 min-w-[150px] border border-amber-300 p-2 rounded-lg text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none"
                                          placeholder="輸入當年度會員姓名"
                                          value={insertForms[slot.id]?.name || ''}
                                          onChange={e => setInsertForms(prev => ({...prev, [slot.id]: {...(prev[slot.id]||{}), name: e.target.value}}))}
                                      />
                                      <select 
                                          className="w-32 border border-amber-300 p-2 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-amber-500"
                                          value={insertForms[slot.id]?.roleTag || ''}
                                          onChange={e => setInsertForms(prev => ({...prev, [slot.id]: {...(prev[slot.id]||{}), roleTag: e.target.value}}))}
                                      >
                                          <option value="">一般參賽</option>
                                          <option value="帶隊教官">帶隊教官</option>
                                          <option value="賽道教官">賽道教官</option>
                                          <option value="醫護教官">醫護教官</option>
                                          <option value="官方代表">官方代表</option>
                                      </select>
                                      <button onClick={() => handleQuickInsert(slot.id)} className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg font-black text-xs transition-colors shadow-md active:scale-95 whitespace-nowrap">
                                          確認安插
                                      </button>
                                  </div>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="p-5 border-t border-slate-200 bg-white shrink-0 flex gap-3 rounded-b-[2rem]">
                      <button onClick={handleQuickSaveAll} disabled={isQuickSaving} className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-600/30 hover:bg-blue-700 transition-colors flex justify-center items-center gap-2 active:scale-95">
                          {isQuickSaving ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 儲存所有變更並關閉
                      </button>
                      <button onClick={() => setQuickEditRace(null)} disabled={isQuickSaving} className="flex-1 bg-slate-100 text-slate-600 font-bold py-4 rounded-xl hover:bg-slate-200 transition-colors active:scale-95">取消</button>
                  </div>
              </div>
              
              <datalist id="member-autocomplete">
                  {allMembers.map(m => (
                      <option key={m.id} value={m.full_name}>{m.email}</option>
                  ))}
              </datalist>
          </div>
      )}
    </div>
  )
}