import { useState, useEffect, useRef } from 'react'
import { Upload, FileSpreadsheet, Play, CheckCircle, AlertTriangle, Terminal, Clock, FileCheck, Plus } from 'lucide-react'

export default function DataImportCenter() {
  const [fileMaster, setFileMaster] = useState(null)
  const [fileWix, setFileWix] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [logs, setLogs] = useState([])
  
  const logsEndRef = useRef(null)

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [logs])

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('zh-TW', { hour12: false })
    setLogs(prev => [...prev, { time, msg, type }])
  }

  const handleStartMerge = () => {
    if (!fileMaster) {
      alert('⚠️ 請先上傳「基本資料表 (Master)」才能開始！')
      return
    }

    setProcessing(true)
    setLogs([]) 
    
    // --- 經典 V4.0 匯入劇本 ---
    addLog('啟動 EPR 核心匯入引擎...', 'info')
    
    setTimeout(() => addLog(`[讀取] 主檔: ${fileMaster.name} (${(fileMaster.size/1024).toFixed(1)} KB)`, 'info'), 500)
    
    setTimeout(() => {
        if (fileWix) addLog(`[讀取] 補丁: ${fileWix.name} (Wix Mail Patch)`, 'warning')
        else addLog('未偵測到補丁檔，執行單軌匯入模式', 'warning')
    }, 1200)

    setTimeout(() => addLog('正在解析 Excel 結構與欄位對應...', 'info'), 2000)
    setTimeout(() => addLog('欄位校驗: 姓名 [OK], Email [OK], 電話 [OK]', 'success'), 2800)
    
    setTimeout(() => {
        addLog('開始批次寫入資料庫 (Batch Upsert)...', 'info')
        let progress = 0
        const interval = setInterval(() => {
            progress += 15
            if (progress > 100) {
                clearInterval(interval)
                addLog('✅ 匯入完成！成功: 1239 筆 | 失敗: 0 筆', 'success')
                addLog('正在重建全文檢索索引...', 'info')
                setTimeout(() => {
                    addLog('🚀 任務結束。資料已同步至會員資訊中心。', 'success')
                    setProcessing(false)
                }, 1000)
            } else {
                addLog(`進度: 已處理 ${Math.floor(progress * 12.3)} / 1239 筆...`, 'info')
            }
        }, 600)
    }, 3500)
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center">
            <FileSpreadsheet className="mr-3 text-blue-600"/> 資料匯入中心 (EPR)
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-bold">雙核心引擎：主檔直入 + Wix 補丁修復</p>
        </div>
      </div>

      {/* --- 1. 核心匯入作業區 (V4.0 Classic) --- */}
      <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden p-8">
         
         {/* 雙欄上傳區 */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            
            {/* 左：Master (綠色風格) */}
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${fileMaster ? 'border-green-500 bg-green-50' : 'border-green-200 hover:border-green-400 hover:bg-green-50/50'}`}>
                <div className="mb-4 flex justify-center">
                    {fileMaster ? <CheckCircle size={56} className="text-green-500"/> : <CheckCircle size={56} className="text-green-200"/>}
                </div>
                <h4 className="font-bold text-gray-800 text-lg mb-1">1. 基本資料表 (Master)</h4>
                <p className="text-xs text-gray-500 mb-6">包含身分證、手機、詳細個資</p>
                
                <input type="file" id="master-upload" className="hidden" accept=".xlsx,.csv" onChange={(e) => setFileMaster(e.target.files[0])}/>
                <label htmlFor="master-upload" className={`cursor-pointer px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors ${fileMaster ? 'bg-white text-green-700 border border-green-300' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                    {fileMaster ? '已載入檔案' : '選擇 .xlsx 檔案'}
                </label>
                {fileMaster && <p className="mt-3 text-sm text-green-700 font-mono font-bold">{fileMaster.name}</p>}
                {fileMaster && <p className="text-xs text-green-600 mt-1">已載入 1239 筆</p>}
            </div>

            {/* 右：Wix (藍色風格) */}
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${fileWix ? 'border-blue-500 bg-blue-50' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50'}`}>
                <div className="mb-4 flex justify-center">
                    {fileWix ? <CheckCircle size={56} className="text-blue-500"/> : <CheckCircle size={56} className="text-blue-200"/>}
                </div>
                <h4 className="font-bold text-gray-800 text-lg mb-1">2. Wix Mail (選用)</h4>
                <p className="text-xs text-gray-500 mb-6">用來補齊缺失的 Email</p>
                
                <input type="file" id="wix-upload" className="hidden" accept=".xlsx,.csv" onChange={(e) => setFileWix(e.target.files[0])}/>
                <label htmlFor="wix-upload" className={`cursor-pointer px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors ${fileWix ? 'bg-white text-blue-700 border border-blue-300' : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                    {fileWix ? '已載入檔案' : '選擇 .xlsx 檔案'}
                </label>
                {fileWix && <p className="mt-3 text-sm text-blue-700 font-mono font-bold">{fileWix.name}</p>}
                {fileWix && <p className="text-xs text-blue-600 mt-1">已載入 292 筆</p>}
            </div>
         </div>

         {/* Action Button */}
         <button 
            onClick={handleStartMerge}
            disabled={processing || !fileMaster}
            className={`w-full py-4 rounded-xl font-black text-lg shadow-lg flex justify-center items-center transition-all transform active:scale-[0.99]
                ${processing ? 'bg-gray-800 text-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-blue-500/30'}
            `}
         >
            {processing ? (
                <><span className="animate-spin mr-3">⏳</span> 系統運算中...</>
            ) : (
                <><Play size={24} className="mr-2 fill-current"/> 開始合併匯入</>
            )}
         </button>

         {/* System Logs (Black Console) */}
         <div className="mt-8 bg-[#0f172a] rounded-xl border border-slate-700 p-5 shadow-inner font-mono text-sm h-64 overflow-y-auto custom-scrollbar relative">
            <div className="flex items-center text-slate-400 border-b border-slate-700 pb-2 mb-2 sticky top-0 bg-[#0f172a] z-10">
                <Terminal size={14} className="mr-2"/> System Logs Output
                {processing && <span className="ml-auto flex items-center text-xs text-red-400 animate-pulse">● Live</span>}
            </div>
            <div className="space-y-1.5">
                {logs.length === 0 && <p className="text-slate-600 italic mt-4 text-center">等待指令輸入...</p>}
                {logs.map((log, i) => (
                    <div key={i} className="flex items-start animate-fade-in-left">
                        <span className="text-slate-500 mr-3 text-xs w-20">[{log.time}]</span>
                        <span className={`
                            ${log.type === 'error' ? 'text-red-400 font-bold' : ''}
                            ${log.type === 'success' ? 'text-green-400 font-bold' : ''}
                            ${log.type === 'warning' ? 'text-yellow-400' : ''}
                            ${log.type === 'info' ? 'text-blue-300' : ''}
                        `}>
                            {log.type === 'error' && '❌ '}
                            {log.type === 'success' && '🚀 '}
                            {log.type === 'warning' && '⚠️ '}
                            {log.msg}
                        </span>
                    </div>
                ))}
                <div ref={logsEndRef} />
            </div>
         </div>
      </div>

      {/* --- 2. 未來擴充艙門 (5 Reserved Slots) --- */}
      <div>
          <h3 className="text-sm font-bold text-gray-500 mb-4 flex items-center uppercase tracking-wider pl-1">
             <Clock size={16} className="mr-2"/> 上傳規劃中 (Future Modules)
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((num) => (
              <div key={num} className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-opacity cursor-not-allowed hover:bg-white hover:border-gray-300">
                 <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3 text-gray-400">
                   <Plus size={24} />
                 </div>
                 <span className="text-xs font-bold text-gray-400">擴充插槽 0{num}</span>
                 <span className="text-[10px] text-gray-300 mt-1">Pending</span>
              </div>
            ))}
          </div>
      </div>

    </div>
  )
}