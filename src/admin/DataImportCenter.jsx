import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx' 
import { FileSpreadsheet, CheckCircle, ArrowRight, Save, Database, Settings, LayoutList, Merge, Plus, Target, AlertTriangle, UserCheck, XCircle, BrainCircuit, Trash2, Edit, Download, FileText, Filter } from 'lucide-react'

// 🎯 系統目標欄位定義
const TARGET_FIELDS = [
    { group: '🟢 【A~O】基本與聯絡資料', options: [
        { key: 'full_name', label: '姓名(A) *必填' }, { key: 'birthday', label: '出生年月日(B)' },
        { key: 'national_id', label: '身分證字號(C)' }, { key: 'phone', label: '手機(D)' },
        { key: 'contact_email', label: 'e-mail(E) (聯絡信箱)' }, { key: 'address', label: '通訊地址(F)' },
        { key: 'shirt_size', label: '賽事衣服(G)' }, { key: 'emergency_name', label: '緊急聯繫人(H)' },
        { key: 'emergency_phone', label: '緊急聯繫人電話(I)' }, { key: 'emergency_relation', label: '緊急聯繫人關係(J)' },
        { key: 'english_name', label: '英文名(K)' }, { key: 'medical_license', label: '醫護證照繳交情況(L)' },
        { key: 'dietary_habit', label: '飲食(M)' }, { key: 'resume_url', label: '醫鐵履歷網址(N)' },
        { key: 'badges', label: '成就徽章(O)' }
    ]},
    { group: '🔵 【P~AB】權限與醫療設定', options: [
        { key: 'role', label: '醫鐵權限(P)' }, { key: 'is_current_member', label: '當年度會員(Q)' },
        { key: 'training_status', label: '會員訓練(R)' }, { key: 'is_team_leader', label: '帶隊官(S)' },
        { key: 'is_new_member', label: '新人(T)' }, { key: 'license_expiry', label: '醫護證照有效期(U)' },
        { key: 'shirt_expiry_25', label: '三鐵服期限-25(V)' }, { key: 'shirt_expiry_26', label: '三鐵服期限-26(W)' },
        { key: 'is_vip', label: 'VIP(X)' }, { key: 'email', label: '報名系統登入/WIX(Y) *系統帳號' },
        { key: 'blood_type', label: '血型(Z)' }, { key: 'medical_history', label: '病史(AA)' },
        { key: 'is_blacklisted', label: '黑名單(AB)' }
    ]},
    { group: '🟣 【AC~AO】賽事與後勤數據', options: [
        { key: 'total_points', label: '積分(AC)' }, { key: 'total_races', label: '場次(AD)' },
        { key: 'volunteer_hours', label: '時數(AE)' }, { key: 'rank_level', label: '等級(AF)' },
        { key: 'line_id', label: 'LineID(AG)' }, { key: 'fb_id', label: 'FB(AH)' },
        { key: 'ig_id', label: 'IG(AI)' }, { key: 'admin_note', label: '備註(AJ)' },
        { key: 'shirt_receive_date', label: '領衣日(AK)' }, { key: 'cert_send_date', label: '證書日(AL)' },
        { key: 'transport_pref', label: '交通(AM)' }, { key: 'stay_pref', label: '住宿(AN)' },
        { key: 'family_count', label: '眷屬(AO)' }
    ]},
    { group: '⚙️ 【AP~BI】擴充資料欄位', options: Array.from({length: 20}, (_, i) => ({ 
        key: `ext_${String(i+1).padStart(2,'0')}`, label: `Ext_${String(i+1).padStart(2,'0')} (備用欄位 ${i+1})` 
    }))}
]

const FLAT_TARGETS = TARGET_FIELDS.flatMap(g => g.options)
const MAPPING_MEMORY_KEY = 'ironmedic_mapping_memory'

export default function DataImportCenter() {
  const [mode, setMode] = useState('full') 
  const [step, setStep] = useState(1) 
  
  const [fileMaster, setFileMaster] = useState(null)
  const [fileWix, setFileWix] = useState(null)
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawData, setRawData] = useState([])
  
  const [fieldMapping, setFieldMapping] = useState({}) 
  const [memoryFlags, setMemoryFlags] = useState({}) 
  
  const [patchAnchorExcel, setPatchAnchorExcel] = useState('') 
  const [patchAnchorDB, setPatchAnchorDB] = useState('full_name') 
  
  const [previewData, setPreviewData] = useState([]) 
  const [viewFilter, setViewFilter] = useState('all') // 狀態篩選器
  const [logs, setLogs] = useState([])
  const [processing, setProcessing] = useState(false)
  const logsEndRef = useRef(null)

  const addLog = (msg, type = 'info') => {
    const time = new Date().toLocaleTimeString('zh-TW', { hour12: false })
    setLogs(prev => [...prev, { time, msg, type }])
    setTimeout(() => logsEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  const readExcel = (file) => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary', cellDates: true });
                const wsName = wb.SheetNames[0];
                const ws = wb.Sheets[wsName];
                const jsonData = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false, dateNF: 'yyyy-mm-dd' });
                resolve(jsonData);
            } catch (err) { reject(err); }
        };
        reader.readAsBinaryString(file);
    });
  }

  const handleModeSwitch = (newMode) => {
      setMode(newMode); setStep(1); setFileMaster(null); setFileWix(null); 
      setRawData([]); setRawHeaders([]); setPreviewData([]); setLogs([]); setFieldMapping({}); setMemoryFlags({}); setViewFilter('all');
  }

  const handleUpdateMapping = (excelHeader, dbField) => {
      setFieldMapping(prev => ({...prev, [excelHeader]: dbField}))
      setMemoryFlags(prev => ({...prev, [excelHeader]: false})) 
      try {
          const savedMemory = JSON.parse(localStorage.getItem(MAPPING_MEMORY_KEY) || '{}')
          if (dbField === "") delete savedMemory[excelHeader]
          else savedMemory[excelHeader] = dbField 
          localStorage.setItem(MAPPING_MEMORY_KEY, JSON.stringify(savedMemory))
      } catch(e) { console.error("記憶寫入失敗", e) }
  }

  const handleClearMemory = () => {
      if(window.confirm("確定要清除系統學習的欄位對應記憶嗎？")) {
          localStorage.removeItem(MAPPING_MEMORY_KEY)
          addLog("系統記憶已成功重置", 'warning')
      }
  }

  // 📝 匯出 TXT 日誌
  const handleExportLog = () => {
      if(logs.length === 0) return alert("目前沒有日誌可匯出");
      const textContent = logs.map(l => `[${l.time}] [${l.type.toUpperCase()}] ${l.msg}`).join('\n');
      const blob = new Blob([textContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `System_Log_${new Date().toISOString().slice(0,10)}.txt`;
      link.click();
      URL.revokeObjectURL(url);
  }

  // 📊 匯出 Excel 審核報表
  const handleExportExcel = () => {
      if (previewData.length === 0) return alert("目前沒有資料可匯出");
      const exportData = previewData.map(row => {
          const exportRow = {
              '系統狀態': row._status,
              '錯誤/異常原因': row._error || (row._status === 'duplicate' ? '發現同名者' : (row._status === 'not_found' ? '查無此人' : '正常')),
              '資料來源': row._source || ''
          };
          if (mode === 'patch') exportRow['比對基準'] = row._rawAnchor;
          Object.keys(fieldMapping).forEach(exCol => {
              if (fieldMapping[exCol]) exportRow[`更新欄位: ${exCol}`] = row[exCol];
          });
          return exportRow;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "匯入審核報表");
      XLSX.writeFile(wb, `Import_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const handleStep1Submit = async () => {
    if (!fileMaster) return alert("請上傳主要資料檔案！")
    setProcessing(true)

    try {
        let finalRows = [];
        let headers = [];

        if (mode === 'patch') {
            finalRows = await readExcel(fileMaster)
            if (finalRows.length === 0) throw new Error("檔案為空")
            headers = Object.keys(finalRows[0])
            setPatchAnchorExcel(headers.find(h => h.includes('姓名') || h.includes('Name')) || headers[0])
        } else {
            const masterRows = await readExcel(fileMaster)
            finalRows = masterRows.map(row => ({...row, _source: '主名單'}))
            
            if (fileWix) {
                const wixRows = await readExcel(fileWix)
                const wixMap = {}
                wixRows.forEach(row => {
                    const nameKey = Object.keys(row).find(k => k.includes('姓名') || k.toLowerCase().includes('name'))
                    if (nameKey && row[nameKey]) wixMap[String(row[nameKey]).replace(/\s+/g, '')] = row
                })

                finalRows = finalRows.map(mRow => {
                    const mNameKey = Object.keys(mRow).find(k => k.includes('姓名') || k.toLowerCase().includes('name'))
                    if (!mNameKey) return mRow
                    const mName = String(mRow[mNameKey]).replace(/\s+/g, '')
                    let match = wixMap[mName] || wixMap[Object.keys(wixMap).find(k => mName.includes(k) || k.includes(mName))]

                    if (match) {
                        const enrichedRow = { ...mRow, _source: '主名單 + 輔助資料' }
                        Object.keys(match).forEach(wKey => {
                            if (mRow[wKey] !== undefined && mRow[wKey] !== "") enrichedRow[`(輔助) ${wKey}`] = match[wKey]
                            else enrichedRow[wKey] = match[wKey]
                        })
                        return enrichedRow
                    }
                    return mRow
                })
            }
            
            const allKeys = new Set()
            finalRows.forEach(row => Object.keys(row).forEach(k => { if (!k.startsWith('_')) allKeys.add(k) }))
            headers = Array.from(allKeys)
        }

        setRawData(finalRows)
        setRawHeaders(headers)
        
        const initialMap = {}
        const memFlags = {}
        const savedMemory = JSON.parse(localStorage.getItem(MAPPING_MEMORY_KEY) || '{}')

        headers.forEach(h => {
            const lowerH = h.toLowerCase().replace(/\s+/g, '')
            if (savedMemory[h]) {
                initialMap[h] = savedMemory[h]; memFlags[h] = true 
            } else {
                if (['姓名', '中文姓名'].some(k => lowerH.includes(k)) && !lowerH.includes('緊急') && !lowerH.includes('英文')) initialMap[h] = 'full_name'
                else if (lowerH.includes('wix') && lowerH.includes('email')) initialMap[h] = 'email' 
                else if (lowerH.includes('e-mail') || lowerH.includes('信箱')) initialMap[h] = 'contact_email'
                else if (['手機', 'phone'].some(k => lowerH.includes(k)) && !lowerH.includes('緊急')) initialMap[h] = 'phone'
                else if (['身分證', 'id_number'].some(k => lowerH.includes(k))) initialMap[h] = 'national_id'
                else if (['衣服', 'size', '背心'].some(k => lowerH.includes(k))) initialMap[h] = 'shirt_size'
                else if (lowerH.includes('血型')) initialMap[h] = 'blood_type'
            }
        })
        
        setFieldMapping(initialMap)
        setMemoryFlags(memFlags)
        
        addLog(`資料分析完成。成功載入 ${Object.keys(memFlags).length} 項系統記憶設定。`, 'success')
        setStep(2)
    } catch (err) { addLog(`分析異常: ${err.message}`, 'error') } finally { setProcessing(false) }
  }

  const handleMatchAndTransform = async () => {
      setProcessing(true)
      
      if (mode === 'patch') {
          if (!patchAnchorExcel) { alert("請選擇 Excel 的比對基準欄位！"); setProcessing(false); return; }
          try {
              const { data: dbUsers, error } = await supabase.from('profiles').select('id, full_name, email, phone, national_id, contact_email')
              if (error) throw error

              let perfect = 0, duplicate = 0, notFound = 0;

              const transformed = rawData.map((row, idx) => {
                  const anchorValue = String(row[patchAnchorExcel] || '').replace(/\s+/g, '')
                  const matches = dbUsers.filter(u => {
                      const dbVal = String(u[patchAnchorDB] || '').replace(/\s+/g, '')
                      return dbVal === anchorValue && anchorValue !== ''
                  })

                  let status = 'not_found', dbId = null, duplicateOptions = []
                  if (matches.length === 1) { status = 'perfect'; dbId = matches[0].id; perfect++; } 
                  else if (matches.length > 1) { status = 'duplicate'; duplicateOptions = matches; duplicate++; } 
                  else { notFound++; }

                  const updateData = {}
                  Object.keys(fieldMapping).forEach(exCol => {
                      const dbField = fieldMapping[exCol]
                      if (dbField && exCol !== patchAnchorExcel) updateData[dbField] = row[exCol]
                  })

                  return { _id: idx, _rawAnchor: anchorValue, _status: status, _dbId: dbId, _duplicates: duplicateOptions, _updateData: updateData, ...updateData }
              })

              setPreviewData(transformed)
              setStep(3)
          } catch (err) { addLog(`資料比對異常: ${err.message}`, 'error') }
      } else {
          const hasName = Object.values(fieldMapping).includes('full_name')
          const hasEmail = Object.values(fieldMapping).includes('email') || Object.values(fieldMapping).includes('contact_email')

          if (!hasName || !hasEmail) {
              alert("⚠️ 系統安全限制：完整建檔必須至少對應「姓名(A)」與「e-mail(E) 或 報名系統登入(Y)」欄位！")
              setProcessing(false); return;
          }

          const transformed = rawData.map((row, idx) => {
              const newRow = { _id: idx, _status: 'pending', _source: row._source || '主名單' }
              Object.keys(fieldMapping).forEach(excelHeader => {
                  const dbField = fieldMapping[excelHeader]
                  if (dbField && dbField !== "") newRow[dbField] = row[excelHeader]
              })
              
              if (!newRow.full_name || (!newRow.email && !newRow.contact_email)) {
                  newRow._status = 'invalid'
                  newRow._error = !newRow.full_name ? '姓名欄位空白' : '聯絡信箱空白'
              } else {
                  newRow._status = 'valid'
              }
              return newRow
          })

          setPreviewData(transformed)
          setStep(3)
      }
      setProcessing(false)
  }

  const handleExecute = async () => {
      setProcessing(true)
      
      if (mode === 'patch') {
          const toUpdate = previewData.filter(r => ['perfect', 'resolved'].includes(r._status) && r._dbId)
          if (toUpdate.length === 0) { alert("無有效資料可更新！"); setProcessing(false); return; }
          
          addLog(`準備執行局部更新，預計更新 ${toUpdate.length} 筆資料...`, 'info')
          let success = 0, fail = 0;
          for (const row of toUpdate) {
              try {
                  const { error } = await supabase.from('profiles').update(row._updateData).eq('id', row._dbId)
                  if (error) throw error
                  success++
              } catch (err) { fail++; addLog(`更新失敗 (${row.full_name}): ${err.message}`, 'error') }
          }
          addLog(`資料更新作業完成。成功: ${success} 筆，失敗: ${fail} 筆。`, success > 0 ? 'success' : 'error')

      } else {
          const validRows = previewData.filter(r => r._status === 'valid')
          if (validRows.length === 0) { setProcessing(false); return; }
          const BATCH = 50
          let success = 0, fail = 0

          const cleanRows = validRows.map(({ _id, _status, _error, _source, ...rest }) => ({
              ...rest, role: rest.role || 'USER', updated_at: new Date()
          }))

          addLog(`準備執行完整資料寫入，共計 ${validRows.length} 筆資料...`, 'info')

          for (let i = 0; i < cleanRows.length; i += BATCH) {
              const chunk = cleanRows.slice(i, i + BATCH)
              try {
                  const { error } = await supabase.from('profiles').upsert(chunk, { onConflict: 'email' })
                  if (error) throw error
                  success += chunk.length
              } catch (err) { 
                  fail += chunk.length; 
                  addLog(`批次寫入失敗: 可能是 Email 重複或資料庫限制 (${err.message})`, 'error') 
              }
          }
          addLog(`完整資料建檔作業完成。成功: ${success} 筆，失敗: ${fail} 筆。`, fail === 0 ? 'success' : 'warning')
      }
      
      setProcessing(false)
      if (!logs.some(l => l.type === 'error') && fail === 0) {
          setTimeout(() => { alert("系統匯入作業已成功完成！"); handleModeSwitch(mode); }, 1500)
      } else {
          alert("作業完成，但有部分資料匯入失敗。請匯出「審核報表」或查看「系統日誌」以了解原因！")
      }
  }

  const resolveDuplicate = (rowIndex, selectedDbId) => {
      const newData = [...previewData]
      newData[rowIndex]._dbId = selectedDbId
      newData[rowIndex]._status = selectedDbId ? 'resolved' : 'duplicate'
      setPreviewData(newData)
  }

  // 🔍 過濾器：根據下拉選單過濾顯示的資料
  const filteredData = previewData.filter(row => {
      if (viewFilter === 'all') return true;
      if (viewFilter === 'valid') return ['valid', 'perfect', 'resolved'].includes(row._status);
      if (viewFilter === 'error') return ['invalid', 'duplicate', 'not_found'].includes(row._status);
      return true;
  });

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-800">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Database className="text-blue-600"/> 資料整合匯入中心 <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold border border-slate-200">System V9.0</span>
                </h2>
                <p className="text-slate-500 text-sm mt-1">企業級資料處理模組。支援「完整資料整合」與「特定欄位更新」雙重作業模式。</p>
            </div>
            <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                <button onClick={()=>handleModeSwitch('full')} className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${mode==='full' ? 'bg-white shadow-sm border border-slate-200 text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}><Merge size={16}/> 完整資料整合 (新增/覆寫)</button>
                <button onClick={()=>handleModeSwitch('patch')} className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${mode==='patch' ? 'bg-white shadow-sm border border-slate-200 text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}><Edit size={16}/> 特定欄位更新 (局部修改)</button>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${step===1 ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>1. 檔案上傳</div>
                <ArrowRight size={16} className="text-slate-300"/>
                <div className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${step===2 ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>2. 欄位對應設定</div>
                <ArrowRight size={16} className="text-slate-300"/>
                <div className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${step===3 ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>3. 預覽與匯入</div>
          </div>
      </div>

      {step === 1 && (
        <div className="space-y-6">
            {mode === 'patch' ? (
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-amber-400 bg-white transition-all cursor-pointer">
                    <input type="file" id="upload-patch" className="hidden" accept=".xlsx,.csv" onChange={(e)=>setFileMaster(e.target.files[0])}/>
                    <label htmlFor="upload-patch" className="cursor-pointer block">
                        <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4 mx-auto border border-amber-100"><Edit size={32}/></div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">上傳「特定欄位更新」資料表</h3>
                        <p className="text-sm text-slate-500 mb-4">此模式僅會更新您指定的欄位，不會影響人員的其他資料。</p>
                        {fileMaster && <div className="font-bold text-blue-600 bg-blue-50 border border-blue-100 inline-block px-4 py-2 rounded-full">已選取檔案: {fileMaster.name}</div>}
                    </label>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${fileMaster ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400'}`}>
                        <input type="file" id="master-up" className="hidden" accept=".xlsx,.csv" onChange={(e)=>setFileMaster(e.target.files[0])}/>
                        <label htmlFor="master-up" className="cursor-pointer block">
                            <FileSpreadsheet size={40} className={`mx-auto mb-4 ${fileMaster ? 'text-blue-600' : 'text-slate-400'}`}/>
                            <h3 className="text-lg font-bold text-slate-700">1. 上傳主要資料表 (Master)</h3>
                            <p className="text-xs text-slate-500 mb-2">包含 A~AO 欄位的完整名單</p>
                            {fileMaster && <div className="text-sm font-bold text-blue-600">{fileMaster.name}</div>}
                        </label>
                    </div>
                    <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${fileWix ? 'border-purple-400 bg-purple-50' : 'border-slate-300 bg-white hover:border-purple-400'}`}>
                        <input type="file" id="wix-up" className="hidden" accept=".xlsx,.csv" onChange={(e)=>setFileWix(e.target.files[0])}/>
                        <label htmlFor="wix-up" className="cursor-pointer block">
                            <Plus size={40} className={`mx-auto mb-4 ${fileWix ? 'text-purple-600' : 'text-slate-400'}`}/>
                            <h3 className="text-lg font-bold text-slate-700">2. 上傳輔助資料表 (選項)</h3>
                            <p className="text-xs text-slate-500 mb-2">用於合併比對，例如 Wix 報名系統匯出的資料</p>
                            {fileWix && <div className="text-sm font-bold text-purple-600">{fileWix.name}</div>}
                        </label>
                    </div>
                </div>
            )}
            <div className="flex justify-center mt-6">
                <button 
                    onClick={handleStep1Submit} disabled={!fileMaster || processing}
                    className="px-10 py-3 text-white rounded-xl font-bold bg-slate-800 hover:bg-slate-700 shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                >
                    {processing ? '資料解析中...' : '確認檔案，進入下一步'}
                </button>
            </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6 animate-fade-in-up">
            {mode === 'patch' && (
                <div className="bg-amber-50 border border-amber-200 p-6 rounded-2xl shadow-sm">
                    <h4 className="font-bold text-amber-800 flex items-center gap-2 mb-4">
                        <Target className="text-amber-600"/> 步驟 2-1：設定資料比對基準 (Primary Key)
                    </h4>
                    <div className="flex flex-col md:flex-row items-center gap-4 bg-white p-4 rounded-xl border border-amber-100">
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-slate-500 block mb-1">您上傳的 Excel 欄位</label>
                            <select className="w-full p-2.5 rounded-lg border focus:ring-2 border-slate-300 font-medium text-slate-700" value={patchAnchorExcel} onChange={e=>setPatchAnchorExcel(e.target.value)}>
                                <option value="">請選擇...</option>
                                {rawHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                            </select>
                        </div>
                        <ArrowRight className="text-slate-300 md:mt-5 shrink-0 rotate-90 md:rotate-0"/>
                        <div className="flex-1 w-full">
                            <label className="text-xs font-bold text-slate-500 block mb-1">對應至系統識別欄位</label>
                            <select className="w-full p-2.5 rounded-lg border focus:ring-2 border-slate-300 font-medium text-slate-700" value={patchAnchorDB} onChange={e=>setPatchAnchorDB(e.target.value)}>
                                <option value="full_name">中文姓名(A)</option>
                                <option value="national_id">身分證字號(C) (建議，最精準)</option>
                                <option value="contact_email">聯絡信箱(E)</option>
                                <option value="email">報名系統登入帳號(Y)</option>
                            </select>
                        </div>
                    </div>
                </div>
            )}

            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="text-slate-500"/> {mode === 'patch' ? '步驟 2-2：選擇欲更新的資料欄位' : '欄位對應設定 (Data Mapping)'}
                    </h4>
                    <button onClick={handleClearMemory} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 size={14}/> 重置系統記憶
                    </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto p-2 bg-slate-50 rounded-xl">
                    {rawHeaders.filter(h => mode === 'full' || h !== patchAnchorExcel).map((header) => {
                        const mappedKey = fieldMapping[header]
                        const isMapped = !!mappedKey
                        const isFromWix = mode === 'full' && header.includes('(輔助)')
                        const isFromMemory = memoryFlags[header] 

                        return (
                            <div key={header} className={`p-4 rounded-xl border transition-all relative ${isMapped ? 'border-blue-300 bg-white shadow-sm' : 'border-slate-200 bg-white opacity-70'}`}>
                                {isFromMemory && isMapped && (
                                    <div className="absolute -top-2.5 right-3 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1"><BrainCircuit size={10}/> 智慧載入</div>
                                )}
                                <div className="flex justify-between items-center mb-1 mt-1">
                                    <span className="text-[10px] font-bold text-slate-400">來源資料 (Excel)</span>
                                    {isFromWix && <span className="text-[10px] bg-purple-100 text-purple-600 px-1.5 rounded font-medium">輔助表</span>}
                                </div>
                                <div className="font-bold text-slate-800 text-sm mb-3 truncate" title={header}>{header}</div>
                                <div className="text-[10px] font-bold text-slate-400 mb-1">匯入至系統欄位 (Database)</div>
                                <select 
                                    className={`w-full p-2 rounded-lg font-medium text-sm border outline-none ${isMapped ? 'border-blue-300 text-blue-800 bg-blue-50/30' : 'border-slate-200 text-slate-500 bg-slate-50'}`}
                                    value={mappedKey || ""} onChange={(e) => handleUpdateMapping(header, e.target.value)} 
                                >
                                    <option value="">-- 略過不匯入 --</option>
                                    {TARGET_FIELDS.map(group => (
                                        <optgroup key={group.group} label={group.group}>
                                            {group.options.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                                        </optgroup>
                                    ))}
                                </select>
                            </div>
                        )
                    })}
                </div>
            </div>

            <div className="flex justify-end gap-4">
                <button onClick={() => setStep(1)} className="px-6 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-100">返回上一步</button>
                <button onClick={handleMatchAndTransform} disabled={processing} className="px-8 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex items-center gap-2">
                    <LayoutList size={18}/> 產生資料預覽
                </button>
            </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6 animate-fade-in-up">
            <div className="flex flex-wrap items-center justify-between p-5 rounded-2xl shadow-sm bg-white border border-slate-200 gap-4">
                {mode === 'patch' ? (
                    <div className="flex gap-4 items-center">
                        <div className="bg-green-50 px-3 py-2 rounded-lg border border-green-100 text-center">
                            <div className="text-xs text-green-600 font-bold">🟢 可更新</div>
                            <div className="text-xl font-black text-green-700">{previewData.filter(r=>['perfect','resolved'].includes(r._status)).length}</div>
                        </div>
                        <div className="bg-amber-50 px-3 py-2 rounded-lg border border-amber-100 text-center">
                            <div className="text-xs text-amber-600 font-bold">🟡 需手動確認</div>
                            <div className="text-xl font-black text-amber-700">{previewData.filter(r=>r._status==='duplicate').length}</div>
                        </div>
                        <div className="bg-slate-50 px-3 py-2 rounded-lg border border-slate-200 text-center">
                            <div className="text-xs text-slate-500 font-bold">⚪ 將略過</div>
                            <div className="text-xl font-black text-slate-600">{previewData.filter(r=>r._status==='not_found').length}</div>
                        </div>
                    </div>
                ) : (
                    <div className="flex gap-4 items-center">
                        <div className="bg-green-50 px-4 py-2 rounded-lg border border-green-100 text-center">
                            <div className="text-xs text-green-600 font-bold">🟢 格式完整</div>
                            <div className="text-xl font-black text-green-700">{previewData.filter(r=>r._status==='valid').length}</div>
                        </div>
                        <div className="bg-red-50 px-4 py-2 rounded-lg border border-red-100 text-center">
                            <div className="text-xs text-red-600 font-bold">🔴 異常/缺漏</div>
                            <div className="text-xl font-black text-red-700">{previewData.filter(r=>r._status==='invalid').length}</div>
                        </div>
                    </div>
                )}
                
                <div className="flex items-center gap-3">
                    <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200">返回修改設定</button>
                    <button onClick={handleExecute} disabled={processing || previewData.filter(r=>mode==='patch' ? ['perfect','resolved'].includes(r._status) : r._status==='valid').length === 0} className="px-8 py-2.5 rounded-xl font-bold text-white shadow-md flex items-center gap-2 disabled:opacity-50 bg-slate-800 hover:bg-slate-700">
                        <Save size={18}/> {processing ? '系統處理中...' : '確認無誤，執行匯入'}
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <Filter size={18} className="text-slate-500"/>
                        <select 
                            className="bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                            value={viewFilter} onChange={(e) => setViewFilter(e.target.value)}
                        >
                            <option value="all">顯示全部名單 ({previewData.length} 筆)</option>
                            <option value="valid">🟢 僅顯示狀態正常名單</option>
                            <option value="error">🔴 僅顯示異常/需確認名單</option>
                        </select>
                    </div>
                    
                    {/* 📊 匯出報表按鈕 */}
                    <button onClick={handleExportExcel} className="flex items-center gap-2 text-sm bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 px-4 py-1.5 rounded-lg transition-colors font-bold">
                        <Download size={16}/> 匯出審核報表 (Excel)
                    </button>
                </div>
                <div className="overflow-x-auto max-h-[500px]">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-white text-slate-500 font-medium sticky top-0 z-10 shadow-sm text-xs">
                            <tr>
                                <th className="p-4 border-b">資料狀態</th>
                                {mode === 'patch' ? (
                                    <>
                                        <th className="p-4 border-b bg-slate-50">比對基準 ({patchAnchorExcel})</th>
                                        {Object.keys(fieldMapping).filter(k=>fieldMapping[k]).map(col => (
                                            <th key={col} className="p-4 border-b text-blue-600">更新: {col}</th>
                                        ))}
                                    </>
                                ) : (
                                    <>
                                        <th className="p-4 border-b">資料來源</th>
                                        {Object.keys(fieldMapping).filter(k=>fieldMapping[k]).slice(0,10).map(col => (
                                            <th key={col} className="p-4 border-b text-slate-700">{col}</th>
                                        ))}
                                        {Object.keys(fieldMapping).filter(k=>fieldMapping[k]).length > 10 && <th className="p-4 border-b text-slate-400">...其他欄位</th>}
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {/* 🚀 無限顯示 (透過 filteredData 控制) */}
                            {filteredData.map((row) => (
                                <tr key={row._id} className={
                                    mode === 'patch' 
                                        ? (row._status === 'duplicate' ? 'bg-amber-50/50' : row._status === 'not_found' ? 'bg-slate-50 opacity-60' : 'hover:bg-slate-50')
                                        : (row._status === 'invalid' ? 'bg-red-50/50' : 'hover:bg-slate-50')
                                }>
                                    {mode === 'patch' ? (
                                        <>
                                            <td className="p-4">
                                                {row._status === 'perfect' && <span className="text-green-600 font-bold text-xs"><CheckCircle size={14} className="inline mr-1"/>準備更新</span>}
                                                {row._status === 'resolved' && <span className="text-blue-600 font-bold text-xs"><UserCheck size={14} className="inline mr-1"/>已手動指定</span>}
                                                {row._status === 'not_found' && <span className="text-slate-400 font-medium text-xs"><XCircle size={14} className="inline mr-1"/>查無此人(略過)</span>}
                                                {row._status === 'duplicate' && (
                                                    <div className="space-y-1">
                                                        <span className="text-amber-600 font-bold text-xs">⚠️ 發現 {row._duplicates.length} 筆重複名稱：</span>
                                                        <select className="w-full p-2 border border-amber-300 rounded bg-white text-xs font-medium text-slate-700" onChange={(e) => resolveDuplicate(row._id, e.target.value)} defaultValue="">
                                                            <option value="" disabled>-- 請指定要更新的人員 --</option>
                                                            {row._duplicates.map(dup => <option key={dup.id} value={dup.id}>{dup.full_name} | {dup.phone || '無電話'} | {dup.email}</option>)}
                                                            <option value="SKIP">🚫 皆非，略過此筆</option>
                                                        </select>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="p-4 font-bold text-slate-700 bg-slate-50/50">{row._rawAnchor}</td>
                                            {Object.keys(fieldMapping).filter(k=>fieldMapping[k]).map(exCol => (
                                                <td key={exCol} className="p-4 text-blue-700">{row[exCol] || '-'}</td>
                                            ))}
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-4">
                                                {row._status === 'valid' ? <span className="text-green-600 font-bold text-xs">🟢 正常</span> : <span className="text-red-500 font-bold text-xs">🔴 {row._error}</span>}
                                            </td>
                                            <td className="p-4 text-xs text-slate-500">{row._source}</td>
                                            {Object.keys(fieldMapping).filter(k=>fieldMapping[k]).slice(0,10).map(col => (
                                                <td key={col} className="p-4 text-sm max-w-[150px] truncate" title={row[col]}>{row[col] || '-'}</td>
                                            ))}
                                            {Object.keys(fieldMapping).filter(k=>fieldMapping[k]).length > 10 && <td className="p-4 text-slate-300">...</td>}
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
      )}

      {/* 系統執行紀錄區 */}
      <div className="bg-slate-900 rounded-xl p-4 h-48 overflow-hidden flex flex-col shadow-inner">
          <div className="text-slate-400 text-xs font-bold border-b border-slate-700 pb-2 mb-2 flex justify-between items-center">
              <span className="flex items-center gap-2"><Database size={14}/> 系統執行紀錄 (System Logs)</span>
              {/* 📝 匯出 TXT 日誌按鈕 */}
              <button onClick={handleExportLog} className="flex items-center gap-1 hover:text-white transition-colors border border-slate-600 px-2 py-1 rounded">
                  <FileText size={12}/> 匯出日誌
              </button>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar font-mono text-xs space-y-1.5">
              {logs.map((l, i) => (
                  <div key={i} className={`flex ${l.type === 'error' ? 'text-red-400' : l.type === 'success' ? 'text-green-400' : l.type === 'warning' ? 'text-amber-400' : 'text-blue-300'}`}>
                      <span className="opacity-50 w-16 shrink-0">[{l.time}]</span><span>{l.msg}</span>
                  </div>
              ))}
              <div ref={logsEndRef}/>
          </div>
       </div>
    </div>
  )
}