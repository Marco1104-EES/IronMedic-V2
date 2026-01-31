import { Calendar, MapPin, ArrowRight, Tag, Users, List } from 'lucide-react'

// 這裡多接收一個參數: initialTab (用來決定打開彈窗時顯示哪一頁)
export default function EventCard({ event, onRegister }) {
  
  // 1. 資料清洗
  const displayTitle = event.name || event.title || '未命名賽事'
  const displayDate = event.date || '日期未定'
  const displayLocation = event.location || '地點待定'
  const currentCount = event.registered || 0
  const totalQuota = event.quota || 100
  const displayImage = event.image || 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&q=80'

  // 2. 解析組別標籤
  let raceGroups = []
  const rawCat = event.category
  if (Array.isArray(rawCat)) raceGroups = rawCat 
  else if (typeof rawCat === 'string') raceGroups = rawCat.replace(/[{"}]/g, '').split(',')
  else raceGroups = ['一般賽事']

  // 3. 狀態設定
  const getStatusConfig = (status) => {
    switch(status) {
      case 'open': return { text: '🔥 報名中', color: 'bg-rose-600', disabled: false }
      case 'pending': return { text: '⏳ 待開放', color: 'bg-blue-500', disabled: true }
      case 'prep': return { text: '🤝 籌備中', color: 'bg-slate-500', disabled: true }
      case 'closed': return { text: '⛔ 已截止', color: 'bg-slate-800', disabled: true }
      default: return { text: '籌備中', color: 'bg-slate-400', disabled: true }
    }
  }
  const config = getStatusConfig(event.status)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-full group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* 圖片區 */}
      <div className="h-40 overflow-hidden relative bg-slate-100">
        <div className={`absolute top-3 left-3 px-3 py-1 text-xs font-bold text-white rounded-full z-10 ${config.color}`}>
          {config.text}
        </div>
        <img src={displayImage} alt={displayTitle} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"/>
        <div className="absolute bottom-0 w-full bg-gradient-to-t from-black/70 to-transparent p-3 pt-8">
           <div className="flex items-center text-white text-xs font-medium">
             <MapPin size={12} className="mr-1 text-sky-300"/> {displayLocation}
           </div>
        </div>
      </div>

      {/* 內容區 */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center text-xs font-bold text-sky-600 mb-2">
          <Calendar size={14} className="mr-1.5"/> {displayDate}
        </div>
        
        <h3 className="text-base font-bold text-slate-800 mb-3 leading-snug line-clamp-2">
          {displayTitle}
        </h3>

        {/* 組別標籤 */}
        <div className="flex flex-wrap gap-2 mb-4">
          {raceGroups.slice(0, 3).map((tag, idx) => (
            tag && <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
              <Tag size={10} className="mr-1 opacity-50"/> {tag.replace(/"/g, '')}
            </span>
          ))}
        </div>
        
        {/* 進度條 */}
        {event.status === 'open' && (
           <div className="mb-4 mt-auto">
             <div className="flex justify-between text-xs mb-1">
               <span className="text-slate-500">名額剩餘 {totalQuota - currentCount}</span>
               <span className="text-rose-500 font-bold">{Math.round((currentCount / totalQuota) * 100)}%</span>
             </div>
             <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
               <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(currentCount / totalQuota) * 100}%` }}></div>
             </div>
           </div>
        )}

        {/* ✨ 企業級雙按鈕設計 (Split Actions) ✨ */}
        <div className="mt-auto border-t border-slate-100 pt-3 flex gap-2">
          {/* 左邊：查看名單 (永遠開啟) */}
          <button 
            onClick={() => onRegister(event, 'list')} // 傳入 'list' 參數
            className="flex-1 bg-white text-slate-600 hover:bg-slate-50 border border-slate-200 text-xs font-bold py-2 rounded-lg transition-colors flex justify-center items-center"
          >
            <List size={14} className="mr-1.5"/> 報名名單
          </button>
          
          {/* 右邊：立即報名 (看狀態) */}
          <button 
            onClick={() => onRegister(event, 'register')} // 傳入 'register' 參數
            disabled={config.disabled}
            className={`flex-[1.5] text-xs font-bold py-2 rounded-lg flex justify-center items-center shadow-sm transition-all
              ${config.disabled 
                ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200'}`}
          >
            {config.text === '🔥 報名中' ? '立即報名' : config.text} 
            {event.status === 'open' && <ArrowRight size={14} className="ml-1.5"/>}
          </button>
        </div>
      </div>
    </div>
  )
}