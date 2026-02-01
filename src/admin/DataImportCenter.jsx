import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx' 
import { Upload, FileSpreadsheet, CheckCircle, Terminal, Plus, RefreshCw, Eye, Save, X, AlertTriangle } from 'lucide-react'

export default function DataImportCenter() {
  const [fileMaster, setFileMaster] = useState(null)
  const [fileWix, setFileWix] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [previewData, setPreviewData] = useState([]) // 預覽資料暫存區
  const [logs, setLogs] = useState([])
  const logsEndRef = useRef(null)

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('zh-TW', { hour12: false })
    setLogs(prev => [...prev, { time, msg, type }])
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  const readExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
          resolve(json);
        } catch (err) { reject(err); }
      };
      reader.readAsBinaryString(file);
    });
  };

  // 階段一：解析並產生預覽
  const handlePreview = async () => {
    if (!fileMaster) { alert("請至少上傳 Master 檔！"); return; }
    setProcessing(true); setLogs([]); setPreviewData([]);
    addLog('啟動解析引擎，準備產生預覽 (Generating Preview)...', 'info');

    try {
        const masterData = await readExcel(fileMaster);
        addLog(`>> 主檔讀取成功: ${masterData.length} 筆`, 'success');
        let finalData = masterData;

        if (fileWix) {
            const wixData = await readExcel(fileWix);
            addLog(`>> 補丁檔讀取成功: ${wixData.length} 筆`, 'success');
            const wixMap = {};
            wixData.forEach(r => {
                // 寬容比對：去除前後空白
                const n = (r['姓名'] || r['Name'] || r['user_name'] || '').toString().trim();
                const e = (r['Email'] || r['email'] || '').toString().trim();
                if (n && e) wixMap[n] = e;
            });
            
            let mCount = 0;
            finalData = masterData.map(row => {
                const name = (row['姓名'] || row['Name'] || '').toString().trim();
                if ((!row['Email'] && !row['email']) && name && wixMap[name]) {
                    mCount++; return { ...row, Email: wixMap[name] };
                }
                return row;
            });
            addLog(`>> 預覽合併計算: 預計修補 ${mCount} 筆 Email`, 'info');
        }

        // 轉換為標準格式供預覽
        const records = finalData.map((row, idx) => ({
            _id: idx, // 暫存 ID
            email: row['Email'] || row['email'] || `missing_${Date.now()}_${idx}@temp.com`,
            full_name: row['姓名'] || row['Name'] || '未命名',
            phone: row['電話'] || row['Phone'] || row['Mobile'] || '',
            id_number: row['身分證'] || row['ID'] || '',
            uniform_size: row['衣服'] || row['Size'] || '',
        }));

        setPreviewData(records);
        addLog('✅ 預覽準備就緒！請檢查下方表格數據是否正確。', 'success');

    } catch (err) {
        addLog(`❌ 解析失敗: ${err.message}`, 'error');
    } finally {
        setProcessing(false);
    }
  }

  // 階段二：確認並真實寫入
  const handleConfirmImport = async () => {
      if (previewData.length === 0) return;
      setProcessing(true);
      addLog('指揮官確認執行。開始寫入資料庫...', 'warning');

      try {
          // 移除暫存 ID，補上更新時間
          const recordsToUpsert = previewData.map(({ _id, ...rest }) => ({
              ...rest,
              updated_at: new Date()
          }));

          const BATCH = 100; let sCount = 0;
          for (let i = 0; i < recordsToUpsert.length; i += BATCH) {
              const { error } = await supabase.from('profiles').upsert(recordsToUpsert.slice(i, i + BATCH), { onConflict: 'email' });
              if (error) throw error;
              sCount += recordsToUpsert.slice(i, i + BATCH).length;
              addLog(`>> 寫入進度: ${sCount} / ${recordsToUpsert.length}`, 'info');
          }

          addLog(`🚀 任務完成！資料庫已同步 ${sCount} 筆資料。請前往會員中心查看。`, 'success');
          
          // 寫入系統日誌
          const { data: { user } } = await supabase.auth.getUser();
          await supabase.from('system_logs').insert([{ level: 'INFO', message: `資料匯入完成`, details: { count: sCount, by: user?.email } }]);

          // 3秒後清空預覽
          setTimeout(() => setPreviewData([]), 3000);

      } catch (err) {
          addLog(`❌ 寫入失敗: ${err.message}`, 'error');
          console.error(err);
      } finally {
          setProcessing(false);
      }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <FileSpreadsheet className="mr-3 text-blue-600"/> 資料匯入中心 (Real Data)
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-bold">雙核心引擎 + 視覺化戰情預覽 (Visual Preview)</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-blue-100 overflow-hidden p-8">
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${fileMaster ? 'border-green-500 bg-green-50' : 'border-green-200 hover:border-green-400 hover:bg-green-50/50'}`}>
                <CheckCircle size={56} className={`mx-auto mb-4 ${fileMaster ? 'text-green-500' : 'text-green-200'}`}/>
                <h4 className="font-bold text-gray-800 text-lg mb-1">1. 基本資料表 (Master)</h4>
                <p className="text-xs text-gray-500 mb-6">包含身分證、手機、詳細個資</p>
                <input type="file" id="m-up" className="hidden" accept=".xlsx" onChange={(e) => setFileMaster(e.target.files[0])}/>
                <label htmlFor="m-up" className={`cursor-pointer px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm ${fileMaster ? 'bg-white text-green-700 border border-green-300' : 'bg-white border border-gray-300 text-gray-600'}`}>{fileMaster ? '已載入' : '選擇檔案'}</label>
                {fileMaster && <p className="mt-2 text-sm text-green-700 font-mono">{fileMaster.name}</p>}
            </div>

            <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${fileWix ? 'border-blue-500 bg-blue-50' : 'border-blue-200 hover:border-blue-400 hover:bg-blue-50/50'}`}>
                <CheckCircle size={56} className={`mx-auto mb-4 ${fileWix ? 'text-blue-500' : 'text-blue-200'}`}/>
                <h4 className="font-bold text-gray-800 text-lg mb-1">2. Wix Mail (選用)</h4>
                <p className="text-xs text-gray-500 mb-6">用來補齊缺失的 Email</p>
                <input type="file" id="w-up" className="hidden" accept=".xlsx" onChange={(e) => setFileWix(e.target.files[0])}/>
                <label htmlFor="w-up" className={`cursor-pointer px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm ${fileWix ? 'bg-white text-blue-700 border border-blue-300' : 'bg-white border border-gray-300 text-gray-600'}`}>{fileWix ? '已載入' : '選擇檔案'}</label>
                {fileWix && <p className="mt-2 text-sm text-blue-700 font-mono">{fileWix.name}</p>}
            </div>
         </div>

         {/* 按鈕區 */}
         {previewData.length === 0 ? (
             <button onClick={handlePreview} disabled={processing || !fileMaster} className="w-full py-4 rounded-xl font-black text-lg shadow-lg bg-blue-600 text-white hover:bg-blue-500 hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center transition-all">
                {processing ? <><RefreshCw size={24} className="animate-spin mr-3"/> 正在解析 Excel...</> : <><Eye size={24} className="mr-2"/> 解析並預覽資料</>}
             </button>
         ) : (
             <div className="flex gap-4">
                 <button onClick={() => setPreviewData([])} className="w-1/3 py-4 rounded-xl font-bold text-lg bg-slate-100 text-slate-600 hover:bg-slate-200 flex justify-center items-center">
                    <X size={24} className="mr-2"/> 取消重來
                 </button>
                 <button onClick={handleConfirmImport} disabled={processing} className="w-2/3 py-4 rounded-xl font-black text-lg shadow-lg bg-green-600 text-white hover:bg-green-500 hover:shadow-green-500/30 disabled:opacity-50 flex justify-center items-center animate-pulse">
                    {processing ? <><RefreshCw size={24} className="animate-spin mr-3"/> 正在寫入資料庫...</> : <><Save size={24} className="mr-2"/> 確認無誤，寫入資料庫 ({previewData.length} 筆)</>}
                 </button>
             </div>
         )}

         {/* 視覺化預覽表格 */}
         {previewData.length > 0 && (
             <div className="mt-8 border-2 border-blue-500 rounded-xl overflow-hidden shadow-2xl">
                 <div className="bg-blue-600 text-white p-3 font-bold flex justify-between items-center">
                     <span className="flex items-center"><Eye size={18} className="mr-2"/> 匯入預覽 (前 50 筆)</span>
                     <span className="text-xs bg-blue-800 px-2 py-1 rounded">請檢查「姓名」與「Email」是否正確</span>
                 </div>
                 <div className="max-h-64 overflow-y-auto bg-slate-50">
                     <table className="w-full text-left text-sm">
                         <thead className="bg-slate-200 text-slate-600 sticky top-0 font-bold">
                             <tr>
                                 <th className="p-3">姓名 (Full Name)</th>
                                 <th className="p-3">Email</th>
                                 <th className="p-3">電話 (Phone)</th>
                                 <th className="p-3">身分證</th>
                             </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-200">
                             {previewData.slice(0, 50).map((row, i) => (
                                 <tr key={i} className="hover:bg-blue-50 transition-colors">
                                     <td className={`p-3 font-bold ${row.full_name === '未命名' ? 'text-red-500 bg-red-100' : 'text-slate-800'}`}>
                                         {row.full_name === '未命名' ? <span className="flex items-center"><AlertTriangle size={14} className="mr-1"/> 未命名</span> : row.full_name}
                                     </td>
                                     <td className="p-3 text-slate-600 font-mono text-xs">{row.email}</td>
                                     <td className="p-3 text-slate-600">{row.phone}</td>
                                     <td className="p-3 text-slate-600 font-mono">{row.id_number}</td>
                                 </tr>
                             ))}
                         </tbody>
                     </table>
                 </div>
             </div>
         )}

         {/* Log Console */}
         <div className="mt-8 bg-[#0f172a] rounded-xl border border-slate-700 p-5 h-48 overflow-y-auto custom-scrollbar font-mono text-sm relative shadow-inner">
            <div className="sticky top-0 bg-[#0f172a] text-slate-400 border-b border-slate-700 pb-2 mb-2 flex items-center"><Terminal size={14} className="mr-2"/> System Logs Output</div>
            <div className="space-y-1">
                {logs.map((l, i) => (
                    <div key={i} className={`flex ${l.type === 'error' ? 'text-red-400' : l.type === 'success' ? 'text-green-400' : l.type === 'warning' ? 'text-yellow-400' : 'text-blue-300'}`}>
                        <span className="text-slate-600 w-20 mr-2">[{l.time}]</span><span>{l.msg}</span>
                    </div>
                ))}
                <div ref={logsEndRef}/>
            </div>
         </div>
      </div>

      {/* 底部擴充槽 */}
      <div className="mt-12">
          <div className="flex items-center text-slate-500 font-bold mb-4 text-sm uppercase tracking-widest">
              <Plus size={16} className="mr-2"/> 未來模組規劃 (Future Modules)
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {[1,2,3,4,5].map(i => (
                  <div key={i} className="aspect-square border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-300 hover:border-slate-300 transition-colors cursor-not-allowed">
                      <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3">
                          <Plus size={24}/>
                      </div>
                      <span className="text-xs font-bold">擴充插槽 0{i}</span>
                      <span className="text-[10px] font-mono mt-1 opacity-50">Pending</span>
                  </div>
              ))}
          </div>
      </div>
    </div>
  )
}