import { useState, useEffect, useRef } from 'react'
import { Calendar, MapPin, Users, Clock, ChevronRight, Activity, Flame, ShieldAlert, Timer, CheckCircle, X, Loader2, UsersRound, Crown, Sprout, Handshake, Send, CreditCard, Flag, Settings, Bell } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

// 🌟 同步 DigitalID.jsx 的通知資料來源
const INITIAL_NOTIFICATIONS = [
    { id: 1, tab: 'system', category: 'race', message: '新賽事已開放報名！', date: new Date().toISOString(), isRead: false },
    { id: 2, tab: 'personal', category: 'cert', message: '您的 EMT-1 證照即將於 30 天後到期，請盡速更新。', date: new Date(Date.now() - 86400000).toISOString(), isRead: false },
    { id: 3, tab: 'system', category: 'shop', message: '專屬 VIP 優惠：鐵人裝備商城全館 8 折！', date: new Date(Date.now() - 86400000 * 3).toISOString(), isRead: true },
    { id: 4, tab: 'personal', category: 'old', message: '這是一則一年前的舊通知，即將被系統自動清除。', date: '2024-01-01T00:00:00.000Z', isRead: true }
]

export default function RaceEvents() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('OPEN') 
  const [timeFilter, setTimeFilter] = useState('CURRENT_YEAR') 

  const [previewRace, setPreviewRace] = useState(null)
  
  // 🌟 權限快取：瞬間讀取 LocalStorage
  const [userRole, setUserRole] = useState(() => localStorage.getItem('iron_medic_user_role') || 'USER') 
  
  const [onlineCount, setOnlineCount] = useState(1) 
  // 🌟 新人廣播聚光燈狀態
  const [newcomersOnline, setNewcomersOnline] = useState([])

  // 🌟 加入通知狀態
  const [notifications, setNotifications] = useState(INITIAL_NOTIFICATIONS)

  const navigate = useNavigate()
  const CURRENT_YEAR = new Date().getFullYear()
  const channelRef = useRef(null)

  useEffect(() => {
    // 🌟 8個月自動刪除機制 (與 DigitalID.jsx 同步)
    const eightMonthsAgo = new Date();
    eightMonthsAgo.setMonth(eightMonthsAgo.getMonth() - 8);
    setNotifications(prev => prev.filter(n => new Date(n.date) >= eightMonthsAgo));

    const cachedRaces = localStorage.getItem('iron_medic_races_cache');
    if (cachedRaces) {
        try {
            setRaces(JSON.parse(cachedRaces));
            setLoading(false); 
        } catch (e) { console.log('快取讀取失敗'); }
    }
    
    fetchUserDataAndRaces()
    setupRealtimePresence()
    
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

    return () => {
        clearTimeout(idleTimer);
        window.removeEventListener('mousemove', resetIdleTimer);
        window.removeEventListener('keypress', resetIdleTimer);
        window.removeEventListener('scroll', resetIdleTimer);
        window.removeEventListener('click', resetIdleTimer);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
              // 🌟 掃描在線名單中是否有新人
              state[id].forEach(u => {
                  if (u.is_new_member && u.name) {
                      // 避免多開分頁重複顯示
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

  const fetchUserDataAndRaces = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user && user.email) {
          try {
              supabase.from('profiles').select('role, full_name, is_new_member').eq('email', user.email).maybeSingle()
                .then(({ data: profile }) => {
                    if (profile) {
                        const role = profile.role ? profile.role.toUpperCase() : 'USER';
                        setUserRole(role);
                        localStorage.setItem('iron_medic_user_role', role); 

                        // 🌟 把自己的資訊推播給所有人知道，包含是否為新人
                        if (channelRef.current) {
                            channelRef.current.track({
                                online_at: new Date().toISOString(),
                                is_new_member: profile.is_new_member === 'Y',
                                name: profile.full_name,
                                avatar: profile.full_name ? profile.full_name.charAt(0) : '?'
                            });
                        }
                    }
                });
          } catch (e) { console.log("獲取身分失敗，略過", e) }
      }

      const { data: racesData, error } = await supabase
        .from('races')
        .select('*')
        .order('date', { ascending: true })

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

  const renderStatusBadge = (status, isHot, isFull) => {
    if (isFull) {
        return (
            <div className="absolute top-3 left-3 md:top-4 md:left-4 flex gap-2">
                <span className="bg-red-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1">
                    <CheckCircle size={12} /> 滿編 / 可候補
                </span>
            </div>
        )
    }

    switch (status) {
      case 'OPEN':
        return (
          <div className="absolute top-3 left-3 md:top-4 md:left-4 flex gap-2">
            <span className="bg-green-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1">
              <Activity size={12} className="animate-pulse" /> 招募中
            </span>
            {isHot && <span className="bg-red-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><Flame size={12} /> 火熱</span>}
          </div>
        )
      case 'NEGOTIATING':
        return (
            <div className="absolute top-3 left-3 md:top-4 md:left-4 flex gap-2">
                <span className="bg-amber-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1">
                    <Handshake size={12} /> 洽談中
                </span>
            </div>
        )
      case 'SUBMITTED':
        return (
            <div className="absolute top-3 left-3 md:top-4 md:left-4 flex gap-2">
                <span className="bg-slate-700/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1">
                    <Send size={12} /> 名單已送出
                </span>
            </div>
        )
      case 'FULL':
        return <div className="absolute top-3 left-3 md:top-4 md:left-4"><span className="bg-slate-800/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><CheckCircle size={12} /> 滿編</span></div>
      case 'UPCOMING':
        return <div className="absolute top-3 left-3 md:top-4 md:left-4"><span className="bg-amber-500/90 backdrop-blur text-white text-[10px] md:text-xs font-black px-2.5 py-1 md:px-3 rounded-full shadow-md flex items-center gap-1"><Timer size={12} /> 預備</span></div>
      default: return null
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
                              
                              if (parsedUser.name === '測試者' || parsedUser.id === 'test') return;
                              
                              if(parsedUser && parsedUser.name) {
                                  participantDetails.push({
                                      name: parsedUser.name,
                                      timestamp: parsedUser.timestamp || '10:00:00:000', 
                                      isVip: parsedUser.isVip || false, 
                                      isNew: parsedUser.isNew || false,
                                      roleTag: parsedUser.roleTag || null, 
                                      slotGroup: slot.group,
                                      slotName: slot.name
                                  });
                              }
                          } catch (e) {
                              if (item.length > 0 && !item.startsWith('{')) { 
                                  if (item.includes('測試者')) return;
                                  
                                  participantDetails.push({
                                      name: item,
                                      timestamp: `10:00:00:000`, 
                                      isVip: item.includes('管理員') || item.includes('VIP'), 
                                      isNew: item.includes('新人'),
                                      slotGroup: slot.group,
                                      slotName: slot.name
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

  const filteredRaces = races.filter(race => {
      if (!race.date) return false;
      const raceYear = new Date(race.date).getFullYear();
      
      let matchTime = false;
      if (timeFilter === 'CURRENT_YEAR') matchTime = raceYear === CURRENT_YEAR;
      else if (timeFilter === 'PAST') matchTime = raceYear < CURRENT_YEAR;
      else if (timeFilter === 'FUTURE') matchTime = raceYear > CURRENT_YEAR;

      let matchStatus = false;
      if (statusFilter === 'ALL') matchStatus = true;
      else matchStatus = race.status === statusFilter;

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

  const unreadCountReal = notifications.filter(n => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans flex flex-col relative">
      <div className="bg-slate-900 pt-20 md:pt-24 pb-32 px-4 md:px-8 text-center relative overflow-hidden shrink-0">
          
          {/* 🌟 包含在線人數與新人 Spotlight 的左上角區塊 */}
          <div className="absolute top-4 left-4 md:top-6 md:left-8 z-30 flex flex-col items-start gap-2">
              <div className="flex items-center gap-2 bg-slate-800/80 backdrop-blur-md px-3 py-1.5 md:px-4 md:py-2 rounded-full border border-slate-700 shadow-lg">
                  <div className="w-2.5 h-2.5 md:w-3 md:h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.9)]"></div>
                  <span className="text-xs md:text-sm font-black text-slate-200 tracking-wider">目前在線：{onlineCount} 人</span>
              </div>
              
              {/* ✨ 新人上線 Spotlight (只在有新人時顯示) */}
              {newcomersOnline.length > 0 && (
                  <div className="flex items-center gap-2 animate-fade-in-up bg-amber-500/20 backdrop-blur-sm border border-amber-500/50 px-3 py-1.5 rounded-full shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                      <span className="text-[10px] md:text-xs font-black text-amber-300 flex items-center gap-1"><Sprout size={12}/> 新人上線</span>
                      <div className="flex -space-x-1.5">
                          {newcomersOnline.slice(0, 4).map((nc, idx) => (
                              <div key={idx} className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-amber-400 text-amber-900 flex items-center justify-center text-[9px] md:text-[10px] font-black border border-slate-900 shadow-sm" title={`歡迎 ${nc.name}！`}>
                                  {nc.avatar}
                              </div>
                          ))}
                          {newcomersOnline.length > 4 && <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[8px] font-bold border border-slate-900">+{newcomersOnline.length - 4}</div>}
                      </div>
                  </div>
              )}
          </div>

          <div className="absolute top-4 right-4 md:top-6 md:right-8 z-30 flex items-center gap-3">
              
              {(['SUPER_ADMIN', 'TOURNAMENT_DIRECTOR', 'RACE_ADMIN', 'ADMIN'].includes(userRole)) && (
                  <button 
                      onClick={() => navigate('/admin/dashboard')} 
                      className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-2 md:px-4 md:py-2.5 rounded-full text-xs md:text-sm font-bold transition-all shadow-lg active:scale-95"
                  >
                      <Settings size={16} /> 
                      <span className="hidden sm:inline">管理員後台</span>
                  </button>
              )}

              <button 
                  onClick={() => navigate('/my-id')} 
                  className="relative flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 px-3 py-2 md:px-4 md:py-2.5 rounded-full text-white text-xs md:text-sm font-bold transition-all shadow-lg shadow-black/20 active:scale-95 group"
              >
                  <div className="relative">
                      <Bell size={22} className="text-white group-hover:text-amber-400 transition-colors group-hover:animate-wiggle"/> 
                      {unreadCountReal > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-slate-900 shadow-sm animate-pulse">
                              {unreadCountReal}
                          </span>
                      )}
                  </div>
                  <span className="hidden sm:inline">我的數位 ID 卡</span>
                  <span className="sm:hidden">數位 ID</span>
              </button>
          </div>

          <div className="absolute inset-0 opacity-20 bg-[url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center"></div>
          <div className="relative z-10">
              <h1 className="text-3xl md:text-5xl font-black text-white mb-3 md:mb-4 tracking-wider leading-tight">醫護鐵人賽事大廳</h1>
              <p className="text-slate-300 text-xs md:text-base font-medium max-w-2xl mx-auto px-4">選擇您的賽事，發揮您的專業。每一場賽事，都因為有您的參與而更加安全。</p>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-20 relative z-20 w-full flex-1">
          
          <div className="bg-white/95 backdrop-blur-xl rounded-2xl md:rounded-[2rem] shadow-xl p-3 md:p-4 flex flex-col xl:flex-row justify-between items-center gap-3 md:gap-4 mb-8 md:mb-10 border border-slate-100/50">
              
              <div className="flex gap-2 w-full xl:w-auto overflow-x-auto pb-1 md:pb-0 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden snap-x">
                  <button onClick={() => setStatusFilter('ALL')} className={`shrink-0 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap snap-start ${statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 bg-slate-50/50'}`}>全部賽事</button>
                  <button onClick={() => setStatusFilter('OPEN')} className={`shrink-0 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 snap-start ${statusFilter === 'OPEN' ? 'bg-green-500 text-white shadow-md shadow-green-500/20' : 'text-slate-500 hover:bg-slate-100 bg-slate-50/50'}`}><Activity size={14} className="hidden sm:block"/> 招募中</button>
                  <button onClick={() => setStatusFilter('NEGOTIATING')} className={`shrink-0 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 snap-start ${statusFilter === 'NEGOTIATING' ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20' : 'text-slate-500 hover:bg-slate-100 bg-slate-50/50'}`}><Handshake size={14} className="hidden sm:block"/> 洽談中</button>
                  <button onClick={() => setStatusFilter('SUBMITTED')} className={`shrink-0 px-4 md:px-5 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-bold transition-all whitespace-nowrap flex items-center gap-1.5 snap-start ${statusFilter === 'SUBMITTED' ? 'bg-slate-700 text-white shadow-md' : 'text-slate-500 hover:bg-slate-100 bg-slate-50/50'}`}><Send size={14} className="hidden sm:block"/> 已送名單</button>
              </div>

              <div className="flex bg-slate-100/80 p-1 md:p-1.5 rounded-xl md:rounded-2xl w-full xl:w-auto border border-slate-200 shadow-inner">
                  <button onClick={() => handleTimeFilterChange('PAST')} className={`flex-1 xl:flex-none px-2 sm:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${timeFilter === 'PAST' ? 'bg-white text-slate-800 shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600'}`}>過去賽事</button>
                  <button onClick={() => handleTimeFilterChange('CURRENT_YEAR')} className={`flex-1 xl:flex-none px-2 sm:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${timeFilter === 'CURRENT_YEAR' ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-400 hover:text-slate-600'}`}>{CURRENT_YEAR} 年</button>
                  <button onClick={() => handleTimeFilterChange('FUTURE')} className={`flex-1 xl:flex-none px-2 sm:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-xs md:text-sm font-black transition-all ${timeFilter === 'FUTURE' ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60' : 'text-slate-400 hover:text-slate-600'}`}>未來賽事</button>
              </div>
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
                  {filteredRaces.map((race, idx) => {
                      const { totalRegistered, participantDetails } = extractParticipantsData(race);
                      const required = race.medic_required || 0;
                      
                      let progressPercentage = 0;
                      if (required > 0) {
                          progressPercentage = Math.round((totalRegistered / required) * 100);
                          progressPercentage = Math.max(2, Math.min(progressPercentage, 100)); 
                      }
                      
                      const isFull = totalRegistered >= required && required > 0;
                      const isAlmostFull = !isFull && progressPercentage >= 80;

                      const getButtonConfig = () => {
                          if (race.status === 'SUBMITTED') return { text: '名單已送出 / 檢視', class: 'bg-slate-700 text-white hover:bg-slate-800' }
                          if (race.status === 'NEGOTIATING') return { text: '賽事洽談中 / 預覽', class: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-200' }
                          if (race.status === 'UPCOMING') return { text: '敬請期待', class: 'bg-slate-50 text-slate-400 cursor-not-allowed border border-slate-100' }
                          if (isFull || race.status === 'FULL') return { text: '查看報名名單 / 候補', class: 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200' }
                          return { text: '進入名額配置 / 報名', class: 'bg-slate-900 text-white hover:bg-blue-600 hover:shadow-xl hover:shadow-blue-600/30' }
                      }
                      const btnConfig = getButtonConfig();

                      return (
                      <div key={race.id} className="bg-white rounded-[1.5rem] md:rounded-[2rem] shadow-lg shadow-slate-200/40 hover:shadow-2xl hover:shadow-blue-900/10 hover:-translate-y-1.5 border border-slate-100 overflow-hidden transition-all duration-300 group flex flex-col h-full animate-fade-in-up" style={{ animationDelay: `${(idx % 6) * 50}ms` }}>
                          <div className="h-[180px] md:h-[200px] relative overflow-hidden bg-slate-200 shrink-0">
                              <img src={race.image_url} alt={race.name} className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 ${isFull || race.status === 'SUBMITTED' ? 'grayscale opacity-70' : ''}`} />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/20 to-transparent"></div>
                              
                              {renderStatusBadge(race.status, race.is_hot, isFull)}
                              
                              <div className="absolute bottom-3 left-3 md:bottom-4 md:left-4 flex items-center gap-2">
                                  <span className="bg-white/20 backdrop-blur-md text-white text-[10px] md:text-xs font-bold px-2.5 md:px-3 py-1 md:py-1.5 rounded-lg border border-white/30">{race.type}</span>
                              </div>
                          </div>

                          <div className="p-5 md:p-6 flex flex-col flex-1">
                              <h3 className="text-lg md:text-xl font-black text-slate-800 mb-4 md:mb-5 line-clamp-2 leading-snug group-hover:text-blue-600 transition-colors">{race.name}</h3>
                              
                              <div className="space-y-2 md:space-y-2.5 mb-6 md:mb-8 flex-1">
                                  <div className="flex items-center text-slate-600 text-xs md:text-sm font-medium bg-slate-50 p-2 md:p-2.5 rounded-xl"><Calendar size={14} className="text-blue-500 mr-2.5 shrink-0"/><span>{race.date}</span></div>
                                  <div className="flex items-center text-slate-600 text-xs md:text-sm font-medium bg-slate-50 p-2 md:p-2.5 rounded-xl"><MapPin size={14} className="text-red-500 mr-2.5 shrink-0"/><span className="truncate">{race.location}</span></div>
                              </div>

                              <div className="mb-5 md:mb-6">
                                  <div className="flex justify-between items-end mb-2">
                                      
                                      <div className="flex items-center cursor-pointer hover:bg-slate-100 p-1.5 -ml-1.5 rounded-xl transition-colors active:scale-95" onClick={() => setPreviewRace({...race, participants: participantDetails})} title="點擊查看名單">
                                          {participantDetails.length > 0 ? (
                                              <div className="flex -space-x-2.5 md:-space-x-3">
                                                  {participantDetails.slice(0, 4).map((p, i) => (
                                                      <div key={i} className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] md:text-xs font-bold text-white shadow-sm" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>{getInitial(p.name)}</div>
                                                  ))}
                                              </div>
                                          ) : (
                                              <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-slate-200 bg-slate-100 flex items-center justify-center text-slate-400">
                                                  <UsersRound size={12} md:size={14}/>
                                              </div>
                                          )}
                                          <span className="text-[10px] md:text-xs font-bold ml-2 md:ml-3 flex items-center gap-1 text-slate-600">
                                              {totalRegistered} 人已報名 <ChevronRight size={12}/>
                                          </span>
                                      </div>
                                      
                                      <div className="flex flex-col items-end">
                                           {isFull ? (
                                              <span className="text-[9px] md:text-[10px] font-black text-red-500 mb-0.5">已滿編</span>
                                           ) : isAlmostFull ? (
                                              <span className="text-[9px] md:text-[10px] font-black text-amber-500 mb-0.5">即將額滿</span>
                                           ) : null}
                                          <div className="text-[10px] md:text-xs font-black text-slate-400">總需 {required} 人</div>
                                      </div>
                                  </div>

                                  <div className="w-full bg-slate-200 rounded-full h-1.5 md:h-2 overflow-hidden shadow-inner">
                                      <div 
                                          className={`h-full rounded-full transition-all duration-1000 
                                              ${isFull ? 'bg-red-500' : isAlmostFull ? 'bg-amber-400' : 'bg-blue-500'}`} 
                                          style={{ width: `${progressPercentage}%` }}
                                      ></div>
                                  </div>
                              </div>

                              <button onClick={() => navigate(`/race-detail/${race.id}`)} disabled={race.status === 'UPCOMING'}
                                  className={`w-full py-3 md:py-4 rounded-xl font-black text-[13px] md:text-[15px] flex items-center justify-center gap-2 transition-all active:scale-95 ${btnConfig.class}`}
                              >
                                  {btnConfig.text}
                                  {race.status !== 'UPCOMING' && <ChevronRight size={16} md:size={18} className="group-hover:translate-x-1 transition-transform" />}
                              </button>
                          </div>
                      </div>
                  )})}
              </div>
          )}
      </div>

      {previewRace && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in" onClick={() => setPreviewRace(null)}>
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm md:max-w-md w-full p-6 animate-bounce-in" onClick={e => e.stopPropagation()}>
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
                                  <div className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>
                                      {getInitial(cleanName)}
                                  </div>
                                  <div>
                                      <div className="font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                                          {cleanName}
                                          {renderRoleBadge(p.roleTag)}
                                          {!p.roleTag && p.isVip && <span className="flex items-center text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black"><Crown size={10} className="mr-1"/> VIP</span>}
                                          {p.isNew && <span className="flex items-center text-[10px] bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded font-black"><Sprout size={10} className="mr-1"/> 新人</span>}
                                      </div>
                                      <div className="text-xs text-slate-500 font-bold mt-1">
                                          📍 {p.slotGroup} - {p.slotName}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                                          <Clock size={10}/> 登記時間: {p.timestamp}
                                      </div>
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
    </div>
  )
}