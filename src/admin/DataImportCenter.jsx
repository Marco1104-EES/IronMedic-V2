import { useState, useRef, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx' 
import { FileSpreadsheet, CheckCircle, ArrowRight, Save, Database, Settings, LayoutList, Merge, Plus, Target, UserCheck, XCircle, BrainCircuit, Trash2, Edit, Download, FileText, Filter, Users, Flag, Upload, AlertTriangle, FileDown, Loader2, Settings2, Fingerprint, GitMerge, X, ListOrdered, ArchiveRestore } from 'lucide-react'

const MAPPING_MEMORY_KEY = 'ironmedic_mapping_memory'
const EXT_LABELS_KEY = 'ironmedic_ext_labels'
const ERROR_STASH_KEY = 'ironmedic_error_stash'

const RACE_IMPORT_TEMPLATE_HEADERS = [
    "賽事名稱", "日期(YYYY-MM-DD)", "鳴槍時間(HH:MM)", "地點", "賽事類型(馬拉松/鐵人三項...)", 
    "海報圖片URL", "狀態(OPEN/NEGOTIATING/SUBMITTED)", "是否火熱(Y/N)", 
    "賽段配置(分組+人數)", "參賽總人數", "教官", "主辦單位或承辦單位", 
    "贊助方（鐵人醫護有限公司）代表1", "贊助方（鐵人醫護有限公司）代表2", "贊助方（鐵人醫護有限公司）代表3",
    ...Array.from({length: 40}, (_, i) => `參加人員${i + 1}`)
]

const cleanString = (str) => {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[\s\u3000\n\r\-_]/g, '');
};

const formatDateString = (rawDate) => {
    if (!rawDate) return '';
    let str = String(rawDate).trim();
    
    if (str.match(/\d+\/\d+\/\d+\s*-\s*\d+/)) {
        str = str.split('-')[0].trim();
    } else if (str.includes('~')) {
        str = str.split('~')[0].trim();
    }

    const usFormatMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (usFormatMatch) {
        let year = parseInt(usFormatMatch[3], 10);
        year += (year < 30 ? 2000 : 1900);
        const month = String(usFormatMatch[1]).padStart(2, '0');
        const day = String(usFormatMatch[2]).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }
    const twFormatMatch = str.match(/^(\d{2,3})[/-](\d{1,2})[/-](\d{1,2})$/);
    if (twFormatMatch && parseInt(twFormatMatch[1], 10) < 150) {
         let year = parseInt(twFormatMatch[1], 10) + 1911;
         const month = String(twFormatMatch[2]).padStart(2, '0');
         const day = String(twFormatMatch[3]).padStart(2, '0');
         return `${year}-${month}-${day}`;
    }
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
    }
    return str; 
}

const normalizeMedicalLicense = (rawLicense) => {
    if (!rawLicense) return '';
    const s = String(rawLicense).toUpperCase().replace(/\s/g, '');
    if (s.includes('EMT-P') || s.includes('EMTP')) return 'EMTP';
    if (s.includes('EMT-2') || s.includes('EMT2')) return 'EMT-2';
    if (s.includes('EMT-1') || s.includes('EMT1')) return 'EMT-1';
    if (s.includes('護理') || s.includes('NURSE')) return '醫療線上護理師';
    if (s.includes('醫') || s.includes('DOCTOR')) return '醫師';
    return rawLicense; 
}

export default function DataImportCenter() {
  const [mainTab, setMainTab] = useState('members') 

  const [mode, setMode] = useState('full') 
  const [step, setStep] = useState(1) 
  const [fileMaster, setFileMaster] = useState(null)
  const [fileWix, setFileWix] = useState(null)
  const [rawHeaders, setRawHeaders] = useState([])
  const [rawData, setRawData] = useState([])
  const [fieldMapping, setFieldMapping] = useState({}) 
  const [memoryFlags, setMemoryFlags] = useState({}) 
  const [patchAnchorExcel, setPatchAnchorExcel] = useState('') 
  const [patchAnchorDB, setPatchAnchorDB] = useState('national_id') 
  const [previewData, setPreviewData] = useState([]) 
  const [viewFilter, setViewFilter] = useState('all') 
  
  const [extLabels, setExtLabels] = useState(() => JSON.parse(localStorage.getItem(EXT_LABELS_KEY) || '{}'))

  const [conflictModalData, setConflictModalData] = useState(null)
  const [mergedData, setMergedData] = useState({})
  
  const [conflictStep, setConflictStep] = useState('edit') 

  const [isUploadingRace, setIsUploadingRace] = useState(false)
  const [uploadRaceStatus, setUploadRaceStatus] = useState(null)
  const [raceFile, setRaceFile] = useState(null)

  const [logs, setLogs] = useState([])
  const [processing, setProcessing] = useState(false)
  const logsEndRef = useRef(null)

  // 🌟 異常待處理區 State
  const [stashData, setStashData] = useState([])
  const [stashFilter, setStashFilter] = useState('all')

  useEffect(() => {
      if (mainTab === 'stash') {
          loadStashData();
      }
  }, [mainTab])

  const loadStashData = () => {
      try {
          const data = JSON.parse(localStorage.getItem(ERROR_STASH_KEY) || '[]');
          setStashData(data);
      } catch(e) { setStashData([]); }
  }

  const TARGET_FIELDS = [
      { group: '🟢 【基本與聯絡資料】', options: [
          { key: 'full_name', label: '姓名(A) *必填' }, { key: 'birthday', label: '出生年月日(B)' },
          { key: 'national_id', label: '身分證字號(C)' }, { key: 'phone', label: '手機(D)' },
          { key: 'contact_email', label: 'e-mail(E) (聯絡信箱)' }, { key: 'address', label: '通訊地址(F)' },
          { key: 'shirt_size', label: '賽事衣服(G)' }, { key: 'emergency_name', label: '緊急聯繫人(H)' },
          { key: 'emergency_phone', label: '緊急聯繫人電話(I)' }, { key: 'emergency_relation', label: '緊急聯繫人關係(J)' },
          { key: 'english_name', label: '英文名(K)' }, { key: 'medical_license', label: '醫護證照繳交情況(L)' },
          { key: 'dietary_habit', label: '飲食(M)' }, { key: 'resume_url', label: '醫鐵履歷網址(N)' },
          { key: 'badges', label: '成就徽章(O)' }, { key: 'gender', label: '生理性別 (自動判定)' }
      ]},
      { group: '🔵 【權限與醫療設定】', options: [
          { key: 'role', label: '醫鐵權限(P)' }, { key: 'is_current_member', label: '當年度會員(Q)' },
          { key: 'training_status', label: '會員訓練(R)' }, { key: 'is_team_leader', label: '帶隊官(S)' },
          { key: 'is_new_member', label: '新人(T)' }, { key: 'license_expiry', label: '醫護證照有效期(U)' },
          { key: 'shirt_expiry_25', label: '三鐵服期限-25(V)' }, { key: 'shirt_expiry_26', label: '三鐵服期限-26(W)' },
          { key: 'is_vip', label: 'VIP(X)' }, { key: 'email', label: '報名系統登入/WIX(Y) *系統帳號' },
          { key: 'blood_type', label: '血型(Z)' }, { key: 'medical_history', label: '病史(AA)' },
          { key: 'is_blacklisted', label: '黑名單(AB)' }
      ]},
      { group: '🟣 【賽事與後勤數據】', options: [
          { key: 'total_points', label: '積分(AC)' }, { key: 'total_races', label: '場次(AD)' },
          { key: 'volunteer_hours', label: '時數(AE)' }, { key: 'rank_level', label: '等級(AF)' },
          { key: 'line_id', label: 'LineID(AG)' }, { key: 'fb_id', label: 'FB(AH)' },
          { key: 'ig_id', label: 'IG(AI)' }, { key: 'admin_note', label: '備註(AJ)' },
          { key: 'shirt_receive_date', label: '領衣日(AK)' }, { key: 'cert_send_date', label: '證書日(AL)' },
          { key: 'transport_pref', label: '交通(AM)' }, { key: 'stay_pref', label: '住宿(AN)' },
          { key: 'family_count', label: '眷屬(AO)' }, { key: 'join_date', label: '加入年月/申請年份' },
          { key: 'ironmedic_no', label: '醫護鐵人編號' }, { key: 'extra_info', label: '🕳️ 黑洞收納箱 (未歸類資料包)' }
      ]},
      { group: '⚙️ 【自定義擴充資料欄位】', options: Array.from({length: 40}, (_, i) => { 
          const k = `ext_${String(i+1).padStart(2,'0')}`;
          return { key: k, label: extLabels[k] ? `${k} (${extLabels[k]})` : `${k} (未命名)` };
      })}
  ];
  const FLAT_TARGETS = TARGET_FIELDS.flatMap(g => g.options);

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
          headers = FLAT_TARGETS.filter(f=>f.key !== 'extra_info').map(f => f.label.split('(')[0]); 
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
      } catch(e) {}
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

  const exportDataToExcel = (dataToExport, fileName) => {
      if (dataToExport.length === 0) return alert("目前沒有資料可匯出");
      const exportData = dataToExport.map(row => {
          const exportRow = {
              '狀態': row._status === 'valid' || row._status === 'perfect' || row._status === 'resolved' ? '🟢 正常' : (row._status === 'internal_conflict' ? '🟣 內部衝突' : '🔴 異常'),
              '錯誤/異常原因': row._error || (row._status === 'duplicate' ? '發現同名者' : (row._status === 'not_found' ? '查無此人' : (row._status === 'internal_conflict' ? '資料欄位內容分歧' : '無'))),
              '姓名(A)': row.full_name || '未提供',
              '聯絡信箱(E)': row.contact_email || '未提供',
              '報名系統登入/WIX(Y)': row.email || '未提供',
              '資料來源': row._source || ''
          };
          if (mode === 'patch' || row._rawAnchor) exportRow['比對基準'] = row._rawAnchor;
          
          Object.keys(fieldMapping).forEach(excelHeader => {
              const dbField = fieldMapping[excelHeader]
              if (dbField && !['full_name', 'email', 'contact_email', 'extra_info'].includes(dbField)) {
                  exportRow[`[原始欄位] ${excelHeader}`] = row[dbField] || '';
              }
          });
          return exportRow;
      });

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "名單匯出");
      XLSX.writeFile(wb, `${fileName}_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const handleExportExcel = () => exportDataToExcel(previewData, 'Import_Report');
  const handleExportStash = () => exportDataToExcel(stashFilter === 'all' ? stashData : stashData.filter(r => r._status === stashFilter), 'Error_Stash_Report');

  const handleClearStash = () => {
      if (window.confirm("確定要清空所有待處理區的資料嗎？清空後將無法復原。")) {
          localStorage.removeItem(ERROR_STASH_KEY);
          setStashData([]);
          addLog("待處理區已清空", 'info');
      }
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
            
            let bestAnchor = headers.find(h => h.toLowerCase().includes('id') || h.includes('身分證'));
            if (!bestAnchor) bestAnchor = headers.find(h => h.toLowerCase().includes('mail') || h.includes('信箱'));
            if (!bestAnchor) bestAnchor = headers.find(h => h.includes('姓名') || h.toLowerCase().includes('name'));
            
            setPatchAnchorExcel(bestAnchor || headers[0]);
            
            if (bestAnchor) {
                const lowerH = bestAnchor.toLowerCase().replace(/\s+/g, '');
                if (lowerH.includes('id') || lowerH.includes('身分證')) setPatchAnchorDB('national_id');
                else if (lowerH.includes('mail') || lowerH.includes('信箱')) setPatchAnchorDB('email');
                else if (lowerH.includes('姓名') || lowerH.includes('name')) setPatchAnchorDB('full_name');
            }

        } else {
            const masterRows = await readExcel(fileMaster)
            finalRows = masterRows.map(row => ({...row, _source: '主名單'}))
            
            if (fileWix) {
                const wixRows = await readExcel(fileWix)
                const wixMapByEmail = {}
                const wixMapByName = {}
                
                wixRows.forEach(row => {
                    const wEmailKey = Object.keys(row).find(k => k.toLowerCase().includes('mail') || k.toLowerCase().includes('email'))
                    if (wEmailKey && row[wEmailKey]) {
                        wixMapByEmail[String(row[wEmailKey]).trim().toLowerCase()] = row
                    }
                    
                    const nameKey = Object.keys(row).find(k => k.includes('姓名') || k.toLowerCase().includes('name'))
                    if (nameKey && row[nameKey]) wixMapByName[cleanString(row[nameKey])] = row
                })

                finalRows = finalRows.map(mRow => {
                    const mEmailKey = Object.keys(mRow).find(k => k.toLowerCase() === 'e-mail' || k.toLowerCase() === 'email' || k.toLowerCase().includes('信箱'))
                    const mNameKey = Object.keys(mRow).find(k => k.includes('姓名') || k.toLowerCase().includes('name'))
                    
                    let match = null;
                    
                    if (mEmailKey && mRow[mEmailKey]) {
                        const mEmail = String(mRow[mEmailKey]).trim().toLowerCase();
                        match = wixMapByEmail[mEmail];
                    }

                    if (!match && mNameKey && mRow[mNameKey]) {
                        const mName = cleanString(mRow[mNameKey])
                        match = wixMapByName[mName] || wixMapByName[Object.keys(wixMapByName).find(k => mName.includes(k) || k.includes(mName))]
                    }

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
        const assignedDbFields = new Set();

        headers.forEach(h => {
            if (savedMemory[h]) {
                initialMap[h] = savedMemory[h]; 
                memFlags[h] = true;
                assignedDbFields.add(savedMemory[h]);
            }
        });

        headers.forEach(h => {
            if (initialMap[h]) return; 

            let matchedKey = null;
            const letterMatch = h.match(/\([A-Z]{1,2}\)/);
            if (letterMatch) {
                const code = letterMatch[0]; 
                const target = FLAT_TARGETS.find(t => t.label.includes(code));
                if (target) matchedKey = target.key;
            }

            if (!matchedKey) {
                const lowerH = h.toLowerCase().replace(/\s+/g, '')
                
                // 🌟 絕對防衛機制：縣市、鄉鎮等干擾詞彙，一律丟入黑洞收納箱
                if (['縣市', '城市', '鄉鎮', '區域', '區別', '年齡', '組別', 'age'].some(k => lowerH.includes(k))) {
                    matchedKey = 'extra_info';
                }
                else if (['姓名', 'name', 'fullname'].some(k => lowerH.includes(k)) && !lowerH.includes('緊急') && !lowerH.includes('英文') && !lowerH.includes('emergency')) matchedKey = 'full_name'
                else if (['wix', '報名系統', 'account'].some(k => lowerH.includes(k)) || (lowerH.includes('登入') && lowerH.includes('帳號'))) matchedKey = 'email'
                else if (lowerH === 'e-mail' || lowerH === 'email' || lowerH.includes('信箱')) matchedKey = 'contact_email'
                else if (['手機', 'phone', 'mobile'].some(k => lowerH.includes(k)) && !lowerH.includes('緊急') && !lowerH.includes('emergency')) matchedKey = 'phone'
                else if (['身分證', 'id_number', 'nationalid'].some(k => lowerH.includes(k)) || lowerH === 'id') matchedKey = 'national_id'
                else if (['衣服', 'size', '背心', 'shirt'].some(k => lowerH.includes(k))) matchedKey = 'shirt_size'
                else if (lowerH.includes('血型') || lowerH.includes('blood')) matchedKey = 'blood_type'
                else if (lowerH.includes('生日') || lowerH.includes('birthday') || lowerH === 'dob') matchedKey = 'birthday'
                // 🌟 只要過了縣市過濾器，來到這裡的就是乾淨的地址了
                else if (lowerH.includes('地址') || lowerH.includes('address') || lowerH.includes('通訊處')) matchedKey = 'address'
                else if (lowerH.includes('緊急聯繫人電話') || lowerH.includes('emergencyphone')) matchedKey = 'emergency_phone'
                else if (lowerH.includes('緊急聯繫人關係') || lowerH.includes('relationship')) matchedKey = 'emergency_relation'
                else if (lowerH.includes('緊急聯繫人') || lowerH.includes('emergencycontact')) matchedKey = 'emergency_name'
                else if (lowerH.includes('英文名') || lowerH.includes('englishname')) matchedKey = 'english_name'
                else if (lowerH.includes('性別') || lowerH === 'gender' || lowerH === 'sex') matchedKey = 'gender'
                else if (lowerH.includes('加入') || lowerH.includes('申請年月')) matchedKey = 'join_date'
                else if (lowerH.includes('編號') || lowerH.includes('no.')) matchedKey = 'ironmedic_no'
                else if (lowerH.includes('病史')) matchedKey = 'medical_history'
                else if (lowerH.includes('醫護證照') || lowerH.includes('醫療執照')) matchedKey = 'medical_license'
                else if (lowerH.includes('已繳交') || lowerH.includes('已繳納') || lowerH.includes('會費年度') || lowerH.includes('當年度會員')) matchedKey = 'is_current_member'
            }

            if (!matchedKey) {
                matchedKey = 'extra_info';
            }

            if (matchedKey) {
                initialMap[h] = matchedKey;
                assignedDbFields.add(matchedKey);
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
      const currentYear = new Date().getFullYear().toString(); 
      
      if (mode === 'patch') {
          if (!patchAnchorExcel) { alert("請選擇 Excel 的比對基準欄位！"); setProcessing(false); return; }
          try {
              const { data: dbUsers, error } = await supabase.from('profiles').select('*')
              if (error) throw error

              let perfect = 0, duplicate = 0, notFound = 0;

              const transformed = rawData.map((row, idx) => {
                  const excelAnchorValue = cleanString(row[patchAnchorExcel]);
                  
                  const possibleId = cleanString(row['身分證字號(C)'] || row['身分證'] || row['ID']);
                  const possibleEmail = cleanString(row['email'] || row['e-mail(E)'] || row['信箱']);
                  const possiblePhone = cleanString(row['手機(D)'] || row['電話'] || row['phone']);
                  const possibleName = cleanString(row['姓名(A)'] || row['姓名'] || row['name'] || row['中文姓名']);

                  const matches = dbUsers.filter(u => {
                      const dbAnchorVal = cleanString(u[patchAnchorDB]);
                      const dbId = cleanString(u.national_id);
                      const dbEmail1 = cleanString(u.email);
                      const dbEmail2 = cleanString(u.contact_email);
                      const dbPhone = cleanString(u.phone);
                      const dbName = cleanString(u.full_name);

                      if (excelAnchorValue !== '' && dbAnchorVal === excelAnchorValue) return true;
                      if (possibleId !== '' && dbId === possibleId) return true;
                      if (possibleEmail !== '' && (dbEmail1 === possibleEmail || dbEmail2 === possibleEmail)) return true;
                      if (possiblePhone !== '' && dbPhone === possiblePhone) return true;
                      if (possibleName !== '' && dbName === possibleName) return true;
                      return false;
                  });

                  const uniqueMatches = Array.from(new Map(matches.map(m => [m.id, m])).values());

                  let status = 'not_found', dbId = null, duplicateOptions = []
                  let dbInfo = { full_name: '', email: '', contact_email: '' } 

                  if (uniqueMatches.length === 1) { 
                      status = 'perfect'; dbId = uniqueMatches[0].id; dbInfo = uniqueMatches[0]; perfect++; 
                  } else if (uniqueMatches.length > 1) { 
                      status = 'duplicate'; duplicateOptions = uniqueMatches; duplicate++; 
                  } else { notFound++; }

                  const updateData = {}
                  let extraInfoCollector = {} 

                  Object.keys(fieldMapping).forEach(exCol => {
                      const dbField = fieldMapping[exCol]
                      if (dbField && exCol !== patchAnchorExcel) {
                          let cellVal = row[exCol];
                          if (cellVal === undefined || cellVal === null || String(cellVal).trim() === '') return;
                          
                          let normalizedVal = cellVal;
                          
                          if (dbField === 'birthday' || dbField === 'join_date') {
                              normalizedVal = formatDateString(cellVal);
                          } else if (dbField === 'medical_license') {
                              normalizedVal = normalizeMedicalLicense(cellVal);
                          } else if (dbField === 'is_current_member') {
                              normalizedVal = String(cellVal).includes(currentYear) ? 'Y' : 'N';
                          } else if (dbField === 'phone' || dbField === 'emergency_phone') {
                              normalizedVal = cleanString(cellVal);
                          } else if (dbField === 'national_id') {
                              normalizedVal = String(cellVal).toUpperCase().replace(/[\s\u3000\n\r\-_]/g, '');
                          } else if (dbField === 'full_name' || dbField === 'emergency_name') {
                              normalizedVal = /[a-zA-Z]/.test(String(cellVal)) ? String(cellVal).trim() : cleanString(cellVal);
                          } else {
                              normalizedVal = typeof cellVal === 'string' ? cellVal.trim() : cellVal;
                          }

                          if (dbField === 'extra_info') {
                              extraInfoCollector[exCol] = normalizedVal;
                          } else {
                              updateData[dbField] = normalizedVal;
                          }
                      }
                  })

                  if (Object.keys(extraInfoCollector).length > 0) {
                      updateData.extra_info = { ...(dbInfo.extra_info || {}), ...extraInfoCollector };
                  }

                  const tempId = updateData.national_id || dbInfo.national_id || '';
                  if (tempId && /^[A-Za-z][12]\d{8}$/.test(tempId)) {
                      updateData.gender = tempId.charAt(1) === '1' ? '男' : '女';
                      row._gender_deduced = true;
                  }

                  return { _id: idx, _rawAnchor: excelAnchorValue || '空值', _status: status, _dbId: dbId, _duplicates: duplicateOptions, _updateData: updateData, ...dbInfo, ...updateData }
              })

              const groupedMap = new Map();
              const finalPreview = [];
              transformed.forEach(row => {
                  const key = row._rawAnchor;
                  if (!key || key === '空值') finalPreview.push(row);
                  else {
                      if (!groupedMap.has(key)) groupedMap.set(key, []);
                      groupedMap.get(key).push(row);
                  }
              });

              groupedMap.forEach((rows, key) => {
                  if (rows.length === 1) {
                      finalPreview.push(rows[0]);
                  } else {
                      finalPreview.push({
                          _id: `conflict_${key}_${Date.now()}`,
                          _status: 'internal_conflict',
                          _rawAnchor: key,
                          email: rows[0].email,
                          full_name: rows.map(r=>r.full_name||'空').join(' 與 '),
                          _conflictRows: rows
                      });
                  }
              });

              setPreviewData(finalPreview)
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
              let extraInfoCollector = {}

              Object.keys(fieldMapping).forEach(excelHeader => {
                  const dbField = fieldMapping[excelHeader]
                  if (dbField && dbField !== "") {
                      let cellVal = row[excelHeader];
                      const isEmpty = (cellVal === undefined || cellVal === null || String(cellVal).trim() === '');
                      
                      if (newRow[dbField] && isEmpty) return;
                      if (!isEmpty) {
                          let normalizedVal = cellVal;
                          
                          if (dbField === 'birthday' || dbField === 'join_date') {
                              normalizedVal = formatDateString(cellVal);
                          } else if (dbField === 'medical_license') {
                              normalizedVal = normalizeMedicalLicense(cellVal);
                          } else if (dbField === 'is_current_member') {
                              normalizedVal = String(cellVal).includes(currentYear) ? 'Y' : 'N';
                          } else if (dbField === 'phone' || dbField === 'emergency_phone') {
                              normalizedVal = cleanString(cellVal);
                          } else if (dbField === 'national_id') {
                              normalizedVal = String(cellVal).toUpperCase().replace(/[\s\u3000\n\r\-_]/g, '');
                          } else if (dbField === 'full_name' || dbField === 'emergency_name') {
                              normalizedVal = /[a-zA-Z]/.test(String(cellVal)) ? String(cellVal).trim() : cleanString(cellVal);
                          } else {
                              normalizedVal = typeof cellVal === 'string' ? cellVal.trim() : cellVal;
                          }

                          if (dbField === 'extra_info') {
                              extraInfoCollector[excelHeader] = normalizedVal;
                          } else {
                              newRow[dbField] = normalizedVal;
                          }
                      }
                  }
              })
              
              if (Object.keys(extraInfoCollector).length > 0) {
                  newRow.extra_info = extraInfoCollector;
              }

              const idToCheck = newRow.national_id || '';
              if (idToCheck && /^[A-Za-z][12]\d{8}$/.test(idToCheck)) {
                  newRow.gender = idToCheck.charAt(1) === '1' ? '男' : '女';
                  newRow._gender_deduced = true;
              }

              if (!newRow.full_name || (!newRow.email && !newRow.contact_email)) {
                  newRow._status = 'invalid'
                  newRow._error = !newRow.full_name ? '姓名欄位空白' : '聯絡信箱空白'
              } else {
                  newRow._status = 'valid'
              }
              return newRow
          })

          const groupedMap = new Map();
          const finalPreview = [];
          transformed.forEach(row => {
              const key = row.email || row.contact_email;
              if (!key || key === '') finalPreview.push(row);
              else {
                  if (!groupedMap.has(key)) groupedMap.set(key, []);
                  groupedMap.get(key).push(row);
              }
          });

          groupedMap.forEach((rows, key) => {
              if (rows.length === 1) {
                  finalPreview.push(rows[0]);
              } else {
                  finalPreview.push({
                      _id: `conflict_${key}_${Date.now()}`,
                      _status: 'internal_conflict',
                      email: key,
                      contact_email: rows[0].contact_email,
                      full_name: rows.map(r=>r.full_name||'空').join(' 與 '),
                      _conflictRows: rows
                  });
              }
          });

          setPreviewData(finalPreview)
          setStep(3)
      }
      setProcessing(false)
  }

  const handleOpenConflictModal = (row) => {
      setConflictStep('edit'); 
      const rows = row._conflictRows;
      const autoMerged = mode === 'patch' ? { ...rows[0]._updateData } : { ...rows[0] };
      
      rows.forEach((r, idx) => {
          if (idx === 0) return;
          const sourceData = mode === 'patch' ? r._updateData : r;
          Object.keys(sourceData).forEach(k => {
              if (k.startsWith('_')) return;
              const oldVal = autoMerged[k];
              const newVal = sourceData[k];
              
              if (newVal !== undefined && newVal !== null && String(newVal).trim() !== '') {
                  if (k === 'full_name' && oldVal) {
                      if (String(newVal).trim().length > String(oldVal).trim().length) {
                          autoMerged[k] = String(newVal).trim();
                      }
                  } else if (!oldVal || String(oldVal).trim() === '') {
                      autoMerged[k] = String(newVal).trim();
                  }
              }
          });
      });
      
      setMergedData(autoMerged);
      setConflictModalData(row);
  }

  const handleSaveConflict = () => {
      const safeMergedData = { ...mergedData };
      if (typeof safeMergedData.extra_info === 'string') {
          try { safeMergedData.extra_info = JSON.parse(safeMergedData.extra_info); } catch(e) {}
      }

      const newPreview = previewData.map(r => {
          if (r._id === conflictModalData._id) {
              if (mode === 'patch') {
                  const baseRow = conflictModalData._conflictRows[0];
                  return {
                      ...baseRow,
                      _id: Date.now(),
                      _status: 'resolved', 
                      _updateData: safeMergedData, 
                      full_name: safeMergedData.full_name || baseRow.full_name 
                  };
              } else {
                  const newRow = { ...conflictModalData._conflictRows[0], ...safeMergedData, _id: Date.now() };
                  if (!newRow.full_name || (!newRow.email && !newRow.contact_email)) {
                      newRow._status = 'invalid';
                      newRow._error = !newRow.full_name ? '姓名欄位空白' : '聯絡信箱空白';
                  } else {
                      newRow._status = 'valid'; 
                  }
                  return newRow;
              }
          }
          return r;
      });
      setPreviewData(newPreview);
      setConflictModalData(null);
  }

  // 🌟 非阻塞式：部分匯入與異常暫存機制
  const handleExecute = async () => {
      setProcessing(true)

      const readyRows = mode === 'patch' 
          ? previewData.filter(r => ['perfect', 'resolved'].includes(r._status) && r._dbId)
          : previewData.filter(r => r._status === 'valid');
          
      const errorRows = previewData.filter(r => !(mode === 'patch' ? ['perfect', 'resolved'].includes(r._status) : r._status === 'valid'));

      if (readyRows.length === 0) {
          if(errorRows.length > 0) {
              if(!window.confirm("目前沒有可匯入的正常資料，是否將這些異常/衝突資料直接移至「待處理區」稍後處理？")) {
                  setProcessing(false); return;
              }
          } else {
              alert("無有效資料可更新！"); 
              setProcessing(false); return;
          }
      }

      let success = 0, fail = 0;

      if (readyRows.length > 0) {
          if (mode === 'patch') {
              for (const row of readyRows) {
                  try {
                      if (Object.keys(row._updateData).length === 0) continue; 
                      const { error } = await supabase.from('profiles').update(row._updateData).eq('id', row._dbId)
                      if (error) throw error
                      success++
                  } catch (err) { fail++; addLog(`更新失敗 (${row.full_name}): ${err.message}`, 'error') }
              }
          } else {
              const BATCH = 50
              const cleanRows = readyRows.map(({ _id, _status, _error, _source, _gender_deduced, _conflictRows, ...rest }) => ({
                  ...rest, role: rest.role || 'USER', updated_at: new Date()
              }))

              for (let i = 0; i < cleanRows.length; i += BATCH) {
                  const chunk = cleanRows.slice(i, i + BATCH)
                  try {
                      const { error } = await supabase.from('profiles').upsert(chunk, { onConflict: 'email' })
                      if (error) throw error
                      success += chunk.length
                  } catch (err) { fail += chunk.length; addLog(`批次寫入失敗: (${err.message})`, 'error') }
              }
          }
      }

      // 🌟 將異常資料推入待處理區 Stash
      if (errorRows.length > 0) {
          try {
              const existingStash = JSON.parse(localStorage.getItem(ERROR_STASH_KEY) || '[]');
              const timestamp = new Date().toLocaleString('zh-TW');
              const newStashItems = errorRows.map(r => ({ ...r, _stashedAt: timestamp }));
              const updatedStash = [...existingStash, ...newStashItems];
              localStorage.setItem(ERROR_STASH_KEY, JSON.stringify(updatedStash));
              addLog(`已將 ${errorRows.length} 筆異常/衝突資料移至待處理區`, 'warning');
          } catch (e) {
              addLog(`儲存待處理區失敗: ${e.message}`, 'error');
          }
      }

      setProcessing(false)
      
      let msg = `作業完成！成功: ${success} 筆，失敗: ${fail} 筆。`;
      if (errorRows.length > 0) {
          msg += `\n另外有 ${errorRows.length} 筆異常或內部衝突的資料，已為您安全移至「異常待處理區」，您可稍後再行處理。`;
      }
      
      alert(msg);
      
      if (errorRows.length > 0) {
          setMainTab('stash'); // 自動導向待處理區讓使用者看
      } else {
          handleModeSwitch(mode);
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
      if (viewFilter === 'error') return ['invalid', 'duplicate', 'not_found', 'internal_conflict'].includes(row._status);
      return true;
  });

  const getDynamicMappedFields = () => {
      return Object.keys(fieldMapping).filter(excelCol => {
          const dbField = fieldMapping[excelCol];
          return dbField && !['full_name', 'email', 'contact_email', 'extra_info'].includes(dbField);
      });
  }

  const handleExecuteRaceUpload = async () => {
      if (!raceFile) return alert("請先選擇賽事建檔表！");
      
      setIsUploadingRace(true);
      setUploadRaceStatus(null);
      addLog(`開始讀取賽事 Excel 檔案: ${raceFile.name}...`, 'info');

      try {
          const data = await raceFile.arrayBuffer()
          const workbook = XLSX.read(data, { cellDates: true })
          const worksheet = workbook.Sheets[workbook.SheetNames[0]]
          const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' })
          
          if (rows.length === 0) throw new Error("上傳的檔案沒有資料");

          const racesToInsert = [];
          let errorCount = 0;

          const { data: dbProfiles } = await supabase.from('profiles').select('id, full_name, email');
          const profileMap = new Map();
          if (dbProfiles) {
              dbProfiles.forEach(p => profileMap.set(p.full_name, p));
          }

          for (let i = 0; i < rows.length; i++) {
              const row = rows[i];
              const keys = Object.keys(row);
              
              try {
                  let name = row['賽事名稱'] || row['賽事或活動名稱'] || '';
                  if (!name && keys.length > 0) {
                       for(let k of keys) {
                           if (k.includes('EMPTY') && typeof row[k] === 'string' && row[k].length > 2) {
                               name = row[k]; break;
                           }
                       }
                       if (!name && typeof row[keys[0]] === 'string') name = row[keys[0]];
                  }

                  if (!name || name.includes('賽事名稱') || name.includes('賽事或活動日期')) {
                      continue; 
                  }

                  let rawDate = row['日期(YYYY-MM-DD)'] || row['賽事或活動日期'] || row['日期'] || '';
                  let location = row['地點'] || row['賽事地點'] || '';
                  const imgUrl = row['海報圖片URL'] || row['賽事URL'] || '';
                  
                  let parsedDate = formatDateString(rawDate);

                  if (!parsedDate || parsedDate === rawDate) {
                      parsedDate = '2025-01-01'; 
                      addLog(`⚠️ 賽事「${name}」日期異常 [${rawDate}]，已暫時代入 2025-01-01`, 'warning');
                  }

                  if (!location || String(location).trim() === '') {
                      location = imgUrl ? "詳見賽事連結" : "地點未定";
                  }

                  let rawStatus = String(row['狀態(OPEN/NEGOTIATING/SUBMITTED)'] || row['與主辦單位合作進度'] || '').toUpperCase();
                  let finalStatus = 'OPEN'; 
                  if (rawStatus.includes('洽談') || rawStatus.includes('確認合作') || rawStatus.includes('尚未開放')) finalStatus = 'NEGOTIATING';
                  else if (rawStatus.includes('名單已送交') || rawStatus.includes('已送交') || rawStatus.includes('名單送出') || rawStatus.includes('SUBMITTED')) finalStatus = 'SUBMITTED';
                  else if (rawStatus.includes('額滿') || rawStatus.includes('滿編') || rawStatus.includes('FULL')) finalStatus = 'FULL';
                  else if (['OPEN', 'COMPLETED', 'CANCELLED', 'UPCOMING'].includes(rawStatus)) finalStatus = rawStatus;

                  const participantsMap = new Map(); 

                  const addParticipant = (rawStr, forcedRole = null) => {
                      if (!rawStr || String(rawStr).trim() === '') return;
                      let str = String(rawStr).trim();
                      let pSlotName = null;

                      const parenMatch = str.match(/(.*?)[(（](.*?)[)）]/);
                      if (parenMatch) {
                          str = parenMatch[1].trim();
                          pSlotName = parenMatch[2].trim();
                      } else {
                          const suffixMatch = str.match(/^([\u4e00-\u9fa5]+)\s*([a-zA-Z0-9]+)$/);
                          if (suffixMatch) {
                              str = suffixMatch[1].trim();
                              let suffix = suffixMatch[2].toUpperCase();
                              
                              if (suffix.includes('DA') || suffix.includes('D')) {
                                  let dayMatch = suffix.match(/\d+/);
                                  if(dayMatch) pSlotName = `Day ${dayMatch[0]}`;
                              } else if (suffix.includes('K')) {
                                  pSlotName = `${suffix.replace('K','')}K`;
                              } else if (!isNaN(suffix)) {
                                  if (['113', '226', '515'].includes(suffix)) pSlotName = `鐵人三項 ${suffix}`;
                                  else pSlotName = `${suffix}K`;
                              } else {
                                  pSlotName = suffix;
                              }
                          }
                      }

                      let cleanName = cleanString(str);
                      if (!cleanName) return;

                      if (participantsMap.has(cleanName)) {
                          let existing = participantsMap.get(cleanName);
                          if (forcedRole && !existing.roleTag) existing.roleTag = forcedRole;
                          if (pSlotName && !existing.pSlotName) existing.pSlotName = pSlotName;
                      } else {
                          participantsMap.set(cleanName, { cleanName, pSlotName, roleTag: forcedRole });
                      }
                  };

                  for(let j = 1; j <= 40; j++) {
                      addParticipant(row[`參加人員${j}`]);
                  }

                  const assignSpecialRole = (rawNameBlock, fallbackRole) => {
                      if (!rawNameBlock) return;
                      const names = String(rawNameBlock).split(/[,，、\n]/);
                      names.forEach(n => {
                          let cleanN = n.replace(/^[0-9\.\s]+/, '').replace(/.*(?:教官|代表)[：:\s]*/, '').trim();
                          cleanN = cleanN.replace(/[a-zA-Z0-9]+$/, '').trim(); 
                          cleanN = cleanString(cleanN);
                          if (cleanN) addParticipant(cleanN, fallbackRole);
                      });
                  };

                  assignSpecialRole(row['贊助方（鐵人醫護有限公司）代表1'], '官方代表');
                  assignSpecialRole(row['贊助方（鐵人醫護有限公司）代表2'], '官方代表');
                  assignSpecialRole(row['贊助方（鐵人醫護有限公司）代表3'], '官方代表');

                  const instructors = row['教官'] || '';
                  if (instructors) {
                      const lines = String(instructors).split(/[\n]/);
                      lines.forEach(line => {
                          if (!line.trim()) return;
                          let role = '帶隊教官'; 
                          if (line.includes('賽道')) role = '賽道教官';
                          if (line.includes('醫護')) role = '醫護教官';
                          if (line.includes('代表')) role = '官方代表';
                          
                          let rawN = line.replace(/^[0-9\.\s]+/, '').replace(/.*(?:教官|代表)[：:\s]*/, '').trim();
                          if(rawN) assignSpecialRole(rawN, role);
                      });
                  }

                  const extraInfo = {
                      organizer: row['主辦單位或承辦單位'] || '',
                      instructor: instructors,
                      sponsor1: row['贊助方（鐵人醫護有限公司）代表1'] || '',
                      sponsor2: row['贊助方（鐵人醫護有限公司）代表2'] || '',
                      sponsor3: row['贊助方（鐵人醫護有限公司）代表3'] || ''
                  };

                  let slotsArray = [];
                  let totalRequiredInput = parseInt(row['參賽總人數'] || row['開放總名額數'] || row['需求人數'], 10);
                  if (isNaN(totalRequiredInput)) totalRequiredInput = 0;

                  const rawSlotsText = row['賽段配置(分組+人數)'] || row['任務賽事名額種類及數量'] || '';
                  
                  if (!rawSlotsText) {
                      slotsArray = [{ 
                          id: Date.now(), group: '一般組別', name: '全賽段', 
                          capacity: Math.max(1, participantsMap.size, totalRequiredInput), 
                          genderLimit: 'ANY', filled: 0, assignee: '', ...extraInfo
                      }];
                  } else {
                      const parts = String(rawSlotsText).split(/[,，、\n]/);
                      slotsArray = parts.map((part, idx) => {
                          let sName = part.trim();
                          if(!sName) return null;
                          let cap = 0;
                          let group = '一般組別';

                          const numMatch = sName.match(/(\d+)\s*(人|位|名)/);
                          if (numMatch) {
                              cap = parseInt(numMatch[1], 10);
                              sName = sName.replace(numMatch[0], '').trim() || `組別${idx+1}`;
                          } else if (sName.includes('不限')) {
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
                      }).filter(Boolean);
                      
                      if(slotsArray.length === 0) {
                          slotsArray = [{ id: Date.now(), group: '一般組別', name: '全賽段', capacity: Math.max(1, participantsMap.size, totalRequiredInput), filled: 0, assignee: '' }];
                      }
                  }

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
                      type: row['賽事類型(馬拉松/鐵人三項...)'] || row['賽事類型'] || '路跑＆馬拉松',
                      image_url: imgUrl || 'https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=800',
                      status: finalStatus,
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
          {/* 🌟 異常待處理區 Tab */}
          <button 
              onClick={() => setMainTab('stash')}
              className={`flex-1 py-4 text-sm font-black flex justify-center items-center gap-2 relative transition-colors ${mainTab === 'stash' ? 'text-rose-600 bg-rose-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
              <AlertTriangle size={18}/> 異常待處理區
              {stashData.length > 0 && <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.5 rounded-full animate-pulse">{stashData.length}</span>}
              {mainTab === 'stash' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-rose-500"></div>}
          </button>
          <button 
              onClick={() => setMainTab('ext_settings')}
              className={`flex-1 py-4 text-sm font-black flex justify-center items-center gap-2 relative transition-colors ${mainTab === 'ext_settings' ? 'text-purple-600 bg-purple-50/30' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'}`}
          >
              <Settings2 size={18}/> ⚙️ 擴充欄位管理
              {mainTab === 'ext_settings' && <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-purple-500"></div>}
          </button>
      </div>

      {mainTab === 'stash' ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full animate-fade-in-up">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <div>
                      <h2 className="text-2xl font-black text-rose-600 flex items-center gap-2">
                          <ArchiveRestore className="text-rose-500"/> 異常待處理區
                      </h2>
                      <p className="text-slate-500 text-sm mt-1">匯入時遭遇異常的資料已安全暫存於此，您可以下載並於 Excel 中修復後重新上傳。</p>
                  </div>
                  <div className="flex items-center gap-3">
                      <select 
                          className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-rose-500"
                          value={stashFilter} onChange={(e) => setStashFilter(e.target.value)}
                      >
                          <option value="all">顯示全部 ({stashData.length} 筆)</option>
                          <option value="invalid">🔴 僅顯示異常/缺漏</option>
                          <option value="internal_conflict">🟣 僅顯示內部衝突</option>
                          <option value="duplicate">🟡 僅顯示系統重複</option>
                      </select>
                      <button onClick={handleExportStash} className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-4 py-2 rounded-xl font-bold flex items-center gap-2 transition-colors active:scale-95 shadow-sm">
                          <Download size={16}/> 匯出 Excel 修復
                      </button>
                      <button onClick={handleClearStash} className="bg-slate-100 text-slate-500 hover:bg-red-50 hover:text-red-500 px-4 py-2 rounded-xl font-bold transition-colors active:scale-95">
                          清空
                      </button>
                  </div>
              </div>

              {stashData.length === 0 ? (
                  <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 font-bold">
                      目前待處理區空空如也，天下太平！
                  </div>
              ) : (
                  <div className="w-full overflow-x-auto custom-scrollbar border border-slate-200 rounded-xl">
                      <table className="w-full text-sm text-left whitespace-nowrap">
                          <thead className="bg-slate-800 text-white font-bold text-xs">
                              <tr>
                                  <th className="px-6 py-4">暫存時間</th>
                                  <th className="px-6 py-4">異常狀態</th>
                                  <th className="px-6 py-4">比對基準</th>
                                  <th className="px-6 py-4">姓名/Email</th>
                                  <th className="px-6 py-4">錯誤說明</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {(stashFilter === 'all' ? stashData : stashData.filter(r => r._status === stashFilter)).map((row, idx) => (
                                  <tr key={idx} className="hover:bg-slate-50">
                                      <td className="px-6 py-4 text-slate-400 text-xs font-mono">{row._stashedAt}</td>
                                      <td className="px-6 py-4">
                                          {row._status === 'invalid' && <span className="text-red-600 font-bold bg-red-50 px-2 py-1 rounded">🔴 異常缺漏</span>}
                                          {row._status === 'internal_conflict' && <span className="text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded">🟣 內部衝突</span>}
                                          {row._status === 'duplicate' && <span className="text-amber-600 font-bold bg-amber-50 px-2 py-1 rounded">🟡 系統重複</span>}
                                          {row._status === 'not_found' && <span className="text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded">⚫ 查無此人</span>}
                                      </td>
                                      <td className="px-6 py-4 font-bold text-slate-700">{row._rawAnchor || '-'}</td>
                                      <td className="px-6 py-4">
                                          <div className="font-bold text-slate-800">{row.full_name || '未提供'}</div>
                                          <div className="text-xs text-slate-500">{row.email || row.contact_email || '無信箱'}</div>
                                      </td>
                                      <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={row._error || '資料欄位分歧'}>
                                          {row._error || (row._status === 'internal_conflict' ? 'Excel內有多筆資料指向同一人' : '需人工確認')}
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              )}
          </div>
      ) : mainTab === 'ext_settings' ? (
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full animate-fade-in-up">
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 mb-2">
                  <Settings2 className="text-purple-600"/> 擴充資料欄位控制中心
              </h2>
              <p className="text-slate-500 text-sm mb-6">可以在此自定義 <code className="bg-slate-100 px-1 rounded">ext_01</code> ~ <code className="bg-slate-100 px-1 rounded">ext_40</code> 的中文顯示名稱。設定後將在「會員名單整合」的對應選單中即刻生效。</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-h-[65vh] overflow-y-auto pr-2 custom-scrollbar">
                  {Array.from({length: 40}, (_, i) => {
                      const key = `ext_${String(i+1).padStart(2,'0')}`;
                      return (
                          <div key={key} className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col gap-1.5 focus-within:border-purple-300 focus-within:bg-purple-50/20 transition-colors">
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{key}</label>
                              <input 
                                  type="text" 
                                  placeholder="未命名欄位"
                                  className="w-full p-2 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-500 outline-none text-sm font-bold text-slate-700 bg-white shadow-sm"
                                  value={extLabels[key] || ''}
                                  onChange={(e) => {
                                      const newLabels = {...extLabels, [key]: e.target.value};
                                      setExtLabels(newLabels);
                                      localStorage.setItem(EXT_LABELS_KEY, JSON.stringify(newLabels));
                                  }}
                              />
                          </div>
                      )
                  })}
              </div>
          </div>
      ) : mainTab === 'members' ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 w-full animate-fade-in-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Database className="text-blue-600"/> 資料整合匯入中心 <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold border border-slate-200">微觀八核心比對版 V10.0
                        </span>
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">深度清洗、日期轉換與黑洞收納箱完整實裝。</p>
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
                                    {TARGET_FIELDS.map(group => (
                                        <optgroup key={group.group} label={group.group}>
                                            {group.options.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                                        </optgroup>
                                    ))}
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
                            <div className="bg-purple-50/50 px-4 py-2 rounded-lg border border-purple-200 text-center min-w-[100px] cursor-help" title="Excel 內發現有重複的資料指向同一個比對基準">
                                <div className="text-xs text-purple-700 font-bold flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>內部衝突</div>
                                <div className="text-2xl font-black text-purple-800 mt-1">{previewData.filter(r=>r._status==='internal_conflict').length}</div>
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
                            <div className="bg-purple-50/50 px-5 py-2.5 rounded-lg border border-purple-200 text-center min-w-[120px] cursor-help" title="Excel 內發現有重複的 Email指向同一個人">
                                <div className="text-xs text-purple-700 font-bold flex items-center justify-center gap-1"><span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>內部衝突</div>
                                <div className="text-2xl font-black text-purple-800 mt-1">{previewData.filter(r=>r._status==='internal_conflict').length}</div>
                            </div>
                        </div>
                    )}
                    
                    <div className="flex items-center gap-3">
                        <button onClick={() => setStep(2)} className="px-5 py-2.5 rounded-xl font-medium text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-colors">返回修改設定</button>
                        
                        {/* 🌟 非阻塞式匯入：只要有正常的就能按 */}
                        <button 
                            onClick={handleExecute} 
                            disabled={processing || (mode === 'patch' ? previewData.filter(r=>['perfect','resolved'].includes(r._status)).length === 0 : previewData.filter(r=>r._status === 'valid').length === 0)} 
                            className="px-8 py-2.5 rounded-xl font-bold text-white shadow-md flex items-center gap-2 disabled:opacity-50 bg-slate-800 hover:bg-slate-700 transition-transform active:scale-95"
                        >
                            {processing ? <><Loader2 className="animate-spin" size={18}/> 系統處理中...</> : <><Save size={18}/> 確認無誤，執行匯入 (異常自動暫存)</>}
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
                                <option value="error">🔴 僅顯示異常/衝突/需確認名單</option>
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
                                    <th className="px-6 py-4 bg-white/95 backdrop-blur text-slate-800">生理性別</th>
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
                                        row._status === 'internal_conflict' ? 'bg-purple-50/70 border-l-4 border-l-purple-500' :
                                        (mode === 'patch' 
                                            ? (row._status === 'duplicate' ? 'bg-amber-50/50' : row._status === 'not_found' ? 'opacity-50' : 'hover:bg-slate-50')
                                            : (row._status === 'invalid' ? 'bg-red-50/50' : 'hover:bg-slate-50'))
                                    }>
                                        <td className="px-6 py-3">
                                            {row._status === 'valid' && <span className="text-green-600 font-bold flex items-center gap-1.5"><CheckCircle size={14}/>資料完整</span>}
                                            {row._status === 'invalid' && <span className="text-red-600 font-bold flex items-center gap-1.5"><XCircle size={14}/>{row._error}</span>}
                                            {row._status === 'perfect' && <span className="text-green-600 font-bold flex items-center gap-1.5"><CheckCircle size={14}/>準備更新</span>}
                                            {row._status === 'resolved' && <span className="text-blue-600 font-bold flex items-center gap-1.5"><UserCheck size={14}/>已手動指定</span>}
                                            {row._status === 'not_found' && <span className="text-slate-400 font-medium flex items-center gap-1.5"><XCircle size={14}/>查無此人(略過)</span>}
                                            
                                            {row._status === 'internal_conflict' && (
                                                <button onClick={() => handleOpenConflictModal(row)} className="text-xs font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-purple-700 transition-colors flex items-center gap-1.5 animate-pulse">
                                                    <GitMerge size={14}/> 👀 進行比對與合體
                                                </button>
                                            )}

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
                                        <td className={`px-6 py-3 font-bold ${row._status === 'internal_conflict' ? 'text-purple-700' : 'text-slate-800'}`}>{row.full_name || '-'}</td>
                                        <td className="px-6 py-3">
                                            {row.gender ? (
                                                <span className={`px-2 py-0.5 rounded text-xs font-bold ${row.gender === '男' ? 'bg-blue-100 text-blue-700' : 'bg-pink-100 text-pink-700'}`}>
                                                    {row.gender}
                                                    {row._gender_deduced && <span title="由身分證自動判定" className="ml-1 cursor-help opacity-70">🤖</span>}
                                                </span>
                                            ) : '-'}
                                        </td>
                                        <td className="px-6 py-3 text-slate-600">{row.contact_email || '-'}</td>
                                        <td className="px-6 py-3 text-slate-600">{row.email || '-'}</td>
                                        {mode === 'patch' && <td className={`px-6 py-3 font-bold ${row._status === 'internal_conflict' ? 'text-purple-700 bg-purple-100/50' : 'text-amber-700 bg-amber-50/30 border-l border-amber-100/50'}`}>{row._rawAnchor}</td>}
                                        {getDynamicMappedFields().map(excelCol => {
                                            // 🌟 渲染防爆機制
                                            let displayVal = row[fieldMapping[excelCol]];
                                            if (fieldMapping[excelCol] === 'extra_info' && row.extra_info) {
                                                displayVal = row.extra_info[excelCol];
                                            }
                                            if (typeof displayVal === 'object' && displayVal !== null) {
                                                displayVal = JSON.stringify(displayVal);
                                            }

                                            return (
                                            <td key={excelCol} className="px-6 py-3 text-blue-700">
                                                {row._status === 'internal_conflict' ? '待合體...' : (displayVal || '-')}
                                            </td>
                                        )})}
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
                <p className="text-slate-500 text-sm mt-1">智能時空收束 / 語意職位融合 / 自動對齊系統狀態版 V10.5</p>
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
                      {isUploadingRace ? <><Loader2 className="animate-spin" size={20}/> 系統深度解析與融合中...</> : <><Upload size={20}/> 開始執行賽事智能匯入</>}
                  </button>

                  {uploadRaceStatus === 'success' && (
                      <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-start gap-3 animate-bounce-in">
                          <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={20}/>
                          <div>
                              <h4 className="font-bold text-green-800">賽事智能建檔成功！</h4>
                              <p className="text-sm text-green-600 mt-1">人員資料已去重、清洗後綴，並完美融合於系統，您可至「賽事任務總覽」查看精準數據。</p>
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
                      <span className="font-bold text-amber-600 block mb-1 flex items-center gap-1"><AlertTriangle size={14}/> 類神經網絡整合說明：</span>
                      <ul className="list-disc pl-4 space-y-1 text-slate-700 mt-2">
                          <li><span className="font-bold text-blue-600">時空解析：</span>遇到 `2025/1/1-2025/1/8` 等區間格式，系統將自動收束為首日標準日期。</li>
                          <li><span className="font-bold text-purple-600">後綴智能剖析：</span>遇到 `蔡智豪21K`, `董珮珊da1`，系統自動拆除後綴，並將其自動分派至 `21K`, `Day 1` 等對應梯次。</li>
                          <li><span className="font-bold text-red-600">職務融合去重：</span>同時出現在「教官欄」與「人員欄」的成員，系統會自動融為一筆，並保留其專業教官身分（絕不重複計算名額）。</li>
                      </ul>
                  </div>
              </div>
          </div>
      </div>
      )}

      {/* ========================================= */}
      {/* 🌟 內部資料衝突：比對與合體 Modal (二階段確認進化版) */}
      {/* ========================================= */}
      {conflictModalData && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fade-in" onClick={() => {}}>
            <div className="bg-white rounded-[2rem] w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden shadow-2xl animate-bounce-in" onClick={e => e.stopPropagation()}>
                
                {/* Modal Header */}
                <div className="p-6 border-b border-purple-100 flex justify-between items-center bg-purple-50 shrink-0">
                    <div className="flex flex-col">
                        <h3 className="text-xl font-black text-purple-800 flex items-center gap-2">
                            <GitMerge className="text-purple-600" size={24}/> 內部資料衝突：比對與合體
                            {conflictStep === 'preview' && <span className="text-xs bg-purple-600 text-white px-2.5 py-1 rounded-full font-bold ml-2 animate-pulse shadow-sm">最終確認階段</span>}
                        </h3>
                        <p className="text-sm text-purple-600 font-medium mt-1.5 flex items-center gap-1.5">
                            <AlertTriangle size={14}/> 系統發現 <span className="font-black px-1.5 py-0.5 bg-purple-200 rounded">{conflictModalData._conflictRows.length}</span> 筆資料存在分歧，請確認最終合體結果。
                        </p>
                    </div>
                    {conflictStep === 'edit' && <button onClick={() => setConflictModalData(null)} className="text-slate-400 hover:bg-white rounded-full p-2 transition-colors"><X size={24}/></button>}
                </div>

                {/* Modal Body: 智慧高亮差異表格 */}
                <div className="p-6 overflow-y-auto bg-slate-50 flex-1 custom-scrollbar">
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                        <table className="w-full text-sm text-left whitespace-nowrap">
                            <thead className="bg-slate-800 text-white font-black">
                                <tr>
                                    <th className="px-5 py-4 border-r border-slate-700 bg-slate-900 sticky left-0 z-20 w-48">資料欄位</th>
                                    {conflictModalData._conflictRows.map((r, i) => (
                                        <th key={i} className="px-5 py-4 border-r border-slate-700">來源資料 {i + 1}</th>
                                    ))}
                                    <th className={`px-5 py-4 min-w-[250px] transition-colors ${conflictStep === 'preview' ? 'bg-purple-700' : 'bg-purple-600'}`}>
                                        ✨ 最終合體結果 {conflictStep === 'preview' ? '(確認預覽)' : '(可手動修改)'}
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {[...new Set(Object.values(fieldMapping).filter(f=>f))].map(fieldKey => {
                                    const fieldLabel = FLAT_TARGETS.find(t => t.key === fieldKey)?.label || fieldKey;
                                    
                                    // 🌟 異常偵測邏輯：判斷來源資料是否有差異
                                    const sourceValues = conflictModalData._conflictRows.map(r => {
                                        const v = mode === 'patch' ? r._updateData[fieldKey] : r[fieldKey];
                                        if (fieldKey === 'extra_info' && r.extra_info) return JSON.stringify(r.extra_info[fieldKey] || '');
                                        if (typeof v === 'object' && v !== null) return JSON.stringify(v);
                                        return v ? String(v).trim() : '';
                                    });
                                    const uniqueSourceValues = [...new Set(sourceValues.filter(v => v !== ''))];
                                    const hasAnomaly = uniqueSourceValues.length > 1;

                                    let finalVal = mergedData[fieldKey];
                                    if (typeof finalVal === 'object' && finalVal !== null) finalVal = JSON.stringify(finalVal);
                                    
                                    return (
                                        <tr key={fieldKey} className={`transition-colors ${hasAnomaly ? 'bg-rose-50/40 hover:bg-rose-50/80' : 'hover:bg-slate-50'}`}>
                                            <td className={`px-5 py-3 font-black border-r border-slate-200 sticky left-0 z-10 shadow-[2px_0_5px_rgba(0,0,0,0.02)] ${hasAnomaly ? 'text-rose-700 bg-rose-50' : 'text-slate-700 bg-white'}`}>
                                                <div className="flex items-center justify-between">
                                                    <span>{fieldLabel.split('(')[0]}</span>
                                                    {hasAnomaly && <AlertTriangle size={14} className="text-rose-500 animate-pulse" title="來源資料存在分歧" />}
                                                </div>
                                            </td>
                                            
                                            {/* 渲染來源資料 */}
                                            {conflictModalData._conflictRows.map((r, i) => {
                                                let val = mode === 'patch' ? r._updateData[fieldKey] : r[fieldKey];
                                                if (fieldKey === 'extra_info' && r.extra_info) val = r.extra_info[fieldKey];
                                                
                                                let displayVal = val;
                                                if (typeof val === 'object' && val !== null) {
                                                    displayVal = JSON.stringify(val);
                                                }
                                                
                                                const isDifferentFromFinal = displayVal && finalVal && String(displayVal).trim() !== String(finalVal).trim();

                                                return (
                                                    <td key={i} className={`px-5 py-3 border-r border-slate-200 ${hasAnomaly ? 'text-rose-900/70' : 'text-slate-600'}`}>
                                                        {displayVal ? (
                                                            <span className={`${conflictStep === 'preview' && isDifferentFromFinal ? 'line-through opacity-40 text-slate-400' : ''}`}>
                                                                {displayVal}
                                                            </span>
                                                        ) : (
                                                            <span className="text-slate-300 italic text-xs">空值</span>
                                                        )}
                                                    </td>
                                                )
                                            })}
                                            
                                            {/* 渲染最終結果 (編輯框 vs 預覽確認框) */}
                                            <td className={`px-3 py-2 ${conflictStep === 'preview' ? 'bg-purple-100/50' : 'bg-purple-50/30'}`}>
                                                {conflictStep === 'edit' ? (
                                                    <input 
                                                        type="text"
                                                        value={typeof mergedData[fieldKey] === 'object' && mergedData[fieldKey] !== null ? JSON.stringify(mergedData[fieldKey]) : (mergedData[fieldKey] || '')}
                                                        onChange={e => setMergedData({...mergedData, [fieldKey]: e.target.value})}
                                                        className={`w-full p-2.5 border rounded-xl outline-none focus:ring-2 focus:ring-purple-500 font-bold text-purple-800 bg-white shadow-sm transition-all focus:border-purple-500 ${hasAnomaly ? 'border-rose-300 ring-2 ring-rose-500/20' : 'border-purple-200'}`}
                                                        placeholder="最終空值"
                                                    />
                                                ) : (
                                                    <div className="w-full p-2.5 border border-purple-300 rounded-xl bg-white font-black text-purple-900 shadow-inner flex items-center gap-2 overflow-hidden">
                                                        <CheckCircle size={16} className="text-purple-500 shrink-0"/>
                                                        <span className="truncate">{finalVal || <span className="text-purple-300 italic text-xs font-medium">最終空值</span>}</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Modal Footer: 二階段確認按鈕 */}
                <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3 shrink-0 shadow-[0_-10px_20px_rgba(0,0,0,0.03)]">
                    {conflictStep === 'edit' ? (
                        <>
                            <button onClick={() => setConflictModalData(null)} className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors">取消合體</button>
                            <button onClick={() => setConflictStep('preview')} className="px-8 py-3 rounded-xl font-black text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-transform active:scale-95">
                                <ListOrdered size={20}/> 暫存並預覽比對結果
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setConflictStep('edit')} className="px-6 py-3 rounded-xl font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-2">
                                <Edit size={18}/> 返回修改
                            </button>
                            <button onClick={() => { setConflictStep('edit'); handleSaveConflict(); }} className="px-8 py-3 rounded-xl font-black text-white bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-600/30 flex items-center gap-2 transition-transform active:scale-95">
                                <Save size={20}/> 確認無誤，寫入合體資料
                            </button>
                        </>
                    )}
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