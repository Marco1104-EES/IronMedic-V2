import { useState } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx'
import { Upload, FileText, CheckCircle, AlertCircle, Database, Play } from 'lucide-react'

export default function BulkImport() {
  const [masterData, setMasterData] = useState([])
  const [wixData, setWixData] = useState([])
  const [loading, setLoading] = useState(false)
  const [logs, setLogs] = useState([])

  // 📂 處理檔案上傳 (解析 Excel)
  const handleFileUpload = (e, type) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target.result, { type: 'binary' })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const jsonData = XLSX.utils.sheet_to_json(sheet)

        if (type === 'master') {
          setMasterData(jsonData)
          addLog(`✅ 基本資料表讀取成功: ${jsonData.length} 筆`)
        } else {
          setWixData(jsonData)
          addLog(`✅ Wix 資料表讀取成功: ${jsonData.length} 筆`)
        }
      } catch (error) {
        console.error(error)
        addLog(`❌ 檔案讀取失敗: ${error.message}`)
      }
    }
    reader.readAsBinaryString(file)
  }

  // 📝 增加日誌到畫面
  const addLog = (msg) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev])
  }

  // 🚀 核心功能：企業級批次匯入引擎
  const handleImport = async () => {
    if (!masterData.length) {
      alert('請先上傳「基本資料表」！')
      return
    }

    setLoading(true)
    const startTime = Date.now()
    addLog('🚀 開始啟動資料匯入程序...')

    // 1. 建立「工單」 (System Job) - 確保有據可查
    const { data: job, error: jobError } = await supabase
      .from('system_jobs')
      .insert({
        job_type: 'member_import',
        status: 'processing',
        total_count: masterData.length,
      })
      .select()
      .single()

    // 如果建立工單失敗，還是繼續跑，只是會在 Console 報錯 (不擋路)
    if (jobError) {
      console.error('⚠️ 無法建立系統日誌 (但不影響匯入):', jobError.message)
    }

    try {
      // 2. 準備資料對應 (Mapping) - 在記憶體中極速處理
      addLog('📂 正在建立資料關聯與清洗...')
      
      // 建立 Wix Email 快速查找表 (Hash Map)
      const wixMap = new Map()
      if (wixData.length > 0) {
        wixData.forEach((row) => {
          const key = String(row['姓名'] || '').trim()
          const email = row['Login email']?.trim()
          if (key && email) wixMap.set(key, email)
        })
        addLog(`🔹 已建立 ${wixMap.size} 筆 Wix Email 索引`)
      }

      // 整理 Excel 資料 (格式化 + 防呆)
      const formattedData = masterData.map((row) => {
        const name = row['中文姓名']?.trim()
        
        // 優先用基本表的 Email，沒有的話去 Wix 找
        let email = row['e-mail']?.trim()
        if (!email && name) {
          email = wixMap.get(name)
        }

        // 處理 Excel 日期 (可能是數字或文字)
        let joinDate = row['加入醫護鐵人年月']
        let formattedJoinDate = null
        
        if (typeof joinDate === 'number') {
          // Excel 序列號轉日期
          formattedJoinDate = new Date(Math.round((joinDate - 25569) * 86400 * 1000)).toISOString()
        } else if (typeof joinDate === 'string' && joinDate.length > 0) {
          // 嘗試解析文字日期 (例如 "2023.05")
          formattedJoinDate = new Date(joinDate.replace(/\./g, '-')).toISOString()
        }

        return {
          // ⚠️ 對應 Supabase 資料庫欄位
          full_name: name,
          citizen_id: String(row['身分證字號'] || '').trim(), // 強制轉字串，防止當機
          email: email || null,
          phone: String(row['手機'] || '').trim(), // 強制轉字串
          uniform_size: row['衣服size(可參考醫護鐵人背心尺寸)']?.trim(),
          join_date: formattedJoinDate,
          license_type: row['醫療執照種類'],
          license_expiry: null, // 如果 Excel 有這欄再補上
          source_file: `import_${new Date().toISOString().split('T')[0]}`,
        }
      }).filter((item) => item.citizen_id) // ❌ 過濾掉沒有身分證的無效資料

      addLog(`📄 有效資料共 ${formattedData.length} 筆，準備寫入...`)

      // 3. 🚀 渦輪加速：批次寫入 (Chunking)
      const BATCH_SIZE = 50 // 一次送 50 筆
      let successCount = 0
      let errors = []

      for (let i = 0; i < formattedData.length; i += BATCH_SIZE) {
        const chunk = formattedData.slice(i, i + BATCH_SIZE)
        
        // Upsert: 有就更新，沒有就新增
        const { error } = await supabase
          .from('profiles')
          .upsert(chunk, { 
            onConflict: 'citizen_id', 
            ignoreDuplicates: false 
          })

        if (error) {
          errors.push({ batch: i, msg: error.message })
          addLog(`❌ 第 ${i + 1} ~ ${i + chunk.length} 筆寫入失敗: ${error.message}`)
        } else {
          successCount += chunk.length
          // 每 100 筆更新一次畫面，避免刷屏太快
          if ((i + BATCH_SIZE) % 100 === 0) {
             addLog(`✅ 進度: 已處理 ${successCount} / ${formattedData.length} 筆...`)
          }
        }
      }

      // 4. 結案：更新工單狀態
      if (job) {
        await supabase
          .from('system_jobs')
          .update({
            status: errors.length > 0 ? 'completed_with_errors' : 'completed',
            success_count: successCount,
            error_count: formattedData.length - successCount,
            error_log: errors,
          })
          .eq('id', job.id)
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(1)
      addLog(`🎉 匯入完成！耗時 ${duration} 秒`)
      addLog(`📊 成功: ${successCount} 筆 | 失敗: ${formattedData.length - successCount} 筆`)
      
      alert(`匯入完成！\n成功: ${successCount}\n失敗: ${formattedData.length - successCount}\n(詳細請看下方日誌)`)

    } catch (err) {
      console.error(err)
      addLog(`⛔ 發生嚴重錯誤: ${err.message}`)
      if (job) {
        await supabase.from('system_jobs').update({ status: 'failed', error_log: err.message }).eq('id', job.id)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-4xl mx-auto mt-10">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <Database className="mr-3 text-blue-600" />
        企業級資料匯入中心 (ERP v4.0)
      </h2>

      {/* 檔案上傳區 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        
        {/* 基本資料表上傳 */}
        <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${masterData.length ? 'border-green-500 bg-green-50' : 'border-gray-300 hover:border-blue-400'}`}>
          <div className="flex flex-col items-center">
            {masterData.length ? <CheckCircle size={40} className="text-green-500 mb-2"/> : <FileText size={40} className="text-gray-400 mb-2"/>}
            <h3 className="font-bold text-gray-700">1. 基本資料表 (Master)</h3>
            <p className="text-sm text-gray-500 mb-4">包含身分證、手機、詳細個資</p>
            
            <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded shadow-sm hover:bg-gray-50 text-sm font-medium">
              選擇 .xlsx 檔案
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => handleFileUpload(e, 'master')} />
            </label>
            {masterData.length > 0 && <span className="text-green-600 text-sm mt-2 font-bold">已載入 {masterData.length} 筆</span>}
          </div>
        </div>

        {/* Wix 資料上傳 */}
        <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${wixData.length ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}`}>
          <div className="flex flex-col items-center">
            {wixData.length ? <CheckCircle size={40} className="text-blue-500 mb-2"/> : <Upload size={40} className="text-gray-400 mb-2"/>}
            <h3 className="font-bold text-gray-700">2. Wix Mail (選用)</h3>
            <p className="text-sm text-gray-500 mb-4">用來補齊缺失的 Email</p>
            
            <label className="cursor-pointer bg-white border border-gray-300 px-4 py-2 rounded shadow-sm hover:bg-gray-50 text-sm font-medium">
              選擇 .xlsx 檔案
              <input type="file" accept=".xlsx, .xls" className="hidden" onChange={(e) => handleFileUpload(e, 'wix')} />
            </label>
            {wixData.length > 0 && <span className="text-blue-600 text-sm mt-2 font-bold">已載入 {wixData.length} 筆</span>}
          </div>
        </div>
      </div>

      {/* 執行按鈕 */}
      <button
        onClick={handleImport}
        disabled={loading || masterData.length === 0}
        className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center transition-all shadow-lg
          ${loading || masterData.length === 0 ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:scale-[1.02]'}`}
      >
        {loading ? (
          <>
            <div className="animate-spin mr-3 border-4 border-white border-t-transparent rounded-full w-6 h-6"></div>
            資料高速處理中...
          </>
        ) : (
          <>
            <Play className="mr-2" fill="currentColor" />
            開始合併匯入
          </>
        )}
      </button>

      {/* 系統日誌區 */}
      <div className="mt-8 bg-slate-900 rounded-lg p-4 shadow-inner min-h-[200px] max-h-[300px] overflow-y-auto font-mono text-sm text-green-400">
        <div className="flex items-center justify-between border-b border-slate-700 pb-2 mb-2">
          <span className="text-gray-400">System Logs</span>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <span className="text-xs text-gray-500">Live</span>
          </div>
        </div>
        
        {logs.length === 0 ? (
          <div className="text-gray-600 italic text-center py-4">等待操作...</div>
        ) : (
          logs.map((log, index) => (
            <div key={index} className="mb-1 border-l-2 border-slate-700 pl-2 hover:bg-slate-800 transition-colors">
              {log}
            </div>
          ))
        )}
      </div>

    </div>
  )
}