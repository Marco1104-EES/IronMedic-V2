import { useState, useEffect, useRef, useMemo } from 'react'
import { Calendar, MapPin, Users, Clock, ChevronRight, Activity, Flame, ShieldAlert, Timer, CheckCircle, X, Loader2, UsersRound, Crown, Sprout, Handshake, Send, Flag, Settings, Bell, ChevronDown, ChevronUp, Trash2, AlertTriangle, Medal, ServerCrash, Server, Menu, User } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'

export default function RaceEvents() {
  const [races, setRaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('OPEN') 
  const [timeFilter, setTimeFilter] = useState('CURRENT_YEAR') 

  const [previewRace, setPreviewRace] = useState(null)
  const [userRole, setUserRole] = useState(() => localStorage.getItem('iron_medic_user_role') || 'USER') 
  const [currentUserProfile, setCurrentUserProfile] = useState(null)

  const [onlineCount, setOnlineCount] = useState(1) 
  const [newcomersOnline, setNewcomersOnline] = useState([])

  const [notifications, setNotifications] = useState([])
  const [showNotifPanel, setShowNotifPanel] = useState(false)
  const [notifTab, setNotifTab] = useState('system')

  const [showStats, setShowStats] = useState(false)
  
  const [serverStatus, setServerStatus] = useState('normal')
  const [dbLatency, setDbLatency] = useState(0)

  const navigate = useNavigate()
  const realtimeChannel = useRef(null)

  const TAIWAN_CENTER = [23.6978, 120.9605]
  const CURRENT_YEAR = new Date().getFullYear();
  const NEXT_YEAR = CURRENT_YEAR + 1;

  useEffect(() => {
      checkUserRole()
      fetchRaces()
      fetchNotifications()
      
      const setupPresence = async () => {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;
          
          const channel = supabase.channel('race_hall_presence', {
              config: { presence: { key: session.user.id } }
          })
          
          channel.on('presence', { event: 'sync' }, () => {
              const state = channel.presenceState();
              const users = Object.values(state).flat();
              setOnlineCount(Math.max(1, users.length));
              
              const newbs = users.filter(u => u.isNew === 'Y').map(u => u.name || '新人');
              setNewcomersOnline(Array.from(new Set(newbs)));
          }).subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                  const { data } = await supabase.from('profiles').select('full_name, is_new_member').eq('email', session.user.email).single();
                  await channel.track({
                      online_at: new Date().toISOString(),
                      isNew: data?.is_new_member,
                      name: data?.full_name?.charAt(0) + '某'
                  });
              }
          })
          realtimeChannel.current = channel;
      }
      setupPresence()

      const pingDb = async () => {
          const start = Date.now();
          const { error } = await supabase.from('races').select('id').limit(1);
          const end = Date.now();
          const latency = end - start;
          setDbLatency(latency);
          
          if (error || latency > 3000) setServerStatus('error');
          else if (latency > 1000) setServerStatus('warning');
          else setServerStatus('normal');
      };
      
      pingDb();
      const pingInterval = setInterval(pingDb, 30000); 

      return () => {
          if (realtimeChannel.current) supabase.removeChannel(realtimeChannel.current);
          clearInterval(pingInterval);
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const checkUserRole = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.email) {
        const { data, error } = await supabase.from('profiles').select('role, is_current_member, license_expiry').eq('email', user.email).single()
        if (error) throw error
        if (data) {
            const role = data.role?.toUpperCase() || 'USER'
            setUserRole(role)
            setCurrentUserProfile(data)
            localStorage.setItem('iron_medic_user_role', role)
        }
      }
    } catch (error) { console.error('無法驗證使用者權限:', error) }
  }

  // 🌟 AI 健康檢查：管理員免疫
  const showWarning = useMemo(() => {
      if (!currentUserProfile) return null;
      if (userRole === 'SUPER_ADMIN' || userRole === 'TOURNAMENT_DIRECTOR') return null; // 管理員免疫
      
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
  }, [currentUserProfile, userRole]);

  const fetchNotifications = async () => {
      try {
          const { data: { user } } = await supabase.auth.getUser()
          if (!user) return;
          const { data } = await supabase.from('user_notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20)
          if (data) setNotifications(data.map(n => ({...n, date: n.created_at})))
      } catch(e) {}
  }

  const fetchRaces = async () => {
    try {
      const { data, error } = await supabase.from('races').select('*').order('date', { ascending: true })
      if (error) throw error
      
      const formattedRaces = data.map(r => {
          const slots = r.slots_data || []
          let totalCapacity = 0; let totalFilled = 0;
          const participantsList = [];

          slots.forEach(slot => {
              totalCapacity += Number(slot.capacity || 0);
              totalFilled += Number(slot.filled || 0);
              if (slot.assignee) {
                  const pArray = slot.assignee.split('|').map(str => {
                      try {
                          const p = JSON.parse(str);
                          p.slotGroup = slot.group;
                          p.slotName = slot.name;
                          return p;
                      } catch(e) {
                          return { name: str, timestamp: '舊資料', isLegacy: true, slotGroup: slot.group, slotName: slot.name };
                      }
                  })
                  participantsList.push(...pArray);
              }
          });

          return {
              id: r.id, title: r.name, date: r.date,
              location: r.location, type: r.type, status: r.status,
              imageUrl: r.image_url, isHot: r.is_hot,
              capacity: totalCapacity, filled: totalFilled,
              participants: participantsList
          }
      })
      
      setRaces(formattedRaces)
    } catch (error) {
      console.error('Error fetching races:', error)
    } finally { setLoading(false) }
  }

  const markAllAsRead = async () => {
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) await supabase.from('user_notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
      } catch(e){}
  }

  const deleteNotification = async (id) => {
      setNotifications(prev => prev.filter(n => n.id !== id));
      try { await supabase.from('user_notifications').delete().eq('id', id); } catch(e){}
  }

  const getNotifIcon = (category) => {
      switch(category) {
          case 'race': return <Flag size={16} className="text-blue-500"/>;
          case 'cert': return <AlertTriangle size={16} className="text-red-500"/>;
          case 'shop': return <Medal size={16} className="text-amber-500"/>;
          default: return <Bell size={16} className="text-slate-500"/>;
      }
  }

  const filteredRaces = useMemo(() => {
      let result = races;
      if (statusFilter !== 'ALL') {
          if (statusFilter === 'UPCOMING') result = result.filter(r => r.status === 'UPCOMING')
          else if (statusFilter === 'OPEN') result = result.filter(r => r.status === 'OPEN')
          else if (statusFilter === 'CLOSED') result = result.filter(r => ['FULL', 'NEGOTIATING', 'SUBMITTED'].includes(r.status))
      }
      if (timeFilter === 'CURRENT_YEAR') result = result.filter(r => r.date.startsWith(CURRENT_YEAR.toString()))
      else if (timeFilter === 'NEXT_YEAR') result = result.filter(r => r.date.startsWith(NEXT_YEAR.toString()))
      else if (timeFilter === 'PAST') result = result.filter(r => new Date(r.date) < new Date())
      return result;
  }, [races, statusFilter, timeFilter, CURRENT_YEAR, NEXT_YEAR])

  const stats = useMemo(() => {
      const currentYearRaces = races.filter(r => r.date.startsWith(CURRENT_YEAR.toString()));
      return {
          total: currentYearRaces.length,
          open: currentYearRaces.filter(r => r.status === 'OPEN').length,
          filled: currentYearRaces.reduce((sum, r) => sum + (r.filled || 0), 0),
          capacity: currentYearRaces.reduce((sum, r) => sum + (r.capacity || 0), 0)
      }
  }, [races, CURRENT_YEAR])

  const getInitial = (name) => name ? name.replace(/[^a-zA-Z\u4e00-\u9fa5]/g, '').charAt(0) || '?' : '?'

  const renderRoleBadge = (roleTag) => {
      if (!roleTag) return null;
      if (roleTag === '帶隊教官') return <span className="flex items-center text-[10px] bg-indigo-100 text-indigo-700 border border-indigo-300 px-1.5 py-0.5 rounded font-black"><ShieldAlert size={10} className="mr-1"/> 帶隊官</span>;
      if (roleTag === '賽道教官') return <span className="flex items-center text-[10px] bg-orange-100 text-orange-700 border border-orange-300 px-1.5 py-0.5 rounded font-black"><Flag size={10} className="mr-1"/> 賽道官</span>;
      if (roleTag === '醫護教官') return <span className="flex items-center text-[10px] bg-rose-100 text-rose-700 border border-rose-300 px-1.5 py-0.5 rounded font-black"><Activity size={10} className="mr-1"/> 醫護官</span>;
      if (roleTag === '官方代表') return <span className="flex items-center text-[10px] bg-slate-800 text-amber-400 border border-slate-600 px-1.5 py-0.5 rounded font-black"><Crown size={10} className="mr-1"/> 代表</span>;
      return null;
  }

  const unreadCountReal = notifications.filter(n => !n.is_read).length;

  if (loading) return <div className="h-screen flex flex-col items-center justify-center bg-slate-900 text-white"><Loader2 className="animate-spin mb-4" size={48}/><span className="font-bold tracking-widest animate-pulse">連線至醫鐵總部...</span></div>

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      
      <div className="bg-slate-900 pb-16 md:pb-24 pt-6 md:pt-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=1920')] bg-cover bg-center"></div>
          
          <nav className="relative z-10 max-w-7xl mx-auto flex justify-between items-center mb-8 md:mb-16">
              <div className="flex items-center gap-3">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg border border-blue-400/30">I</div>
                  <div>
                      <h1 className="text-xl md:text-2xl font-black text-white tracking-tight leading-tight">醫護鐵人賽事大廳</h1>
                      <p className="text-[10px] md:text-xs text-blue-300 font-mono tracking-widest hidden md:block">IRON MEDIC COMMAND CENTER</p>
                  </div>
              </div>
              
              <div className="flex items-center gap-3 md:gap-4">
                  {(userRole === 'SUPER_ADMIN' || userRole === 'TOURNAMENT_DIRECTOR') && (
                      <button onClick={() => navigate('/admin/dashboard')} className="hidden md:flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl backdrop-blur-md transition-colors text-sm font-bold border border-white/10">
                          <Settings size={16}/> 進入後台
                      </button>
                  )}
                  
                  <button onClick={() => setShowNotifPanel(true)} className="relative p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-colors active:scale-95 group">
                      <Bell size={20} className="group-hover:animate-wiggle"/>
                      {unreadCountReal > 0 && (
                          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white border-2 border-slate-900 shadow-sm animate-pulse">
                              {unreadCountReal > 99 ? '99+' : unreadCountReal}
                          </span>
                      )}
                  </button>
                  
                  <button onClick={() => navigate('/digital-id')} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-lg shadow-blue-900/50 transition-all active:scale-95 border border-blue-400/30">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center"><User size={14}/></div>
                      <span className="font-bold text-sm hidden md:block">數位 ID 卡</span>
                  </button>

                  <div className="md:hidden">
                      <button onClick={() => {
                          if (userRole === 'SUPER_ADMIN' || userRole === 'TOURNAMENT_DIRECTOR') {
                              navigate('/admin/dashboard');
                          } else {
                              alert("一般會員無後台權限");
                          }
                      }} className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white backdrop-blur-md transition-colors active:scale-95">
                          <Menu size={20}/>
                      </button>
                  </div>
              </div>
          </nav>

          <div className="relative z-10 max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-end gap-6">
              <div>
                  <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-black rounded-full backdrop-blur-sm shadow-inner flex items-center gap-1.5">
                          <Activity size={12}/> V10.8 系統上線
                      </span>
                      <span className={`px-3 py-1 border text-xs font-black rounded-full backdrop-blur-sm shadow-inner flex items-center gap-1.5 transition-colors
                          ${serverStatus === 'normal' ? 'bg-green-500/20 border-green-400/30 text-green-300' 
                          : serverStatus === 'warning' ? 'bg-amber-500/20 border-amber-400/30 text-amber-300' 
                          : 'bg-red-500/20 border-red-400/30 text-red-300'}`}>
                          {serverStatus === 'normal' ? <Server size={12}/> : serverStatus === 'warning' ? <Server size={12}/> : <ServerCrash size={12}/>}
                          {dbLatency}ms
                      </span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-white tracking-tight drop-shadow-lg">
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">醫護鐵人</span><br className="md:hidden"/>賽事卡
                  </h2>
                  <p className="text-slate-400 mt-3 max-w-xl text-sm md:text-base font-medium leading-relaxed">
                      選擇您的賽事，發揮您的專業。每一場賽事，都因為有您的參與而更加安全<br className="hidden md:block"/>專業與熱情守護每一位跑者的賽道安全。
                  </p>
              </div>

              <div className="flex flex-col items-end gap-3 w-full md:w-auto">
                  <div className="flex -space-x-3 hover:space-x-1 transition-all duration-300 bg-slate-800/50 p-2 rounded-2xl backdrop-blur-md border border-slate-700/50 group w-full md:w-auto justify-end">
                      {[...Array(Math.min(5, onlineCount))].map((_, i) => (
                          <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-800 bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-black text-xs shadow-lg relative group-hover:scale-110 transition-transform">
                              {getInitial(newcomersOnline[i] || '醫')}
                              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-800 rounded-full animate-pulse"></div>
                          </div>
                      ))}
                      {onlineCount > 5 && (
                          <div className="w-10 h-10 rounded-full border-2 border-slate-800 bg-slate-700 flex items-center justify-center text-white font-black text-xs shadow-lg group-hover:scale-110 transition-transform">
                              +{onlineCount - 5}
                          </div>
                      )}
                  </div>
                  <div className="text-xs font-bold text-slate-400 flex items-center gap-1.5 bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-700/50">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-ping"></div>
                      目前 <span className="text-white">{onlineCount}</span> 人在線
                  </div>
              </div>
          </div>
      </div>

      {/* 保持原本的版面設計 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 -mt-8 md:-mt-12">
          
          {/* 🌟 唯一新增：完全保留原版面的警告橫幅，並放在白色篩選列的上方 */}
          {showWarning && (
              <div className={`mb-6 p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 shadow-xl border animate-fade-in-down 
                  ${showWarning.type === 'danger' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-amber-50 border-amber-200 text-amber-800'}`}>
                  <AlertTriangle size={28} className={`shrink-0 ${showWarning.type === 'danger' ? 'text-red-500' : 'text-amber-500'}`} />
                  <div>
                      <h4 className={`font-black text-lg sm:text-xl mb-1 ${showWarning.type === 'danger' ? 'text-red-700' : 'text-amber-800'}`}>
                          {showWarning.title}
                      </h4>
                      <p className="text-sm font-bold opacity-90 leading-relaxed">{showWarning.msg}</p>
                  </div>
                  <button onClick={() => navigate('/digital-id')} className={`mt-3 sm:mt-0 sm:ml-auto w-full sm:w-auto whitespace-nowrap px-5 py-2.5 rounded-xl font-black text-sm shadow-md transition-transform active:scale-95 border
                      ${showWarning.type === 'danger' ? 'bg-red-600 hover:bg-red-700 text-white border-red-700' : 'bg-amber-500 hover:bg-amber-600 text-white border-amber-600'}`}>
                      前往更新資料
                  </button>
              </div>
          )}

          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-2 md:p-3 flex flex-col sm:flex-row gap-2 justify-between items-center mb-8">
              <div className="flex w-full sm:w-auto gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 overflow-x-auto custom-scrollbar">
                  <button onClick={() => setTimeFilter('CURRENT_YEAR')} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-black transition-all ${timeFilter === 'CURRENT_YEAR' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:bg-slate-100'}`}>當年度 ({CURRENT_YEAR})</button>
                  <button onClick={() => setTimeFilter('NEXT_YEAR')} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-black transition-all ${timeFilter === 'NEXT_YEAR' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:bg-slate-100'}`}>下年度 ({NEXT_YEAR})</button>
                  <button onClick={() => setTimeFilter('PAST')} className={`whitespace-nowrap px-4 py-2 rounded-lg text-sm font-black transition-all ${timeFilter === 'PAST' ? 'bg-white text-blue-600 shadow-sm ring-1 ring-slate-200/50' : 'text-slate-500 hover:bg-slate-100'}`}>歷史回顧</button>
              </div>
              
              <div className="flex w-full sm:w-auto gap-2 bg-slate-50 p-1.5 rounded-xl border border-slate-200 overflow-x-auto custom-scrollbar">
                  <button onClick={() => setStatusFilter('ALL')} className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2 rounded-lg text-sm font-black transition-all ${statusFilter === 'ALL' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>全部</button>
                  <button onClick={() => setStatusFilter('UPCOMING')} className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2 rounded-lg text-sm font-black transition-all ${statusFilter === 'UPCOMING' ? 'bg-amber-100 text-amber-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>即將開放</button>
                  <button onClick={() => setStatusFilter('OPEN')} className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2 rounded-lg text-sm font-black transition-all ${statusFilter === 'OPEN' ? 'bg-green-100 text-green-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>招募中</button>
                  <button onClick={() => setStatusFilter('CLOSED')} className={`flex-1 sm:flex-none whitespace-nowrap px-4 py-2 rounded-lg text-sm font-black transition-all ${statusFilter === 'CLOSED' ? 'bg-red-100 text-red-700 shadow-sm' : 'text-slate-500 hover:bg-slate-100'}`}>已滿/結案</button>
              </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
              {filteredRaces.length > 0 ? (
                  filteredRaces.map((race) => (
                      <div key={race.id} className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden hover:shadow-xl hover:border-blue-200 transition-all duration-300 group flex flex-col h-full">
                          <div className="relative h-48 md:h-56 overflow-hidden cursor-pointer" onClick={() => navigate(`/race-detail/${race.id}`)}>
                              <div className="absolute inset-0 bg-slate-200 animate-pulse"></div>
                              
                              {/* 🌟 終極圖片防呆：如果伊貝特阻擋了圖片，自動切換為預設圖 */}
                              <img 
                                  src={race.imageUrl || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=600'} 
                                  alt={race.title} 
                                  onError={(e) => {
                                      e.target.onerror = null; // 防止無限迴圈
                                      e.target.src = 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=600';
                                  }}
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 relative z-10" 
                              />
                              
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent z-10"></div>
                              
                              <div className="absolute top-4 left-4 z-20 flex flex-col gap-2">
                                  <span className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider rounded-xl shadow-lg backdrop-blur-md border ${race.status === 'UPCOMING' ? 'bg-amber-500/90 text-white border-amber-400' : race.status === 'OPEN' ? 'bg-green-500/90 text-white border-green-400' : 'bg-red-500/90 text-white border-red-400'}`}>
                                      {race.status === 'UPCOMING' ? '⏳ 即將開放' : race.status === 'OPEN' ? '🟢 招募中' : '🔴 名額已滿'}
                                  </span>
                                  {race.isHot && <span className="bg-gradient-to-r from-orange-500 to-red-600 text-white text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg border border-red-400 flex items-center gap-1 w-fit animate-pulse"><Flame size={12}/> 熱門</span>}
                              </div>
                              
                              <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl text-center shadow-lg border border-white/50">
                                  <div className="text-xs text-slate-500 font-black mb-0.5">{race.date.split('-')[1]}月</div>
                                  <div className="text-xl font-black text-slate-800 leading-none">{race.date.split('-')[2]}</div>
                              </div>
                          </div>

                          <div className="p-6 md:p-8 flex flex-col flex-1">
                              <div className="flex items-center justify-between mb-3">
                                  <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg tracking-widest">{race.type}</span>
                                  <span className="text-xs text-slate-400 font-mono flex items-center gap-1"><Clock size={12}/> {race.date}</span>
                              </div>
                              
                              <h3 onClick={() => navigate(`/race-detail/${race.id}`)} className="text-xl md:text-2xl font-black text-slate-800 mb-3 leading-snug group-hover:text-blue-600 transition-colors cursor-pointer line-clamp-2">
                                  {race.title}
                              </h3>
                              
                              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium mb-6">
                                  <MapPin size={16} className="text-red-400 shrink-0"/> <span className="truncate">{race.location}</span>
                              </div>

                              <div className="mt-auto pt-5 border-t border-slate-100 flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shadow-inner">
                                          <span className="text-[10px] text-slate-400 font-black uppercase leading-none mb-0.5">名額</span>
                                          <span className="text-sm font-black text-slate-700 leading-none">{race.filled}<span className="text-[10px] text-slate-400 mx-0.5">/</span>{race.capacity}</span>
                                      </div>
                                      
                                      <div className="flex -space-x-2 cursor-pointer group/faces" onClick={(e) => { e.stopPropagation(); setPreviewRace(race); }}>
                                          {race.participants && race.participants.slice(0,3).map((p, i) => (
                                              <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-white shadow-sm transition-transform group-hover/faces:scale-110" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>
                                                  {getInitial(p.name)}
                                              </div>
                                          ))}
                                          {race.participants && race.participants.length > 3 && (
                                              <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-600 shadow-sm">+{race.participants.length - 3}</div>
                                          )}
                                          {(!race.participants || race.participants.length === 0) && (
                                              <div className="text-xs text-slate-400 font-medium ml-1">搶先報名</div>
                                          )}
                                      </div>
                                  </div>
                                  
                                  <button onClick={() => navigate(`/race-detail/${race.id}`)} className="w-10 h-10 rounded-full bg-slate-50 hover:bg-blue-600 text-slate-400 hover:text-white flex items-center justify-center transition-all shadow-sm active:scale-95 border border-slate-200 hover:border-transparent">
                                      <ChevronRight size={20}/>
                                  </button>
                              </div>
                          </div>
                      </div>
                  ))
              ) : (
                  <div className="col-span-full py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200 text-center shadow-sm">
                      <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Calendar className="text-slate-300" size={32}/></div>
                      <h3 className="text-xl font-black text-slate-800 mb-2">此篩選條件下無賽事</h3>
                      <p className="text-slate-500 font-medium">請嘗試切換上方的年度或狀態分類</p>
                  </div>
              )}
          </div>
      </div>

      {showNotifPanel && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex justify-end animate-fade-in" onClick={() => setShowNotifPanel(false)}>
              <div className="bg-slate-50 w-full sm:w-[400px] h-full flex flex-col shadow-2xl animate-slide-left" onClick={e => e.stopPropagation()}>
                  
                  <div className="px-6 py-5 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <Bell className="text-blue-600"/> 醫鐵通知中心
                      </h3>
                      <button onClick={() => setShowNotifPanel(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors active:scale-95">
                          <X size={20}/>
                      </button>
                  </div>

                  <div className="flex bg-white px-4 pt-2 border-b border-slate-200 shrink-0">
                      <button onClick={() => setNotifTab('system')} className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${notifTab === 'system' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>賽事通報</button>
                      <button onClick={() => setNotifTab('personal')} className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-colors ${notifTab === 'personal' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>個人提醒</button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                      <div className="flex justify-between items-center mb-2 px-1">
                          <span className="text-xs font-bold text-slate-400">保留近 8 個月的通知</span>
                          <button onClick={markAllAsRead} className="text-xs font-bold text-blue-600 hover:underline">全部標示已讀</button>
                      </div>

                      {notifications.filter(n => n.tab === notifTab).length > 0 ? (
                          notifications.filter(n => n.tab === notifTab).map(notif => {
                              const isRead = notif.is_read;
                              return (
                              <div key={notif.id} className={`p-4 rounded-2xl border transition-all relative group ${isRead ? 'bg-slate-100/50 border-slate-200 opacity-80' : 'bg-white border-blue-200 shadow-sm'}`}>
                                  <button onClick={() => deleteNotification(notif.id)} className="absolute top-2 right-2 p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                      <Trash2 size={14}/>
                                  </button>
                                  <div className="flex gap-3">
                                      <div className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${isRead ? 'bg-slate-200' : 'bg-blue-50'}`}>
                                          {getNotifIcon(notif.category)}
                                      </div>
                                      <div className="flex-1 pr-6">
                                          <div className="text-[10px] text-slate-400 font-medium mb-1 flex items-center gap-1">
                                              <Clock size={10}/> {new Date(notif.date).toLocaleDateString()}
                                          </div>
                                          <p className={`text-sm leading-relaxed ${isRead ? 'text-slate-600' : 'text-slate-800 font-bold'}`}>
                                              {notif.message}
                                          </p>
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-fade-in" onClick={() => setPreviewRace(null)}>
              <div className="bg-white rounded-[2rem] shadow-2xl max-w-sm md:max-w-md w-full p-6 animate-bounce-in flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
                  <div className="flex justify-between items-center mb-4 shrink-0">
                      <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> 已報名夥伴</h3>
                      <button onClick={() => setPreviewRace(null)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-full transition-colors"><X size={20}/></button>
                  </div>
                  <div className="text-sm font-bold text-slate-500 mb-4 pb-4 border-b border-slate-100 leading-snug shrink-0">{previewRace.title}</div>
                  
                  <div className="overflow-y-auto space-y-3 custom-scrollbar pr-2 flex-1">
                      {previewRace.participants && previewRace.participants.map((p, i) => {
                          const cleanName = p.isLegacy ? p.name.split('#')[0].trim() : p.name;
                          return (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors">
                              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shadow-sm" style={{ backgroundColor: `hsl(${i * 60 + 200}, 70%, 50%)` }}>
                                  {getInitial(cleanName)}
                              </div>
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