import React, { useState, useRef, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import BulkImport from './BulkImport';
import PermissionManager from './PermissionManager';

// 🎨 輔助函式：取得賽事類型的專屬色系與圖示
const getCategoryTheme = (type) => {
  if (type.includes('路跑')) return { icon: '🏃', bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', bar: 'bg-orange-500', gradient: 'from-orange-400 to-red-500' };
  if (type.includes('三鐵')) return { icon: '🏊🚴🏃', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', bar: 'bg-blue-500', gradient: 'from-blue-400 to-indigo-500' };
  if (type.includes('接力')) return { icon: '🤝', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', bar: 'bg-purple-500', gradient: 'from-purple-400 to-pink-500' };
  if (type.includes('單車')) return { icon: '🚴', bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', bar: 'bg-teal-500', gradient: 'from-teal-400 to-emerald-500' };
  if (type.includes('游泳')) return { icon: '🏊', bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', bar: 'bg-cyan-500', gradient: 'from-cyan-400 to-blue-500' };
  return { icon: '🏆', bg: 'bg-gray-50', text: 'text-gray-600', border: 'border-gray-200', bar: 'bg-gray-500', gradient: 'from-gray-400 to-slate-500' };
};

// 📊 1. 戰情數據卡
const StatCard = ({ title, value, icon, gradient, onClick }) => (
  <div 
    onClick={onClick}
    className={`relative overflow-hidden rounded-2xl shadow-lg text-white p-6 bg-gradient-to-br ${gradient} transform hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer group`}
  >
    <div className="absolute -right-4 -top-4 text-8xl opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-500">{icon}</div>
    <div className="relative z-10 flex flex-col justify-between h-full">
      <div>
        <p className="text-sm font-medium opacity-90 mb-1 tracking-wide border-b border-white/20 pb-1 inline-block">{title}</p>
        <h3 className="text-4xl font-extrabold mt-2">{value}</h3>
      </div>
      <div className="mt-4 flex items-center gap-2 text-xs font-bold opacity-80 group-hover:opacity-100 bg-white/20 w-fit px-3 py-1 rounded-full backdrop-blur-sm">
        <span>點擊查看分析</span>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
        </svg>
      </div>
    </div>
  </div>
);

// 🎛️ 2. 主選單按鈕
const MenuCard = ({ title, icon, color, desc, onClick }) => (
  <button onClick={onClick} className="group relative bg-white p-6 rounded-3xl shadow-sm border border-gray-100 text-left transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl mb-4 transition-colors ${color}`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-gray-800 group-hover:text-navy">{title}</h3>
      <p className="text-sm text-gray-500 mt-2 leading-relaxed">{desc}</p>
  </button>
);

// 🏃 3. 賽事健康度卡片
const EventHealthCard = ({ event, onEdit }) => {
  const theme = getCategoryTheme(event.category_type);
  const totalSeats = event.seats || 0;
  const totalRegistered = Array.isArray(event.tags) ? event.tags.reduce((acc, tag) => acc + (tag.registered || 0), 0) : 0;
  const progress = totalSeats > 0 ? Math.min((totalRegistered / totalSeats) * 100, 100) : 0;
  
  const getStatusBadge = (s) => {
    if (s === '開放中') return <span className="flex items-center gap-1 bg-green-100 text-green-700 px-2 py-0.5 rounded text-[10px] font-bold border border-green-200"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>開放中</span>;
    if (s === '截止,名單送大會') return <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold border border-red-200">已截止</span>;
    if (s === '待開放報名') return <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded text-[10px] font-bold border border-yellow-200">即將開放</span>;
    return <span className="bg-gray-100 text-gray-500 px-2 py-0.5 rounded text-[10px] font-bold border border-gray-200">籌備中</span>;
  };

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:border-navy/20 transition-all duration-300 flex flex-col justify-between h-full relative overflow-hidden">
      <div className={`h-4 w-full ${theme.bar}`}></div>
      <div className="p-5">
        <div className="flex justify-between items-start mb-3">
            {getStatusBadge(event.status)}
            <span className="text-xs text-gray-400 font-mono bg-gray-50 px-2 py-1 rounded">{event.date}</span>
        </div>
        <div className="flex items-start gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${theme.bg}`}>{theme.icon}</div>
            <div>
                <h4 className="font-bold text-gray-800 text-lg leading-tight group-hover:text-navy transition-colors line-clamp-2">{event.name}</h4>
                <p className="text-xs text-gray-500 mt-1">{event.location} • {event.category_type}</p>
            </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-3 border border-gray-100">
            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1.5">
              <span>報名進度</span>
              <span className={progress >= 100 ? 'text-red-500' : 'text-navy'}>{Math.round(progress)}% ({totalRegistered}/{totalSeats})</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className={`h-2 rounded-full transition-all duration-700 ease-out ${progress >= 100 ? 'bg-red-500' : theme.bar}`} style={{ width: `${progress}%` }}></div>
            </div>
        </div>
      </div>
      <div className="px-5 pb-5 mt-auto">
        <button onClick={() => onEdit(event)} className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-navy hover:text-white hover:border-navy transition-all flex items-center justify-center gap-2 group-hover:shadow-md">
          <span>⚙️ 編輯管理</span>
        </button>
      </div>
    </div>
  );
};

// 📈 4. SEO 報名數據分析視窗
const SeoSignupsView = ({ stats }) => (
    <div className="animate-fade-in-up space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-navy mb-4 border-l-4 border-blue-500 pl-3">📊 報名轉化率漏斗</h3>
                <div className="space-y-4">
                    <div className="relative pt-2">
                        <div className="flex justify-between text-sm font-bold text-gray-600 mb-1"><span>總瀏覽人次 (PV)</span><span>15,420</span></div>
                        <div className="w-full bg-gray-100 h-3 rounded-full"><div className="bg-gray-400 h-3 rounded-full w-full"></div></div>
                    </div>
                    <div className="relative pt-2">
                        <div className="flex justify-between text-sm font-bold text-gray-600 mb-1"><span>點擊報名按鈕</span><span>3,200</span></div>
                        <div className="w-full bg-gray-100 h-3 rounded-full"><div className="bg-blue-400 h-3 rounded-full w-[20%]"></div></div>
                    </div>
                    <div className="relative pt-2">
                        <div className="flex justify-between text-sm font-bold text-navy mb-1"><span>實際完成報名 (Conversion)</span><span className="text-xl">{stats.totalSignups}</span></div>
                        <div className="w-full bg-gray-100 h-3 rounded-full"><div className="bg-green-500 h-3 rounded-full w-[10%]"></div></div>
                    </div>
                </div>
                <p className="text-xs text-gray-400 mt-4 text-center">數據來源：系統即時監測 (模擬數據)</p>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <h3 className="text-lg font-bold text-navy mb-4 border-l-4 border-purple-500 pl-3">📈 近期熱度趨勢</h3>
                <div className="flex items-end justify-between h-40 gap-2 px-2">
                    {[30, 45, 20, 60, 80, 50, 90, 100].map((h, i) => (
                        <div key={i} className="w-full bg-purple-100 rounded-t-md relative group">
                            <div className="absolute bottom-0 w-full bg-purple-500 rounded-t-md transition-all duration-500 group-hover:bg-purple-600" style={{ height: `${h}%` }}></div>
                            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded transition-opacity">{h}人</div>
                        </div>
                    ))}
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-2 px-2">
                    <span>1月</span><span>2月</span><span>3月</span><span>4月</span>
                </div>
            </div>
        </div>
    </div>
);

// 🌍 5. SEO 地理與環境分析視窗
const SeoLocationsView = ({ events }) => {
    const regions = { '北部': 0, '中部': 0, '南部': 0, '東部': 0, '離島': 0 };
    events.forEach(e => {
        if (e.location.includes('台北') || e.location.includes('新北') || e.location.includes('基隆') || e.location.includes('桃園') || e.location.includes('新竹') || e.location.includes('宜蘭')) regions['北部']++;
        else if (e.location.includes('台中') || e.location.includes('苗栗') || e.location.includes('彰化') || e.location.includes('南投') || e.location.includes('雲林')) regions['中部']++;
        else if (e.location.includes('高雄') || e.location.includes('台南') || e.location.includes('嘉義') || e.location.includes('屏東')) regions['南部']++;
        else if (e.location.includes('花蓮') || e.location.includes('台東')) regions['東部']++;
        else regions['離島']++;
    });
    const maxRegion = Math.max(...Object.values(regions));

    return (
        <div className="animate-fade-in-up space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-navy mb-4 border-l-4 border-green-500 pl-3">🗺️ 賽事地圖分佈分析</h3>
                    <div className="space-y-3">
                        {Object.entries(regions).map(([region, count]) => (
                            <div key={region} className="flex items-center gap-3">
                                <span className="w-12 text-sm font-bold text-gray-600">{region}</span>
                                <div className="flex-grow bg-gray-100 h-2 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${count === maxRegion ? 'bg-green-500' : 'bg-green-300'}`} 
                                        style={{ width: `${maxRegion > 0 ? (count / maxRegion) * 100 : 0}%` }}
                                    ></div>
                                </div>
                                <span className="text-sm font-mono text-navy font-bold">{count} 場</span>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h3 className="text-lg font-bold text-navy mb-4 border-l-4 border-orange-500 pl-3">🌤️ 賽事當日氣候風險預測 (模擬)</h3>
                    <div className="overflow-y-auto max-h-[200px] custom-scrollbar space-y-2">
                        {events.map((e, i) => (
                            <div key={e.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-100 text-sm">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">{e.date}</span>
                                    <span className="font-bold text-gray-700 truncate max-w-[120px]">{e.name}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-lg">{['☀️', '☁️', '🌧️', '⛈️'][i % 4]}</span>
                                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${i % 4 === 0 ? 'bg-green-100 text-green-700' : i % 4 === 2 ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>
                                        {['極佳', '舒適', '有雨', '風險'][i % 4]}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                 <h3 className="text-lg font-bold text-navy mb-4 border-l-4 border-teal-500 pl-3">🧩 賽事類型佔比分析</h3>
                 <div className="flex flex-wrap gap-4">
                    {['路跑', '三鐵', '接力賽', '單車', '游泳'].map((type) => {
                        const count = events.filter(e => e.category_type.includes(type)).length;
                        if(count === 0) return null;
                        const theme = getCategoryTheme(type);
                        return (
                            <div key={type} className={`flex items-center gap-3 p-4 rounded-xl border ${theme.bg} ${theme.border}`}>
                                <span className="text-2xl">{theme.icon}</span>
                                <div>
                                    <p className={`text-xs font-bold ${theme.text} opacity-70`}>{type}</p>
                                    <p className={`text-xl font-extrabold ${theme.text}`}>{count} 場</p>
                                </div>
                            </div>
                        );
                    })}
                 </div>
            </div>
        </div>
    );
};

export default function AdminDashboard({ events, onUpdate, currentUserRole }) {
  const [activeView, setActiveView] = useState('menu'); 
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // --- 編輯器邏輯 ---
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const formRef = useRef(null);
  const initialFormState = { name: '', event_link: '', date: '', location: '', status: '洽談中', category_type: '路跑', category: '全馬組42K', tags: [{ name: '全馬組42K', seats: 100, registered: 0, takenSlots: [] }] };
  const [formData, setFormData] = useState(initialFormState);

  // --- 統計數據 ---
  const stats = useMemo(() => {
    const totalEvents = events.length;
    const activeEvents = events.filter(e => e.status === '開放中').length;
    const totalSignups = events.reduce((sum, e) => sum + (Array.isArray(e.tags) ? e.tags.reduce((tSum, tag) => tSum + (tag.registered || 0), 0) : 0), 0);
    return { totalEvents, activeEvents, totalSignups };
  }, [events]);

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
        const matchesSearch = e.name.toLowerCase().includes(searchTerm.toLowerCase()) || e.location.includes(searchTerm);
        const matchesStatus = filterStatus === 'all' ? true :
            filterStatus === 'active' ? e.status === '開放中' :
            filterStatus === 'pending' ? (e.status === '洽談中' || e.status === '待開放報名') :
            filterStatus === 'closed' ? e.status === '截止,名單送大會' : true;
        return matchesSearch && matchesStatus;
    });
  }, [events, searchTerm, filterStatus]);

  // --- 表單函式 ---
  const handleCategoryTypeChange = (type) => { 
    let defaultTags = [{name: '一般組', seats: 100, registered: 0, takenSlots: []}];
    if (type.includes('路跑')) defaultTags = [{name:'全馬組',seats:100},{name:'半馬組',seats:100}];
    if (type.includes('接力')) defaultTags = [{name:'7人接力',seats:7}];
    if (type.includes('三鐵')) defaultTags = [{name:'標鐵',seats:50}];
    setFormData(prev => ({...prev, category_type: type, tags: defaultTags}));
  };
  const handleChange = (e) => setFormData({...formData, [e.target.name]: e.target.value});
  const handleTagNameChange = (i, v) => { const n = [...formData.tags]; n[i].name = v; setFormData({...formData, tags: n}); };
  const handleTagSeatsChange = (i, v) => { const n = [...formData.tags]; n[i].seats = v; setFormData({...formData, tags: n}); };
  const addTag = () => setFormData(prev => ({ ...prev, tags: [...prev.tags, { name: '新組', seats: 50 }] }));
  const removeTag = (i) => setFormData(prev => ({ ...prev, tags: formData.tags.filter((_, idx) => idx !== i) }));
  
  const handleSaveEvent = async (e) => {
    e.preventDefault(); setLoading(true);
    const totalSeats = formData.tags.reduce((sum, tag) => sum + (tag.seats || 0), 0);
    const payload = { ...formData, seats: totalSeats };
    if(editingId) await supabase.from('events').update(payload).eq('id', editingId);
    else await supabase.from('events').insert([payload]);
    alert("儲存成功"); setEditingId(null); setFormData(initialFormState); onUpdate(); setActiveView('list'); setLoading(false);
  };
  const startEdit = (event) => { setEditingId(event.id); setFormData(event); setActiveView('editor'); };
  const startCreate = () => { setEditingId(null); setFormData(initialFormState); setActiveView('editor'); };

  const handleStatClick = (type) => {
      if (type === 'active') { setFilterStatus('active'); setActiveView('list'); }
      if (type === 'signups') setActiveView('seo_signups');
      if (type === 'events') setActiveView('seo_locations');
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 pb-20 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* 頂部導航 */}
        <div className="flex justify-between items-center bg-white px-6 py-4 rounded-2xl shadow-sm border border-gray-100">
            <div>
                <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                    <span className="bg-navy text-white w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-md">⚙️</span>
                    後台指揮中心 <span className="text-sm font-normal text-gray-400 hidden md:inline">| System Admin</span>
                </h2>
            </div>
            
            {/* 🟢 經典藍色方塊返回鍵 (優化升級版) */}
            {activeView !== 'menu' && (
                <button 
                    onClick={() => setActiveView('menu')} 
                    className="group flex items-center gap-3 bg-navy hover:bg-blue-900 text-white px-6 py-3 rounded-xl font-bold text-lg shadow-lg hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 active:scale-95 border border-blue-900"
                >
                    {/* 半透明方塊包覆箭頭 */}
                    <div className="bg-white/10 p-1.5 rounded-lg group-hover:bg-white/20 transition backdrop-blur-sm">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-5 h-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </div>
                    <span>回主選單</span>
                </button>
            )}
        </div>

        {/* 🟢 畫面 1: 主選單 (儀表板) */}
        {activeView === 'menu' && (
            <div className="animate-fade-in-up space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <StatCard title="報名進行中賽事" value={stats.activeEvents} icon="🔥" gradient="from-orange-400 to-red-500" onClick={() => handleStatClick('active')} />
                    <StatCard title="累積總報名人次" value={stats.totalSignups} icon="👥" gradient="from-blue-400 to-indigo-500" onClick={() => handleStatClick('signups')} />
                    <StatCard title="總賽事場次" value={stats.totalEvents} icon="🏆" gradient="from-purple-400 to-pink-500" onClick={() => handleStatClick('events')} />
                </div>

                <div>
                    <h3 className="text-lg font-bold text-slate-700 mb-4 ml-1">功能模組</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MenuCard title="賽事管理" icon="🏆" color="text-blue-600 bg-blue-50" desc="新增、編輯、監控所有賽事狀態與報名進度" onClick={() => setActiveView('list')} />
                        <MenuCard title="資料匯入" icon="📂" color="text-green-600 bg-green-50" desc="批次上傳會員 CSV，快速建立與更新名單" onClick={() => setActiveView('import')} />
                        {currentUserRole === 'super_admin' && <MenuCard title="權限管理" icon="👑" color="text-purple-600 bg-purple-50" desc="最高權限專屬，指派系統操作者" onClick={() => setActiveView('permission')} />}
                    </div>
                </div>
            </div>
        )}

        {/* 戰情分析視窗 */}
        {activeView === 'seo_signups' && <SeoSignupsView stats={stats} />}
        {activeView === 'seo_locations' && <SeoLocationsView events={events} />}

        {/* 🟢 畫面 2: 賽事列表 */}
        {activeView === 'list' && (
            <div className="animate-fade-in-up space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                            <input type="text" placeholder="搜尋賽事..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-navy outline-none" />
                        </div>
                    </div>
                    <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto">
                        {['all', 'active', 'pending', 'closed'].map(status => (
                            <button key={status} onClick={() => setFilterStatus(status)} className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${filterStatus === status ? 'bg-navy text-white shadow-md' : 'bg-white text-gray-500 hover:bg-gray-50 border border-gray-200'}`}>
                                {status === 'all' ? '全部' : status === 'active' ? '🔥 開放中' : status === 'pending' ? '⏳ 籌備中' : '⛔ 已截止'}
                            </button>
                        ))}
                    </div>
                    <button onClick={startCreate} className="w-full md:w-auto bg-navy hover:bg-blue-900 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg transition transform active:scale-95 flex items-center justify-center gap-2">➕ 建立新賽事</button>
                </div>
                {filteredEvents.length === 0 ? <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300 text-gray-400">找不到符合條件的賽事</div> : 
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredEvents.map(event => <EventHealthCard key={event.id} event={event} onEdit={startEdit} />)}</div>
                }
            </div>
        )}

        {/* 🟢 畫面 3: 編輯器 */}
        {activeView === 'editor' && (
            <div className="animate-fade-in-up max-w-4xl mx-auto">
                 <section className="bg-white p-8 rounded-3xl shadow-xl border border-gray-100">
                    <div className="flex justify-between items-center mb-8 border-b border-gray-100 pb-6">
                        <h3 className="text-2xl font-bold text-navy">{editingId ? "✏️ 編輯賽事" : "➕ 建立新賽事"}</h3>
                        {editingId && <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-xs font-bold border border-blue-100">編輯模式</span>}
                    </div>
                    <form onSubmit={handleSaveEvent} className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-6 col-span-2 md:col-span-1">
                            <div><label className="block text-sm font-bold text-slate-700 mb-2">賽事分類</label><select name="category_type" value={formData.category_type} onChange={(e) => handleCategoryTypeChange(e.target.value)} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none"><option value="路跑">🏃 路跑</option><option value="接力賽">🤝 接力賽</option><option value="三鐵">🏋️ 三鐵</option><option value="三鐵接力">🔄 三鐵接力</option></select></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-2">賽事名稱</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full border border-gray-200 p-3 rounded-xl outline-none" required /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-2">日期</label><input type="date" name="date" value={formData.date} onChange={handleChange} className="w-full border border-gray-200 p-3 rounded-xl" required /></div>
                        </div>
                        <div className="space-y-6 col-span-2 md:col-span-1">
                            <div><label className="block text-sm font-bold text-slate-700 mb-2">狀態</label><select name="status" value={formData.status} onChange={handleChange} className="w-full border border-gray-200 p-3 rounded-xl bg-gray-50 outline-none font-bold"><option value="洽談中">💬 洽談中</option><option value="待開放報名">⏳ 待開放</option><option value="開放中">✅ 開放中</option><option value="截止,名單送大會">⛔ 截止</option></select></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-2">🔗 官方連結</label><input type="text" name="event_link" value={formData.event_link} onChange={handleChange} className="w-full border border-gray-200 p-3 rounded-xl" /></div>
                            <div><label className="block text-sm font-bold text-slate-700 mb-2">地點</label><input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full border border-gray-200 p-3 rounded-xl" required /></div>
                        </div>
                        <div className="col-span-2 bg-slate-50 p-6 rounded-2xl border border-slate-200">
                            <div className="flex justify-between items-center mb-4"><label className="text-sm font-bold text-navy">📋 組別設定</label><span className="text-xs font-bold text-slate-500">總名額: {formData.tags.reduce((sum, tag) => sum + (tag.seats || 0), 0)}</span></div>
                            <div className="space-y-3">
                                {formData.tags.map((tag, index) => (
                                <div key={index} className="flex items-center gap-3"><input type="text" value={tag.name} onChange={(e) => handleTagNameChange(index, e.target.value)} className="flex-grow text-sm border border-gray-300 rounded-lg px-3 py-2" /><input type="number" value={tag.seats} onChange={(e) => handleTagSeatsChange(index, e.target.value)} className="w-16 text-sm font-bold text-right" min="0" /><button type="button" onClick={() => removeTag(index)} className="text-red-400 hover:text-red-600 p-2">🗑️</button></div>
                                ))}
                                <button type="button" onClick={addTag} className="mt-2 text-sm text-blue-600 font-bold">+ 新增組別</button>
                            </div>
                        </div>
                        <div className="col-span-2 pt-6 border-t border-gray-100 flex gap-4">
                            <button type="button" onClick={() => setActiveView('list')} className="w-1/3 py-3.5 rounded-xl font-bold text-gray-500 bg-gray-100 hover:bg-gray-200">取消</button>
                            <button type="submit" disabled={loading} className="w-2/3 bg-navy text-white font-bold py-3.5 rounded-xl shadow-lg hover:bg-blue-900">儲存變更</button>
                        </div>
                    </form>
                 </section>
            </div>
        )}

        {activeView === 'import' && <div className="animate-fade-in-up"><BulkImport /></div>}
        {activeView === 'permission' && <div className="animate-fade-in-up"><PermissionManager /></div>}
      </div>
    </div>
  );
}