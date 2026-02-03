import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Plus, Trash2, Edit, X, Calendar, MapPin, Layers, Loader2, 
  FileSpreadsheet, Mail, RefreshCw, CheckCircle, FileOutput, 
  ShieldAlert, Lock, HardDrive 
} from 'lucide-react'
import * as XLSX from 'xlsx' // 🟢 請確認 npm install xlsx
import { syncLegacyFormat } from '../api/googleSheets' 

export default function EventManagement() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editId, setEditId] = useState(null)
  
  // 狀態鎖與安全機制
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [syncingId, setSyncingId] = useState(null) 
  
  // 組別設定
  const [categories, setCategories] = useState([
    { name: '全馬組 42K', quota: 100, type: 'Individual' }
  ])

  const initialForm = {
    name: '', date: '', location: '', status: 'open', image: ''
  }
  const [formData, setFormData] = useState(initialForm)
  const totalQuota = categories.reduce((sum, cat) => sum + (parseInt(cat.quota) || 0), 0)

  useEffect(() => { fetchEvents() }, [])

  // 1. 讀取賽事
  const fetchEvents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true })
      if (error) throw error
      setEvents(data || [])
    } catch (error) { console.error('讀取失敗:', error) } finally { setLoading(false) }
  }

  // --- 系統操作日誌 (Operation Logger) ---
  const logOperation = async (action, details, status) => {
    const logData = {
      level: status === 'success' ? 'INFO' : 'ERROR',
      message: `[${action}] ${status === 'success' ? '成功' : '失敗'}`,
      details: JSON.stringify(details).slice(0, 500) // 截斷以節省空間
    }

    // 方案 A：寫入雲端資料庫
    const { error } = await supabase.from('system_logs').insert([logData])
    
    // 方案 B：離線備援 (Local Storage)
    if (error) {
      console.warn('日誌連線失敗，啟用本地暫存...');
      const localLogs = JSON.parse(localStorage.getItem('offline_logs') || '[]');
      localLogs.push({ ...logData, timestamp: new Date().toISOString() });
      localStorage.setItem('offline_logs', JSON.stringify(localLogs));
      alert('⚠️ 網路連線異常！操作紀錄已暫存於本機。');
    }
  }

  // --- 功能 1: 匯出大會名單 (Export Excel) ---
  const handleExportOrganizer = async (event) => {
    try {
      // 記憶體保護機制 (Memory Protection)
      if (event.quota > 3000) {
         if(!confirm('⚠️ 系統提示：此賽事資料量較大 (>3000)，產生 Excel 可能會導致瀏覽器短暫回應緩慢。\n建議關閉其他分頁後再繼續。')) return;
      }

      // 1. 抓取資料
      const { data: participants, error } = await supabase
        .from('registrations')
        .select('*')
        .eq('event_id', event.id)
        .order('category')
      
      if (error) throw error;
      if (!participants || participants.length === 0) {
        alert('此賽事尚無人報名，無法匯出。');
        return;
      }

      // 2. 轉換 Excel 格式
      const excelData = participants.map((p, index) => ({
        '序號': index + 1,
        '姓名': p.user_name,
        '組別': p.category,
        '性別': p.gender || '',
        '身分證': p.id_number || '', // 注意個資隱私
        '電話': p.phone,
        'Email': p.email,
        '報名時間': new Date(p.created_at).toLocaleString(),
        '備註': ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "報名名單");
      
      // 3. 檔名時間戳記
      const now = new Date();
      const timeStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours()}${now.getMinutes()}`;
      const fileName = `${event.name}_大會名單_${timeStr}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);

      // 4. 寫入日誌
      logOperation('EXPORT_EXCEL', { event: event.name, count: participants.length }, 'success');

      // 5. 喚醒郵件軟體
      const subject = encodeURIComponent(`【名單提交】${event.name} 報名資料 (${timeStr})`);
      const body = encodeURIComponent(`大會您好，\n\n附件為本次 ${event.name} 的報名名單 (共 ${participants.length} 人)。\n\n請查收。\n\n系統自動生成`);
      
      setTimeout(() => {
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        alert(`✅ Excel 已下載完成！\n\n👉 提示：由於瀏覽器安全限制，\n請「手動」將下載的檔案 (${fileName}) 附加至剛剛開啟的郵件中。`);
      }, 800);

    } catch (e) {
      logOperation('EXPORT_EXCEL', { error: e.message }, 'error');
      alert('匯出失敗: ' + e.message);
    }
  }

  // --- 功能 2: 回填舊表單 (Legacy Sync) ---
  const handleSyncLegacy = async (event) => {
    // 1. 檢查系統鎖定狀態 (System Lock Check)
    if (event.is_syncing) {
      alert('🔒 系統作業中：目前有其他管理員正在同步此賽事，請稍後再試。');
      return;
    }

    const confirmSync = window.confirm(`⚠️ 確認執行「舊表單資料同步」？\n\n賽事：${event.name}\n目標：Google Sheets (自動偵測列數)\n\n此操作將覆蓋目標欄位資料。確定執行？`)
    if (!confirmSync) return;

    setSyncingId(event.id); 

    try {
      // 2. 上鎖 (Lock)
      await supabase.from('events').update({ is_syncing: true }).eq('id', event.id);
      
      // 3. 抓取資料
      const { data: participants, error } = await supabase
        .from('registrations')
        .select('user_name, category')
        .eq('event_id', event.id)
      
      if (error) throw error;

      // 4. 執行同步 (API Call)
      const resultMsg = await syncLegacyFormat(event.name, participants);
      
      // 5. 寫入日誌
      logOperation('SYNC_LEGACY', { event: event.name, msg: resultMsg }, 'success');
      alert(`✅ 同步成功！\n${resultMsg}`);

    } catch (e) {
      console.error(e);
      logOperation('SYNC_LEGACY', { error: e.message }, 'error');
      alert('❌ 同步失敗: ' + e.message + '\n\n建議：請檢查 Google Sheet 賽事名稱欄位，或確認網路連線。');
    } finally {
      // 6. 解鎖 (Unlock)
      await supabase.from('events').update({ is_syncing: false }).eq('id', event.id);
      setSyncingId(null);
      fetchEvents(); // 重新整理列表以更新狀態
    }
  }

  const handleAddCategory = () => setCategories([...categories, { name: '', quota: 50, type: 'Individual' }])
  const handleRemoveCategory = (index) => { if(categories.length > 1) { const n=[...categories]; n.splice(index,1); setCategories(n); } }
  const handleCategoryChange = (index, field, value) => { const n=[...categories]; n[index][field]=value; setCategories(n); }

  const handleEdit = (event) => {
    setIsEditing(true)
    setEditId(event.id)
    setFormData({ name: event.name || event.title, date: event.date, location: event.location, status: event.status, image: event.image || '' })
    // 解析組別 (簡易版)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!formData.name || !formData.date) { alert('請填寫賽事名稱與日期'); return }
    setIsSubmitting(true)
    
    // 簡易儲存邏輯
    const payload = { ...formData, quota: totalQuota, category: categories.map(c=>`${c.name}`).join(',') }
    
    try {
        if (isEditing) await supabase.from('events').update(payload).eq('id', editId)
        else await supabase.from('events').insert([payload])
        alert('儲存成功')
        fetchEvents()
        setShowModal(false)
    } catch(e) { alert(e.message) }
    finally { setIsSubmitting(false) }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('確定刪除此賽事？')) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) setEvents(events.filter(e => e.id !== id))
  }

  const openNew = () => { setIsEditing(false); setFormData(initialForm); setCategories([{ name: '全馬組 42K', quota: 100, type: 'Individual' }]); setShowModal(true); }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div>
          {/* 修正：賽事管理系統 */}
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <Calendar className="mr-3 text-blue-600" /> 賽事管理系統
          </h2>
          {/* 修正：副標題 */}
          <p className="text-slate-500 text-sm mt-1 font-mono">管理賽事、匯出名單 (Excel)、資料同步作業</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg shadow-blue-600/20 transition-transform active:scale-95">
          <Plus size={18} className="mr-2"/> 新增賽事
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-4 w-32">日期</th>
                <th className="p-4">賽事名稱</th>
                <th className="p-4 w-24">狀態</th>
                <th className="p-4 w-24 text-right">名額</th>
                {/* 修正：資料匯出 */}
                <th className="p-4 text-center">資料匯出 (Export)</th>
                <th className="p-4 text-center w-24">編輯</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {events.map((event) => (
                <tr key={event.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="p-4 font-mono text-blue-600 font-bold">{event.date}</td>
                  <td className="p-4 font-bold text-slate-700 text-base">
                    {event.name || event.title}
                    {event.is_syncing && <span className="ml-2 text-xs text-red-500 font-bold animate-pulse">(同步中...)</span>}
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${event.status==='open'?'bg-green-100 text-green-600':'bg-slate-100 text-slate-500'}`}>
                      {event.status==='open'?'報名中':event.status}
                    </span>
                  </td>
                  <td className="p-4 text-right font-mono font-bold">{event.quota}</td>
                  
                  {/* ✨ 操作按鈕區 ✨ */}
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-2">
                      {/* 1. 給大會 (Excel) */}
                      <button 
                        onClick={() => handleExportOrganizer(event)}
                        className="flex items-center px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg text-xs font-bold hover:bg-green-100 transition-colors"
                        title="下載 Excel 並發信"
                      >
                        <Mail size={14} className="mr-1.5"/> 給大會
                      </button>

                      {/* 2. 舊表單同步 */}
                      <button 
                        onClick={() => handleSyncLegacy(event)}
                        disabled={syncingId === event.id || event.is_syncing}
                        className={`flex items-center px-3 py-1.5 border rounded-lg text-xs font-bold transition-colors
                          ${event.is_syncing 
                              ? 'bg-red-50 text-red-600 border-red-200 cursor-not-allowed' 
                              : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}
                        `}
                        title={event.is_syncing ? "系統鎖定中" : "同步資料至 Google Sheets"}
                      >
                        {syncingId === event.id || event.is_syncing ? <Loader2 size={14} className="animate-spin mr-1.5"/> : <RefreshCw size={14} className="mr-1.5"/>}
                        {event.is_syncing ? '鎖定中' : '舊表單'}
                      </button>
                    </div>
                  </td>

                  <td className="p-4 text-center text-slate-400">
                    <div className="flex justify-center gap-2">
                        <button onClick={() => handleEdit(event)} className="hover:text-blue-600"><Edit size={16}/></button>
                        <button onClick={() => handleDelete(event.id)} className="hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
              ))}
              {events.length === 0 && !loading && (
                 <tr><td colSpan="6" className="p-10 text-center text-slate-400">尚無賽事資料</td></tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Modal */}
        {showModal && (
           <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white p-6 rounded-xl w-96 shadow-2xl animate-scale-in">
                  <h3 className="font-bold text-lg mb-4 text-slate-800">編輯賽事</h3>
                  <input className="w-full border border-slate-300 p-2 mb-2 rounded-lg" placeholder="名稱" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})}/>
                  <input className="w-full border border-slate-300 p-2 mb-4 rounded-lg" type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})}/>
                  <div className="flex gap-2">
                      <button onClick={handleSave} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-bold transition-colors">儲存</button>
                      <button onClick={() => setShowModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-lg font-bold transition-colors">取消</button>
                  </div>
              </div>
           </div>
        )}
      </div>
    </div>
  )
}