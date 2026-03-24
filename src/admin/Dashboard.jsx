import { useState, useEffect, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
// 🌟 確保新增了需要的圖示包含 Info, Sprout
import { Users, Activity, Award, ShieldAlert, Map as MapIcon, Loader2, Flag, Mountain, Bike, Footprints, User, MapPin, Bell, UserCheck, Calendar, Clock, History, ChevronUp, ChevronDown, Handshake, Send, Timer, ArrowRight, X, UserMinus, Mail, Phone, Info, Sprout } from 'lucide-react'

// 修正 Leaflet icon 消失問題
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({
    iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// 台灣縣市賽事座標對應表
const cityCoordinates = {
    "台北": [25.0330, 121.5654], "新北": [25.0172, 121.4625], "桃園": [24.9936, 121.3010],
    "台中": [24.1477, 120.6736], "台南": [22.9997, 120.2270], "高雄": [22.6273, 120.3014],
    "新竹": [24.8138, 120.9675], "苗栗": [24.5602, 120.8214], "彰化": [24.0518, 120.5393],
    "南投": [23.9610, 120.9719], "雲林": [23.7092, 120.4313], "嘉義": [23.4801, 120.4491],
    "屏東": [22.6687, 120.4862], "宜蘭": [24.7021, 121.7377], "花蓮": [23.9872, 121.6016],
    "台東": [22.7583, 121.1444], "澎湖": [23.5711, 119.5793], "金門": [24.4492, 118.3186],
    "連江": [26.1505, 119.9360]
}

// 區域中心圓點座標 (用於會員分佈地圖)
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

  // 頂部四大指標 + 轉換率指標
  const [stats, setStats] = useState({
      totalMembers: 0,
      currentMembers: 0,
      newMembers: 0,
      teamLeaders: 0,
      vipMembers: 0,
      loggedMembers: 0,          
      unloggedMembersCount: 0    
  })
  
  // 🌟 追蹤名單狀態 (包含未登入、已登入、新人名單)
  const [unloggedList, setUnloggedList] = useState([])
  const [loggedList, setLoggedList] = useState([])
  const [newcomersList, setNewcomersList] = useState([]) // 🌟 新增：新人名單
  
  const [showUnloggedModal, setShowUnloggedModal] = useState(false)
  const [showLoggedModal, setShowLoggedModal] = useState(false)
  const [showNewcomersModal, setShowNewcomersModal] = useState(false) // 🌟 新增：新人彈窗控制

  // 原本的賽事地圖分類資料
  const [raceStats, setRaceStats] = useState({
      marathon: 0, trail: 0, bike: 0, tri: 0
  })
  const [raceLocations, setRaceLocations] = useState([])

  // 會員分佈資料
  const [demoStats, setDemostats] = useState({
      male: 0, female: 0,
      north: 0, central: 0, south: 0, east: 0, islands: 0
  })

  // 通知狀態
  const [recentRaces, setRecentRaces] = useState([])
  const [profileUpdates, setProfileUpdates] = useState([])

  // 移植專用狀態：保留所有賽事原始資料供總表計算
  const [allRacesData, setAllRacesData] = useState([])
  const [showRaceOverview, setShowRaceOverview] = useState(true)

  useEffect(() => {
      fetchDashboardData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchDashboardData = async () => {
      try {
          // 1. 抓取基本數量統計
          const [
              { count: total },
              { count: current },
              { count: newM },
              { count: leaders },
              { count: vips }
          ] = await Promise.all([
              supabase.from('profiles').select('*', { count: 'exact', head: true }),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_current_member', 'Y'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_current_member', 'Y').eq('is_new_member', 'Y'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_team_leader', 'Y'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_vip', 'Y')
          ]);

          // 2. 後端 API 直連：呼叫 PostgreSQL 函數，取得最真實的 auth.users 交叉比對資料
          const { data: activationData, error: rpcError } = await supabase.rpc('get_member_activation_stats');
          
          let loggedInCount = 0;
          let unloggedArray = [];
          let loggedArray = [];

          if (!rpcError && activationData) {
              loggedInCount = activationData.logged_count || 0;
              unloggedArray = activationData.unlogged_list || [];

              // 獲取已登入名單：從 profile 抓取所有當屆會員，扣除未登入名單
              const { data: allCurrentMembers } = await supabase.from('profiles')
                  .select('id, full_name, email, phone')
                  .eq('is_current_member', 'Y')
                  .limit(5000);

              if (allCurrentMembers) {
                  loggedArray = allCurrentMembers.filter(m => !unloggedArray.some(u => u.id === m.id));
              }
          } else {
              console.error("後端 RPC 呼叫失敗", rpcError);
          }
          
          setUnloggedList(unloggedArray);
          setLoggedList(loggedArray);

          // 🌟 3. 獨立抓取「當屆新人名單」並附帶 newbie_passes 欄位
          const { data: newMembersData } = await supabase.from('profiles')
              .select('id, full_name, email, phone, newbie_passes')
              .eq('is_current_member', 'Y')
              .eq('is_new_member', 'Y')
              .limit(1000);
          
          let sortedNewcomers = [];
          if (newMembersData) {
              // 🌟 智能排序：依據剩餘權利次數「由少到多 (Ascending)」排序
              sortedNewcomers = newMembersData.sort((a, b) => (a.newbie_passes || 0) - (b.newbie_passes || 0));
          }
          setNewcomersList(sortedNewcomers);
          
          setStats({
              totalMembers: total || 0, 
              currentMembers: current || 0,
              newMembers: sortedNewcomers.length || newM || 0, // 確保數據一致性
              teamLeaders: leaders || 0,
              vipMembers: vips || 0,
              loggedMembers: loggedInCount,
              unloggedMembersCount: unloggedArray.length
          })

          // 4. 抓取賽事資料
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

          // 5. 抓取地圖與性別分佈
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

          // 6. 抓取通知
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

  // 送出隱形包裹的導航函數 (支援雷達 ID 掃描)
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

  if (loading) return <div className="h-[60vh] flex items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> 正在載入醫鐵總部賽事數據...</div>

  if (currentView === 'NOTIFICATIONS') {
      return (
          <div className="space-y-6 md:space-y-8 animate-fade-in pb-20">
              <div className="mb-6">
                  <h2 className="text-3xl font-black text-slate-800 mb-2 flex items-center gap-2">
                      <Bell className="text-amber-500"/> 醫鐵通知中心
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
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20">
      <div className="mb-8">
          <h2 className="text-3xl font-black text-slate-800 mb-2">醫鐵數據儀表板</h2>
          <p className="text-slate-500 font-medium">即時掌握全台醫護鐵人會員與賽事分佈</p>
      </div>

      {/* 🌟 擴充為 5 格排版，包含當屆轉換追蹤 */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-6">
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
                  {/* 🌟 修改為可點擊的按鈕，觸發新人名單彈窗 */}
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
              <h3 className="text-slate-500 font-bold text-[13px] md:text-sm whitespace-nowrap">當屆登入 / 未登入追蹤</h3>
              <div className="text-2xl md:text-3xl font-black text-slate-800 mt-1 flex items-baseline gap-1 relative z-10">
                  <button 
                      onClick={() => setShowLoggedModal(true)}
                      className="text-xl md:text-2xl text-blue-600 hover:text-blue-700 hover:scale-110 transition-transform underline decoration-blue-300 decoration-2 underline-offset-4 cursor-pointer"
                      title="點擊查看已登入新系統名單"
                  >
                      {stats.loggedMembers}
                  </button>
                  <span className="text-lg text-slate-400">/</span>
                  <button 
                      onClick={() => setShowUnloggedModal(true)}
                      className="text-xl md:text-2xl text-rose-500 hover:text-rose-600 hover:scale-110 transition-transform underline decoration-rose-300 decoration-2 underline-offset-4 cursor-pointer"
                      title="點擊查看尚未登入新系統名單"
                  >
                      {stats.unloggedMembersCount}
                  </button>
              </div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><ShieldAlert size={24}/></div>
              <h3 className="text-slate-500 font-bold text-sm">帶隊教官</h3>
              <div className="text-3xl font-black text-slate-800 mt-1">{stats.teamLeaders}</div>
          </div>

          <div className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow group">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform"><Award size={24}/></div>
              <h3 className="text-slate-500 font-bold text-sm">VIP 會員</h3>
              <div className="text-3xl font-black text-slate-800 mt-1">{stats.vipMembers}</div>
          </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden transition-all duration-300">
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
                  <Users className="text-indigo-500"/> 醫護鐵人會員分佈
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

      {/* 🌟 追蹤名單：當屆未登入新系統名單 Modal */}
      {showUnloggedModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 animate-fade-in backdrop-blur-sm" onClick={() => setShowUnloggedModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                  
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <UserMinus className="text-rose-500"/> 當屆未登入新系統名單
                          <span className="bg-rose-100 text-rose-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">共 {unloggedList.length} 人</span>
                      </h3>
                      <button onClick={() => setShowUnloggedModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>
                  
                  <div className="bg-blue-50 text-blue-700 text-[11px] p-4 font-bold flex items-start gap-2 border-b border-blue-100 shrink-0">
                      <Info size={16} className="shrink-0 mt-0.5"/>
                      <p className="leading-relaxed">
                          判定基準說明：此數據由系統後端 (RPC) 直接連線至真實身份驗證庫 (auth.users) 取得，擁有最高準確度。清單中之人員代表「尚未透過 Google 帳號授權登入新系統」。
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
                              <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-2"><CheckCircle size={32}/></div>
                              <div className="text-lg font-black text-slate-800">太棒了！</div>
                              <div className="text-sm font-bold text-slate-500">所有當屆會員都已經成功轉換並登入新系統！</div>
                          </div>
                      )}
                  </div>

                  <div className="p-4 bg-slate-50 border-t border-slate-100 shrink-0">
                      <button onClick={() => setShowUnloggedModal(false)} className="w-full py-3.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-black rounded-xl transition-colors active:scale-95">關閉名單</button>
                  </div>
              </div>
          </div>
      )}

      {/* 🌟 追蹤名單：當屆已登入新系統名單 Modal */}
      {showLoggedModal && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] p-4 animate-fade-in backdrop-blur-sm" onClick={() => setShowLoggedModal(false)}>
              <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-bounce-in" onClick={e => e.stopPropagation()}>
                  
                  <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <UserCheck className="text-blue-500"/> 當屆已登入新系統名單
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-black px-2 py-0.5 rounded-full ml-2">共 {loggedList.length} 人</span>
                      </h3>
                      <button onClick={() => setShowLoggedModal(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors active:scale-95"><X size={20}/></button>
                  </div>
                  
                  <div className="bg-blue-50 text-blue-700 text-[11px] p-4 font-bold flex items-start gap-2 border-b border-blue-100 shrink-0">
                      <Info size={16} className="shrink-0 mt-0.5"/>
                      <p className="leading-relaxed">
                          判定基準說明：名單為系統後端 (RPC) 交叉比對真實身份驗證庫 (auth.users) 後，已成功登入之人員名單。
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

    </div>
  )
}