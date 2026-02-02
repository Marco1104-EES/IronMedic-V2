import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx' 
import { Upload, FileSpreadsheet, CheckCircle, Terminal, Plus, RefreshCw, Eye, Save, X, AlertTriangle, Download, FileWarning, ShieldCheck } from 'lucide-react'

export default function DataImportCenter() {
  const [fileMaster, setFileMaster] = useState(null)
  const [fileWix, setFileWix] = useState(null)
  const [processing, setProcessing] = useState(false)
  
  // 🟢 兩個資料庫：合格區 vs 隔離區
  const [validData, setValidData] = useState([])     // 準備匯入
  const [invalidData, setInvalidData] = useState([]) // 問題資料
  const [viewMode, setViewMode] = useState('valid')  // 切換檢視模式 ('valid' | 'invalid')

  const [logs, setLogs] = useState([])
  const logsEndRef = useRef(null)

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('zh-TW', { hour12: false })
    setLogs(prev => [...prev, { time, msg, type }])
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  // 🛠️ 工具：匯出 Excel
  const exportExcel = (data, filename) => {
      if (data.length === 0) { alert("沒有資料可匯出"); return; }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
      addLog(`📥 已下載檔案: ${filename}`, 'success');
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

  // 🔍 階段一：解析、合併、分流
  const handlePreview = async () => {
    if (!fileMaster) { alert("請至少上傳 Master 檔！"); return; }
    
    setProcessing(true); setLogs([]); setValidData([]); setInvalidData([]);
    addLog('啟動雙核解析引擎...', 'info');

    try {
        const masterData = await readExcel(fileMaster);
        addLog(`>> 主檔讀取成功: ${masterData.length} 筆`, 'success');
        let finalData = masterData;
        let patchedCount = 0;

        // 1. Wix 補丁邏輯
        if (fileWix) {
            const wixData = await readExcel(fileWix);
            addLog(`>> 補丁檔讀取成功: ${wixData.length} 筆`, 'success');
            const wixMap = {};
            wixData.forEach(r => {
                const n = (r['姓名'] || r['Name'] || r['user_name'] || '').toString().trim();
                const e = (r['Email'] || r['email'] || '').toString().trim();
                if (n && e) wixMap[n] = e;
            });
            
            finalData = masterData.map(row => {
                const name = (row['姓名'] || row['Name'] || '').toString().trim();
                // 如果缺 Email 但 Wix 有，就補上去
                if ((!row['Email'] && !row['email']) && name && wixMap[name]) {
                    patchedCount++; 
                    return { ...row, Email: wixMap[name], _patched: 'Yes' };
                }
                return row;
            });
            addLog(`>> 智能修補: 成功救回 ${patchedCount} 筆 Email`, 'info');
        }

        // 2. 資料標準化與分流 (Quarantine Logic)
        const validList = [];
        const invalidList = [];

        finalData.forEach((row, idx) => {
            // 欄位對應
            const name = (row['姓名'] || row['Name'] || '').toString().trim();
            const email = (row['Email'] || row['email'] || '').toString().trim();
            const phone = (row['電話'] || row['Phone'] || row['Mobile'] || '').toString().trim();
            const idNumber = (row['身分證'] || row['ID'] || '').toString().trim();
            const size = (row['衣服'] || row['Size'] || '').toString().trim();
            
            const record = {
                _id: idx,
                full_name: name || '未命名',
                email: email,
                phone: phone,
                id_number: idNumber,
                uniform_size: size,
                original_source: row._patched ? 'Master+Wix' : 'Master'
            };

            // 🔥 嚴格檢查：沒 Email 或 沒名字 就視為問題資料
            if (!email || !name || name === '未命名') {
                invalidList.push({ ...record, error_reason: !name ? '缺姓名' : '缺 Email' });
            } else {
                validList.push(record);
            }
        });

        setValidData(validList);
        setInvalidData(invalidList);
        
        // 自動切換視角
        if (invalidList.length > 0) {
            setViewMode('invalid');
            addLog(`⚠️ 發現 ${invalidList.length} 筆問題資料！已自動切換至檢疫區。`, 'warning');
        } else {
            setViewMode('valid');
            addLog(`✅ 全數通過！共 ${validList.length} 筆資料準備就緒。`, 'success');
        }

    } catch (err) {
        addLog(`❌ 解析失敗: ${err.message}`, 'error');
    } finally {
        setProcessing(false);
    }
  }

  // 💾 階段二：寫入資料庫 (只寫入 Valid Data)
  const handleConfirmImport = async () => {
      if (validData.length === 0) return;
      setProcessing(true);
      addLog('指揮官確認執行。開始寫入合格資料...', 'warning');

      try {
          // 移除暫存欄位，補上時間
          const recordsToUpsert = validData.map(({ _id, original_source, ...rest }) => ({
              ...rest,
              updated_at: new Date()
          }));

          const BATCH = 50; 
          let sCount = 0;
          let failedCount = 0;

          for (let i = 0; i < recordsToUpsert.length; i += BATCH) {
              const batch = recordsToUpsert.slice(i, i + BATCH);
              const { data, error } = await supabase
                  .from('profiles')
                  .upsert(batch, { onConflict: 'email' })
                  .select(); 

              if (error) {
                  addLog(`❌ 批次錯誤: ${error.message}`, 'error');
                  failedCount += batch.length;
              } else if (!data || data.length === 0) {
                   addLog(`⚠️ RLS 攔截: 第 ${i} 批資料寫入後無回應`, 'error');
                   failedCount += batch.length;
              } else {
                   sCount += data.length;
                   addLog(`>> 寫入進度: ${sCount} / ${recordsToUpsert.length}`, 'info');
              }
          }

          if (sCount > 0) {
              addLog(`🚀 任務完成！成功匯入: ${sCount} 筆。`, 'success');
              // 記錄到系統日誌
              const { data: { user } } = await supabase.auth.getUser();
              await supabase.from('system_logs').insert([{ 
                  level: 'INFO', 
                  message: `資料匯入完成`, 
                  details: { success: sCount, failed: failedCount, importer: user?.email } 
              }]);
              
              // 成功後清空合格區，但保留問題區讓使用者下載
              setTimeout(() => setValidData([]), 3000);
          } else {
              addLog(`💀 匯入失敗。請檢查權限。`, 'error');
          }

      } catch (err) {
          addLog(`❌ 致命錯誤: ${err.message}`, 'error');
      } finally {
          setProcessing(false);
      }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <FileSpreadsheet className="mr-3 text-blue-600"/> 資料匯入中心 V2.0
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-bold">雙核引擎 + 自動檢疫分流 (Auto Quarantine)</p>
        </div>
        
        {/* 全域下載按鈕區 */}
        {(validData.length > 0 || invalidData.length > 0) && (
            <div className="flex gap-2">
                 <button onClick={() => exportExcel([...validData, ...invalidData], 'IronMedic_Merged_Full')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center hover:bg-slate-700 transition-colors">
                     <Download size={14} className="mr-2"/> 下載完整合併檔 ({validData.length + invalidData.length})
                 </button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         {/* 左側：控制台 */}
         <div className="lg:col-span-1 space-y-6">
             <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center"><Upload size={18} className="mr-2"/> 檔案上傳區</h3>
                
                {/* Master */}
                <div className={`border-2 border-dashed rounded-xl p-4 text-center mb-3 transition-all ${fileMaster ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-blue-400'}`}>
                    <input type="file" id="m-up" className="hidden" accept=".xlsx" onChange={(e) => setFileMaster(e.target.files[0])}/>
                    <label htmlFor="m-up" className="cursor-pointer block">
                        <div className="flex items-center justify-center mb-1">
                            {fileMaster ? <CheckCircle size={24} className="text-green-600"/> : <FileSpreadsheet size={24} className="text-slate-400"/>}
                        </div>
                        <span className={`text-xs font-bold ${fileMaster ? 'text-green-700' : 'text-slate-500'}`}>{fileMaster ? fileMaster.name : '點擊上傳 Master.xlsx'}</span>
                    </label>
                </div>

                {/* Wix */}
                <div className={`border-2 border-dashed rounded-xl p-4 text-center mb-6 transition-all ${fileWix ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}>
                    <input type="file" id="w-up" className="hidden" accept=".xlsx" onChange={(e) => setFileWix(e.target.files[0])}/>
                    <label htmlFor="w-up" className="cursor-pointer block">
                        <div className="flex items-center justify-center mb-1">
                            {fileWix ? <CheckCircle size={24} className="text-blue-600"/> : <FileSpreadsheet size={24} className="text-slate-400"/>}
                        </div>
                        <span className={`text-xs font-bold ${fileWix ? 'text-blue-700' : 'text-slate-500'}`}>{fileWix ? fileWix.name : '點擊上傳 Wix.xlsx (選用)'}</span>
                    </label>
                </div>

                {/* 執行按鈕 */}
                {validData.length === 0 && invalidData.length === 0 ? (
                    <button onClick={handlePreview} disabled={processing || !fileMaster} className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md disabled:opacity-50 flex justify-center items-center transition-all">
                        {processing ? <RefreshCw size={20} className="animate-spin mr-2"/> : <Eye size={20} className="mr-2"/>}
                        開始解析與分流
                    </button>
                ) : (
                    <div className="space-y-3">
                        <button onClick={handleConfirmImport} disabled={processing || validData.length === 0} className="w-full py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-500 shadow-lg disabled:opacity-50 flex justify-center items-center animate-pulse">
                            {processing ? '寫入中...' : <><Save size={20} className="mr-2"/> 確認寫入合格資料 ({validData.length})</>}
                        </button>
                        <button onClick={() => {setValidData([]); setInvalidData([]); setLogs([])}} className="w-full py-2 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 flex justify-center items-center">
                            <X size={18} className="mr-2"/> 清除重來
                        </button>
                    </div>
                )}
             </div>
             
             {/* Log Console */}
             <div className="bg-[#0f172a] rounded-xl border border-slate-700 p-4 h-64 overflow-hidden flex flex-col shadow-inner">
                <div className="text-slate-400 text-xs font-bold border-b border-slate-700 pb-2 mb-2 flex items-center"><Terminal size={12} className="mr-2"/> System Logs</div>
                <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-xs space-y-1">
                    {logs.map((l, i) => (
                        <div key={i} className={`flex ${l.type === 'error' ? 'text-red-400' : l.type === 'success' ? 'text-green-400' : l.type === 'warning' ? 'text-yellow-400' : 'text-blue-300'}`}>
                            <span className="opacity-50 w-16 shrink-0">[{l.time}]</span><span>{l.msg}</span>
                        </div>
                    ))}
                    <div ref={logsEndRef}/>
                </div>
             </div>
         </div>

         {/* 右側：戰情視窗 (Tab 切換) */}
         <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden h-[600px]">
             {/* Tab Header */}
             <div className="flex border-b border-slate-200">
                 <button 
                    onClick={() => setViewMode('valid')}
                    className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-all ${viewMode === 'valid' ? 'bg-white text-green-600 border-b-2 border-green-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                 >
                    <ShieldCheck size={18} className="mr-2"/> 合格資料 ({validData.length})
                 </button>
                 <button 
                    onClick={() => setViewMode('invalid')}
                    className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-all ${viewMode === 'invalid' ? 'bg-red-50 text-red-600 border-b-2 border-red-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
                 >
                    <FileWarning size={18} className="mr-2"/> 問題資料/隔離區 ({invalidData.length})
                 </button>
             </div>

             {/* Tab Content */}
             <div className="flex-1 overflow-auto bg-slate-50 p-4">
                 {viewMode === 'valid' && (
                     <>
                        {validData.length > 0 ? (
                            <table className="w-full text-left text-sm bg-white rounded-lg overflow-hidden shadow-sm">
                                <thead className="bg-green-50 text-green-800 sticky top-0 font-bold">
                                    <tr><th className="p-3">姓名</th><th className="p-3">Email</th><th className="p-3">電話</th><th className="p-3">來源</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {validData.map((row, i) => (
                                        <tr key={i} className="hover:bg-green-50/30">
                                            <td className="p-3 font-bold text-slate-700">{row.full_name}</td>
                                            <td className="p-3 font-mono text-xs text-slate-500">{row.email}</td>
                                            <td className="p-3 text-slate-500">{row.phone}</td>
                                            <td className="p-3 text-xs"><span className="bg-slate-100 px-2 py-1 rounded text-slate-500">{row.original_source}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <div className="h-full flex flex-col items-center justify-center text-slate-400"><ShieldCheck size={48} className="mb-2 opacity-20"/>等待解析資料...</div>}
                     </>
                 )}

                 {viewMode === 'invalid' && (
                     <div className="space-y-4">
                        {invalidData.length > 0 && (
                            <div className="bg-red-100 border border-red-200 text-red-800 p-3 rounded-lg flex justify-between items-center">
                                <span className="text-xs font-bold flex items-center"><AlertTriangle size={14} className="mr-2"/> 這些資料缺少關鍵欄位，無法匯入。</span>
                                <button onClick={() => exportExcel(invalidData, 'IronMedic_Error_Report')} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-700 flex items-center shadow-sm">
                                    <Download size={12} className="mr-1"/> 下載問題報表
                                </button>
                            </div>
                        )}
                        
                        {invalidData.length > 0 ? (
                            <table className="w-full text-left text-sm bg-white rounded-lg overflow-hidden shadow-sm">
                                <thead className="bg-red-50 text-red-800 sticky top-0 font-bold">
                                    <tr><th className="p-3">姓名</th><th className="p-3">Email (缺失)</th><th className="p-3">錯誤原因</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invalidData.map((row, i) => (
                                        <tr key={i} className="hover:bg-red-50/30">
                                            <td className="p-3 font-bold text-slate-700">{row.full_name}</td>
                                            <td className="p-3 font-mono text-xs text-red-400 font-bold">{row.email || 'NULL'}</td>
                                            <td className="p-3"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{row.error_reason}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <div className="h-full flex flex-col items-center justify-center text-slate-400"><CheckCircle size={48} className="mb-2 opacity-20"/>太棒了！沒有發現問題資料。</div>}
                     </div>
                 )}
             </div>
         </div>
      </div>
    </div>
  )
}