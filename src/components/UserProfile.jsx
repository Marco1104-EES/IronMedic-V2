import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// 🟢 優先權標籤元件 (Green Light 系列)
const PriorityBadge = ({ type }) => {
  let label = "一般會員";
  let bgClass = "bg-gray-50 border-gray-200 text-gray-500";
  let dotClass = "bg-gray-400";
  
  if (type === 'new') { 
      label = "新加入會員"; 
      bgClass = "bg-emerald-50 border-emerald-200 text-emerald-700"; 
      dotClass = "bg-emerald-500";
  }
  if (type === 'leader') { 
      label = "當年度帶隊官"; 
      bgClass = "bg-teal-50 border-teal-200 text-teal-800"; 
      dotClass = "bg-teal-500";
  }
  if (type === 'p1') { 
      label = "優先報名 (第一階段)"; 
      bgClass = "bg-green-50 border-green-200 text-green-700"; 
      dotClass = "bg-green-500";
  }
  if (type === 'p2') { 
      label = "優先報名 (第二階段)"; 
      bgClass = "bg-lime-50 border-lime-200 text-lime-700"; 
      dotClass = "bg-lime-500";
  }

  return (
    <div className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-full border ${bgClass} shadow-sm w-full`}>
        <span className="relative flex h-2 w-2 shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span>
          <span className={`relative inline-flex rounded-full h-2 w-2 ${dotClass}`}></span>
        </span>
        <span className="text-[10px] font-bold tracking-wide whitespace-nowrap">{label}</span>
    </div>
  );
};

export default function UserProfile({ user, onBack, onCancelSuccess }) {
  const [registrations, setRegistrations] = useState([]);
  const [showMyEvents, setShowMyEvents] = useState(false);
  const [loading, setLoading] = useState(false);

  // 模擬會員資料
  const profile = {
    name: user.user_metadata?.full_name || 'Chen Marco',
    idDisplay: user.id.split('-')[0].toUpperCase(),
    avatar: user.user_metadata?.avatar_url,
    licenseName: '高級緊急救護員 EMTP',
    licenseExpiry: '2026/11/04',
    vestSize: 'L',
    trisuit: { zodiac: '龍 (Dragon)', expiry: '2028/12/31' }
  };

  useEffect(() => {
    fetchMyRegistrations();
  }, []);

  const fetchMyRegistrations = async () => {
    const { data } = await supabase
      .from('registrations')
      .select(`id, group_name, created_at, event_id, events ( id, name, date, tags )`)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    if (data) setRegistrations(data);
  };

  const handleCancelRegistration = async (regId, eventId, groupName) => {
    if (!window.confirm("⚠️ 確定要取消此賽事報名嗎？")) return;
    if (!window.confirm("⛔ 警告：取消後名額將立即釋出，無法直接復原。\n\n您真的要放棄資格嗎？")) return;

    setLoading(true);
    try {
        const { error: delError } = await supabase.from('registrations').delete().eq('id', regId);
        if (delError) throw delError;

        const { data: eventData } = await supabase.from('events').select('tags').eq('id', eventId).single();
        if (eventData) {
            const currentTags = eventData.tags;
            const updatedTags = currentTags.map(tag => {
                if (groupName.includes(tag.name)) {
                    const newRegistered = Math.max((tag.registered || 0) - 1, 0);
                    let newTakenSlots = tag.takenSlots || [];
                    const legMatch = groupName.match(/第 (\d+) 棒/);
                    if (legMatch) {
                        const legToRemove = parseInt(legMatch[1]);
                        newTakenSlots = newTakenSlots.filter(slot => slot !== legToRemove);
                    }
                    return { ...tag, registered: newRegistered, takenSlots: newTakenSlots };
                }
                return tag;
            });
            await supabase.from('events').update({ tags: updatedTags }).eq('id', eventId);
        }
        alert("✅ 取消成功！名額已釋出。");
        onCancelSuccess(eventId); 
        fetchMyRegistrations();
    } catch (error) {
        alert("取消失敗：" + error.message);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="animate-fade-in-up flex flex-col items-center w-full max-w-sm mx-auto pt-2 pb-20">
      
      {/* 頂部導航 */}
      <div className="w-full flex justify-between items-center mb-4 px-4">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-navy font-bold transition">
            <span className="text-xl">‹</span> 返回首頁
        </button>
        <span className="text-xs font-bold text-gray-400 tracking-widest">個人數位憑證</span>
      </div>

      {/* 💳 核心卡片 */}
      <div className="relative w-full bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100">
        
        {/* 頂部深藍色背景 */}
        <div className="h-28 bg-[#1e293b] relative">
            <div className="absolute top-0 left-0 w-full h-full opacity-30 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-400/20 to-transparent"></div>
        </div>

        {/* 內容區 */}
        <div className="relative px-6 pb-8 text-center -mt-12">
            
            {/* 頭像 */}
            <div className="flex justify-center mb-3">
                <div className="p-1.5 bg-white rounded-full shadow-lg">
                    {profile.avatar ? (
                        <img src={profile.avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover border-2 border-gray-100" />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-slate-200 flex items-center justify-center text-3xl font-bold text-slate-400">
                            {profile.name.charAt(0)}
                        </div>
                    )}
                </div>
            </div>
            
            {/* 姓名與ID */}
            <h2 className="text-2xl font-black text-slate-800 mb-1">{profile.name}</h2>
            <p className="text-[10px] text-gray-400 font-mono mb-5 tracking-widest">ID: {profile.idDisplay}</p>

            {/* 1. 金色證照區 */}
            <div className="bg-[#fffbeb] border border-[#fcd34d] rounded-xl p-4 mb-5 shadow-sm">
                <div className="flex flex-col items-center text-[#92400e]">
                    <span className="text-xl mb-1">★</span>
                    <span className="font-bold text-lg tracking-wide">{profile.licenseName}</span>
                    <div className="h-px w-16 bg-[#fde68a] my-2"></div>
                    <span className="text-xs font-bold opacity-80">有效期限：{profile.licenseExpiry}</span>
                </div>
            </div>

            {/* 🟢 2. 身份與權限區 (依照您的圖片排版) */}
            <div className="mb-6 space-y-3">
                
                {/* 第一排：藍色(會員) + 青色(帶隊官) */}
                <div className="flex justify-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-xs shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                        當年度會員 (有效)
                    </div>
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 font-bold text-xs shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-teal-500"></span>
                        當年度帶隊官
                    </div>
                </div>

                {/* 第二排：4 種優先權標籤 (2x2 排列) */}
                <div className="bg-gray-50/50 p-2 rounded-xl border border-gray-100">
                    <div className="grid grid-cols-2 gap-2">
                        <PriorityBadge type="new" />
                        <PriorityBadge type="leader" />
                        <PriorityBadge type="p1" />
                        <PriorityBadge type="p2" />
                    </div>
                </div>
            </div>

            {/* 3. 服裝尺寸區 */}
            <div className="grid grid-cols-2 gap-3 mb-8">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col justify-center min-h-[80px]">
                    <p className="text-[10px] text-gray-400 font-bold mb-1">背心尺寸</p>
                    <p className="text-2xl font-black text-slate-700">{profile.vestSize}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex flex-col justify-center min-h-[80px]">
                    <p className="text-[10px] text-gray-400 font-bold mb-1">三鐵服 / 期限</p>
                    <div>
                        <span className="text-base font-bold text-slate-700 block">{profile.trisuit.zodiac}</span>
                        <span className="text-[10px] text-gray-400">{profile.trisuit.expiry}</span>
                    </div>
                </div>
            </div>

            {/* 4. 統計按鈕區 */}
            <div className="grid grid-cols-2 gap-4">
                <button 
                    onClick={() => setShowMyEvents(!showMyEvents)}
                    className={`p-4 rounded-xl border transition-all duration-300 group min-h-[100px] flex flex-col justify-center items-center
                        ${showMyEvents ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105' : 'bg-white border-gray-200 hover:border-blue-300 hover:bg-blue-50'}
                    `}
                >
                    <p className={`text-4xl font-black mb-1 ${showMyEvents ? 'text-white' : 'text-blue-600'}`}>{registrations.length}</p>
                    <p className={`text-xs font-bold ${showMyEvents ? 'text-blue-100' : 'text-gray-400 group-hover:text-blue-500'}`}>已報名賽事</p>
                </button>

                <div className="p-4 rounded-xl border border-gray-200 bg-white opacity-60 grayscale min-h-[100px] flex flex-col justify-center items-center">
                    <p className="text-4xl font-black text-gray-300 mb-1">0</p>
                    <p className="text-xs font-bold text-gray-400">累計完賽 (建置中)</p>
                </div>
            </div>

        </div>

        {/* 🔽 下拉式報名清單 (Drawer) */}
        {showMyEvents && (
            <div className="bg-slate-50 border-t border-gray-200 p-4 animate-fade-in-up">
                <h3 className="text-sm font-bold text-navy mb-3 flex items-center gap-2">
                    📋 已報名列表 <span className="text-xs font-normal text-gray-400">({registrations.length})</span>
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar pr-1">
                    {registrations.length === 0 ? (
                        <p className="text-xs text-gray-400 text-center py-4">尚無報名紀錄</p>
                    ) : (
                        registrations.map((reg) => (
                            <div key={reg.id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm flex justify-between items-center group">
                                <div className="flex flex-col items-start">
                                    <span className="text-[10px] text-gray-400">{reg.events?.date.split('T')[0]}</span>
                                    <span className="text-sm font-bold text-slate-800 line-clamp-1">{reg.events?.name}</span>
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded mt-1">
                                        {reg.group_name}
                                    </span>
                                </div>
                                <button 
                                    disabled={loading}
                                    onClick={() => handleCancelRegistration(reg.id, reg.event_id, reg.group_name)}
                                    className="bg-white border border-red-200 text-red-500 hover:bg-red-500 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm whitespace-nowrap"
                                >
                                    {loading ? '...' : '取消'}
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}
      </div>
    </div>
  );
}