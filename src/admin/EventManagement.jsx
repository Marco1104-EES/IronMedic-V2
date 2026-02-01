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
  
  // 狀態鎖與防禦機制
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

  // 1. 讀取賽事 (包含鎖定狀態)
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

  // --- 黑盒子紀錄系統 (Blackbox Recorder) ---
  const logToBlackbox = async (action, details, status) => {
    const logData = {
      level: status === 'success' ? 'INFO' : 'ERROR',
      message: `[${action}] ${status === 'success' ? '成功' : '失敗'}`,
      details: JSON.stringify(details).slice(0, 500) // 截斷以節省空間
    }

    // A計畫：寫入 Supabase
    const { error } = await supabase.from('system_logs').insert([logData])
    
    // B計畫：如果斷網，寫入 LocalStorage (瀏覽器黑盒子)
    if (error) {
      console.warn('黑盒子連線失敗，啟用本地備份...');
      const localLogs = JSON.parse(localStorage.getItem('offline_logs') || '[]');
      localLogs.push({ ...logData, timestamp: new Date().toISOString() });
      localStorage.setItem('offline_logs', JSON.stringify(localLogs));
      alert('⚠️ 網路異常！操作紀錄已暫存於本機 (Local Storage)。');
    }
  }

  // --- V17.0 功能 1: 匯出大會名單 (空投補給) ---
  const handleExportOrganizer = async (event) => {
    try {
      // 記憶體壓力閥 (Pressure Valve)
      if (event.quota > 3000) {
         if(!confirm('⚠️ 警告：此賽事資料量巨大 (>3000)，產生 Excel 可能會導致瀏覽器短暫卡頓。\n建議關閉其他分頁後再繼續。')) return;
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

      // 2. 轉換 Excel
      const excelData = participants.map((p, index) => ({
        '序號': index + 1,
        '姓名': p.user_name,
        '組別': p.category,
        '性別': p.gender || '',
        '身分證': p.id_number || '', // 注意個資
        '電話': p.phone,
        'Email': p.email,
        '報名時間': new Date(p.created_at).toLocaleString(),
        '備註': ''
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "報名名單");
      
      // 3. 檔名時間戳記 (Timestamping)
      const now = new Date();
      const timeStr = `${now.getFullYear()}${(now.getMonth()+1).toString().padStart(2,'0')}${now.getDate().toString().padStart(2,'0')}_${now.getHours()}${now.getMinutes()}`;
      const fileName = `${event.name}_大會名單_${timeStr}.xlsx`;
      
      XLSX.writeFile(workbook, fileName);

      // 4. 記錄黑盒子
      logToBlackbox('EXPORT_EXCEL', { event: event.name, count: participants.length }, 'success');

      // 5. 喚醒郵件軟體
      const subject = encodeURIComponent(`【名單提交】${event.name} 報名資料 (${timeStr})`);
      const body = encodeURIComponent(`大會您好，\n\n附件為本次 ${event.name} 的報名名單 (共 ${participants.length} 人)。\n\n請查收。\n\n系統自動生成`);
      
      setTimeout(() => {
        window.location.href = `mailto:?subject=${subject}&body=${body}`;
        alert(`✅ Excel 已下載至您的電腦！\n\n👉 請注意：由於瀏覽器安全限制，\n請「手動」將下載的檔案 (${fileName}) 拖曳到剛剛開啟的郵件中。`);
      }, 800);

    } catch (e) {
      logToBlackbox('EXPORT_EXCEL', { error: e.message }, 'error');
      alert('匯出失敗: ' + e.message);
    }
  }

  // --- V17.0 功能 2: 回填舊表單 (馬里亞納級同步) ---
  const handleSyncLegacy = async (event) => {
    // 1. 檢查全球鎖 (Global Mutex Lock)
    if (event.is_syncing) {
      alert('🔒 系統鎖定中：目前有其他指揮官正在同步此賽事，請稍後再試。');
      return;
    }

    const confirmSync = window.confirm(`⚠️ 注意：即將執行「舊表單回填」！\n\n賽事：${event.name}\n目標：舊 Google Sheet (Row Auto-Detect)\n\n這將會覆蓋該賽事列後方 (AA欄) 的資料。確定執行？`)
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
      // 這裡會自動執行：戰前磨刀(Token) -> 偵查(座標) -> 清洗(UserEntered)
      const resultMsg = await syncLegacyFormat(event.name, participants);
      
      // 5. 記錄黑盒子
      logToBlackbox('SYNC_LEGACY', { event: event.name, msg: resultMsg }, 'success');
      alert(`✅ 同步成功！\n${resultMsg}`);

    } catch (e) {
      console.error(e);
      logToBlackbox('SYNC_LEGACY', { error: e.message }, 'error');
      alert('❌ 同步失敗: ' + e.message + '\n\n建議：請檢查舊表單 A 欄是否有該賽事名稱，或網路連線狀態。');
    } finally {
      // 6. 無論成功失敗，必定解鎖 (Unlock)
      await supabase.from('events').update({ is_syncing: false }).eq('id', event.id);
      setSyncingId(null);
      fetchEvents(); // 重新整理列表以更新鎖頭狀態
    }
  }

  // ... (保留原本的 CRUD 邏輯) ...
  const handleAddCategory = () => setCategories([...categories, { name: '', quota: 50, type: 'Individual' }])
  const handleRemoveCategory = (index) => { if(categories.length > 1) { const n=[...categories]; n.splice(index,1); setCategories(n); } }
  const handleCategoryChange = (index, field, value) => { const n=[...categories]; n[index][field]=value; setCategories(n); }

  const handleEdit = (event) => {
    setIsEditing(true)
    setEditId(event.id)
    setFormData({ name: event.name || event.title, date: event.date, location: event.location, status: event.status, image: event.image || '' })
    // 解析組別 (簡易版)
    let parsedCats = [{ name: '一般組', quota: 100, type: 'Individual' }]
    // ... 若有詳細解析邏輯請貼回 ...
    setShowModal(true)
  }

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!formData.name || !formData.date) { alert('請填寫賽事名稱與日期'); return }
    setIsSubmitting(true)
    
    // 簡易儲存邏輯 (請依需求補完)
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
    if (!window.confirm('確定刪除？')) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) setEvents(events.filter(e => e.id !== id))
  }

  const openNew = () => { setIsEditing(false); setFormData(initialForm); setCategories([{ name: '全馬組 42K', quota: 100, type: 'Individual' }]); setShowModal(true); }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center">
            <Calendar className="mr-3 text-blue-600" /> 賽事作戰中心 (Operations)
          </h2>
          <p className="text-gray-500 text-sm mt-1">管理賽事、空投名單 (Excel)、同步舊系統 (Legacy)</p>
        </div>
        <button onClick={openNew} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-md transition-transform active:scale-95">
          <Plus size={18} className="mr-2"/> 新增賽事
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-white font-bold border-b">
            <tr>
              <th className="p-4 w-32">日期</th>
              <th className="p-4">賽事名稱</th>
              <th className="p-4 w-24">狀態</th>
              <th className="p-4 w-24 text-right">名額</th>
              <th className="p-4 text-center">後勤支援 (Logistics)</th>
              <th className="p-4 text-center w-24">編輯</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-blue-50 transition-colors group">
                <td className="p-4 font-mono text-blue-600 font-bold">{event.date}</td>
                <td className="p-4 font-bold text-gray-800 text-base">
                    {event.name || event.title}
                    {event.is_syncing && <span className="ml-2 text-xs text-red-500 font-bold animate-pulse">(同步中...)</span>}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${event.status==='open'?'bg-red-100 text-red-600':'bg-gray-100 text-gray-500'}`}>
                    {event.status==='open'?'報名中':event.status}
                  </span>
                </td>
                <td className="p-4 text-right font-mono font-bold">{event.quota}</td>
                
                {/* ✨ V17.0 戰術按鈕區 ✨ */}
                <td className="p-4 text-center">
                  <div className="flex justify-center gap-2">
                    {/* 1. 給大會 (Excel) */}
                    <button 
                      onClick={() => handleExportOrganizer(event)}
                      className="flex items-center px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-bold hover:bg-green-100 transition-colors"
                      title="下載 Excel 並發信"
                    >
                      <Mail size={14} className="mr-1.5"/> 給大會
                    </button>

                    {/* 2. 舊表單同步 (含全球鎖) */}
                    <button 
                      onClick={() => handleSyncLegacy(event)}
                      disabled={syncingId === event.id || event.is_syncing}
                      className={`flex items-center px-3 py-1.5 border rounded text-xs font-bold transition-colors
                        ${event.is_syncing 
                            ? 'bg-red-50 text-red-600 border-red-200 cursor-not-allowed' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}
                      `}
                      title={event.is_syncing ? "系統鎖定中 (Mutex Lock)" : "轉置名單到舊表單"}
                    >
                      {syncingId === event.id || event.is_syncing ? <Loader2 size={14} className="animate-spin mr-1.5"/> : <RefreshCw size={14} className="mr-1.5"/>}
                      {event.is_syncing ? '鎖定中' : '舊表單'}
                    </button>
                  </div>
                </td>

                <td className="p-4 text-center text-gray-400">
                  <button onClick={() => handleEdit(event)} className="hover:text-blue-600 mr-2"><Edit size={16}/></button>
                  <button onClick={() => handleDelete(event.id)} className="hover:text-red-600"><Trash2 size={16}/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* 簡易 Modal (示意用) */}
      {showModal && (
         <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-xl w-96">
                <h3 className="font-bold text-lg mb-4">編輯賽事 (簡易版)</h3>
                <input className="w-full border p-2 mb-2 rounded" placeholder="名稱" value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})}/>
                <input className="w-full border p-2 mb-4 rounded" type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})}/>
                <div className="flex gap-2">
                    <button onClick={handleSave} className="flex-1 bg-blue-600 text-white py-2 rounded font-bold">儲存</button>
                    <button onClick={() => setShowModal(false)} className="flex-1 bg-gray-200 py-2 rounded font-bold">取消</button>
                </div>
            </div>
         </div>
      )}
    </div>
  )
}