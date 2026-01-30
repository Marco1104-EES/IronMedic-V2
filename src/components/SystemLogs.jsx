import { useState } from 'react'
import { FileText, Download, AlertTriangle, Trash2, Calendar } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function SystemLogs() {
  const [downloading, setDownloading] = useState(false)

  // 模擬下載 CSV 的功能
  const handleDownload = async () => {
    setDownloading(true)
    
    // 這裡模擬從後端抓資料並打包成 CSV
    setTimeout(() => {
      // 假裝產生了 CSV 內容
      const csvContent = "data:text/csv;charset=utf-8,Time,Type,Status,Message\n2026-01-30 10:00,Login,Success,User Admin logged in\n2026-01-30 09:45,Import,Error,File format invalid"
      const encodedUri = encodeURI(csvContent)
      const link = document.createElement("a")
      link.setAttribute("href", encodedUri)
      link.setAttribute("download", "system_logs_20260130.csv")
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      setDownloading(false)
      alert('日誌下載完成！')
    }, 1500)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[500px]">
      <div className="border-b border-gray-100 pb-6 mb-8">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <FileText className="mr-3 text-blue-600" /> 系統作業日誌 (System Logs)
        </h2>
        <p className="text-gray-500 mt-2 ml-1">
          為節省資料庫效能，本頁面不提供即時預覽。請下載日誌檔案進行稽核。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* 左邊：下載區 */}
        <div className="bg-blue-50 rounded-2xl p-8 border border-blue-100 flex flex-col justify-center items-center text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
            <Download size={32} className="text-blue-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">匯出完整日誌</h3>
          <p className="text-gray-500 mb-6 text-sm">包含會員匯入紀錄、錯誤報告、系統操作歷程。</p>
          
          <button 
            onClick={handleDownload}
            disabled={downloading}
            className="w-full max-w-xs bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center shadow-lg shadow-blue-500/30"
          >
            {downloading ? (
              <span className="flex items-center"><span className="animate-spin mr-2">⏳</span> 打包中...</span>
            ) : (
              <span className="flex items-center"><Download size={18} className="mr-2"/> 下載 CSV 報表</span>
            )}
          </button>
        </div>

        {/* 右邊：政策說明 */}
        <div className="space-y-6">
          <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
             <h4 className="font-bold text-orange-800 flex items-center mb-2">
               <AlertTriangle size={18} className="mr-2"/> 資料保存政策
             </h4>
             <p className="text-sm text-orange-700 leading-relaxed">
               系統日誌僅保留 <span className="font-bold underline">60 天</span>。超過期限的日誌將由系統自動封存並從線上資料庫移除，以確保系統運作效能。
             </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-gray-200">
            <h4 className="font-bold text-gray-800 flex items-center mb-4">
              <Calendar size={18} className="mr-2 text-gray-500"/> 自動排程狀態
            </h4>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-500">上次自動清理</span>
                <span className="font-mono text-gray-800">2026-01-30 03:00 AM</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b border-gray-50 pb-2">
                <span className="text-gray-500">預計下次清理</span>
                <span className="font-mono text-gray-800">2026-01-31 03:00 AM</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-500">目前日誌筆數</span>
                <span className="font-mono text-blue-600 font-bold">12,580 筆</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}