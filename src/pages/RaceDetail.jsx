import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Calendar, MapPin, Clock, ShieldAlert, CheckCircle, XCircle, Crown, Sprout, Timer, AlertTriangle, Activity, Users, ChevronLeft, Flag } from 'lucide-react'

// 📌 模擬當前登入會員 (您可以手動切換這些值來測試防呆機制)
const CURRENT_USER = {
    id: 'u999',
    full_name: '測試指揮官',
    is_current_member: 'Y', // 必須為 Y 才能報名
    license_expiry: '2026-12-31', // 必須大於賽事日期
    shirt_expiry_25: '2025-12-31', // 三鐵衣效期 (擇一有效即可)
    shirt_expiry_26: '', 
    is_vip: 'Y', // 👑 測試：設為 Y 看他如何插隊！
    total_races: 0, // 🌱 測試：設為 0 會變成新人
    is_team_leader: 'N'
}

// 📌 模擬賽事資料
const RACE_DATA = {
    id: 2,
    title: '2026 普悠瑪國際鐵人三項賽',
    date: '2026-03-15',
    type: '鐵人三項', // 觸發三鐵衣檢查的關鍵字
    location: '台東縣・活水湖',
    imageUrl: 'https://images.unsplash.com/photo-1532454258191-49cb370f8713?auto=format&fit=crop&q=80&w=1920',
    slots: [
        { id: 's1', name: '全程 226 組 (醫護鐵人)', total: 2, filled: 1 },
        { id: 's2', name: '接力組 - 🏊 游泳 (1.9km)', total: 1, filled: 0 },
        { id: 's3', name: '接力組 - 🚴 自行車 (90km)', total: 1, filled: 1, assignee: '帶隊教官 陳大明' },
        { id: 's4', name: '接力組 - 🏃‍♀️ 跑步 (21km)', total: 1, filled: 0, genderLimit: 'F' }
    ]
}

// 📌 模擬目前已在排隊的等候池
const INITIAL_QUEUE = [
    { id: 'u1', name: '王大同', tier: 5, isVip: false, isNew: false, timestamp: '10:00:00:000', slot: 's1' },
    { id: 'u2', name: '李新人', tier: 2, isVip: false, isNew: true, timestamp: '10:05:00:000', slot: 's1' }
]

export default function RaceDetail() {
  const navigate = useNavigate()
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [queue, setQueue] = useState(INITIAL_QUEUE)
  
  // 🧮 核心演算法：判定階級 (1 最高 ~ 5 最低)
  const getUserTier = (user) => {
      if (user.is_vip === 'Y') return 1;
      if (user.total_races < 2) return 2; // 新人
      if (user.is_team_leader === 'Y') return 3;
      if (user.is_current_member === 'Y') return 4;
      return 5; // 一般會員
  }

  // 🛡️ 核心演算法：資格防呆審查
  const checkEligibility = () => {
      const checks = {
          isCurrentMember: CURRENT_USER.is_current_member === 'Y',
          isLicenseValid: new Date(CURRENT_USER.license_expiry) >= new Date(RACE_DATA.date),
          isTriShirtValid: true, // 預設通過
          genderMatch: true // 預設通過
      }

      // 三鐵/二鐵/游泳 強制檢查三鐵衣服
      if (['鐵人三項', '二鐵', '游泳'].includes(RACE_DATA.type)) {
          const hasValid25 = CURRENT_USER.shirt_expiry_25 && new Date(CURRENT_USER.shirt_expiry_25) >= new Date();
          const hasValid26 = CURRENT_USER.shirt_expiry_26 && new Date(CURRENT_USER.shirt_expiry_26) >= new Date();
          checks.isTriShirtValid = hasValid25 || hasValid26;
      }

      // 性別檢查 (如果選了限制女性的棒次)
      if (selectedSlot) {
          const slotInfo = RACE_DATA.slots.find(s => s.id === selectedSlot)
          if (slotInfo?.genderLimit === 'F' && CURRENT_USER.gender === 'M') { // 假設有性別欄位
              checks.genderMatch = false;
          }
      }

      const allPassed = Object.values(checks).every(v => v === true);
      return { checks, allPassed };
  }

  const { checks, allPassed } = checkEligibility();

  // 🚀 核心演算法：模擬點擊報名與自動排序
  const handleRegister = () => {
      if (!selectedSlot) return alert("請先選擇您要報名的賽段/棒次！")
      if (!allPassed) return alert("資格審查未通過，無法報名！")

      // 產生毫秒級時間戳記
      const now = new Date();
      const timestamp = `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}:${now.getSeconds().toString().padStart(2,'0')}:${now.getMilliseconds().toString().padStart(3,'0')}`;
      
      const newEntry = {
          id: CURRENT_USER.id,
          name: CURRENT_USER.full_name,
          tier: getUserTier(CURRENT_USER),
          isVip: CURRENT_USER.is_vip === 'Y',
          isNew: CURRENT_USER.total_races < 2,
          timestamp: timestamp,
          slot: selectedSlot,
          isMe: true
      }

      // 鐵面包公排序法：先比 Tier (越小越前面)，再比 Timestamp
      const newQueue = [...queue, newEntry].sort((a, b) => {
          if (a.tier !== b.tier) return a.tier - b.tier;
          return a.timestamp.localeCompare(b.timestamp);
      });

      setQueue(newQueue)
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24 font-sans animate-fade-in">
      
      {/* 頂部賽事視覺 */}
      <div className="relative h-[35vh] md:h-[45vh] bg-slate-900 flex items-end pb-8">
          <div className="absolute inset-0 opacity-40 bg-cover bg-center" style={{ backgroundImage: `url(${RACE_DATA.imageUrl})` }}></div>
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent"></div>
          
          <button onClick={() => navigate('/races')} className="absolute top-6 left-6 text-white flex items-center gap-2 hover:text-blue-400 transition-colors bg-black/20 px-4 py-2 rounded-full backdrop-blur-md border border-white/10 z-20">
              <ChevronLeft size={18}/> 返回任務大廳
          </button>

          <div className="relative z-10 max-w-7xl mx-auto px-6 w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div>
                  <span className="bg-blue-600 text-white text-xs font-black px-3 py-1 rounded-full shadow-lg mb-3 inline-block">
                      {RACE_DATA.type}
                  </span>
                  <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-wider drop-shadow-lg">{RACE_DATA.title}</h1>
                  <div className="flex flex-wrap items-center text-slate-200 text-sm md:text-base font-medium gap-4 md:gap-6">
                      <div className="flex items-center gap-2"><Calendar size={18} className="text-blue-400"/> {RACE_DATA.date}</div>
                      <div className="flex items-center gap-2"><MapPin size={18} className="text-red-400"/> {RACE_DATA.location}</div>
                  </div>
              </div>
          </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* 左側：戰情陣型與排序池 */}
          <div className="lg:col-span-2 space-y-8">
              
              {/* 模組化賽段陣型 */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <h2 className="text-xl font-black text-slate-800 mb-6 flex items-center gap-2">
                      <Flag className="text-blue-600"/> 任務陣型佈署 (Slot Allocation)
                  </h2>
                  <div className="space-y-4">
                      {RACE_DATA.slots.map(slot => {
                          const isFull = slot.filled >= slot.total;
                          const isSelected = selectedSlot === slot.id;
                          return (
                              <div 
                                  key={slot.id} 
                                  onClick={() => !isFull && setSelectedSlot(slot.id)}
                                  className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4
                                      ${isFull ? 'bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed' 
                                      : isSelected ? 'bg-blue-50 border-blue-500 shadow-md ring-4 ring-blue-500/20' 
                                      : 'bg-white border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
                              >
                                  <div>
                                      <h3 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                          {slot.name}
                                          {slot.genderLimit === 'F' && <span className="bg-pink-100 text-pink-600 text-[10px] px-2 py-0.5 rounded-full border border-pink-200">限定女性</span>}
                                      </h3>
                                      {slot.assignee && <div className="text-sm text-slate-500 mt-1 flex items-center gap-1"><ShieldAlert size={14}/> 守護者: {slot.assignee}</div>}
                                  </div>
                                  <div className="flex items-center gap-4">
                                      <div className="text-sm font-black text-slate-700 bg-slate-100 px-4 py-2 rounded-xl">
                                          名額 {slot.filled} / {slot.total}
                                      </div>
                                      {!isFull && (
                                          <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                                              {isSelected && <CheckCircle size={14}/>}
                                          </div>
                                      )}
                                      {isFull && <span className="text-xs font-bold text-slate-400 bg-slate-200 px-3 py-1.5 rounded-lg">滿編</span>}
                                  </div>
                              </div>
                          )
                      })}
                  </div>
              </div>

              {/* 鐵面包公：預約排序池 */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <Users className="text-blue-600"/> 任務預備池 (Priority Queue)
                      </h2>
                      <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full flex items-center gap-1">
                          <Timer size={12}/> 系統自動排序中
                      </span>
                  </div>
                  
                  <div className="space-y-3">
                      {queue.length === 0 ? (
                          <div className="text-center py-8 text-slate-400 font-medium">目前尚無人員報名</div>
                      ) : (
                          queue.map((user, idx) => (
                              <div key={idx} className={`flex items-center justify-between p-4 rounded-xl border transition-all ${user.isMe ? 'bg-amber-50 border-amber-300 shadow-sm animate-pulse-once' : 'bg-slate-50 border-slate-200'}`}>
                                  <div className="flex items-center gap-4">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm shadow-inner ${idx === 0 ? 'bg-yellow-400 text-yellow-900' : idx === 1 ? 'bg-slate-300 text-slate-700' : 'bg-orange-300 text-orange-900'}`}>
                                          {idx + 1}
                                      </div>
                                      <div>
                                          <div className="font-bold text-slate-800 flex items-center gap-2">
                                              {user.name}
                                              {user.isMe && <span className="text-[10px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">我</span>}
                                              {user.isVip && <span className="flex items-center text-[10px] bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded font-black"><Crown size={10} className="mr-1"/> VIP</span>}
                                              {user.isNew && <span className="flex items-center text-[10px] bg-green-100 text-green-700 border border-green-300 px-1.5 py-0.5 rounded font-black"><Sprout size={10} className="mr-1"/> 新人保送</span>}
                                          </div>
                                          <div className="text-xs text-slate-400 mt-0.5 font-mono">{user.timestamp}</div>
                                      </div>
                                  </div>
                                  <div className="text-xs font-bold text-slate-500 bg-white px-3 py-1 rounded-lg border border-slate-200">
                                      Tier {user.tier}
                                  </div>
                              </div>
                          ))
                      )}
                  </div>
              </div>
          </div>

          {/* 右側：個人資格審查雷達 */}
          <div className="space-y-6">
              <div className="bg-slate-900 rounded-3xl shadow-xl border border-slate-800 p-6 md:p-8 sticky top-8 text-white">
                  <h3 className="text-lg font-black mb-6 border-b border-slate-700 pb-4 flex items-center gap-2">
                      <Activity className="text-blue-400"/> 系統資格審查 (ID Check)
                  </h3>
                  
                  <div className="space-y-4 mb-8">
                      <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400 font-medium">當屆會員身分</span>
                          {checks.isCurrentMember ? <CheckCircle size={20} className="text-green-400"/> : <XCircle size={20} className="text-red-500"/>}
                      </div>
                      <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-400 font-medium">醫護證照效期</span>
                          {checks.isLicenseValid ? <CheckCircle size={20} className="text-green-400"/> : <XCircle size={20} className="text-red-500"/>}
                      </div>
                      {['鐵人三項', '二鐵', '游泳'].includes(RACE_DATA.type) && (
                          <div className="flex items-center justify-between bg-blue-900/30 p-3 rounded-xl border border-blue-800/50">
                              <div>
                                  <div className="text-sm text-blue-300 font-bold">三鐵戰袍檢核</div>
                                  <div className="text-[10px] text-slate-500 mt-1">本賽事強制要求著三鐵衣</div>
                              </div>
                              {checks.isTriShirtValid ? <CheckCircle size={20} className="text-green-400"/> : <XCircle size={20} className="text-red-500"/>}
                          </div>
                      )}
                      {!checks.genderMatch && (
                          <div className="flex items-center justify-between bg-pink-900/30 p-3 rounded-xl border border-pink-800/50 mt-2">
                              <span className="text-sm text-pink-300 font-bold">生理性別限制</span>
                              <XCircle size={20} className="text-red-500"/>
                          </div>
                      )}
                  </div>

                  {!allPassed && (
                      <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-4 rounded-xl text-sm font-bold flex gap-3 mb-6">
                          <AlertTriangle size={20} className="shrink-0"/>
                          您有部分資料未符合作戰規定，按鈕已鎖定。請至個人資料更新。
                      </div>
                  )}

                  <button 
                      onClick={handleRegister}
                      disabled={!allPassed || !selectedSlot || queue.some(q => q.id === CURRENT_USER.id)}
                      className="w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95
                          disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed disabled:shadow-none
                          bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]"
                  >
                      {queue.some(q => q.id === CURRENT_USER.id) ? '已成功進入排隊池' : '核准並送出報名'}
                  </button>
                  
                  {/* 讓您測試排隊機制的提示 */}
                  <div className="mt-6 text-xs text-slate-500 text-center border-t border-slate-800 pt-4">
                      💡 測試提示：您目前為 VIP，點擊報名後，系統會利用毫秒級運算，無視一般會員的時間，自動將您插隊至第一順位。
                  </div>
              </div>
          </div>
      </div>
    </div>
  )
}