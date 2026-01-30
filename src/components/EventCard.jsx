import { Calendar, MapPin, ArrowRight, Users } from 'lucide-react'
import { Link } from 'react-router-dom'

export default function EventCard({ event }) {
  // 判斷狀態顏色
  const getStatusColor = (status) => {
    switch(status) {
      case 'open': return 'bg-green-100 text-green-800 border-green-200'
      case 'closing': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'full': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-blue-100 text-blue-800 border-blue-200'
    }
  }

  const getStatusText = (status) => {
    switch(status) {
      case 'open': return '🔥 熱烈報名中'
      case 'closing': return '⏳ 即將截止'
      case 'full': return '⛔ 額滿'
      default: return '籌備中'
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden group flex flex-col h-full">
      {/* 圖片區 (上方) */}
      <div className="h-48 overflow-hidden relative">
        <div className="absolute inset-0 bg-gray-200 animate-pulse"></div>
        <img 
          src={event.image} 
          alt={event.title} 
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 relative z-10"
          onError={(e) => {e.target.style.display='none'}} // 圖片讀不到時隱藏
        />
        <div className="absolute top-4 right-4 z-20">
          <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusColor(event.status)}`}>
            {getStatusText(event.status)}
          </span>
        </div>
      </div>

      {/* 內容區 */}
      <div className="p-6 flex-1 flex flex-col">
        <div className="flex items-center text-xs text-gray-500 mb-3 space-x-4">
          <span className="flex items-center bg-gray-50 px-2 py-1 rounded"><Calendar size={14} className="mr-1"/> {event.date}</span>
          <span className="flex items-center bg-gray-50 px-2 py-1 rounded"><MapPin size={14} className="mr-1"/> {event.location}</span>
        </div>
        
        <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors line-clamp-2">
          {event.title}
        </h3>
        
        <p className="text-gray-500 text-sm mb-6 line-clamp-2 flex-1">
          {event.description || '醫護鐵人官方賽事，提供專業賽道救護與支援。'}
        </p>

        {/* 底部按鈕 */}
        <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
          <div className="flex items-center text-sm text-gray-500">
             <Users size={16} className="mr-1 text-blue-500"/> 
             <span className="font-bold text-gray-800">{event.participants || 0}</span> 人已報名
          </div>
          <button className="flex items-center text-blue-600 font-bold text-sm hover:translate-x-1 transition-transform">
            查看詳情 <ArrowRight size={16} className="ml-1"/>
          </button>
        </div>
      </div>
    </div>
  )
}