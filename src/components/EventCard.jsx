import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import RegistrationModal from './RegistrationModal';

const customStyles = `
  @keyframes pulse-slow {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  .animate-pulse-slow {
    animation: pulse-slow 3s ease-in-out infinite;
  }
`;

const RelayBlockBar = ({ total, takenSlots, colorClass }) => {
  const blocks = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="grid grid-cols-10 gap-1 mt-2 w-full max-w-[300px]">
      {blocks.map((legNumber) => {
        const isFilled = takenSlots?.includes(legNumber);
        return <div key={legNumber} className={`aspect-square flex items-center justify-center text-[10px] font-bold border rounded transition-all duration-300 ${isFilled ? `${colorClass} text-white border-transparent` : 'bg-white border-gray-300 text-gray-400'}`}>{legNumber}</div>;
      })}
    </div>
  );
};

export default function EventCard({ event, onUpdate }) {
  const [showModal, setShowModal] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [registrants, setRegistrants] = useState([]); 
  const [activeGroupIdx, setActiveGroupIdx] = useState(null);
  const cardRef = useRef(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUser(data.user));
    fetchRegistrants();
    const handleClickOutside = (e) => {
      if (cardRef.current && !cardRef.current.contains(e.target)) setActiveGroupIdx(null);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [event.status]);

  const fetchRegistrants = async () => {
    const { data } = await supabase.from('registrations').select('group_name, full_name, created_at').eq('event_id', event.id).order('created_at', { ascending: true });
    if (data) setRegistrants(data);
  };

  const groups = Array.isArray(event.tags) ? event.tags.map(t => typeof t === 'string' ? { name: t, seats: 50, registered: 0, takenSlots: [] } : { ...t, takenSlots: t.takenSlots || [] }) : [];
  const isRelayEvent = event.category_type === '接力賽' || event.category_type.includes('接力');

  // 計算數據
  const totalSeats = event.seats || 0;
  const totalRegistered = groups.reduce((acc, g) => acc + (g.registered || 0), 0);
  const remaining = totalSeats - totalRegistered;
  const isFull = totalSeats > 0 && totalRegistered >= totalSeats;

  // 🟢 智慧判斷：是否顯示「釋出名額」紅條
  // 1. 已截止但有名額 (絕對是釋出)
  // 2. 開放中但只剩 1 個名額 (視為搶手/釋出，符合"額滿有釋出時顯示"的邏輯)
  const showReleaseBanner = (event.status === '截止,名單送大會' && remaining > 0) || 
                            (event.status === '開放中' && remaining === 1 && totalSeats > 1);

  const getStatusConfig = (status) => {
    switch (status) {
      case '洽談中': return { color: 'bg-gray-400', text: '💬 籌備中', disabled: true };
      case '待開放報名': return { color: 'bg-yellow-500', text: '⏳ 即將開放', disabled: true };
      case '開放中': return { color: 'bg-green-500', text: '🔥 熱烈報名中', disabled: false };
      case '截止,名單送大會': return { color: 'bg-red-500', text: '⛔ 報名截止', disabled: true };
      default: return { color: 'bg-blue-500', text: '活動詳情', disabled: false };
    }
  };

  const config = getStatusConfig(event.status);
  
  // 🟢 按鈕邏輯：額滿時變橘色「候補中」
  let mainBtnText = "立即報名";
  let mainBtnClass = "bg-[#2563eb] hover:bg-blue-700";
  
  if (isFull && event.status === '開放中') {
      mainBtnText = "額滿，報名候補中";
      mainBtnClass = "bg-orange-500 hover:bg-orange-600 ring-2 ring-orange-200";
  } else if (config.disabled) {
      mainBtnText = config.text; 
      mainBtnClass = "bg-gray-300 cursor-not-allowed";
  }

  const getGroupColor = (idx) => ['bg-blue-500', 'bg-purple-500', 'bg-orange-500', 'bg-teal-500'][idx % 4];
  const getGroupColorHex = (idx) => ['#3b82f6', '#a855f7', '#f97316', '#14b8a6'][idx % 4];
  const getRegistrantsByGroup = (groupName) => registrants.filter(r => r.group_name.includes(groupName));
  const formatTime = (isoString) => { const d = new Date(isoString); return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; };
  const togglePanel = (e, idx) => { e.stopPropagation(); setActiveGroupIdx(prev => prev === idx ? null : idx); };

  return (
    <>
      <style>{customStyles}</style>
      {/* 若有釋出名額，外框加紅光 */}
      <div ref={cardRef} className={`bg-white rounded-xl shadow-lg border transition-all duration-500 relative z-10 group ${showReleaseBanner ? 'border-rose-300 shadow-rose-100/50 ring-1 ring-rose-200' : 'border-gray-100'}`}>
        
        {/* Header */}
        <div className="bg-[#0f172a] rounded-t-xl relative overflow-hidden">
          
          {/* 🟢 釋出名額 Banner (持續顯示，直到名額被搶走) */}
          {showReleaseBanner && (
              <div className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white text-center py-1.5 text-xs font-bold tracking-widest shadow-md animate-pulse-slow relative z-20">
                  ✨ 已釋出 {remaining} 個名額，把握機會！ ✨
              </div>
          )}

          <div className="p-4 flex justify-between items-start text-white relative z-10">
            <div className="w-full">
                <span className="text-xs bg-white/20 px-2 py-1 rounded text-gray-200 mb-2 inline-block">{event.date}</span>
                <div className="flex justify-between items-start gap-4 mb-1">
                    <h3 className="text-xl font-bold leading-tight text-white flex-grow">{event.name}</h3>
                    {event.event_link && (<a href={event.event_link} target="_blank" rel="noreferrer" className="shrink-0 flex items-center gap-1.5 bg-white/10 hover:bg-white/25 text-white border border-white/30 px-3 py-1.5 rounded-full transition-all hover:scale-105 shadow-sm backdrop-blur-sm group"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-4 h-4 group-hover:rotate-45 transition-transform"><path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" /></svg><span className="text-xs font-bold whitespace-nowrap">官方連結</span></a>)}
                </div>
                <div className="flex items-center gap-2 mt-2 text-sm text-gray-400"><span>📍 {event.location}</span><span>•</span><span>{event.category_type}</span></div>
            </div>
            <div className={`ml-2 shrink-0 text-xs px-2 py-1 rounded font-bold text-white ${config.color}`}>{config.text}</div>
          </div>
        </div>

        <div className="p-4">
          {event.status === '開放中' ? (
              <div className="space-y-6">
                  {groups.map((group, idx) => {
                      const groupRegistrants = getRegistrantsByGroup(group.name);
                      const isPanelOpen = activeGroupIdx === idx;
                      const accepted = groupRegistrants.slice(0, group.seats);
                      const rejected = groupRegistrants.slice(group.seats);

                      return (
                        <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-100 relative">
                            <div className="flex justify-between items-center text-xs font-bold mb-1 text-gray-700"><span>{group.name}</span><span className="text-gray-400"><span className={`text-lg font-extrabold mr-1 ${group.registered >= group.seats ? 'text-red-600' : 'text-red-500'}`}>{group.registered || 0}</span>/ {group.seats}</span></div>
                            {isRelayEvent && group.seats <= 50 ? (<RelayBlockBar total={group.seats} takenSlots={group.takenSlots} colorClass={getGroupColor(idx)} />) : (<div className="w-full bg-gray-200 rounded-full h-3 mt-2 overflow-hidden shadow-inner"><div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${Math.min(((group.registered||0)/group.seats)*100, 100)}%`, backgroundColor: getGroupColorHex(idx) }}></div></div>)}
                            {groupRegistrants.length > 0 && (<div className="mt-2 border-t border-dashed border-gray-300 pt-2 flex justify-end"><button onClick={(e) => togglePanel(e, idx)} className={`flex items-center gap-1 text-[10px] font-bold px-3 py-1.5 rounded-full transition-all transform active:scale-95 ${isPanelOpen ? 'bg-navy text-white shadow-md ring-2 ring-blue-200' : 'bg-white text-gray-500 border border-gray-200 hover:text-navy hover:border-navy hover:shadow-sm'}`}><span className="text-lg leading-none">{isPanelOpen ? '📖' : '🏆'}</span><span>已報名者 ({groupRegistrants.length})</span><span className="transform transition-transform text-[8px] ml-1">{isPanelOpen ? '◀' : '▶'}</span></button></div>)}
                            {isPanelOpen && (
                                <div className="absolute top-0 left-[102%] w-64 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden animate-fade-in-right" onClick={(e) => e.stopPropagation()}>
                                    <div className="absolute top-8 -left-1.5 w-3 h-3 bg-white border-l border-b border-gray-200 transform rotate-45"></div>
                                    <div className="bg-navy text-white px-4 py-3 text-xs font-bold shadow-sm">📋 {group.name} ({groupRegistrants.length}人)</div>
                                    <div className="max-h-64 overflow-y-auto custom-scrollbar bg-gray-50">
                                        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-100 text-[10px] font-bold text-gray-500 border-b border-gray-200 sticky top-0 backdrop-blur-sm bg-opacity-90"><div className="col-span-2 text-center">No.</div><div className="col-span-5">姓名</div><div className="col-span-5 text-right">時間</div></div>
                                        {accepted.map((r, i) => (<div key={`acc-${i}`} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs border-b border-gray-100 hover:bg-white transition group/item"><div className="col-span-2 text-center font-mono text-gray-400 text-[10px] group-hover/item:text-navy">{i + 1}</div><div className="col-span-5 font-bold text-navy truncate">{r.full_name}</div><div className="col-span-5 text-right text-gray-400 font-mono text-[10px] scale-90 origin-right">{formatTime(r.created_at)}</div></div>))}
                                        {rejected.length > 0 && (<><div className="bg-red-50 text-red-500 text-[10px] font-bold px-3 py-1.5 border-t border-b border-red-100 text-center sticky top-0 mt-2">⚠️ 候補名單</div>{rejected.map((r, i) => (<div key={`rej-${i}`} className="grid grid-cols-12 gap-2 px-3 py-2 text-xs border-b border-gray-100 bg-red-50/30 text-gray-400 opacity-80"><div className="col-span-2 text-center font-mono text-red-300 text-[10px]">備{i + 1}</div><div className="col-span-5 font-bold truncate line-through decoration-red-300">{r.full_name}</div><div className="col-span-5 text-right text-red-200 font-mono text-[10px] scale-90 origin-right">{formatTime(r.created_at)}</div></div>))}</>)}
                                    </div>
                                </div>
                            )}
                        </div>
                      );
                  })}
              </div>
          ) : (<div className="text-xs text-gray-500">{groups.map(g => g.name).join(' / ')}</div>)}
          
          <button 
            className={`w-full mt-4 py-3 rounded-b-lg rounded-t-md font-bold text-white transition active:scale-95 shadow-md ${mainBtnClass}`}
            disabled={config.disabled && !isFull}
            onClick={() => {
                // 開放中或額滿候補皆可點
                if (event.status === '開放中') setShowModal(true);
                else alert("目前無法報名");
            }}
          >
            {mainBtnText}
          </button>
        </div>
      </div>
      {showModal && currentUser && <RegistrationModal event={event} user={currentUser} onClose={() => setShowModal(false)} onRefresh={() => { onUpdate(); fetchRegistrants(); }} />}
    </>
  );
}