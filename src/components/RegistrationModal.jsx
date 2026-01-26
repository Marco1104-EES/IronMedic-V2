import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function RegistrationModal({ event, user, onClose, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [expandedRelayIndex, setExpandedRelayIndex] = useState(null);
  const [usersInRoom, setUsersInRoom] = useState(0);
  const [myRank, setMyRank] = useState(0);
  const MAX_CONCURRENT_USERS = 3; 

  useEffect(() => {
    const channel = supabase.channel(`event-${event.id}`);
    channel.on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const allUsers = [];
        for (const id in state) allUsers.push(...state[id]);
        allUsers.sort((a, b) => new Date(a.online_at) - new Date(b.online_at));
        setUsersInRoom(allUsers.length);
        const myIndex = allUsers.findIndex(u => u.user_id === user.id);
        setMyRank(myIndex + 1);
      }).subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
      });
    return () => { supabase.removeChannel(channel); };
  }, []);

  const groups = Array.isArray(event.tags) ? event.tags.map(t => typeof t === 'string' ? { name: t, seats: 50, registered: 0, takenSlots: [] } : { ...t, takenSlots: t.takenSlots || [] }) : [];
  const isWaiting = myRank > MAX_CONCURRENT_USERS;

  const handleDirectRegister = async (groupIndex, leg = null) => {
    if (isWaiting) { alert("目前報名人數過多，請排隊！"); return; }
    if (loading) return;

    const targetGroup = groups[groupIndex];
    // 🟢 判斷是否為候補 (已註冊人數 >= 名額)
    const isWaitlist = (targetGroup.registered || 0) >= targetGroup.seats;
    
    // 🟢 候補確認訊息
    const confirmMsg = leg 
        ? `確定要報名「${targetGroup.name} - 第 ${leg} 棒」嗎？`
        : isWaitlist 
            ? `⚠️ 該組別已額滿，您確定要「排隊候補」嗎？\n(若有釋出名額將依序遞補)`
            : `確定要報名「${targetGroup.name}」嗎？`;
        
    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    
    const { data: latestEvent } = await supabase.from('events').select('tags, registered_count').eq('id', event.id).single();
    const currentTags = latestEvent.tags;
    const currentGroup = currentTags[groupIndex];
    
    // 檢查棒次衝突 (接力賽仍需檢查格子是否被佔用)
    if (leg && currentGroup.takenSlots.includes(leg)) {
        alert("此棒次,被選了,換一棒");
        setLoading(false); onRefresh(); return;
    }

    const finalGroupName = leg ? `${targetGroup.name} (第 ${leg} 棒)` : targetGroup.name;

    const { error } = await supabase.from('registrations').insert([{
      event_id: event.id, user_id: user.id, group_name: finalGroupName,
      full_name: user.user_metadata?.full_name || '會員', email: user.email
    }]);

    if (!error) {
        const updatedTakenSlots = [...(currentGroup.takenSlots || [])];
        if (leg) updatedTakenSlots.push(leg);
        
        currentTags[groupIndex] = {
            ...currentGroup,
            registered: (currentGroup.registered || 0) + 1,
            takenSlots: updatedTakenSlots
        };

        await supabase.from('events').update({ tags: currentTags, registered_count: (latestEvent.registered_count || 0) + 1 }).eq('id', event.id);

        alert(isWaitlist ? `✅ 已加入候補名單：${finalGroupName}` : `🎉 報名成功：${finalGroupName}`);
        onRefresh(); onClose();
    } else {
        alert("報名失敗：" + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh] animate-fade-in-up">
        <div className="bg-navy p-4 text-white flex justify-between items-center shrink-0">
          <div><h3 className="font-bold text-lg">📝 賽事報名</h3><p className="text-xs text-blue-200 mt-1 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>目前 {usersInRoom} 人正在此視窗</p></div>
          <button onClick={onClose} className="text-white/70 hover:text-white text-xl">✕</button>
        </div>
        {isWaiting && <div className="bg-yellow-500 text-white px-4 py-2 text-sm font-bold text-center animate-pulse">🚧 人數爆滿中！您目前候補第 {myRank - MAX_CONCURRENT_USERS} 位，請稍候...</div>}
        <div className="p-6 overflow-y-auto">
          <h4 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">{event.name}</h4>
          <div className="space-y-4">
            {groups.map((group, idx) => {
              const isFull = (group.registered || 0) >= group.seats;
              const remaining = group.seats - (group.registered || 0);
              const isRelay = group.seats <= 50 && event.category_type.includes('接力');
              const isExpanded = expandedRelayIndex === idx;
              
              return (
                <div key={idx} className={`border rounded-xl transition-all ${isExpanded ? 'border-navy bg-blue-50 ring-1 ring-navy' : 'border-gray-200 hover:border-gray-300'}`}>
                  <div className="flex justify-between items-center p-4">
                     <div>
                        <h5 className="font-bold text-lg text-navy">{group.name}</h5>
                        {/* 顯示剩餘或候補狀態 */}
                        <span className={`text-xs font-bold px-2 py-1 rounded inline-block mt-1 ${isFull ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-500'}`}>
                            {isFull ? `額滿 (候補 ${-remaining} 人)` : `剩餘 ${remaining} 席`}
                        </span>
                     </div>
                     <div>
                        {/* 🟢 按鈕邏輯修改：額滿仍然可以點擊，只是樣式不同 */}
                        {isRelay ? (
                            <button onClick={() => setExpandedRelayIndex(isExpanded ? null : idx)} disabled={isWaiting} className={`px-4 py-2 rounded-lg font-bold border transition ${isExpanded ? 'bg-navy text-white' : 'bg-white text-navy border-navy hover:bg-blue-50'}`}>
                                {isExpanded ? '收合 ▲' : '選擇棒次 ▼'}
                            </button>
                        ) : (
                            <button onClick={() => handleDirectRegister(idx)} disabled={isWaiting || loading} className={`px-5 py-2 rounded-lg font-bold shadow-md transition transform active:scale-95 text-white ${isFull ? 'bg-orange-500 hover:bg-orange-600' : 'bg-navy hover:bg-blue-900'}`}>
                                {loading ? '處理中...' : isFull ? '排隊候補' : '確認報名 🚀'}
                            </button>
                        )}
                     </div>
                  </div>
                  {isRelay && isExpanded && (
                      <div className="px-4 pb-4 pt-2 border-t border-blue-200">
                          <p className="text-xs font-bold text-gray-500 mb-2">請直接點擊下方方塊進行報名：</p>
                          <div className="flex flex-wrap gap-2">
                              {Array.from({ length: group.seats }, (_, i) => i + 1).map(leg => {
                                  const isTaken = group.takenSlots?.includes(leg);
                                  return <button key={leg} disabled={isTaken || isWaiting || loading} onClick={() => handleDirectRegister(idx, leg)} className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all transform hover:scale-105 ${isTaken ? 'bg-gray-200 text-gray-400 cursor-not-allowed decoration-slice' : 'bg-white border-2 border-navy text-navy hover:bg-navy hover:text-white shadow-sm'}`}>{leg}</button>;
                              })}
                          </div>
                      </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}