import { useState, useEffect } from 'react'
// 🟢 修正：只往上一層
import { supabase } from '../supabaseClient' 
import { AlertTriangle, Trash2, CheckCircle, Terminal } from 'lucide-react'

export default function SystemLogs() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { fetchLogs() }, [])

  const fetchLogs = async () => {
    setLoading(true)
    const { data } = await supabase.from('system_logs').select('*').order('created_at', { ascending: false }).limit(50)
    setLogs(data || [])
    setLoading(false)
  }

  const handleClearLogs = async () => {
    if(!confirm('⚠️ 警告：確定清空所有日誌？此操作無法復原。')) return
    await supabase.from('system_logs').delete().neq('id', 0)
    fetchLogs()
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Terminal className="mr-3 text-red-600"/> 異常處理中心
          </h2>
          <p className="text-gray-500 text-sm mt-1">即時監控系統錯誤、API 連線與資料庫狀態</p>
        </div>
        <button onClick={handleClearLogs} className="flex items-center px-4 py-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-sm font-bold transition-colors border border-red-200">
          <Trash2 size={16} className="mr-2"/> 清空日誌
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-900 text-white font-bold border-b">
            <tr>
              <th className="p-4 w-48">發生時間</th>
              <th className="p-4 w-24">等級</th>
              <th className="p-4 w-1/3">訊息摘要</th>
              <th className="p-4">詳細內容 (Stack Trace)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="4" className="p-10 text-center text-gray-400">讀取系統數據中...</td></tr>
            ) : logs.length === 0 ? (
               <tr><td colSpan="4" className="p-16 text-center text-gray-400 flex flex-col items-center justify-center">
                 <CheckCircle size={48} className="text-green-500 mb-4"/>
                 <p className="font-bold text-gray-600">系統運作完美</p>
                 <p className="text-xs">目前沒有任何異常紀錄</p>
               </td></tr>
            ) : (
              logs.map(log => (
                <tr key={log.id} className="hover:bg-red-50/30 transition-colors group">
                  <td className="p-4 text-gray-500 font-mono text-xs border-r border-gray-100">
                    {new Date(log.created_at).toLocaleString('zh-TW', { hour12: false })}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${
                      log.level === 'ERROR' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="p-4 font-bold text-gray-800 border-r border-gray-100">{log.message}</td>
                  <td className="p-4 text-gray-500 font-mono text-xs break-all">
                    {log.details || '無詳細內容'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}