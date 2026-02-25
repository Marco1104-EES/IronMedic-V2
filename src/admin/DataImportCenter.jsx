import { useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx' 
import { FileSpreadsheet, CheckCircle, ArrowRight, Save, Database, Settings, LayoutList, Merge, Plus, Target, UserCheck, XCircle, BrainCircuit, Trash2, Edit, Download, FileText, Filter, Users, Flag, Upload, AlertTriangle, FileDown, Loader2 } from 'lucide-react'

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

// 🌟 賽事匯入模板表頭
const RACE_IMPORT_TEMPLATE_HEADERS = [
    "賽事名稱", "日期(YYYY-MM-DD)", "鳴槍時間(HH:MM)", "地點", "賽事類型(馬拉松/鐵人三項...)", 
    "海報圖片URL", "狀態(OPEN/NEGOTIATING/SUBMITTED)", "是否火熱(Y/N)", 
    "賽段配置(分組+人數)", "參賽總人數", "教官", "主辦單位或承辦單位", 
    "贊助方（鐵人醫護有限公司）代表1", "贊助方（鐵人醫護有限公司）代表2", "贊助方（鐵人醫護有限公司）代表3",
    ...Array.from({length: 40}, (_, i) => `參加人員${i + 1}`)
]

export default function DataImportCenter() {
  const [mainTab, setMainTab] = useState('members') 

  // --- 會員匯入專用 State ---
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
  const [viewFilter, setViewFilter] = useState('all') 
  
  // --- 賽事匯入專用 State ---
  const [isUploadingRace, setIsUploadingRace] = useState(false)
  const [uploadRaceStatus, setUploadRaceStatus] = useState(null)
  const [raceFile, setRaceFile] = useState(null)

  // --- 共用 State ---
  const [logs, setLogs] = useState([])
  const [processing, setProcessing] = useState(false)
  const logsEndRef = useRef(null)

  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); }
  const handleDropMaster = (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) setFileMaster(e.dataTransfer.files[0]); }
  const handleDropWix = (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) setFileWix(e.dataTransfer.files[0]); }
  const handleDropRace = (e) => { e.preventDefault(); e.stopPropagation(); if (e.dataTransfer.files && e.dataTransfer.files.length > 0) setRaceFile(e.dataTransfer.files[0]); }

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

  const handleDownloadTemplate = (type) => {
      let headers = [];
      let filename = "";
      if (type === 'members') {
          headers = FLAT_TARGETS.map(f => f.label.split('(')[0]); 
          filename = "醫護鐵人_會員匯入標準範本.xlsx";
      } else {
          headers = RACE_IMPORT_TEMPLATE_HEADERS;
          filename = "醫護鐵人_賽事年度總表標準範本.xlsx";
      }

      const ws = XLSX.utils.aoa_to_sheet([headers]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, filename);
      addLog(`已下載 ${filename}`, 'info');
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

  const handleExportExcel = () => {
      if (previewData.length === 0) return alert("目前沒有資料可匯出");
      const exportData = previewData.map(row => {
          const exportRow = {
              '狀態': row._status === 'valid' || row._status === 'perfect' || row._status === 'resolved' ? '🟢 正常' : '🔴 異常',
              '錯誤/異常原因': row._error || (row._status === 'duplicate' ? '發現同名者' : (row._status === 'not_found' ? '查無此人' : '無')),
              '姓名(A)': row.full_name || '未提供',
              '聯絡信箱(E)': row.contact_email || '未提供',
              '報名系統登入/WIX(Y)': row.email || '未提供',
              '資料來源': row._source || ''
          };
          if (mode === 'patch') exportRow['比對基準'] = row._rawAnchor;
          Object.keys(fieldMapping).forEach(excelHeader => {
              const dbField = fieldMapping[excelHeader]
              if (dbField && !['full_name', 'email', 'contact_email'].includes(dbField)) {
                  exportRow[`[更新] ${excelHeader}`] = row[dbField] || '';
              }
          });
          return exportRow;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "匯入審核報表");
      XLSX.writeFile(wb, `Import_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  // ==========================================
  // 🌟 會員匯入核心邏輯 (完整保留)
  // ==========================================
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
            setPatchAnchorExcel(headers.find(h => h.includes('姓名') || h.toLowerCase().includes('name')) || headers[0])
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
            let matchedKey = null;

            const letterMatch = h.match(/\([A-Z]{1,2}\)/);
            if (letterMatch) {
                const code = letterMatch[0]; 
                const target = FLAT_TARGETS.find(t => t.label.includes(code));
                if (target) matchedKey = target.key;
            }

            if (!matchedKey) {
                const lowerH = h.toLowerCase().replace(/\s+/g, '')
                if (['姓名', 'name', 'fullname'].some(k => lowerH.includes(k)) && !lowerH.includes('緊急') && !lowerH.includes('英文') && !lowerH.includes('emergency')) matchedKey = 'full_name'
                else if (['wix', '報名系統', 'account'].some(k => lowerH.includes(k)) || (lowerH.includes('登入') && lowerH.includes('帳號'))) matchedKey = 'email'
                else if (lowerH === 'e-mail' || lowerH === 'email' || lowerH.includes('信箱')) matchedKey = 'contact_email'
                else if (['手機', 'phone', 'mobile'].some(k => lowerH.includes(k)) && !lowerH.includes('緊急') && !lowerH.includes('emergency')) matchedKey = 'phone'
                else if (['身分證', 'id_number', 'nationalid'].some(k => lowerH.includes(k)) || lowerH === 'id') matchedKey = 'national_id'
                else if (['衣服', 'size', '背心', 'shirt'].some(k => lowerH.includes(k))) matchedKey = 'shirt_size'
                else if (lowerH.includes('血型') || lowerH.includes('blood')) matchedKey = 'blood_type'
                else if (lowerH.includes('生日') || lowerH.includes('birthday') || lowerH === 'dob') matchedKey = 'birthday'
                else if (lowerH.includes('地址') || lowerH.includes('address')) matchedKey = 'address'
                else if (lowerH.includes('緊急聯繫人電話') || lowerH.includes('emergencyphone')) matchedKey = 'emergency_phone'
                else if (lowerH.includes('緊急聯繫人關係') || lowerH.includes('relationship')) matchedKey = 'emergency_relation'
                else if (lowerH.includes('緊急聯繫人') || lowerH.includes('emergencycontact')) matchedKey = 'emergency_name'
                else if (lowerH.includes('英文名') || lowerH.includes('englishname')) matchedKey = 'english_name'
            }

            if (savedMemory[h]) {
                initialMap[h] = savedMemory[h]; memFlags[h] = true 
            } else if (matchedKey) {
                initialMap[h] = matchedKey;
            }
        })
        
        setFieldMapping(initialMap)
        setMemoryFlags(memFlags)
        
        addLog(`資料分析完成。成功預載對應 ${Object.keys(initialMap).length} 個欄位！`, 'success')
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
                  let dbInfo = { full_name: '', email: '', contact_email: '' } 

                  if (matches.length === 1) { 
                      status = 'perfect'; dbId = matches[0].id; dbInfo = matches[0]; perfect++; 
                  } else if (matches.length > 1) { 
                      status = 'duplicate'; duplicateOptions = matches; duplicate++; 
                  } else { notFound++; }

                  const updateData = {}
                  Object.keys(fieldMapping).forEach(exCol => {
                      const dbField = fieldMapping[exCol]
                      if (dbField && exCol !== patchAnchorExcel) updateData[dbField] = row[exCol]
                  })

                  return { _id: idx, _rawAnchor: anchorValue, _status: status, _dbId: dbId, _duplicates: duplicateOptions, _updateData: updateData, ...dbInfo, ...updateData }
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

          const uniqueRowsMap = new Map();
          cleanRows.forEach(row => {
              const emailKey = row.email || row.contact_email; 
              if (emailKey) uniqueRowsMap.set(emailKey, row); 
          });
          const uniqueCleanRows = Array.from(uniqueRowsMap.values());
          
          const duplicateCount = cleanRows.length - uniqueCleanRows.length;
          if (duplicateCount > 0) {
              addLog(`自動過濾了 ${duplicateCount} 筆重複的 Email 資料，確保寫入安全。`, 'warning')
          }

          for (let i = 0; i < uniqueCleanRows.length; i += BATCH) {
              const chunk = uniqueCleanRows.slice(i, i + BATCH)
              try {
                  const { error } = await supabase.from('profiles').upsert(chunk, { onConflict: 'email' })
                  if (error) throw error
                  success += chunk.length
              } catch (err) { fail += chunk.length; addLog(`批次寫入失敗: (${err.message})`, 'error') }
          }
          addLog(`完整資料建檔作業完成。成功: ${success} 筆，失敗: ${fail} 筆。`, fail === 0 ? 'success' : 'warning')
      }
      
      setProcessing(false)
      if (!logs.some(l => l.type === 'error') && fail === 0) {
          setTimeout(() => { alert("系統匯入作業已成功完成！"); handleModeSwitch(mode); }, 1500)
      } else {
          alert("作業完成，但有部分資料匯入失敗。請查看「系統日誌」了解原因！")
      }
  }

  const resolveDuplicate = (rowIndex, selectedDbId) => {
      const newData = [...previewData]
      newData[rowIndex]._dbId = selectedDbId
      newData[rowIndex]._status = selectedDbId ? 'resolved' : 'duplicate'
      if (selectedDbId !== 'SKIP' && selectedDbId) {
          const selectedUser = newData[rowIndex]._duplicates.find(u => u.id === selectedDbId);
          if (selectedUser) {
              newData[rowIndex].full_name = selectedUser.full_name;
              newData[rowIndex].contact_email = selectedUser.contact_email;
              newData[rowIndex].email = selectedUser.email;
          }
      }
      setPreviewData(newData)
  }

  const filteredData = previewData.filter(row => {
      if (viewFilter === 'all') return true;
      if (viewFilter === 'valid') return ['valid', 'perfect', 'resolved'].includes(row._status);
      if (viewFilter === 'error') return ['invalid', 'duplicate', 'not_found'].includes(row._status);
      return true;
  });

  const getDynamicMappedFields = () => {
      return Object.keys(fieldMapping).filter(excelCol => {
          const dbField = fieldMapping[excelCol];
          return dbField && !['full_name', 'email', 'contact_email'].includes(dbField);
      });
  }

  // ==========================================
  // 🌟 賽事匯入核心邏輯 (真．智慧去重版)
  // ==========================================
  const handleExecuteRaceUpload = async () => {
      if (!raceFile) return alert("請先選擇賽事建檔表！");
      
      setIsUploadingRace(true);
      setUploadRaceStatus(null);
      addLog("開始讀取賽事 Excel 檔案...", 'info');

      try {
          const rows = await readExcel(raceFile);
          if (rows.length === 0) throw new Error("上傳的檔案沒有資料");

          const racesToInsert = [];
          let errorCount = 0;

          // 預先載入所有會員資料，供姓名精準匹配使用
          const { data: dbProfiles } = await supabase.from('profiles').select('id, full_name, email');
          const profileMap = new Map();
          if (dbProfiles) {
              dbProfiles.forEach(p => profileMap.set(p.full_name, p));
          }

          for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              try {
                  const name = row['賽事名稱'] || row.name || '';
                  if (!name) {
                      addLog(`警告：第 ${i+2} 行缺少「賽事名稱」，自動略過此筆`, 'warning');
                      continue;
                  }

                  let rawDate = row['日期(YYYY-MM-DD)'] || row.date || '';
                  let location = row['地點'] || row.location || '';
                  const imgUrl = row['海報圖片URL'] || row['賽事URL'] || '';
                  
                  // 日期容錯處理
                  let parsedDate = null;
                  if (rawDate) {
                      let dateStr = String(rawDate).trim();
                      if (dateStr.includes('-') && dateStr.includes('/')) dateStr = dateStr.split('-')[0].trim();
                      dateStr = dateStr.replace(/\//g, '-');
                      const d = new Date(dateStr);
                      if (!isNaN(d.getTime())) parsedDate = d.toISOString().split('T')[0];
                  }

                  if (!parsedDate) {
                      parsedDate = '2025-01-01'; 
                      addLog(`⚠️ 賽事「${name}」日期異常 [${rawDate}]，已暫時代入 2025-01-01 以防崩潰`, 'warning');
                  }

                  if (!location || String(location).trim() === '') {
                      location = imgUrl ? "詳見賽事連結" : "地點未定";
                  }

                  // 🌟🌟 建立人員地圖 (Deduplication Map) 以防重複計算
                  const participantsMap = new Map(); 

                  // 1. 抓取一般參加人員 1~40
                  for(let j = 1; j <= 40; j++) {
                      const person = row[`參加人員${j}`];
                      if (person && String(person).trim() !== '') {
                          let rawString = String(person).trim();
                          let pSlotName = null;
                          const match = rawString.match(/(.*?)\((.*?)\)/) || rawString.match(/(.*?)（(.*?)）/);
                          if (match) {
                              rawString = match[1].trim();
                              pSlotName = match[2].trim();
                          }
                          let cleanName = rawString.replace(/[A-Za-z0-9\s]+$/, '').trim(); 
                          if (!cleanName) cleanName = rawString.trim(); 
                          
                          if (!participantsMap.has(cleanName)) {
                              participantsMap.set(cleanName, { cleanName, pSlotName, roleTag: null });
                          }
                      }
                  }

                  // 2. 處理教官與代表，若已存在則「只貼標籤」，不存在才新增
                  const assignSpecialRole = (rawSpecialName, role) => {
                      if (!rawSpecialName) return;
                      let cleanSpecial = String(rawSpecialName).replace(/[A-Za-z0-9\s]+$/, '').trim();
                      if (!cleanSpecial) cleanSpecial = String(rawSpecialName).trim();
                      
                      if (participantsMap.has(cleanSpecial)) {
                          participantsMap.get(cleanSpecial).roleTag = role;
                      } else {
                          participantsMap.set(cleanSpecial, { cleanName: cleanSpecial, pSlotName: null, roleTag: role });
                      }
                  };

                  const sponsor1 = row['贊助方（鐵人醫護有限公司）代表1'] || '';
                  const sponsor2 = row['贊助方（鐵人醫護有限公司）代表2'] || '';
                  const sponsor3 = row['贊助方（鐵人醫護有限公司）代表3'] || '';
                  assignSpecialRole(sponsor1, '官方代表');
                  assignSpecialRole(sponsor2, '官方代表');
                  assignSpecialRole(sponsor3, '官方代表');

                  const instructors = row['教官'] || '';
                  if (instructors) {
                      const lines = String(instructors).split('\n');
                      lines.forEach(line => {
                          let rawInst = line.replace(/^[0-9\.\s]+/, '').trim();
                          if (rawInst) {
                              let role = '帶隊教官'; 
                              if (rawInst.includes('賽道')) role = '賽道教官';
                              if (rawInst.includes('醫護')) role = '醫護教官';
                              rawInst = rawInst.replace(/帶隊教官[：:]?|賽道教官[：:]?|醫護教官[：:]?/g, '').trim();
                              if(rawInst) assignSpecialRole(rawInst, role);
                          }
                      });
                  }

                  const extraInfo = {
                      organizer: row['主辦單位或承辦單位'] || '',
                      instructor: instructors,
                      sponsor1: sponsor1,
                      sponsor2: sponsor2,
                      sponsor3: sponsor3
                  };

                  let slotsArray = [];
                  let totalRequiredInput = parseInt(row['參賽總人數'], 10);
                  if (isNaN(totalRequiredInput)) totalRequiredInput = 0;

                  const rawSlotsText = row['賽段配置(分組+人數)'] || row['賽段配置(快速語法)'] || '';
                  
                  if (!rawSlotsText) {
                      slotsArray = [{ 
                          id: Date.now(), 
                          group: '一般組別', 
                          name: '全賽段', 
                          capacity: Math.max(1, participantsMap.size, totalRequiredInput), 
                          genderLimit: 'ANY', 
                          filled: 0, 
                          assignee: '',
                          ...extraInfo
                      }];
                  } else {
                      const parts = String(rawSlotsText).split(/[,，、]/);
                      slotsArray = parts.map((part, idx) => {
                          let sName = part.trim();
                          let cap = 0;
                          let group = '一般組別';

                          const numMatch = sName.match(/(\d+)\s*(人|位|名)/);
                          if (numMatch) {
                              cap = parseInt(numMatch[1], 10);
                              sName = sName.replace(numMatch[0], '').trim() || `組別${idx+1}`;
                          } else {
                              cap = 0;
                          }

                          if (sName.includes('-')) {
                              const sp = sName.split('-');
                              group = sp[0].trim();
                              sName = sp.slice(1).join('-').trim();
                          }

                          if (!sName) sName = `組別${idx+1}`;

                          return {
                              id: Date.now() + idx,
                              group: group,
                              name: sName,
                              capacity: cap,
                              genderLimit: 'ANY',
                              filled: 0,
                              assignee: '',
                              ...extraInfo
                          };
                      });
                  }

                  // 3. 把 Map 中的人員真正放進 Slots 中
                  Array.from(participantsMap.values()).forEach(pData => {
                      let targetSlot = slotsArray[0];
                      if (pData.pSlotName) {
                          const found = slotsArray.find(s => s.name.includes(pData.pSlotName) || pData.pSlotName.includes(s.name));
                          if (found) targetSlot = found;
                      }

                      const dbMatch = profileMap.get(pData.cleanName);
                      let assigneesList = targetSlot.assignee ? targetSlot.assignee.split('|') : [];
                      
                      const pObj = {
                          id: dbMatch ? dbMatch.id : `legacy-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                          name: pData.cleanName,
                          email: dbMatch ? dbMatch.email : '',
                          timestamp: '舊表單匯入',
                          isLegacy: !dbMatch,
                          roleTag: pData.roleTag 
                      };
                      assigneesList.push(JSON.stringify(pObj));
                      
                      targetSlot.assignee = assigneesList.join('|');
                      targetSlot.filled = assigneesList.length;
                      
                      if (targetSlot.filled > targetSlot.capacity) {
                          targetSlot.capacity = targetSlot.filled;
                      }
                  });

                  slotsArray.forEach(s => {
                      if (s.capacity === 0) s.capacity = Math.max(1, s.filled);
                  });

                  const calcRequired = slotsArray.reduce((acc, cur) => acc + cur.capacity, 0);
                  let finalRequired = Math.max(totalRequiredInput || 0, calcRequired);

                  racesToInsert.push({
                      name: name,
                      date: parsedDate, 
                      gather_time: row['鳴槍時間(HH:MM)'] || null,
                      location: location, 
                      type: row['賽事類型(馬拉松/鐵人三項...)'] || '馬拉松',
                      image_url: imgUrl,
                      status: row['狀態(OPEN/NEGOTIATING/SUBMITTED)'] || 'OPEN',
                      is_hot: (row['是否火熱(Y/N)'] === 'Y' || row['是否火熱(Y/N)'] === 'y'),
                      medic_required: finalRequired,
                      medic_registered: participantsMap.size, 
                      slots_data: slotsArray,
                      waitlist_data: []
                  });

              } catch (e) {
                  errorCount++;
                  addLog(`❌ 解析失敗 (${row['賽事名稱'] || `第${i+2}行`}): ${e.message}`, 'error');
              }
          }

          if (racesToInsert.length > 0) {
              addLog(`準備將 ${racesToInsert.length} 筆清洗完畢的賽事寫入資料庫...`, 'info');
              
              const BATCH_SIZE = 50;
              for (let i = 0; i < racesToInsert.length; i += BATCH_SIZE) {
                  const chunk = racesToInsert.slice(i, i + BATCH_SIZE);
                  const { error } = await supabase.from('races').insert(chunk);
                  if (error) throw error;
              }
              
              setUploadRaceStatus('success');
              addLog(`🎉 賽事建檔成功！共新增 ${racesToInsert.length} 筆賽事。${errorCount > 0 ? `(有 ${errorCount} 筆遭略過)` : ''}`, 'success');
              setRaceFile(null); 
          } else {
              setUploadRaceStatus('error');
              addLog("未能解析出任何有效的賽事資料。", 'warning');
          }

      } catch (err) {
          setUploadRaceStatus('error');
          addLog(`賽事檔案讀取錯誤: ${err.message}`, 'error');
      } finally {
          setIsUploadingRace(false);
      }
  }

  return (
    <div className="w-full space-y-6 pb-20 animate-fade-in text-slate-800">
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex">
          <button 
              onClick={() => setMainTab('members')}
              className={`flex-1 py-4 text-sm font-black flex justify-center items-center gap-2 relative transition-colors ${mainTab === 'members' ? 'text-blue-600 bg-blue-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
              <Users size={18}/> 👥 會員名單整合
              {mainTab === 'members' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600"></div>}
          </button>
          <button 
              onClick={() => setMainTab('races')}
              className={`flex-1 py-4 text-sm font-black flex justify-center items-center gap-2 relative transition-colors ${mainTab === 'races' ? 'text-amber-600 bg-amber-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
              <Flag size={18}/> 🚩 賽事批次建檔
              {mainTab === 'races' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-amber-500"></div>}
          </button>
      </div>

      {mainTab === 'members' ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Database className="text-blue-600"/> 資料整合匯入中心 <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold border border-slate-200">System V9.6 AI 智慧版</span>
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">企業級資料處理模組。支援自動對接欄位與大螢幕滿版檢視。</p>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-lg border border-slate-200">
                    <button onClick={()=>handleModeSwitch('full')} className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${mode==='full' ? 'bg-white shadow-sm border border-slate-200 text-blue-600' : 'text-slate-500 hover:text-slate-700'} `}><Merge size={16}/> 完整資料整合</button>
                    <button onClick={()=>handleModeSwitch('patch')} className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${mode==='patch' ? 'bg-white shadow-sm border border-slate-200 text-amber-600' : 'text-slate-500 hover:text-slate-700'}`}><Edit size={16}/> 特定欄位更新</button>
                </div>
            </div>
            
            <div className="flex items-center gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100 mb-6">
                <div className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${step===1 ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>1. 檔案上傳</div>
                <ArrowRight size={16} className="text-slate-300"/>
                <div className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${step===2 ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>2. 欄位對應設定</div>
                <ArrowRight size={16} className="text-slate-300"/>
                <div className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${step===3 ? 'bg-slate-800 text-white' : 'text-slate-400'}`}>3. 預覽與匯入</div>
            </div>

            {step === 1 && (
            <div className="space-y-6">
                {mode === 'patch' ? (
                    <div 
                        onDragOver={handleDragOver} 
                        onDrop={handleDropMaster}
                        className="border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-amber-400 bg-white transition-all cursor-pointer"
                    >
                        <input type="file" id="upload-patch" className="hidden" accept=".xlsx,.csv" onChange={(e)=>setFileMaster(e.target.files[0])}/>
                        <label htmlFor="upload-patch" className="cursor-pointer block w-full h-full">
                            <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-4 mx-auto border border-amber-100"><Edit size={32}/></div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">點擊選擇檔案，或將檔案拖曳至此</h3>
                            <p className="text-sm text-slate-500 mb-4">此模式僅會更新您指定的欄位，不會影響人員的其他資料。</p>
                            {fileMaster && <div className="font-bold text-blue-600 bg-blue-50 border border-blue-100 inline-block px-4 py-2 rounded-full">已選取檔案: {fileMaster.name}</div>}
                        </label>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div 
                            onDragOver={handleDragOver} 
                            onDrop={handleDropMaster}
                            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${fileMaster ? 'border-blue-400 bg-blue-50' : 'border-slate-300 bg-white hover:border-blue-400'}`}
                        >
                            <input type="file" id="master-up" className="hidden" accept=".xlsx,.csv" onChange={(e)=>setFileMaster(e.target.files[0])}/>
                            <label htmlFor="master-up" className="cursor-pointer block w-full h-full">
                                <FileSpreadsheet size={40} className={`mx-auto mb-4 ${fileMaster ? 'text-blue-600' : 'text-slate-400'}`}/>
                                <h3 className="text-lg font-bold text-slate-700">1. 上傳或拖曳主要資料表 (Master)</h3>
                                <p className="text-xs text-slate-500 mb-2">包含 A~AO 欄位的完整名單</p>
                                {fileMaster && <div className="text-sm font-bold text-blue-600">{fileMaster.name}</div>}
                            </label>
                        </div>
                        <div 
                            onDragOver={handleDragOver} 
                            onDrop={handleDropWix}
                            className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer ${fileWix ? 'border-purple-400 bg-purple-50' : 'border-slate-300 bg-white hover:border-purple-400'}`}
                        >
                            <input type="file" id="wix-up" className="hidden" accept=".xlsx,.csv" onChange={(e)=>setFileWix(e.target.files[0])}/>
                            <label htmlFor="wix-up" className="cursor-pointer block w-full h-full">
                                <Plus size={40} className={`mx-auto mb-4 ${fileWix ? 'text-purple-600' : 'text-slate-400'}`}/>
                                <h3 className="text-lg font-bold text-slate-700">2. 上傳或拖曳輔助資料表 (選項)</h3>
                                <p className="text-xs text-slate-500 mb-2">用於合併比對，例如 Wix 報名系統匯出的資料</p>
                                {fileWix && <div className="text-sm font-bold text-purple-600">{fileWix.name}</div>}
                            </label>
                        </div>
                    </div>
                )}
                <div className="flex justify-between items-center mt-6">
                    <button 
                        onClick={() => handleDownloadTemplate('members')} 
                        className="text-sm font-bold text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1 border-b border-dashed border-slate-300 pb-0.5"
                    >
                        <FileDown size={16}/> 找不到格式？下載會員標準範本
                    </button>

                    <button 
                        onClick={handleStep1Submit} disabled={!fileMaster || processing}
                        className="px-10 py-3 text-white rounded-xl font-bold bg-slate-800 hover:bg-slate-700 shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {processing ? <><Loader2 className="animate-spin" size={20}/> 資料解析中...</> : '確認檔案，進入下一步'}
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

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm w-full">
                    <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                        <h4 className="font-bold text-slate-800 flex items-center gap-2">
                            <Settings className="text-slate-500"/> {mode === 'patch' ? '步驟 2-2：選擇欲更新的資料欄位 (系統已為您自動配對)' : '欄位對應設定 (Data Mapping)'}
                        </h4>
                        <button onClick={handleClearMemory} className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                            <Trash2 size={14}/> 重置系統記憶
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto p-2 bg-slate-50 rounded-xl custom-scrollbar">
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
                                    <div className="text-[10px] font-bold text-slate-400 mb-1">匯入至系統欄位</div>
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
                    <button onClick={() => setStep(1)} className="px-6 py-2 rounded-xl font-medium text-slate-600 hover:bg-slate-100 border border-slate-200">返回上一步</button>
                    <button onClick={handleMatchAndTransform} disabled={processing} className="px-8 py-2 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md flex items-center gap-2">
                        {processing ? <><Loader2 className="animate-spin" size={18}/> 處理中...</> : <><LayoutList size={18}/> 確認對應，產生預覽</>}
                    </button>
                </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4 animate-fade-in-up w-full">
                
                <div className="flex flex-wrap items-center justify-start p-4 rounded-xl shadow-sm bg-white border border-slate-200 gap-6">
                    {mode === 'patch' ? (
                        <div className="flex gap-4 items-center border-r border-slate-200 pr-6">
                            <div className="bg-green-50/50 px-4 py-2 rounded-lg border border-green-100 text-center min-w-[100px]">
                                <div className="text-xs text-green-600 font-bold flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>可更新</div>
                                <div className="text-2xl font-black text-green-700 mt-1">{previewData.filter(r=>['perfect','resolved'].includes(r._status)).length}</div>
                            </div>
                            <div className="bg-amber-50/50 px-4 py-2 rounded-lg border border-amber-100 text-center min-w-[100px]">
                                <div className="text-xs text-amber-600 font-bold flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span>需手動確認</div>
                                <div className="text-2xl font-black text-amber-700 mt-1">{previewData.filter(r=>r._status==='duplicate').length}</div>
                            </div>
                            <div className="bg-slate-50/50 px-4 py-2 rounded-lg border border-slate-200 text-center min-w-[100px]">
                                <div className="text-xs text-slate-500 font-bold flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400"></span>查無此人</div>
                                <div className="text-2xl font-black text-slate-600 mt-1">{previewData.filter(r=>r._status==='not_found').length}</div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-4 items-center border-r border-slate-200 pr-6">
                            <div className="bg-green-50/50 px-5 py-2.5 rounded-lg border border-green-100 text-center min-w-[120px]">
                                <div className="text-xs text-green-600 font-bold flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>格式完整</div>
                                <div className="text-2xl font-black text-green-700 mt-1">{previewData.filter(r=>r._status==='valid').length}</div>
                            </div>
                            <div className="bg-red-50/50 px-5 py-2.5 rounded-lg border border-red-100 text-center min-w-[120px]">
                                <div className="text-xs text-red-600 font-bold flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span>異常/缺漏</div>
                                <div className="text-2xl font-black text-red-700 mt-1">{previewData.filter(r=>r._status==='invalid').length}</div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                        <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">返回修改設定</button>
                        <button onClick={handleExecute} disabled={processing || previewData.filter(r=>mode==='patch' ? ['perfect','resolved'].includes(r._status) : r._status==='valid').length === 0} className="px-8 py-2.5 rounded-xl font-bold text-white shadow-md flex items-center gap-2 disabled:opacity-50 bg-slate-800 hover:bg-slate-700 transition-transform active:scale-95">
                            {processing ? <><Loader2 className="animate-spin" size={18}/> 系統處理中...</> : <><Save size={18}/> 確認無誤，執行匯入</>}
                        </button>
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl shadow-sm w-full flex flex-col overflow-hidden">
                    
                    <div className="p-3 bg-white border-b border-slate-200 flex justify-start items-center w-full gap-4">
                        <div className="flex items-center gap-2">
                            <Filter size={16} className="text-slate-400"/>
                            <select 
                                className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500"
                                value={viewFilter} onChange={(e) => setViewFilter(e.target.value)}
                            >
                                <option value="all">顯示全部名單 ({previewData.length} 筆)</option>
                                <option value="valid">🟢 僅顯示狀態正常名單</option>
                                <option value="error">🔴 僅顯示異常/需確認名單</option>
                            </select>
                        </div>

                        <div className="h-6 w-px bg-slate-200"></div> 
                        
                        <button onClick={handleExportExcel} className="flex items-center gap-2 text-sm text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 px-4 py-1.5 rounded-lg transition-colors font-bold shadow-sm">
                            <Download size={16}/> 匯出審核報表 (Excel)
                        </button>
                    </div>
                    
                    <div className="w-full overflow-x-auto overflow-y-auto max-h-[65vh] custom-scrollbar">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-white text-slate-500 font-bold sticky top-0 z-10 text-xs border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 bg-white/95 backdrop-blur">資料狀態</th>
                                    <th className="px-6 py-4 bg-white/95 backdrop-blur text-slate-800">姓名(A)</th>
                                    <th className="px-6 py-4 bg-white/95 backdrop-blur text-slate-800">聯絡信箱(E)</th>
                                    <th className="px-6 py-4 bg-white/95 backdrop-blur text-slate-800">登入帳號/WIX(Y)</th>
                                    {mode === 'patch' && <th className="px-6 py-4 bg-amber-50/95 backdrop-blur text-amber-800 border-l border-amber-100">比對基準 ({patchAnchorExcel})</th>}
                                    {getDynamicMappedFields().map(excelCol => (
                                        <th key={excelCol} className="px-6 py-4 bg-white/95 backdrop-blur text-blue-600">更新: {excelCol}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 bg-white">
                                {filteredData.map((row) => (
                                    <tr key={row._id} className={
                                        mode === 'patch' 
                                            ? (row._status === 'duplicate' ? 'bg-amber-50/50' : row._status === 'not_found' ? 'opacity-50' : 'hover:bg-slate-50')
                                            : (row._status === 'invalid' ? 'bg-red-50/50' : 'hover:bg-slate-50')
                                    }>
                                        <td className="px-6 py-3">
                                            {row._status === 'valid' && <span className="text-green-600 font-bold flex items-center gap-1.5"><CheckCircle size={14}/>資料完整</span>}
                                            {row._status === 'invalid' && <span className="text-red-600 font-bold flex items-center gap-1.5"><XCircle size={14}/>{row._error}</span>}
                                            {row._status === 'perfect' && <span className="text-green-600 font-bold flex items-center gap-1.5"><CheckCircle size={14}/>準備更新</span>}
                                            {row._status === 'resolved' && <span className="text-blue-600 font-bold flex items-center gap-1.5"><UserCheck size={14}/>已手動指定</span>}
                                            {row._status === 'not_found' && <span className="text-slate-400 font-medium flex items-center gap-1.5"><XCircle size={14}/>查無此人(略過)</span>}
                                            
                                            {row._status === 'duplicate' && (
                                                <div className="space-y-1 mt-1">
                                                    <span className="text-amber-600 font-bold text-xs">⚠️ 發現 {row._duplicates.length} 筆重複：</span>
                                                    <select className="w-full min-w-[200px] p-1.5 border border-amber-300 rounded bg-white text-xs font-medium text-slate-700" onChange={(e) => resolveDuplicate(row._id, e.target.value)} defaultValue="">
                                                        <option value="" disabled>-- 請指定更新對象 --</option>
                                                        {row._duplicates.map(dup => <option key={dup.id} value={dup.id}>{dup.full_name} | {dup.phone || '無電話'} | {dup.email}</option>)}
                                                        <option value="SKIP">🚫 皆非，略過此筆</option>
                                                    </select>
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 font-bold text-slate-800">{row.full_name || '-'}</td>
                                        <td className="px-6 py-3 text-slate-600">{row.contact_email || '-'}</td>
                                        <td className="px-6 py-3 text-slate-600">{row.email || '-'}</td>
                                        {mode === 'patch' && <td className="px-6 py-3 font-bold text-amber-700 bg-amber-50/30 border-l border-amber-100/50">{row._rawAnchor}</td>}
                                        {getDynamicMappedFields().map(excelCol => (
                                            <td key={excelCol} className="px-6 py-3 text-blue-700">{row[fieldMapping[excelCol]] || '-'}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          )}
        </div>
      ) : (
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full animate-fade-in-up">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 border-b border-slate-100 pb-6">
            <div>
                <h2 className="text-2xl font-black text-amber-600 flex items-center gap-2">
                    <Flag className="text-amber-500"/> 賽事年度總表批次建檔
                </h2>
                <p className="text-slate-500 text-sm mt-1">配備「智慧去重引擎」，教官與一般人員完美整合，保證人數不再失真！</p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12">
              <div>
                  <div 
                      onDragOver={handleDragOver} 
                      onDrop={handleDropRace}
                      className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer group mb-6 ${raceFile ? 'border-amber-400 bg-amber-50' : 'border-amber-300 hover:border-amber-400 bg-slate-50/50'}`}
                  >
                      <input type="file" id="race-upload" className="hidden" accept=".xlsx,.csv" onChange={(e)=>setRaceFile(e.target.files[0])}/>
                      <label htmlFor="race-upload" className="cursor-pointer block w-full h-full">
                          <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                              <FileSpreadsheet size={32} />
                          </div>
                          <h3 className="text-xl font-bold text-slate-800 mb-2">點擊選擇檔案，或將檔案拖曳至此</h3>
                          <p className="text-xs text-slate-500 font-medium">支援格式：.xlsx, .csv</p>
                          {raceFile && <div className="mt-4 font-bold text-amber-600 bg-amber-50 inline-block px-4 py-1.5 rounded-full border border-amber-200 shadow-sm">{raceFile.name}</div>}
                      </label>
                  </div>

                  <button 
                      onClick={handleExecuteRaceUpload}
                      disabled={isUploadingRace || !raceFile}
                      className={`w-full py-4 rounded-xl font-black flex items-center justify-center gap-2 transition-all shadow-lg
                          ${isUploadingRace || !raceFile ? 'bg-slate-400 text-white cursor-not-allowed shadow-none' : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30 active:scale-95'}`}
                  >
                      {isUploadingRace ? <><Loader2 className="animate-spin" size={20}/> 系統去重解析與寫入中...</> : <><Upload size={20}/> 開始執行賽事匯入</>}
                  </button>

                  {uploadRaceStatus === 'success' && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-bounce-in">
                          <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20}/>
                          <div>
                              <h4 className="font-bold text-green-800">賽事批次建檔成功！</h4>
                              <p className="text-sm text-green-600 mt-1">人員資料已去重並寫入，您可至「賽事任務總覽」查看精準數據。</p>
                          </div>
                      </div>
                  )}
                  {uploadRaceStatus === 'error' && (
                      <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 animate-bounce-in">
                          <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20}/>
                          <div>
                              <h4 className="font-bold text-red-800">賽事建檔發生錯誤</h4>
                              <p className="text-sm text-red-600 mt-1">請查看下方系統日誌了解詳細錯誤原因。</p>
                          </div>
                      </div>
                  )}
              </div>

              <div className="bg-amber-50/30 rounded-2xl p-6 border border-amber-100">
                  <h3 className="text-lg font-black text-amber-800 mb-4 flex items-center gap-2">
                      <FileDown className="text-amber-500"/> 下載 年度賽事總表 格式
                  </h3>
                  <button onClick={() => handleDownloadTemplate('races')} className="w-full py-3 mb-6 bg-white border border-amber-300 hover:border-amber-500 hover:text-amber-600 text-slate-700 font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm group">
                      <FileDown size={18} className="group-hover:-translate-y-1 transition-transform text-amber-500"/> 
                      下載 賽事總表標準範本 (.xlsx)
                  </button>
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800 leading-relaxed shadow-inner">
                      <span className="font-bold text-amber-600 block mb-1 flex items-center gap-1"><AlertTriangle size={14}/> 人員防呆與去重說明：</span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 mt-2">
                          <li>系統會自動辨識並清除非人名的後綴 (如 da1)。</li>
                          <li><span className="font-bold text-red-600">不會重複計算：</span>若「教官」已存在於「參加人員 1~40」中，系統會自動將其合併為同一人，並掛上教官徽章。</li>
                      </ul>
                  </div>
              </div>
          </div>
      </div>
      )}

      <div className="bg-slate-900 rounded-xl p-4 h-40 overflow-hidden flex flex-col shadow-inner w-full">
          <div className="text-slate-400 text-xs font-bold border-b border-slate-700 pb-2 mb-2 flex justify-between items-center">
              <span className="flex items-center gap-2"><Database size={14}/> 系統執行紀錄 (System Logs)</span>
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