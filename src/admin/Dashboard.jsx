import { useState, useEffect, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { Users, Activity, Award, ShieldAlert, Map as MapIcon, Loader2, Flag, Mountain, Bike, Footprints, User, MapPin, Bell, UserCheck, Calendar, Clock, History, ChevronUp, ChevronDown, Handshake, Send, Timer, ArrowRight, X, UserMinus, Mail, Phone, Info, Sprout, Search, Zap, AlertTriangle, FileSpreadsheet, Server, List, Rocket, Radio, GraduationCap, UserX } from 'lucide-react'

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const cityCoordinates = {
    "台北": [25.0330, 121.5654], "新北": [25.0172, 121.4625], "桃園": [24.9936, 121.3010],
    "台中": [24.1477, 120.6736], "台南": [22.9997, 120.2270], "高雄": [22.6273, 120.3014],
    "新竹": [24.8138, 120.9675], "苗栗": [24.5602, 120.8214], "彰化": [24.0518, 120.5393],
    "南投": [23.9610, 120.9719], "雲林": [23.7092, 120.4313], "嘉義": [23.4801, 120.4491],
    "屏東": [22.6687, 120.4862], "宜蘭": [24.7021, 121.7377], "花蓮": [23.9872, 121.6016],
    "台東": [22.7583, 121.1444], "澎湖": [23.5711, 119.5793], "金門": [24.4492, 118.3186],
    "連江": [26.1505, 119.9360]
}

const regionCenters = {
    north: [24.9, 121.3],
    central: [24.0, 120.5],
    south: [22.9, 120.3],
    east: [23.8, 121.4],
    islands: [23.5, 119.5]
}

export default function Dashboard() {
  const location = useLocation()
  const searchParams = new URLSearchParams(location.search)
  const currentView = searchParams.get('view') 
  const navigate = useNavigate() 

  const [loading, setLoading] = useState(true)
  const CURRENT_YEAR = new Date().getFullYear();

  const [stats, setStats] = useState({
      totalMembers: 0, currentMembers: 0, newMembers: 0, teamLeaders: 0,
      vipMembers: 0, loggedMembers: 0, unloggedMembersCount: 0, unlinkedCount: 0, trainedCount: 0    
  })
  
  const [unloggedList, setUnloggedList] = useState([])
  const [loggedList, setLoggedList] = useState([])
  const [unlinkedList, setUnlinkedList] = useState([]) 
  const [newcomersList, setNewcomersList] = useState([]) 
  const [leaderList, setLeaderList] = useState([])
  const [vipList, setVipList] = useState([])
  const [trainedList, setTrainedList] = useState([])
  
  const [showUnloggedModal, setShowUnloggedModal] = useState(false)
  const [showLoggedModal, setShowLoggedModal] = useState(false)
  const [showUnlinkedModal, setShowUnlinkedModal] = useState(false) 
  const [showNewcomersModal, setShowNewcomersModal] = useState(false) 
  const [showLeaderModal, setShowLeaderModal] = useState(false)
  const [showVipModal, setShowVipModal] = useState(false)
  const [showTrainedModal, setShowTrainedModal] = useState(false)

  const [raceStats, setRaceStats] = useState({ marathon: 0, trail: 0, bike: 0, tri: 0 })
  const [raceLocations, setRaceLocations] = useState([])

  const [demoStats, setDemostats] = useState({
      male: 0, female: 0, north: 0, central: 0, south: 0, east: 0, islands: 0
  })

  const [recentRaces, setRecentRaces] = useState([])
  const [profileUpdates, setProfileUpdates] = useState([])

  const [allRacesData, setAllRacesData] = useState([])
  const [showRaceOverview, setShowRaceOverview] = useState(true)

  const [searchAccountInput, setSearchAccountInput] = useState('');
  const [searchAccountResult, setSearchAccountResult] = useState(null);
  const [isSearchingAccount, setIsSearchingAccount] = useState(false);
  const [isUnlinkingAccount, setIsUnlinkingAccount] = useState(false);

  // ==========================================
  // 🌟 系統版本與發布控制中心 狀態
  // ==========================================
  const [updateCount, setUpdateCount] = useState(0);
  const [updateLogs, setUpdateLogs] = useState([]);
  const [errorBoundaryEnabled, setErrorBoundaryEnabled] = useState(true);
  const [readReleaseCounts, setReadReleaseCounts] = useState({});

  const loadSystemReleaseData = useCallback(() => {
      setUpdateCount(parseInt(localStorage.getItem('system_update_count') || '0', 10));
      setUpdateLogs(JSON.parse(localStorage.getItem('system_update_logs') || '[]'));
      setErrorBoundaryEnabled(localStorage.getItem('enable_error_boundary') !== 'false');
      try {
          setReadReleaseCounts(JSON.parse(localStorage.getItem('read_release_counts') || '{}'));
      } catch (e) {
          setReadReleaseCounts({});
      }
  }, []);

  const handleToggleErrorBoundary = () => {
      const newValue = !errorBoundaryEnabled;
      localStorage.setItem('enable_error_boundary', String(newValue));
      setErrorBoundaryEnabled(newValue);
  };

  const handleBroadcastRelease = async () => {
      if (!window.confirm('確定要發布全域更新嗎？\n這將強制所有在線會員的手機系統重新載入最新版本。')) return;

      try {
          const channel = supabase.channel('global_system_updates');
          channel.subscribe(async (status) => {
              if (status === 'SUBSCRIBED') {
                  await channel.send({
                      type: 'broadcast',
                      event: 'force_reload',
                      payload: { timestamp: Date.now() }
                  });
                  localStorage.setItem('system_update_count', '0');
                  window.dispatchEvent(new Event('system_update_changed'));
                  alert('✅ 全域更新指令已成功發布！會員手機將自動同步最新資料。');
                  supabase.removeChannel(channel);
              }
          });
      } catch (err) {
          alert('發布失敗: ' + err.message);
      }
  };

  useEffect(() => {
      loadSystemReleaseData();
      window.addEventListener('system_update_changed', loadSystemReleaseData);
      return () => window.removeEventListener('system_update_changed', loadSystemReleaseData);
  }, [loadSystemReleaseData]);

  const groupedReleaseLogs = useMemo(() => {
      const groups = {};
      updateLogs.forEach(log => {
          let monthKey = "近期異動";
          try {
              const d = new Date(log.time.replace(/上午|下午/g, '').trim());
              if (!isNaN(d.getTime())) monthKey = `${d.getFullYear()}年${d.getMonth() + 1}月`;
              else {
                  const match = log.time.match(/^(\d{4})[\/\-](\d{1,2})/);
                  if (match) monthKey = `${match[1]}年${match[2]}月`;
              }
          } catch (e) {}

          if (!groups[monthKey]) groups[monthKey] = [];
          groups[monthKey].push(log);
      });
      return groups;
  }, [updateLogs]);

  const [expandedReleaseMonths, setExpandedReleaseMonths] = useState({});

  const toggleReleaseMonth = (month) => {
      setExpandedReleaseMonths(prev => ({ ...prev, [month]: !prev[month] }));
      if (!expandedReleaseMonths[month]) {
          setReadReleaseCounts(prev => {
              const newCounts = { ...prev, [month]: groupedReleaseLogs[month].length };
              localStorage.setItem('read_release_counts', JSON.stringify(newCounts));
              return newCounts;
          });
      }
  };

  useEffect(() => {
      fetchDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
      const timer = setTimeout(() => {
          if (searchAccountInput.trim().length > 1) {
              performAccountSearch(searchAccountInput.trim());
          } else {
              setSearchAccountResult(null);
          }
      }, 500); 
      return () => clearTimeout(timer);
  }, [searchAccountInput]);

  const performAccountSearch = async (term) => {
      setIsSearchingAccount(true);
      try {
          const { data, error } = await supabase
              .from('profiles')
              .select('*')
              .or(`email.ilike.%${term}%,full_name.ilike.%${term}%,national_id.ilike.%${term}%`)
              .limit(1); 

          if (error) throw error;
          setSearchAccountResult(data && data.length > 0 ? data[0] : null);
      } catch (err) {
          console.error("搜尋帳號失敗:", err);
      } finally {
          setIsSearchingAccount(false);
      }
  };

  // ==========================================
  // 🚨 企業級帳號解除媒合引擎 (修復版)
  // ==========================================
  const handleUnlinkAccount = async () => {
      if (!searchAccountResult) return;
      
      const confirmMsg = `【系統確認】\n\n確定要將【${searchAccountResult.full_name}】解除帳號媒合狀態嗎？\n\n執行後，系統將切斷其帳號關聯並「保留原始信箱」。該人員下次登入系統時，必須重新進行身份驗證。`;
      if (!window.confirm(confirmMsg)) return;

      setIsUnlinkingAccount(true);
      try {
          const unlinkedUser = { ...searchAccountResult };
          
          // 🚨 核心修復：僅更新 ID 產生新 UUID，徹底斷開與 auth.users 的連結。
          // 絕對不碰 email，確保資料庫與 Supabase Auth 的一致性，達成完美還原原始狀態。
          const newRandomUuid = crypto.randomUUID(); 

          const { error } = await supabase
              .from('profiles')
              .update({ 
                  id: newRandomUuid
              })
              .eq('id', unlinkedUser.id);

          if (error) throw error;

          alert(`🎉【${unlinkedUser.full_name}】已成功解除帳號媒合！\n狀態已還原為未登入，且已安全保留原始信箱：${unlinkedUser.email}`);
          
          if (window.logSystemChange) {
              window.logSystemChange(`解除帳號媒合：${unlinkedUser.full_name}`);
          }
          
          setSearchAccountInput('');
          setSearchAccountResult(null);

          // 解除後給予系統1.5秒緩衝，隨即觸發全面數據重載以確保畫面一致
          setTimeout(() => {
              fetchDashboardData();
          }, 1500);

      } catch (error) {
          console.error("解除媒合失敗:", error)
          alert('解除媒合失敗：\n' + error.message);
      } finally {
          setIsUnlinkingAccount(false);
      }
  };

  const fetchDashboardData = async () => {
      try {
          const [
              { count: total },
              { count: current },
              { count: newM },
              { count: leaders },
              { count: vips },
              { count: trained } 
          ] = await Promise.all([
              supabase.from('profiles').select('*', { count: 'exact', head: true }),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_current_member', 'Y'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_current_member', 'Y').eq('is_new_member', 'Y'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_team_leader', 'Y'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_vip', 'Y'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_current_member', 'Y').eq('training_status', 'Y')
          ]);

          const { data: activationData, error: rpcError } = await supabase.rpc('get_member_activation_stats');
          const rpcUnloggedIds = new Set(activationData?.unlogged_list?.map(u => u.id) || []);

          const { data: allCurrentMembers, error: membersError } = await supabase.from('profiles')
              .select('id, full_name, email, phone')
              .eq('is_current_member', 'Y')
              .limit(5000);

          if (membersError) throw membersError;

          let arrayLogged = [];
          let arrayUnlogged = [];
          let arrayUnlinked = [];

          if (allCurrentMembers) {
              allCurrentMembers.forEach(m => {
                  // 保留相容性檢查：若資料庫內仍有舊版被修改為 unlinked_ 的異常資料，依舊歸類在「媒合取消」區塊供查閱
                  const isLegacyUnlinkedFallback = m.email && m.email.toLowerCase().includes('unlinked_') && m.email.toLowerCase().includes('ms1.url.com.tw');
                  
                  if (isLegacyUnlinkedFallback) {
                      arrayUnlinked.push({ ...m, email: '舊版異常資料(請手動修復)' });
                  } 
                  else if (rpcUnloggedIds.has(m.id)) {
                      // 正常解除媒合後，因為 ID 不在 auth.users 內，會自然落回此「未登入」名單，達成真正的重置原始狀態
                      arrayUnlogged.push(m);
                  } 
                  else {
                      arrayLogged.push(m);
                  }
              });
          }
          
          setLoggedList(arrayLogged);
          setUnloggedList(arrayUnlogged);
          setUnlinkedList(arrayUnlinked);

          const { data: newMembersData } = await supabase.from('profiles')
              .select('id, full_name, email, phone, newbie_passes')
              .eq('is_current_member', 'Y')
              .eq('is_new_member', 'Y')
              .limit(1000);
          
          let sortedNewcomers = [];
          if (newMembersData) {
              sortedNewcomers = newMembersData.sort((a, b) => (a.newbie_passes || 0) - (b.newbie_passes || 0));
          }
          setNewcomersList(sortedNewcomers);

          const { data: leaderData } = await supabase.from('profiles').select('id, full_name, email, phone').eq('is_team_leader', 'Y').limit(1000);
          const { data: vipData } = await supabase.from('profiles').select('id, full_name, email, phone').eq('is_vip', 'Y').limit(1000);
          const { data: trainedData } = await supabase.from('profiles').select('id, full_name, email, phone').eq('is_current_member', 'Y').eq('training_status', 'Y').limit(2000);

          setLeaderList(leaderData || []);
          setVipList(vipData || []);
          setTrainedList(trainedData || []);
          
          setStats({
              totalMembers: total || 0, 
              currentMembers: current || 0,
              newMembers: sortedNewcomers.length || newM || 0, 
              teamLeaders: leaders || 0,
              vipMembers: vips || 0,
              loggedMembers: arrayLogged.length,
              unloggedMembersCount: arrayUnlogged.length,
              unlinkedCount: arrayUnlinked.length,
              trainedCount: trained || 0 
          })

          const { data: races } = await supabase.from('races').select('id, name, date, type, location, status, medic_required, medic_registered').order('created_at', { ascending: false })
          let rMarathon = 0, rTrail = 0, rBike = 0, rTri = 0;
          let locations = []

          if (races) {
              setRecentRaces(races.slice(0, 5))
              setAllRacesData(races) 

              races.forEach(r => {
                  const raceDate = new Date(r.date)
                  if (raceDate.getFullYear() === CURRENT_YEAR) {
                      const typeStr = r.type || '';
                      if (/越野/.test(typeStr)) rTrail++;
                      else if (/自行車|單車|公路車/.test(typeStr)) rBike++;
                      else if (/鐵人/.test(typeStr)) rTri++;
                      else rMarathon++; 
                  }

                  if (r.location) {
                      const matchedCity = Object.keys(cityCoordinates).find(city => r.location.includes(city))
                      if (matchedCity) {
                          locations.push({ id: r.id, name: r.name, coord: cityCoordinates[matchedCity], date: r.date })
                      }
                  }
              })
              setRaceStats({ marathon: rMarathon, trail: rTrail, bike: rBike, tri: rTri })
              setRaceLocations(locations)
          }

          const { data: memberData } = await supabase.from('profiles').select('gender, address')
          if (memberData) {
              let mMale = 0, mFemale = 0;
              let regN = 0, regC = 0, regS = 0, regE = 0, regI = 0;

              memberData.forEach(p => {
                  if (p.gender === '男') mMale++;
                  if (p.gender === '女') mFemale++;
                  
                  const addr = p.address || '';
                  if (/基隆|臺北|台北|新北|桃園|新竹/.test(addr)) regN++;
                  else if (/苗栗|臺中|台中|彰化|南投|雲林/.test(addr)) regC++;
                  else if (/嘉義|臺南|台南|高雄|屏東/.test(addr)) regS++;
                  else if (/宜蘭|花蓮|臺東|台東/.test(addr)) regE++;
                  else if (/金門|馬祖|連江|澎湖|綠島|蘭嶼/.test(addr)) regI++;
              })

              setDemostats({
                  male: mMale, female: mFemale,
                  north: regN, central: regC, south: regS, east: regE, islands: regI
              })
          }

          try {
              const { data: notifs } = await supabase.from('admin_notifications').select('*').eq('type', 'PROFILE_UPDATE').order('created_at', { ascending: false }).limit(20)
              if (notifs) {
                  await supabase.from('admin_notifications').update({ is_read: true }).eq('is_read', false).eq('type', 'PROFILE_UPDATE')
                  setProfileUpdates(notifs)
              }
          } catch(e) { console.log("admin_notifications 表格可能尚未建立或無資料") }

      } catch (error) {
          console.error("載入儀表板資料失敗", error)
      } finally {
          setLoading(false)
      }
  }

  const raceOverviewStats = useMemo(() => {
    let total = allRacesData.length;
    let currentYearCount = 0;
    let pastCount = 0;
    let futureCount = 0;
    let openCount = 0;
    let negotiatingCount = 0;
    let submittedCount = 0;
    let upcomingCount = 0;

    allRacesData.forEach(race => {
      if (!race.date) return;
      const raceYear = new Date(race.date).getFullYear();
      if (raceYear === CURRENT_YEAR) currentYearCount++;
      else if (raceYear < CURRENT_YEAR) pastCount++;
      else if (raceYear > CURRENT_YEAR) futureCount++;

      if (race.status === 'OPEN') openCount++;
      else if (race.status === 'NEGOTIATING') negotiatingCount++;
      else if (race.status === 'SUBMITTED') submittedCount++;
      else if (race.status === 'UPCOMING') upcomingCount++;
    });

    return { total, currentYearCount, pastCount, futureCount, openCount, negotiatingCount, submittedCount, upcomingCount };
  }, [allRacesData, CURRENT_YEAR]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444']
  const TAIWAN_CENTER = [23.6978, 120.9605]

  const handleReviewClick = (log) => {
      const match = log.message.match(/\(ID:\s*(.*?)\)/);
      if (match && match[1]) {
          navigate(`/admin/members?view=ALL&targetId=${match[1]}`);
      } else {
          navigate('/admin/members', {
              state: { 
                  autoEditUserName: log.user_name, 
                  changesMessage: log.message      
              }
          });
      }
  }

  if (loading) return <div className="h-[60vh] flex items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> 正在載入系統資料...</div>

  if (currentView === 'NOTIFICATIONS') {
      return (
          <div className="space-y-6 md:space-y-8 animate-fade-in pb-20">
              <div className="mb-6">
                  <h2 className="text-3xl font-black text-slate-800 mb-2 flex items-center gap-2">
                      <Bell className="text-amber-500"/> 通知中心
                  </h2>
                  <p className="text-slate-500 font-medium">即時掌握最新建立的賽事與會員資料異動</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                      <div className="bg-blue-50/50 p-4 border-b border-blue-100 flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg"><Flag size={18}/></div>
                          <h3 className="font-black text-blue-900">新增賽事動態</h3>
                      </div>
                      <div className="p-4 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar space-y-3">
                          {recentRaces.length > 0 ? recentRaces.map((race, i) => (
                              <div key={i} className="flex flex-col p-3 rounded-xl border border-slate-100 hover:bg-slate-50 transition-colors gap-1.5">
                                  <div className="flex justify-between items-start">
                                      <span className="text-sm font-black text-slate-800 line-clamp-1">{race.name}</span>
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${race.status === 'OPEN' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{race.status === 'OPEN' ? '報名中' : race.status}</span>
                                  </div>
                                  <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
                                      <span className="flex items-center gap-1"><Calendar size={12}/> {race.date}</span>
                                      <span>預計需求: {race.medic_required || 0} 人</span>
                                  </div>
                              </div>
                          )) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70 py-10">
                                  <Flag size={32} className="mb-2"/>
                                  <span className="text-sm font-bold">近期無新增賽事</span>
                              </div>
                          )}
                      </div>
                  </div>

                  <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                      <div className="bg-indigo-50/50 p-4 border-b border-indigo-100 flex items-center gap-2">
                          <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg"><UserCheck size={18}/></div>
                          <h3 className="font-black text-indigo-900">會員資料變更紀錄 (稽核日誌)</h3>
                      </div>
                      <div className="p-4 flex-1 overflow-y-auto max-h-[500px] custom-scrollbar space-y-3">
                          {profileUpdates.length > 0 ? profileUpdates.map((log, i) => (
                              <div 
                                  key={i} 
                                  onClick={() => handleReviewClick(log)}
                                  className="flex gap-3 p-3 rounded-xl border border-slate-100 hover:bg-indigo-50/50 hover:border-indigo-200 transition-colors cursor-pointer group"
                              >
                                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 font-black flex items-center justify-center shrink-0 text-xs mt-1">
                                      {log.user_name?.charAt(0) || '?'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <div className="text-sm font-black text-slate-800">{log.user_name}</div>
                                      <div className="text-xs text-slate-600 font-bold mt-1.5 mb-1 leading-relaxed whitespace-pre-wrap break-words bg-slate-50 p-2 rounded-lg border border-slate-100">
                                          {log.message}
                                      </div>
                                      <div className="flex justify-between items-end mt-1.5">
                                          <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1"><Clock size={10}/> {new Date(log.created_at).toLocaleString()}</div>
                                          <span className="text-[10px] font-black text-indigo-500 bg-indigo-50 px-2 py-1 rounded group-hover:bg-indigo-100 transition-colors flex items-center gap-1">前往 CRM 審查 <ArrowRight size={10}/></span>
                                      </div>
                                  </div>
                              </div>
                          )) : (
                              <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-70 py-10">
                                  <UserCheck size={32} className="mb-2"/>
                                  <span className="text-sm font-bold">近期無變更紀錄</span>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20 max-w-[1600px] mx-auto">
      <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-800 mb-2">營運總覽與數據儀表板</h2>
          <p className="text-slate-500 font-medium">即時掌握全台會員狀態與賽事分佈</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Users size={24}/></div>
              <h3 className="text-slate-500 font-bold text-sm">註冊總人數</h3>
              <div className="text-3xl font-black text-slate-800 mt-1">{stats.totalMembers}</div>
          </div>
          
          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-50 rounded-bl-full -z-10 transition-transform group-hover:scale-125"></div>
              <div className="w-12 h-12 rounded-xl bg-green-100 text-green-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10"><Activity size={24}/></div>
              <h3 className="text-slate-500 font-bold text-[13px] md:text-sm whitespace-nowrap">當屆({CURRENT_YEAR})總數 / 新人</h3>
              <div className="text-2xl md:text-3xl font-black text-slate-800 mt-1 flex items-baseline gap-1 relative z-10">
                  <span className="text-green-600">{stats.currentMembers}</span>
                  <span className="text-lg text-slate-400">/</span>
                  <button 
                      onClick={() => setShowNewcomersModal(true)}
                      className="text-xl md:text-2xl text-emerald-500 hover:text-emerald-600 hover:scale-110 transition-transform underline decoration-emerald-300 decoration-2 underline-offset-4 cursor-pointer"
                      title="點擊查看當屆新人名單與剩餘權利"
                  >
                      {stats.newMembers}
                  </button>
              </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group relative overflow-hidden md:col-span-1 lg:col-span-1 col-span-2">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -z-10 transition-transform group-hover:scale-125"></div>
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform relative z-10"><UserCheck size={24}/></div>
              <h3 className="text-slate-500 font-bold text-[13px] md:text-sm whitespace-nowrap">登入 / 未登入 / 異常取消</h3>
              <div className="text-2xl md:text-3xl font-black text-slate-800 mt-1 flex items-baseline gap-1 relative z-10">
                  <button 
                      onClick={() => setShowLoggedModal(true)}
                      className="text-xl md:text-2xl text-blue-600 hover:text-blue-700 hover:scale-110 transition-transform underline decoration-blue-300 decoration-2 underline-offset-4 cursor-pointer"
                      title="點擊查看已登入新系統名單"
                  >
                      {stats.loggedMembers}
                  </button>
                  <span className="text-lg text-slate-300">/</span>
                  <button 
                      onClick={() => setShowUnloggedModal(true)}
                      className="text-xl md:text-2xl text-rose-500 hover:text-rose-600 hover:scale-110 transition-transform underline decoration-rose-300 decoration-2 underline-offset-4 cursor-pointer"
                      title="點擊查看尚未登入名單"
                  >
                      {stats.unloggedMembersCount}
                  </button>
                  <span className="text-lg text-slate-300">/</span>
                  <button 
                      onClick={() => setShowUnlinkedModal(true)}
                      className="text-xl md:text-2xl text-slate-500 hover:text-slate-600 hover:scale-110 transition-transform underline decoration-slate-300 decoration-2 underline-offset-4 cursor-pointer"
                      title="點擊查看舊版異常取消名單"
                  >
                      {stats.unlinkedCount}
                  </button>
              </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><ShieldAlert size={24}/></div>
              <h3 className="text-slate-500 font-bold text-sm">帶隊教官</h3>
              <div className="text-3xl font-black text-slate-800 mt-1 flex items-baseline gap-1 relative z-10">
                  <button 
                      onClick={() => setShowLeaderModal(true)}
                      className="text-3xl font-black text-indigo-600 hover:text-indigo-700 hover:scale-110 transition-transform underline decoration-indigo-300 decoration-2 underline-offset-4 cursor-pointer"
                      title="點擊查看帶隊教官名單"
                  >
                      {stats.teamLeaders}
                  </button>
              </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Award size={24}/></div>
              <h3 className="text-slate-500 font-bold text-sm">VIP 會員</h3>
              <div className="text-3xl font-black text-slate-800 mt-1 flex items-baseline gap-1 relative z-10">
                  <button 
                      onClick={() => setShowVipModal(true)}
                      className="text-3xl font-black text-amber-500 hover:text-amber-600 hover:scale-110 transition-transform underline decoration-amber-300 decoration-2 underline-offset-4 cursor-pointer"
                      title="點擊查看 VIP 會員名單"
                  >
                      {stats.vipMembers}
                  </button>
              </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><GraduationCap size={24}/></div>
              <h3 className="text-slate-500 font-bold text-[13px] md:text-sm">當屆訓練完成</h3>
              <div className="text-3xl font-black text-slate-800 mt-1 flex items-baseline gap-1 relative z-10">
                  <button 
                      onClick={() => setShowTrainedModal(true)}
                      className="text-3xl font-black text-purple-600 hover:text-purple-700 hover:scale-110 transition-transform underline decoration-purple-300 decoration-2 underline-offset-4 cursor-pointer"
                      title="點擊查看當屆訓練結業名單"
                  >
                      {stats.trainedCount}
                  </button>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
          <div 
              className="px-6 py-4 flex justify-between items-center cursor-pointer bg-slate-50 hover:bg-slate-100 transition-colors"
              onClick={() => setShowRaceOverview(!showRaceOverview)}
          >
              <div className="flex items-center gap-2">
                  <Flag className="text-blue-600" size={20} />
                  <h3 className="font-black text-slate-800">賽事總表統計</h3>
                  <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">全部 {raceOverviewStats.total} 場</span>
              </div>
              {showRaceOverview ? <ChevronUp className="text-slate-400" size={20} /> : <ChevronDown className="text-slate-400" size={20} />}
          </div>
          
          {showRaceOverview && (
              <div className="p-6 pt-2 border-t border-slate-100 bg-white grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in-down">
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-black text-slate-500 mb-3 flex items-center gap-1.5"><Calendar size={14}/> 年度統計</h4>
                      <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-sm"><span className="text-slate-600 font-bold">過去賽事</span><span className="font-black text-slate-800">{raceOverviewStats.pastCount}</span></div>
                          <div className="flex justify-between items-center text-sm bg-blue-50/50 p-1.5 -mx-1.5 rounded-lg"><span className="text-blue-700 font-black">當屆 ({CURRENT_YEAR})</span><span className="font-black text-blue-700">{raceOverviewStats.currentYearCount}</span></div>
                          <div className="flex justify-between items-center text-sm"><span className="text-slate-600 font-bold">未來賽事</span><span className="font-black text-slate-800">{raceOverviewStats.futureCount}</span></div>
                      </div>
                  </div>
                  
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                      <h4 className="text-xs font-black text-slate-500 mb-3 flex items-center gap-1.5"><Activity size={14}/> 招募狀態</h4>
                      <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-center text-sm"><span className="text-green-600 font-bold flex items-center gap-1"><Activity size={12}/> 招募中</span><span className="font-black text-green-700">{raceOverviewStats.openCount}</span></div>
                          <div className="flex justify-between items-center text-sm"><span className="text-amber-600 font-bold flex items-center gap-1"><Handshake size={12}/> 洽談中</span><span className="font-black text-amber-700">{raceOverviewStats.negotiatingCount}</span></div>
                          <div className="flex justify-between items-center text-sm"><span className="text-slate-600 font-bold flex items-center gap-1"><Send size={12}/> 已送名單</span><span className="font-black text-slate-800">{raceOverviewStats.submittedCount}</span></div>
                          <div className="flex justify-between items-center text-sm"><span className="text-slate-400 font-bold flex items-center gap-1"><Timer size={12}/> 預備中</span><span className="font-black text-slate-500">{raceOverviewStats.upcomingCount}</span></div>
                      </div>
                  </div>
              </div>
          )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <MapIcon className="text-blue-500"/> 本年度賽事類型分佈 ({CURRENT_YEAR})
              </h3>
              
              <div className="flex flex-col md:flex-row gap-6 flex-1">
                  <div className="w-full md:w-1/3 flex flex-col justify-center space-y-3">
                      <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><Footprints size={16} className="text-blue-500"/> 馬拉松路跑</span>
                          <span className="font-black text-slate-800">{raceStats.marathon} <span className="text-xs text-slate-400 font-normal">場</span></span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><Mountain size={16} className="text-green-600"/> 越野</span>
                          <span className="font-black text-slate-800">{raceStats.trail} <span className="text-xs text-slate-400 font-normal">場</span></span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><Bike size={16} className="text-amber-500"/> 自行車</span>
                          <span className="font-black text-slate-800">{raceStats.bike} <span className="text-xs text-slate-400 font-normal">場</span></span>
                      </div>
                      <div className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          <span className="flex items-center gap-2 text-sm font-bold text-slate-700"><Flag size={16} className="text-red-500"/> 鐵人項</span>
                          <span className="font-black text-slate-800">{raceStats.tri} <span className="text-xs text-slate-400 font-normal">場</span></span>
                      </div>
                  </div>
                  
                  <div className="w-full md:w-2/3 h-[300px] md:h-auto min-h-[350px] rounded-xl overflow-hidden border border-slate-200 relative z-0">
                      <MapContainer 
                          center={TAIWAN_CENTER} 
                          zoom={7} 
                          style={{ height: '100%', width: '100%' }}
                          dragging={false}
                          touchZoom={false}
                          doubleClickZoom={false}
                          scrollWheelZoom={false}
                          zoomControl={false}
                          keyboard={false}
                      >
                          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; CartoDB' />
                          {raceLocations.map((loc, idx) => (
                              <Marker key={idx} position={loc.coord}>
                                  <Popup>
                                      <div className="font-bold text-slate-800">{loc.name}</div>
                                      <div className="text-xs text-slate-500">{loc.date}</div>
                                  </Popup>
                              </Marker>
                          ))}
                      </MapContainer>
                  </div>
              </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200 flex flex-col h-full">
              <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
                  <Users className="text-indigo-500"/> 會員分佈
              </h3>
              
              <div className="flex flex-col md:flex-row gap-6 flex-1">
                  <div className="w-full md:w-1/3 flex flex-col justify-center space-y-2">
                      <div className="flex justify-between items-center bg-indigo-50/50 p-3 rounded-xl border border-indigo-100 mb-2">
                          <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-800"><User size={14}/> 生理男/女</span>
                          <span className="font-black text-indigo-900 text-sm">{demoStats.male} <span className="text-[10px] text-indigo-400">/</span> {demoStats.female}</span>
                      </div>

                      <div className="flex justify-between items-center px-2 py-1.5">
                          <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> 北部</span>
                          <span className="font-black text-slate-800">{demoStats.north} <span className="text-[10px] text-slate-400">人</span></span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1.5 bg-slate-50 rounded-lg">
                          <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> 中部</span>
                          <span className="font-black text-slate-800">{demoStats.central} <span className="text-[10px] text-slate-400">人</span></span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1.5">
                          <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> 南部</span>
                          <span className="font-black text-slate-800">{demoStats.south} <span className="text-[10px] text-slate-400">人</span></span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1.5 bg-slate-50 rounded-lg">
                          <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> 宜花東</span>
                          <span className="font-black text-slate-800">{demoStats.east} <span className="text-[10px] text-slate-400">人</span></span>
                      </div>
                      <div className="flex justify-between items-center px-2 py-1.5">
                          <span className="text-sm font-bold text-slate-600 flex items-center gap-2"><MapPin size={14} className="text-slate-400"/> 金馬澎</span>
                          <span className="font-black text-slate-800">{demoStats.islands} <span className="text-[10px] text-slate-400">人</span></span>
                      </div>
                  </div>
                  
                  <div className="w-full md:w-2/3 h-[300px] md:h-auto min-h-[350px] rounded-xl overflow-hidden border border-slate-200 relative z-0 bg-blue-50/30">
                      <MapContainer 
                          center={[23.8, 120.5]} 
                          zoom={6.5} 
                          style={{ height: '100%', width: '100%' }}
                          dragging={false}
                          touchZoom={false}
                          doubleClickZoom={false}
                          scrollWheelZoom={false}
                          zoomControl={false}
                          keyboard={false}
                      >
                          <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution='&copy; CartoDB' />
                          
                          {demoStats.north > 0 && (
                              <CircleMarker center={regionCenters.north} radius={Math.max(10, Math.min(30, demoStats.north / 10))} pathOptions={{ color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.6 }}>
                                  <Popup><div className="font-bold">北部會員: {demoStats.north} 人</div></Popup>
                              </CircleMarker>
                          )}
                          {demoStats.central > 0 && (
                              <CircleMarker center={regionCenters.central} radius={Math.max(10, Math.min(30, demoStats.central / 10))} pathOptions={{ color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.6 }}>
                                  <Popup><div className="font-bold">中部會員: {demoStats.central} 人</div></Popup>
                              </CircleMarker>
                          )}
                          {demoStats.south > 0 && (
                              <CircleMarker center={regionCenters.south} radius={Math.max(10, Math.min(30, demoStats.south / 10))} pathOptions={{ color: '#10b981', fillColor: '#10b981', fillOpacity: 0.6 }}>
                                  <Popup><div className="font-bold">南部會員: {demoStats.south} 人</div></Popup>
                              </CircleMarker>
                          )}
                          {demoStats.east > 0 && (
                              <CircleMarker center={regionCenters.east} radius={Math.max(10, Math.min(30, demoStats.east / 10))} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.6 }}>
                                  <Popup><div className="font-bold">東部會員: {demoStats.east} 人</div></Popup>
                              </CircleMarker>
                          )}
                          {demoStats.islands > 0 && (
                              <CircleMarker center={regionCenters.islands} radius={Math.max(8, Math.min(25, demoStats.islands / 5))} pathOptions={{ color: '#8b5cf6', fillColor: '#8b5cf6', fillOpacity: 0.6 }}>
                                  <Popup><div className="font-bold">離島會員: {demoStats.islands} 人</div></Popup>
                              </CircleMarker>
                          )}
                      </MapContainer>
                  </div>
              </div>
          </div>

      </div>

      {/* 🌟 追蹤名單：當屆未登入名單 Modal */}
      {showUnloggedModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 animate-fade-in backdrop-blur-sm" onClick={() => setShowUnloggedModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                  
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <UserMinus className="text-rose-500"/> 未登入名單
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">共 {unloggedList.length} 人</span>
                      </h3>
                      <button onClick={() => setShowUnloggedModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>
                  
                  <div className="bg-blue-50 text-blue-700 text-[11px] p-4 font-bold flex items-start gap-2 border-b border-blue-100 shrink-0">
                      <Info size={16} className="shrink-0 mt-0.5"/>
                      <p className="leading-relaxed">
                          此名單為尚未透過 Google 帳號授權登入新系統之有效會員（不含已強制解除媒合之異常帳號）。
                      </p>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-3">
                      {unloggedList.length > 0 ? unloggedList.map(m => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-rose-50/30 hover:border-rose-200 transition-colors gap-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">{m.full_name?.charAt(0) || '?'}</div>
                                  <div>
                                      <div className="font-black text-slate-800 text-sm flex items-center gap-2">{m.full_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5" title="資料庫 UUID">系統 ID: {m.id?.substring(0,8)}...</div>
                                  </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1.5">
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Mail size={12} className="text-slate-400"/> {m.email || '未建檔信箱'}</span>
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {m.phone || '未建檔電話'}</span>
                              </div>
                          </div>
                      )) : (
                          <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                              <div className="text-sm font-bold text-slate-500">目前尚無未登入資料</div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                      <button onClick={() => setShowUnloggedModal(false)} className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-colors active:scale-95">關閉名單</button>
                  </div>
              </div>
          </div>
      )}

      {/* 🌟 追蹤名單：當屆登入名單 Modal */}
      {showLoggedModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 animate-fade-in backdrop-blur-sm" onClick={() => setShowLoggedModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                  
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <UserCheck className="text-blue-500"/> 當屆登入名單
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">共 {loggedList.length} 人</span>
                      </h3>
                      <button onClick={() => setShowLoggedModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>
                  
                  <div className="bg-blue-50 text-blue-700 text-[11px] p-4 font-bold flex items-start gap-2 border-b border-blue-100 shrink-0">
                      <Info size={16} className="shrink-0 mt-0.5"/>
                      <p className="leading-relaxed">
                          此名單為前端過濾排除「未登入」與「已解除媒合」之異常帳號，代表擁有真實有效登入憑證的現役會員。
                      </p>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-3">
                      {loggedList.length > 0 ? loggedList.map(m => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-blue-50/30 hover:border-blue-200 transition-colors gap-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">{m.full_name?.charAt(0) || '?'}</div>
                                  <div>
                                      <div className="font-black text-slate-800 text-sm flex items-center gap-2">{m.full_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5" title="資料庫 UUID">系統 ID: {m.id?.substring(0,8)}...</div>
                                  </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1.5">
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Mail size={12} className="text-slate-400"/> {m.email || '未建檔信箱'}</span>
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {m.phone || '未建檔電話'}</span>
                              </div>
                          </div>
                      )) : (
                          <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                              <div className="text-sm font-bold text-slate-500">目前尚無人員登入</div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                      <button onClick={() => setShowLoggedModal(false)} className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-colors active:scale-95">關閉名單</button>
                  </div>
              </div>
          </div>
      )}

      {/* 🌟 追蹤名單：舊版異常取消名單 Modal (向下相容) */}
      {showUnlinkedModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 animate-fade-in backdrop-blur-sm" onClick={() => setShowUnlinkedModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                  
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <UserX className="text-slate-500"/> 舊版異常取消名單
                          <span className="bg-slate-200 text-slate-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">共 {unlinkedList.length} 人</span>
                      </h3>
                      <button onClick={() => setShowUnlinkedModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>
                  
                  <div className="bg-slate-50 text-slate-600 text-[11px] p-4 font-bold flex items-start gap-2 border-b border-slate-200 shrink-0">
                      <Info size={16} className="shrink-0 mt-0.5"/>
                      <p className="leading-relaxed">
                          此名單僅保留舊版強制修改信箱的異常帳號供查閱。<br/>
                          💡 系統優化後：新解除帳號媒合者，將保留原始信箱，並直接歸入「未登入」名單。
                      </p>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-3">
                      {unlinkedList.length > 0 ? unlinkedList.map(m => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-slate-50 hover:border-slate-300 transition-colors gap-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center font-black text-sm">{m.full_name?.charAt(0) || '?'}</div>
                                  <div>
                                      <div className="font-black text-slate-800 text-sm flex items-center gap-2">{m.full_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5" title="資料庫 UUID">系統 ID: {m.id?.substring(0,8)}...</div>
                                  </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1.5">
                                  <span className="text-xs font-bold text-rose-500 flex items-center gap-1.5"><Mail size={12} className="text-rose-400"/> {m.email || '未建檔信箱'}</span>
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {m.phone || '未建檔電話'}</span>
                              </div>
                          </div>
                      )) : (
                          <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                              <div className="text-sm font-bold text-slate-500">目前尚無舊版異常取消資料</div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                      <button onClick={() => setShowUnlinkedModal(false)} className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-colors active:scale-95">關閉名單</button>
                  </div>
              </div>
          </div>
      )}

      {/* 🌟 追蹤名單：當屆新人名單 Modal */}
      {showNewcomersModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 animate-fade-in backdrop-blur-sm" onClick={() => setShowNewcomersModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>

                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <Sprout className="text-emerald-500"/> 當屆新人名單與權利追蹤
                          <span className="bg-emerald-100 text-emerald-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">共 {newcomersList.length} 人</span>
                      </h3>
                      <button onClick={() => setShowNewcomersModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>

                  <div className="bg-emerald-50 text-emerald-700 text-[11px] p-4 font-bold flex items-start gap-2 border-b border-emerald-100 shrink-0">
                      <Info size={16} className="shrink-0 mt-0.5"/>
                      <p className="leading-relaxed">
                          名單排序：已依照「剩餘優先權利次數」由少到多排序。新人擁有專屬報名階段的優先登記權益。
                      </p>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-3">
                      {newcomersList.length > 0 ? newcomersList.map(m => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-emerald-50/30 hover:border-emerald-200 transition-colors gap-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm">{m.full_name?.charAt(0) || '?'}</div>
                                  <div>
                                      <div className="font-black text-slate-800 text-sm flex items-center gap-2">{m.full_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5" title="資料庫 UUID">系統 ID: {m.id?.substring(0,8)}...</div>
                                  </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1.5">
                                  <span className="text-xs font-black text-emerald-600 flex items-center gap-1.5 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 shadow-sm">
                                      <Sprout size={12}/> 剩餘優先權利: {m.newbie_passes ?? 0} 次
                                  </span>
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Mail size={12} className="text-slate-400"/> {m.email || '未建檔信箱'}</span>
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {m.phone || '未建檔電話'}</span>
                              </div>
                          </div>
                      )) : (
                          <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                              <div className="text-sm font-bold text-slate-500">目前尚無新人資料</div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                      <button onClick={() => setShowNewcomersModal(false)} className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-colors active:scale-95">關閉名單</button>
                  </div>
              </div>
          </div>
      )}

      {/* 🌟 追蹤名單：帶隊教官名單 Modal */}
      {showLeaderModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 animate-fade-in backdrop-blur-sm" onClick={() => setShowLeaderModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <ShieldAlert className="text-indigo-500"/> 帶隊教官名單
                          <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">共 {leaderList.length} 人</span>
                      </h3>
                      <button onClick={() => setShowLeaderModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-3">
                      {leaderList.length > 0 ? leaderList.map(m => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-indigo-50/30 hover:border-indigo-200 transition-colors gap-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">{m.full_name?.charAt(0) || '?'}</div>
                                  <div>
                                      <div className="font-black text-slate-800 text-sm flex items-center gap-2">{m.full_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">系統 ID: {m.id?.substring(0,8)}...</div>
                                  </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1.5">
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Mail size={12} className="text-slate-400"/> {m.email || '未建檔信箱'}</span>
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {m.phone || '未建檔電話'}</span>
                              </div>
                          </div>
                      )) : (
                          <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                              <div className="text-sm font-bold text-slate-500">目前尚無帶隊教官資料</div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                      <button onClick={() => setShowLeaderModal(false)} className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-colors active:scale-95">關閉名單</button>
                  </div>
              </div>
          </div>
      )}

      {/* 🌟 追蹤名單：VIP 會員名單 Modal */}
      {showVipModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 animate-fade-in backdrop-blur-sm" onClick={() => setShowVipModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <Award className="text-amber-500"/> VIP 會員名單
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">共 {vipList.length} 人</span>
                      </h3>
                      <button onClick={() => setShowVipModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-3">
                      {vipList.length > 0 ? vipList.map(m => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-amber-50/30 hover:border-amber-200 transition-colors gap-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">{m.full_name?.charAt(0) || '?'}</div>
                                  <div>
                                      <div className="font-black text-slate-800 text-sm flex items-center gap-2">{m.full_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">系統 ID: {m.id?.substring(0,8)}...</div>
                                  </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1.5">
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Mail size={12} className="text-slate-400"/> {m.email || '未建檔信箱'}</span>
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {m.phone || '未建檔電話'}</span>
                              </div>
                          </div>
                      )) : (
                          <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                              <div className="text-sm font-bold text-slate-500">目前尚無 VIP 會員資料</div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                      <button onClick={() => setShowVipModal(false)} className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-colors active:scale-95">關閉名單</button>
                  </div>
              </div>
          </div>
      )}

      {/* 🌟 追蹤名單：當屆訓練結業名單 Modal */}
      {showTrainedModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 animate-fade-in backdrop-blur-sm" onClick={() => setShowTrainedModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <GraduationCap className="text-purple-500"/> 當屆訓練結業名單
                          <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">共 {trainedList.length} 人</span>
                      </h3>
                      <button onClick={() => setShowTrainedModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>

                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-white space-y-3">
                      {trainedList.length > 0 ? trainedList.map(m => (
                          <div key={m.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-slate-100 hover:bg-purple-50/30 hover:border-purple-200 transition-colors gap-3">
                              <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center font-black text-sm">{m.full_name?.charAt(0) || '?'}</div>
                                  <div>
                                      <div className="font-black text-slate-800 text-sm flex items-center gap-2">{m.full_name}</div>
                                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">系統 ID: {m.id?.substring(0,8)}...</div>
                                  </div>
                              </div>
                              <div className="flex flex-col sm:items-end gap-1.5">
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Mail size={12} className="text-slate-400"/> {m.email || '未建檔信箱'}</span>
                                  <span className="text-xs font-bold text-slate-600 flex items-center gap-1.5"><Phone size={12} className="text-slate-400"/> {m.phone || '未建檔電話'}</span>
                              </div>
                          </div>
                      )) : (
                          <div className="text-center py-12 flex flex-col items-center justify-center gap-3">
                              <div className="text-sm font-bold text-slate-500">目前尚無訓練結業資料</div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                      <button onClick={() => setShowTrainedModal(false)} className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-colors active:scale-95">關閉名單</button>
                  </div>
              </div>
          </div>
      )}

      {/* 🌟 系統資料庫管理 / 匯入中心 + 獨立插入的帳號解除媒合區塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mt-6 md:mt-8">
          
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 relative overflow-hidden group">
              <h3 className="font-black text-slate-800 mb-5 flex items-center gap-2">系統資料庫管理 / 匯入中心</h3>
              <p className="text-slate-500 text-sm mb-6 font-medium leading-relaxed">執行年度會員資料更新、名單匯入，或是重置人員參數的專屬管理通道。</p>
              <button onClick={() => navigate('/admin/import')} className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-slate-900 font-black rounded-xl text-sm transition-all active:scale-95 shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2">
                  <FileSpreadsheet size={18}/> 前往資料匯入與重置中心
              </button>
          </div>

          <div className="bg-gradient-to-b from-slate-900 to-slate-800 rounded-[2rem] shadow-xl border border-slate-700 p-6 relative overflow-hidden flex-1 flex flex-col group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-bl-full blur-2xl"></div>
              
              <div className="flex justify-between items-center mb-5 relative z-10">
                  <h3 className="font-black text-white flex items-center gap-2"><Zap size={18} className="text-amber-400"/> 解除帳號媒合</h3>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded border border-slate-700 font-bold uppercase tracking-wider">Admin Engine</span>
              </div>

              <div className="relative z-10 flex flex-col h-full justify-center gap-4">
                  <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Search className="h-4 w-4 text-slate-400" />
                      </div>
                      <input 
                          type="text" 
                          placeholder="智能搜尋：輸入姓名、信箱或身分證..." 
                          className="w-full bg-slate-950 border border-slate-700 text-white pl-10 pr-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-amber-500 outline-none transition-all placeholder-slate-600"
                          value={searchAccountInput}
                          onChange={(e) => setSearchAccountInput(e.target.value)}
                      />
                      {isSearchingAccount && (
                          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                              <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
                          </div>
                      )}
                  </div>

                  {searchAccountResult ? (
                      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700 shadow-inner animate-fade-in">
                          <div className="flex justify-between items-start mb-3">
                              <div>
                                  <div className="font-black text-white text-lg">{searchAccountResult.full_name}</div>
                                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">{searchAccountResult.id?.slice(0, 13)}...</div>
                              </div>
                              <span className={`text-[10px] px-2 py-1 rounded font-black ${searchAccountResult.is_current_member === 'Y' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-700 text-slate-400'}`}>
                                  {searchAccountResult.is_current_member === 'Y' ? '當屆會員' : '非當屆'}
                              </span>
                          </div>
                          
                          <div className="space-y-1.5 mb-4">
                              <div className="text-xs font-medium text-slate-300 flex items-center gap-2"><Mail size={12} className="text-slate-500"/> {searchAccountResult.email}</div>
                              <div className="text-xs font-medium text-slate-300 flex items-center gap-2"><UserCheck size={12} className="text-slate-500"/> {searchAccountResult.national_id || '未登錄'}</div>
                          </div>

                          <button 
                              onClick={handleUnlinkAccount}
                              disabled={isUnlinkingAccount}
                              className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-black rounded-lg text-sm transition-colors active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                              {isUnlinkingAccount ? <Loader2 size={16} className="animate-spin"/> : <AlertTriangle size={16}/>}
                              強制解除帳號媒合
                          </button>
                      </div>
                  ) : searchAccountInput.trim().length > 1 && !isSearchingAccount ? (
                      <div className="bg-slate-800/50 rounded-xl p-6 border border-dashed border-slate-700 text-center animate-fade-in">
                          <div className="text-slate-500 text-sm font-bold">查無相符的會員資料</div>
                      </div>
                  ) : (
                      <div className="bg-slate-800/30 rounded-xl p-6 border border-slate-800 text-center">
                          <Info size={24} className="text-slate-600 mx-auto mb-2 opacity-50"/>
                          <div className="text-slate-400 text-xs font-medium leading-relaxed">
                              用於處理會員綁錯帳號、或更換信箱之異常排除。<br/>解除帳號媒合後，該會員需重新進行身份驗證。
                          </div>
                      </div>
                  )}
              </div>
          </div>

          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 p-6 md:p-8 lg:col-span-2 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-bl-full blur-2xl"></div>

              <div className="flex justify-between items-center mb-6 relative z-10">
                  <h3 className="font-black text-slate-800 flex items-center gap-2"><Server size={20} className="text-indigo-500"/> 系統版本與發布控制中心</h3>
                  <div className="flex gap-2">
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full font-black border border-indigo-100 uppercase tracking-wider">Release Management</span>
                      <span className="text-[10px] bg-rose-50 text-rose-600 px-2 py-1 rounded-full font-black border border-rose-100 uppercase tracking-wider">限管理員可見</span>
                  </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
                  <div className="flex flex-col gap-4">
                      <div className={`p-5 rounded-2xl border ${updateCount >= 5 ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'} transition-colors`}>
                          <div className="flex justify-between items-start mb-2">
                              <div className="text-sm font-black text-slate-700 flex items-center gap-2">
                                  <List size={16} className={updateCount >= 5 ? 'text-rose-500' : 'text-slate-500'}/>
                                  系統變更項次
                              </div>
                              <div className={`text-2xl font-black ${updateCount >= 5 ? 'text-rose-600' : 'text-slate-800'}`}>
                                  {updateCount} <span className="text-sm font-medium text-slate-500">項</span>
                              </div>
                          </div>
                          <p className={`text-xs font-bold leading-relaxed mt-2 ${updateCount >= 5 ? 'text-rose-500' : 'text-slate-500'}`}>
                              這些是您與其他管理員在後台執行的異動紀錄。<br/>
                              點擊下方發布按鈕後，系統將透過 WebSocket 廣播，強制全體在線會員的手機瞬間清除舊快取並重新載入最新資料。<br/>
                              <span className="text-[10px] text-slate-400 font-medium">※ 發布後僅重置次數，操作日誌將永久保留以供查核。</span>
                          </p>
                      </div>

                      <button
                          onClick={handleBroadcastRelease}
                          disabled={updateCount === 0}
                          className={`w-full py-4 rounded-xl font-black text-sm flex justify-center items-center gap-2 transition-all active:scale-95 shadow-lg
                              ${updateCount >= 5 ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30 animate-pulse' :
                                updateCount > 0 ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30' :
                                'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'}`}
                      >
                          <Rocket size={18}/>
                          發布全域更新 (強制全體會員重載)
                      </button>
                  </div>

                  <div className="flex flex-col gap-4">
                      <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <div>
                              <div className="text-sm font-black text-slate-800 flex items-center gap-2">
                                  <ShieldAlert size={16} className={errorBoundaryEnabled ? 'text-green-500' : 'text-slate-400'}/>
                                  系統異常防護網 (Error Boundary)
                              </div>
                              <div className="text-[15px] font-bold text-slate-500 mt-1">攔截前端致命崩潰並引導重新載入</div>
                          </div>
                          <button
                              onClick={handleToggleErrorBoundary}
                              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${errorBoundaryEnabled ? 'bg-green-500' : 'bg-slate-300'}`}
                          >
                              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${errorBoundaryEnabled ? 'translate-x-6' : 'translate-x-1'}`}/>
                          </button>
                      </div>

                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex-1 overflow-hidden flex flex-col min-h-[220px]">
                          <div className="text-xs font-black text-slate-700 mb-3 flex items-center gap-2"><Radio size={14} className="text-slate-400"/> 系統修改備註日誌 </div>
                          <div className="overflow-y-auto custom-scrollbar flex-1 space-y-3 pr-2">
                              {Object.keys(groupedReleaseLogs).length > 0 ? (
                                  Object.entries(groupedReleaseLogs).map(([month, logs]) => {
                                      const isExpanded = expandedReleaseMonths[month];
                                      const readCount = readReleaseCounts[month] || 0;
                                      const hasUnread = logs.length > readCount;

                                      return (
                                          <div key={month} className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm group/month">
                                              <button
                                                  onClick={() => toggleReleaseMonth(month)}
                                                  className="w-full flex justify-between items-center p-2.5 bg-slate-50 hover:bg-slate-100 transition-colors"
                                              >
                                                  <span className="text-xs font-black text-slate-700">{month}</span>
                                                  <div className="flex items-center gap-2">
                                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors ${hasUnread ? 'bg-rose-500 text-white animate-pulse shadow-md shadow-rose-500/30' : 'bg-slate-200 text-slate-500'}`}>
                                                          {logs.length} 筆
                                                      </span>
                                                      {isExpanded ? <ChevronUp size={14} className="text-slate-400"/> : <ChevronDown size={14} className="text-slate-400"/>}
                                                  </div>
                                              </button>
                                              {isExpanded && (
                                                  <div className="p-2 space-y-2 border-t border-slate-100 bg-white">
                                                      {logs.map((log, idx) => (
                                                          <div key={idx} className={`p-2 rounded-lg border text-xs flex justify-between items-center gap-2 ${idx < (logs.length - readCount) ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100'}`}>
                                                              <div className={`font-bold truncate flex-1 ${idx < (logs.length - readCount) ? 'text-rose-700' : 'text-slate-800'}`}>{log.action}</div>
                                                              <div className="text-[9px] text-slate-400 font-mono shrink-0">{log.time}</div>
                                                          </div>
                                                      ))}
                                                  </div>
                                              )}
                                          </div>
                                      )
                                  })
                              ) : (
                                  <div className="text-center py-6 text-slate-400 text-xs font-bold">目前尚無未發布之異動</div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

    </div>
  )
}