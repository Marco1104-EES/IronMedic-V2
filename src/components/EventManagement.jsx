import { useState } from 'react'
import { Calendar, MapPin, Users, Edit, Trash2, Plus, Bike, Waves, Mountain, Footprints } from 'lucide-react'

// 這裡我們直接用跟前台一樣的 Mock Data，實務上這裡會是 fetch API
const INITIAL_EVENTS = [
  { id: 101, category: '馬拉松', title: '2026 金門大橋馬拉松', date: '2026-01-25', location: '金門縣', status: 'open', participants: 1250 },
  { id: 102, category: '馬拉松', title: '2026 臺北國道馬拉松', date: '2026-03-08', location: '臺北市', status: 'closing', participants: 5800 },
  { id: 103, category: '鐵人三項', title: '2026 IRONMAN 70.3 Kenting', date: '2026-04-12', location: '屏東恆春', status: 'full', participants: 2100 },
  { id: 104, category: '鐵人三項', title: '2026 Challenge Taiwan', date: '2026-04-25', location: '台東縣', status: 'open', participants: 4500 },
  { id: 105, category: '越野賽', title: '2026 棲蘭林道越野', date: '2026-05-02', location: '宜蘭縣', status: 'open', participants: 800 },
  { id: 106, category: '馬拉松', title: '2026 澎湖花火節路跑', date: '2026-05-20', location: '澎湖縣', status: 'open', participants: 3000 },
  { id: 108, category: '游泳', title: '2026 泳渡日月潭', date: '2026-09-20', location: '南投縣', status: '筹备中', participants: 0 },
  { id: 109, category: '單車', title: '2026 台灣 KOM 登山王', date: '2026-10-25', location: '花蓮/南投', status: 'open', participants: 600 },
]

export default function EventManagement() {
  const [events, setEvents] = useState(INITIAL_EVENTS)

  // 取得對應圖示
  const getIcon = (cat) => {
    if (cat === '游泳') return <Waves size={16} className="text-blue-500"/>
    if (cat === '單車') return <Bike size={16} className="text-green-500"/>
    if (cat === '越野賽') return <Mountain size={16} className="text-orange-500"/>
    return <Footprints size={16} className="text-indigo-500"/>
  }

  // 刪除功能 (模擬)
  const handleDelete = (id) => {
    if (window.confirm('確定要刪除這場賽事嗎？此動作無法復原。')) {
      setEvents(events.filter(e => e.id !== id))
    }
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[600px]">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Calendar className="mr-3 text-blue-600" /> 賽事管理
          </h2>
          <p className="text-gray-500 text-sm mt-1">管理前台顯示的所有賽事活動</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center transition-colors">
          <Plus size={18} className="mr-2"/> 新增賽事
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase font-bold border-b">
            <tr>
              <th className="p-4">類別</th>
              <th className="p-4">賽事名稱</th>
              <th className="p-4">日期 / 地點</th>
              <th className="p-4">報名狀態</th>
              <th className="p-4 text-right">已報名人數</th>
              <th className="p-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-blue-50 transition-colors">
                <td className="p-4">
                  <div className="flex items-center space-x-2 bg-gray-100 w-fit px-2 py-1 rounded text-gray-600 font-bold text-xs">
                    {getIcon(event.category)}
                    <span>{event.category}</span>
                  </div>
                </td>
                <td className="p-4 font-bold text-gray-800">{event.title}</td>
                <td className="p-4 text-gray-500">
                  <div className="flex items-center"><Calendar size={14} className="mr-1"/> {event.date}</div>
                  <div className="flex items-center mt-1"><MapPin size={14} className="mr-1"/> {event.location}</div>
                </td>
                <td className="p-4">
                  {event.status === 'open' && <span className="text-green-600 bg-green-50 px-2 py-1 rounded font-bold text-xs">報名中</span>}
                  {event.status === 'closing' && <span className="text-orange-600 bg-orange-50 px-2 py-1 rounded font-bold text-xs">即將截止</span>}
                  {event.status === 'full' && <span className="text-gray-500 bg-gray-100 px-2 py-1 rounded font-bold text-xs">已額滿</span>}
                  {event.status === '筹备中' && <span className="text-blue-500 bg-blue-50 px-2 py-1 rounded font-bold text-xs">籌備中</span>}
                </td>
                <td className="p-4 text-right font-mono text-base">{event.participants.toLocaleString()}</td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center space-x-2">
                    <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white border border-transparent hover:border-gray-200 rounded transition-all" title="編輯">
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(event.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-white border border-transparent hover:border-gray-200 rounded transition-all" 
                      title="刪除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}