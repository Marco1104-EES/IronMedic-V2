import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from './supabaseClient';
import EventCard from './components/EventCard';
import AdminDashboard from './components/AdminDashboard';
import Login from './components/Login';
import UserProfile from './components/UserProfile';

export default function App() {
  const [view, setView] = useState('list'); 
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [onlineCount, setOnlineCount] = useState(1);
  const [userRole, setUserRole] = useState('user');
  const [filterType, setFilterType] = useState('active');
  
  // 🟢 移除 releasedEventId，改用真實數據驅動

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchUserRole(session.user.id);
      else setUserRole('user');
    });

    fetchEvents();

    const channel = supabase.channel('online-users');
    channel.on('presence', { event: 'sync' }, () => {
        const users = channel.presenceState();
        let count = 0;
        for (const key in users) count += users[key].length;
        setOnlineCount(count);
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ online_at: new Date().toISOString() });
      });

    return () => {
      subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchUserRole = async (userId) => {
    const { data } = await supabase.from('user_roles').select('role').eq('id', userId).single();
    setUserRole(data ? data.role : 'user');
  };

  const fetchEvents = async () => {
    setLoading(true);
    const { data } = await supabase.from('events').select('*').order('date', { ascending: true });
    if (data) setEvents(data || []);
    setLoading(false);
  };

  // 🟢 取消成功後，只負責重抓資料與轉頁
  const handleCancelSuccess = () => {
      fetchEvents(); 
      setView('list'); 
  };

  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const negotiatingFuture = events.filter(e => e.status === '洽談中' && parseInt(e.date.substring(0,4)) >= nextYear);
  const historyEvents = events.reduce((acc, event) => {
    const year = event.date.substring(0, 4);
    if (parseInt(year) < currentYear) { if (!acc[year]) acc[year] = []; acc[year].push(event); }
    return acc;
  }, {});
  const historyYears = Object.keys(historyEvents).sort((a, b) => b - a);

  const currentYearAllEvents = events.filter(e => e.date.startsWith(currentYear.toString()));

  const filteredMainEvents = useMemo(() => {
    let result = currentYearAllEvents;

    if (filterType) {
        result = currentYearAllEvents.filter(e => {
            const totalSeats = e.seats || 0;
            const totalRegistered = Array.isArray(e.tags) ? e.tags.reduce((acc, t) => acc + (t.registered || 0), 0) : 0;
            const isFull = totalSeats > 0 && totalRegistered >= totalSeats;
            if (filterType === 'active') return e.status === '開放中';
            if (filterType === 'pending') return e.status === '洽談中' || e.status === '待開放報名';
            if (filterType === 'closed') return e.status === '截止,名單送大會';
            if (filterType === 'full') return e.status === '開放中' && isFull;
            return true;
        });
    }

    // 🟢 排序邏輯：有「釋出名額」特徵的賽事置頂
    // 特徵定義：狀態是「截止」但有名額，或者狀態是「開放」但剩餘極少(1個)
    result = [...result].sort((a, b) => {
        const getVacancy = (ev) => {
            const registered = Array.isArray(ev.tags) ? ev.tags.reduce((acc, t) => acc + (t.registered || 0), 0) : 0;
            return (ev.seats || 0) - registered;
        };
        const hasReleaseA = (a.status === '截止,名單送大會' && getVacancy(a) > 0) || (a.status === '開放中' && getVacancy(a) === 1);
        const hasReleaseB = (b.status === '截止,名單送大會' && getVacancy(b) > 0) || (b.status === '開放中' && getVacancy(b) === 1);

        if (hasReleaseA && !hasReleaseB) return -1;
        if (!hasReleaseA && hasReleaseB) return 1;
        return 0;
    });

    return result;
  }, [currentYearAllEvents, filterType]);

  const toggleFilter = (type) => setFilterType(prev => prev === type ? null : type);

  if (!session) return <Login />;
  const isAdminOrSuper = ['admin', 'super_admin'].includes(userRole);

  if (view === 'admin') {
    if (!isAdminOrSuper) { setView('list'); return null; }
    return (
      <>
        <button onClick={() => setView('list')} className="fixed top-4 right-4 z-50 bg-white text-navy px-4 py-2 rounded-full shadow-lg font-bold border border-navy hover:bg-gray-100 transition">回前台</button>
        <AdminDashboard events={events} onUpdate={fetchEvents} currentUserRole={userRole} /> 
      </>
    );
  }

  if (view === 'profile') {
      return (
          <div className="min-h-screen bg-gray-50 pb-20 pt-4">
              <UserProfile user={session.user} onBack={() => setView('list')} onCancelSuccess={handleCancelSuccess} />
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-40 bg-navy text-white shadow-md">
        <div className="mx-auto flex max-w-md items-center justify-between p-4">
          <h1 className="text-xl font-bold flex items-center gap-2">⚡ 醫護鐵人賽事</h1>
          <div className="flex items-center gap-3">
             <div className="flex items-center gap-1 bg-black/30 px-2 py-1 rounded-full text-xs text-green-300 border border-green-500/30">
                <span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span></span><span>{onlineCount} 在線</span>
             </div>
            <button onClick={() => setView('profile')} className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white/50 hover:border-white transition overflow-hidden shadow-sm flex items-center justify-center active:scale-95">
                {session?.user?.user_metadata?.avatar_url ? <img src={session.user.user_metadata.avatar_url} alt="User" className="w-full h-full object-cover" /> : <span className="font-bold text-xs text-white">{session?.user?.email?.charAt(0).toUpperCase()}</span>}
            </button>
            {isAdminOrSuper && <button onClick={() => setView('admin')} className="rounded bg-white/10 px-3 py-1 text-sm font-medium hover:bg-white/20 transition border border-white/20">後台</button>}
            <button onClick={() => supabase.auth.signOut()} className="rounded bg-red-500/80 px-3 py-1 text-sm font-medium hover:bg-red-600 transition">登出</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-md p-4 space-y-8">
        {loading ? (
          <div className="flex justify-center mt-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-navy"></div></div>
        ) : (
          <>
            <section>
              <div className="flex flex-col mb-4">
                  <div className="flex justify-between items-center mb-2 border-l-4 border-navy pl-3">
                      <h2 className="text-xl font-bold text-navy flex items-center gap-2">🔥 {currentYear} 年度賽事</h2>
                      {filterType && <button onClick={() => setFilterType(null)} className="text-xs text-blue-600 underline">顯示全部</button>}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 ml-1 h-10">
                      <button onClick={() => toggleFilter('active')} className={`flex items-center gap-2 rounded-lg border transition-all duration-300 ease-out shadow-sm ${filterType === 'active' ? 'bg-green-600 text-white border-green-700 px-5 py-2 text-sm font-bold shadow-md transform scale-105 ring-2 ring-green-300' : 'bg-green-50 text-green-700 border-green-200 px-2 py-1 text-[10px] hover:bg-green-100'}`}><span className={`rounded-full ${filterType === 'active' ? 'bg-white animate-pulse w-2 h-2' : 'bg-green-500 w-1.5 h-1.5'}`}></span>報名進行中</button>
                      <button onClick={() => toggleFilter('pending')} className={`flex items-center gap-2 rounded-lg border transition-all duration-300 ease-out shadow-sm ${filterType === 'pending' ? 'bg-gray-600 text-white border-gray-700 px-5 py-2 text-sm font-bold shadow-md transform scale-105 ring-2 ring-gray-300' : 'bg-gray-50 text-gray-500 border-gray-200 px-2 py-1 text-[10px] hover:bg-gray-100'}`}><span className={`rounded-full ${filterType === 'pending' ? 'bg-white w-2 h-2' : 'bg-gray-400 w-1.5 h-1.5'}`}></span>洽談籌備中</button>
                      <button onClick={() => toggleFilter('closed')} className={`flex items-center gap-2 rounded-lg border transition-all duration-300 ease-out shadow-sm ${filterType === 'closed' ? 'bg-red-600 text-white border-red-700 px-5 py-2 text-sm font-bold shadow-md transform scale-105 ring-2 ring-red-300' : 'bg-red-50 text-red-400 border-red-100 px-2 py-1 text-[10px] hover:bg-red-100'}`}>⛔ 已截止</button>
                      <button onClick={() => toggleFilter('full')} className={`flex items-center gap-2 rounded-lg border transition-all duration-300 ease-out shadow-sm ${filterType === 'full' ? 'bg-orange-500 text-white border-orange-600 px-5 py-2 text-sm font-bold shadow-md transform scale-105 ring-2 ring-orange-300' : 'bg-orange-50 text-orange-600 border-orange-200 px-2 py-1 text-[10px] hover:bg-orange-100'}`}>🔥 😱 報名超額</button>
                  </div>
              </div>

              {filteredMainEvents.length === 0 ? <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300 text-gray-400 text-sm mt-4">{filterType === 'active' ? '目前沒有正在報名中的賽事' : '沒有符合條件的賽事'}</div> : 
                <div className="space-y-6 mt-4">
                  {/* 🟢 不再需要傳遞 isReleased */}
                  {filteredMainEvents.map((event) => <EventCard key={event.id} event={event} onUpdate={fetchEvents} />)}
                </div>
              }
            </section>

             {negotiatingFuture.length > 0 && <section className="bg-blue-50 p-4 rounded-xl border border-blue-100"><h2 className="text-lg font-bold text-blue-800 mb-3">🚀 未來展望 ({nextYear} 起)</h2>{negotiatingFuture.map(event => (<div key={event.id} className="flex justify-between items-center bg-white p-3 rounded-lg shadow-sm mb-2"><span className="font-medium text-gray-700">{event.name}</span><span className="text-xs text-gray-400">洽談中</span></div>))}</section>}
            {historyYears.length > 0 && <section className="pt-6 border-t border-gray-200"><h2 className="text-lg font-bold text-gray-600 mb-4">📜 歷年賽事回顧</h2>{historyYears.map(year => (<div key={year} className="mb-4"><h3 className="text-sm font-bold text-gray-400 mb-2 border-b pb-1">{year} 年度</h3>{historyEvents[year].map((event) => (<div key={event.id} className="p-3 flex justify-between text-gray-600 text-sm bg-gray-100 rounded mb-1"><span>{event.name}</span><span>{event.date}</span></div>))}</div>))}</section>}
          </>
        )}
      </main>
    </div>
  );
}