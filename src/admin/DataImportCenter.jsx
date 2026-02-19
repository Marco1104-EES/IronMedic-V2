import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx' 
import { Upload, FileSpreadsheet, CheckCircle, Terminal, RefreshCw, Eye, Save, X, AlertTriangle, Download, FileWarning, ShieldCheck, Search, Database } from 'lucide-react'

export default function DataImportCenter() {
  const [fileMaster, setFileMaster] = useState(null)
  const [fileWix, setFileWix] = useState(null)
  const [processing, setProcessing] = useState(false)
  
  // 🟢 兩個資料庫：合格區 vs 隔離區
  const [validData, setValidData] = useState([])     
  const [invalidData, setInvalidData] = useState([]) 
  const [viewMode, setViewMode] = useState('valid')  

  const [logs, setLogs] = useState([])
  const logsEndRef = useRef(null)

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('zh-TW', { hour12: false })
    setLogs(prev => [...prev, { time, msg, type }])
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  const exportExcel = (data, filename) => {
      if (data.length === 0) { alert("沒有資料可匯出"); return; }
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${filename}_${new Date().toISOString().slice(0,10)}.xlsx`);
      addLog(`📥 已下載檔案: ${filename}`, 'success');
  }

  // 核心引擎：原始資料讀取 (讀取所有行，不預設表頭)
  const readExcelRaw = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const sheetName = workbook.SheetNames[0];
          // 關鍵：使用 header: 1 讀取為二維陣列 (Array of Arrays)，讓我們可以看到原始結構
          const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
          resolve(rows);
        } catch (err) { reject(err); }
      };
      reader.readAsBinaryString(file);
    });
  };

  // 🕵️‍♂️ 定位表頭 (Header Detection)
  const findHeaderRow = (rows) => {
      // 掃描前 20 行，尋找包含關鍵字的行
      const keywords = ['姓名', 'Name', 'name', 'Email', 'email', '信箱', '電話', 'Phone', '身分證', 'ID'];
      
      for (let i = 0; i < Math.min(rows.length, 20); i++) {
          const rowStr = JSON.stringify(rows[i]); // 轉字串比較快
          const matchCount = keywords.filter(k => rowStr.includes(k)).length;
          // 如果這一行包含超過 2 個關鍵字，它就是表頭！
          if (matchCount >= 2) {
              return i;
          }
      }
      return 0; // 找不到就預設第一行
  }

  // 轉換二維陣列為物件 (基於找到的表頭)
  const parseRowsToObjects = (rows, headerIndex) => {
      const headers = rows[headerIndex].map(h => (h || '').toString().trim());
      const data = [];
      
      for (let i = headerIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue; // 跳過空行
          
          let obj = {};
          headers.forEach((h, colIndex) => {
              if (h) obj[h] = row[colIndex];
          });
          data.push(obj);
      }
      return { data, headers };
  }

  // 🧠 模糊取值助手
  const findValue = (row, keywords) => {
      if (!row) return '';
      const keys = Object.keys(row);
      // 精準+模糊混合搜尋
      const match = keys.find(k => keywords.some(w => k.toLowerCase().includes(w.toLowerCase())));
      return match ? (row[match] || '').toString().trim() : '';
  }

  // 🔍 階段一：資料解析
  const handlePreview = async () => {
    if (!fileMaster) { alert("請至少上傳 Master 檔！"); return; }
    
    setProcessing(true); setLogs([]); setValidData([]); setInvalidData([]);
    addLog('啟動資料分析引擎 (Deep Analysis Mode)...', 'warning');

    try {
        // 1. 讀取 Master (Raw Mode)
        const masterRows = await readExcelRaw(fileMaster);
        const masterHeaderIdx = findHeaderRow(masterRows);
        addLog(`>> 定位 Master 表頭在第 ${masterHeaderIdx + 1} 行`, 'info');
        
        const { data: masterData, headers: masterHeaders } = parseRowsToObjects(masterRows, masterHeaderIdx);
        addLog(`>> 成功提取資料: ${masterData.length} 筆 (偵測欄位: ${masterHeaders.slice(0,5).join(', ')}...)`, 'success');

        let finalData = masterData;
        let patchedCount = 0;

        // 2. 讀取 Wix (Raw Mode)
        if (fileWix) {
            const wixRows = await readExcelRaw(fileWix);
            const wixHeaderIdx = findHeaderRow(wixRows);
            const { data: wixData } = parseRowsToObjects(wixRows, wixHeaderIdx);
            
            addLog(`>> 補丁檔提取成功: ${wixData.length} 筆`, 'success');
            
            const wixMap = {};
            wixData.forEach(r => {
                // 盡量抓乾淨的名字
                const n = findValue(r, ['姓名', 'Name']).replace(/\s+/g, ''); // 去除空白
                const e = findValue(r, ['Email', 'email', '信箱']);
                if (n && e) wixMap[n] = e;
            });

            // 3. 模糊比對修補 (Fuzzy Patching)
            finalData = masterData.map(row => {
                let name = findValue(row, ['姓名', 'Name', '選手']).replace(/\s+/g, '');
                // 處理 "陳彥良 基本救命術..." -> 只取前三個字當 Key 來比對 (或是把職稱去掉)
                // 這裡用一個簡單策略：如果 Wix Map 的 key 包含在 Master 名字裡，就算對中
                let matchedEmail = null;
                
                // 策略 A: 完全符合
                if (wixMap[name]) matchedEmail = wixMap[name];
                
                // 策略 B: 部分符合 (解決 "陳彥良XXX" 的問題)
                if (!matchedEmail) {
                    const possibleKey = Object.keys(wixMap).find(k => name.startsWith(k) || k.startsWith(name));
                    if (possibleKey) matchedEmail = wixMap[possibleKey];
                }

                if (matchedEmail) {
                    // 如果原本沒 Email，補上去
                    let originalEmail = findValue(row, ['Email', 'email', '信箱']);
                    if (!originalEmail) {
                        patchedCount++;
                        return { ...row, _patched_email: matchedEmail, _is_patched: true };
                    }
                }
                return row;
            });
            addLog(`>> 模糊比對修補: 自動修復 ${patchedCount} 筆 Email`, 'info');
        }

        // 4. 標準化與分流
        const validList = [];
        const invalidList = [];

        finalData.forEach((row, idx) => {
            const nameRaw = findValue(row, ['姓名', 'Name', '選手', '中文']);
            const name = nameRaw || '未命名';
            
            // 優先用修補的 Email
            const emailRaw = row._patched_email || findValue(row, ['Email', 'email', '信箱', 'mail']);
            const phone = findValue(row, ['電話', 'Phone', 'Mobile', '手機']);
            const idNumber = findValue(row, ['身分證', 'ID', 'id_number']);
            const size = findValue(row, ['衣服', 'Size', 'uniform', '尺寸']);
            
            const record = {
                _id: idx,
                full_name: name,
                email: emailRaw,
                phone: phone,
                id_number: idNumber,
                shirt_size: size, // 注意：您原本寫 uniform_size，但我看 MemberCRM 用 shirt_size，這裡幫您對齊
                admin_note: row._is_patched ? '來源: Master+Wix (Fuzzy)' : '來源: Master'
            };

            // 嚴格檢查：沒 Email 或 沒名字 就視為問題資料
            // 但如果名字是 "未命名"，一定要踢掉
            if (!emailRaw || !nameRaw) {
                invalidList.push({ ...record, error_reason: !nameRaw ? '找不到姓名欄位' : '缺 Email' });
            } else {
                validList.push(record);
            }
        });

        setValidData(validList);
        setInvalidData(invalidList);
        
        if (invalidList.length > 0) {
            setViewMode('invalid');
            addLog(`⚠️ 偵測到 ${invalidList.length} 筆異常資料 (已隔離)`, 'warning');
        } else {
            setViewMode('valid');
            addLog(`✅ 資料檢查正常！共 ${validList.length} 筆資料待匯入。`, 'success');
        }

    } catch (err) {
        addLog(`❌ 分析錯誤: ${err.message}`, 'error');
        console.error(err);
    } finally {
        setProcessing(false);
    }
  }

  // 💾 階段二：寫入資料庫 (批次處理)
  const handleConfirmImport = async () => {
      if (validData.length === 0) return;
      setProcessing(true);
      addLog('開始寫入資料庫 (Writing to DB)...', 'warning');

      try {
          const recordsToUpsert = validData.map(({ _id, ...rest }) => ({
              ...rest,
              role: 'USER', // 預設權限
              updated_at: new Date()
          }));

          const BATCH = 50; 
          let sCount = 0;
          let failedCount = 0;

          // 使用 for...of 迴圈確保順序與安全性
          for (let i = 0; i < recordsToUpsert.length; i += BATCH) {
              const batch = recordsToUpsert.slice(i, i + BATCH);
              try {
                  const { data, error } = await supabase
                      .from('profiles')
                      .upsert(batch, { onConflict: 'email' })
                      .select(); 

                  if (error) throw error;

                  if (!data || data.length === 0) {
                      // RLS 攔截，但不中斷整個流程
                      addLog(`⚠️ 寫入遭拒 (RLS): 第 ${i/BATCH + 1} 批次無效`, 'error');
                      failedCount += batch.length;
                  } else {
                      sCount += data.length;
                      // 減少 Log 刷屏，每 200 筆回報一次
                      if (sCount % 200 === 0) addLog(`>> 寫入確認: ${sCount} / ${recordsToUpsert.length}`, 'info');
                  }
              } catch (batchErr) {
                  addLog(`❌ 第 ${i/BATCH + 1} 批次寫入失敗: ${batchErr.message}`, 'error');
                  failedCount += batch.length;
                  // 繼續下一批，不中斷
              }
          }

          if (sCount > 0) {
              addLog(`🚀 匯入作業結束！成功匯入: ${sCount} 筆資料。`, 'success');
              // 記錄到系統日誌 (如果有 system_logs 表的話)
              /* await supabase.from('system_logs').insert([{ 
                  level: 'INFO', 
                  message: `資料匯入完成`, 
                  details: { success: sCount, failed: failedCount } 
              }]);
              */
              setTimeout(() => setValidData([]), 3000);
          } else {
              addLog(`💀 寫入失敗：資料庫拒絕了所有寫入。請檢查 Supabase Policy。`, 'error');
          }

      } catch (err) {
          addLog(`❌ 系統錯誤: ${err.message}`, 'error');
      } finally {
          setProcessing(false);
      }
  }

  return (
    <div className="space-y-8 animate-fade-in pb-20">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <Database className="mr-3 text-blue-600"/> 資料匯入中心 (Advanced)
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-bold">資料分析比對清除 (Master 表頭偵測 + Wix 補丁融合)</p>
        </div>
        
        {(validData.length > 0 || invalidData.length > 0) && (
            <div className="flex gap-2">
                 <button onClick={() => exportExcel([...validData, ...invalidData], 'IronMedic_Full_Report')} className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center hover:bg-slate-700 transition-colors">
                     <Download size={14} className="mr-2"/> 下載匯入報告 ({validData.length + invalidData.length})
                 </button>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1 space-y-6">
             <div className="bg-white rounded-2xl shadow-xl border border-blue-100 p-6">
                <h3 className="font-bold text-slate-700 mb-4 flex items-center"><Search size={18} className="mr-2 text-purple-500"/> 匯入資料分析</h3>
                
                <div className={`border-2 border-dashed rounded-xl p-4 text-center mb-3 transition-all ${fileMaster ? 'border-green-500 bg-green-50' : 'border-slate-300 hover:border-blue-400'}`}>
                    <input type="file" id="m-up" className="hidden" accept=".xlsx" onChange={(e) => setFileMaster(e.target.files[0])}/>
                    <label htmlFor="m-up" className="cursor-pointer block">
                        <div className="flex items-center justify-center mb-1">
                            {fileMaster ? <CheckCircle size={24} className="text-green-600"/> : <FileSpreadsheet size={24} className="text-slate-400"/>}
                        </div>
                        <span className={`text-xs font-bold ${fileMaster ? 'text-green-700' : 'text-slate-500'}`}>{fileMaster ? fileMaster.name : '1. 上傳 Master.xlsx (名單)'}</span>
                    </label>
                </div>

                <div className={`border-2 border-dashed rounded-xl p-4 text-center mb-6 transition-all ${fileWix ? 'border-blue-500 bg-blue-50' : 'border-slate-300 hover:border-blue-400'}`}>
                    <input type="file" id="w-up" className="hidden" accept=".xlsx" onChange={(e) => setFileWix(e.target.files[0])}/>
                    <label htmlFor="w-up" className="cursor-pointer block">
                        <div className="flex items-center justify-center mb-1">
                            {fileWix ? <CheckCircle size={24} className="text-blue-600"/> : <FileSpreadsheet size={24} className="text-slate-400"/>}
                        </div>
                        <span className={`text-xs font-bold ${fileWix ? 'text-blue-700' : 'text-slate-500'}`}>{fileWix ? fileWix.name : '2. 上傳 Wix.xlsx (補丁)'}</span>
                    </label>
                </div>

                {validData.length === 0 && invalidData.length === 0 ? (
                    <button onClick={handlePreview} disabled={processing || !fileMaster} className="w-full py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-500 shadow-md disabled:opacity-50 flex justify-center items-center transition-all">
                        {processing ? <RefreshCw size={20} className="animate-spin mr-2"/> : <Eye size={20} className="mr-2"/>}
                        啟動分析檢查
                    </button>
                ) : (
                    <div className="space-y-3">
                        <button onClick={handleConfirmImport} disabled={processing || validData.length === 0} className="w-full py-3 rounded-xl font-black text-white bg-green-600 hover:bg-green-500 shadow-lg disabled:opacity-50 flex justify-center items-center animate-pulse">
                            {processing ? '資料寫入中...' : <><Save size={20} className="mr-2"/> 確認匯入 ({validData.length})</>}
                        </button>
                        <button onClick={() => {setValidData([]); setInvalidData([]); setLogs([])}} className="w-full py-2 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 flex justify-center items-center">
                            <X size={18} className="mr-2"/> 清除重來
                        </button>
                    </div>
                )}
             </div>
             
             <div className="bg-[#0f172a] rounded-xl border border-slate-700 p-4 h-64 overflow-hidden flex flex-col shadow-inner">
                <div className="text-slate-400 text-xs font-bold border-b border-slate-700 pb-2 mb-2 flex items-center"><Terminal size={12} className="mr-2"/> 操作紀錄日誌 (Operation Logs)</div>
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

         <div className="lg:col-span-2 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden h-[600px]">
             <div className="flex border-b border-slate-200">
                 <button onClick={() => setViewMode('valid')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-all ${viewMode === 'valid' ? 'bg-white text-green-600 border-b-2 border-green-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                    <ShieldCheck size={18} className="mr-2"/> 有效資料 ({validData.length})
                 </button>
                 <button onClick={() => setViewMode('invalid')} className={`flex-1 py-4 text-sm font-bold flex items-center justify-center transition-all ${viewMode === 'invalid' ? 'bg-red-50 text-red-600 border-b-2 border-red-600' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}>
                    <FileWarning size={18} className="mr-2"/> 異常資料 ({invalidData.length})
                 </button>
             </div>

             <div className="flex-1 overflow-auto bg-slate-50 p-4">
                 {viewMode === 'valid' && (
                     <>
                        {validData.length > 0 ? (
                            <table className="w-full text-left text-sm bg-white rounded-lg overflow-hidden shadow-sm">
                                <thead className="bg-green-50 text-green-800 sticky top-0 font-bold">
                                    <tr><th className="p-3">姓名</th><th className="p-3">Email</th><th className="p-3">電話</th><th className="p-3">來源</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {validData.slice(0, 100).map((row, i) => (
                                        <tr key={i} className="hover:bg-green-50/30">
                                            <td className="p-3 font-bold text-slate-700">{row.full_name}</td>
                                            <td className="p-3 font-mono text-xs text-slate-500">{row.email}</td>
                                            <td className="p-3 text-slate-500">{row.phone}</td>
                                            <td className="p-3 text-xs"><span className="bg-slate-100 px-2 py-1 rounded text-slate-500">{row.admin_note}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <div className="h-full flex flex-col items-center justify-center text-slate-400"><ShieldCheck size={48} className="mb-2 opacity-20"/>請上傳檔案以開始分析</div>}
                     </>
                 )}

                 {viewMode === 'invalid' && (
                     <div className="space-y-4">
                        {invalidData.length > 0 && (
                            <div className="bg-red-100 border border-red-200 text-red-800 p-3 rounded-lg flex justify-between items-center">
                                <span className="text-xs font-bold flex items-center"><AlertTriangle size={14} className="mr-2"/> 這些資料無法匯入 (缺姓名或 Email)</span>
                                <button onClick={() => exportExcel(invalidData, 'IronMedic_Missed_Targets')} className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-700 flex items-center shadow-sm">
                                    <Download size={12} className="mr-1"/> 下載異常清單
                                </button>
                            </div>
                        )}
                        
                        {invalidData.length > 0 ? (
                            <table className="w-full text-left text-sm bg-white rounded-lg overflow-hidden shadow-sm">
                                <thead className="bg-red-50 text-red-800 sticky top-0 font-bold">
                                    <tr><th className="p-3">姓名 (原始)</th><th className="p-3">Email (缺失)</th><th className="p-3">錯誤原因</th></tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {invalidData.slice(0, 100).map((row, i) => (
                                        <tr key={i} className="hover:bg-red-50/30">
                                            <td className="p-3 font-bold text-slate-700">{row.full_name}</td>
                                            <td className="p-3 font-mono text-xs text-red-400 font-bold">{row.email || 'NULL'}</td>
                                            <td className="p-3"><span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{row.error_reason}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : <div className="h-full flex flex-col items-center justify-center text-slate-400"><CheckCircle size={48} className="mb-2 opacity-20"/>太棒了！無異常資料。</div>}
                     </div>
                 )}
             </div>
         </div>
      </div>
    </div>
  )
}