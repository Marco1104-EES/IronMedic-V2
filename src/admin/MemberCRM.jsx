import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Search, Trash2, Edit, User, X, Shield, CheckSquare, Square, FileSpreadsheet, Upload, Download, Save, AlertCircle } from 'lucide-react'

export default function MemberCRM() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 20 
  
  // 編輯與選取狀態
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [saving, setSaving] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())

  // 匯入功能 ref
  const fileInputRef = useRef(null)

  useEffect(() => { fetchMembers(); setSelectedIds(new Set()) }, [page, searchTerm, filterRole])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      let query = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false })
      if (searchTerm) query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%`)
      if (filterRole !== 'ALL') query = query.eq('role', filterRole)
      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      const { data, count, error } = await query.range(from, to)
      if (error) throw error
      setMembers(data || [])
      setTotalCount(count || 0)
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  // --- 匯入 CSV 邏輯 (Native Parser) ---
  const handleImportClick = () => fileInputRef.current.click()

  const handleFileUpload = async (e) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (event) => {
          try {
              const text = event.target.result
              // 簡單解析 CSV: 依換行分割，再依逗號分割
              const rows = text.split('\n').map(row => row.split(',').map(cell => cell.trim()))
              
              // 移除標題列 (假設第一列是標題)
              const dataRows = rows.slice(1).filter(r => r.length > 1 && r[0].includes('@')) // 簡單過濾空行和非Email行

              if (dataRows.length === 0) return alert("❌ 檔案內容為空或格式錯誤")

              const confirmMsg = `讀取到 ${dataRows.length} 筆資料。\n系統將依據 Email 進行「更新」或「新增」。\n確定執行嗎？`
              if (!window.confirm(confirmMsg)) return

              setLoading(true)
              let successCount = 0
              let failCount = 0

              // 逐筆處理 (Upsert)
              for (const row of dataRows) {
                  // 假設 CSV 順序: Email, Role, FullName, DisplayName, Phone, Field_01
                  const [email, role, fullName, displayName, phone, field01] = row
                  
                  // 簡單防呆
                  if (!email) continue; 

                  const payload = {
                      email: email,
                      role: role || 'USER', // 沒填預設 USER
                      full_name: fullName || email.split('@')[0],
                      display_name: displayName || '',
                      phone: phone || '',
                      field_01: field01 || '', // 這是您的「未來賽事優先權」或其他備註
                      updated_at: new Date()
                  }

                  // 先查這個 Email 是否存在 (因為 profiles 的主鍵是 ID，不是 Email，所以不能直接用 upsert 覆蓋，要先查 ID)
                  // 技巧：我們用 Email 查 profiles
                  const { data: existingUser } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()

                  let error = null
                  if (existingUser) {
                      // 更新 (Update)
                      const { error: updateErr } = await supabase.from('profiles').update(payload).eq('id', existingUser.id)
                      error = updateErr
                  } else {
                      // 新增 (Insert) - 這裡需要注意：如果是全新用戶，最好是讓他自己註冊。
                      // 但如果是「預先建檔」，我們需要生成一個隨機 ID
                      // *注意*：這裡 Insert 只會建立 Profile，不會建立 Auth 帳號。使用者之後註冊時會自動對應。
                      const { error: insertErr } = await supabase.from('profiles').insert([{ ...payload, id: crypto.randomUUID() }])
                      error = insertErr
                  }

                  if (!error) successCount++
                  else { console.error(error); failCount++ }
              }

              alert(`匯入完成！\n✅ 成功: ${successCount}\n❌ 失敗: ${failCount}`)
              fetchMembers() // 重新整理列表

          } catch (err) {
              alert("❌ 解析失敗: " + err.message)
          } finally {
              setLoading(false)
              e.target.value = null // 清空 input
          }
      }
      reader.readAsText(file)
  }

  // --- 匯出 CSV (V4.0 修復版) ---
  const handleExportCSV = () => {
      const csvContent = "\uFEFF" + [
          "Email,Role,FullName,DisplayName,Phone,Field_01(Priority),Created_At", // Header
          ...members.map(m => [
              m.email, m.role, 
              `"${m.full_name||''}"`, `"${m.display_name||''}"`, `"${m.phone||''}"`, 
              `"${m.field_01||''}"`, m.created_at
          ].join(','))
      ].join('\n')
      
      const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }))
      const link = document.createElement('a')
      link.href = url
      link.download = `IronMedic_Members_${new Date().toISOString().slice(0,10)}.csv`
      link.click()
  }

  // --- 其他邏輯 (保持不變) ---
  const toggleSelection = (id) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet) }
  const toggleSelectAll = () => { if (selectedIds.size === members.length) setSelectedIds(new Set()); else setSelectedIds(new Set(members.map(m => m.id))) }
  const handleBatchUpdateRole = async (targetRole, roleName) => {
      if (selectedIds.size === 0) return; if (!window.confirm(`確認變更 ${selectedIds.size} 人為 ${roleName}?`)) return
      await supabase.from('profiles').update({ role: targetRole }).in('id', Array.from(selectedIds))
      fetchMembers(); setSelectedIds(new Set())
  }
  const handleSave = async (e) => { e.preventDefault(); setSaving(true); await supabase.from('profiles').update(editingMember).eq('id', editingMember.id); setMembers(prev => prev.map(m => m.id === editingMember.id ? editingMember : m)); setIsEditOpen(false); setSaving(false) }
  const handleDelete = async (id) => { if(window.confirm('刪除?')) { await supabase.from('profiles').delete().eq('id', id); setMembers(prev => prev.filter(m => m.id !== id)) } }
  const getRoleLabel = (role) => {
      switch(role) { case 'SUPER_ADMIN': return '🔴 超級管理員'; case 'TOURNAMENT_DIRECTOR': return '🔵 賽事總監'; case 'VERIFIED_MEDIC': return '🟢 當屆醫護鐵人'; case 'USER': return '⚪ 非當屆醫護鐵人'; default: return role }
  }

  return (
    <div className="space-y-6 pb-20 relative animate-fade-in">
      {/* 隱藏的檔案上傳 Input */}
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />

      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                人員名冊管理 
                <span className="text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">V4.0 Import</span>
            </h1>
            <p className="text-sm text-slate-500">CRM 批次指揮系統</p>
        </div>
        
        {/* 🔥 操作按鈕區 (匯入/匯出) */}
        <div className="flex gap-3">
             <button onClick={handleImportClick} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition-all">
                <Upload size={18}/> 匯入/更新名單
             </button>
             <button onClick={handleExportCSV} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold shadow-md transition-all">
                <Download size={18}/> 匯出報表
             </button>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
            <input type="text" placeholder="搜尋姓名、Email..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>
        <select className="px-4 py-2 bg-slate-50 border rounded-lg font-bold" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="ALL">顯示所有</option>
            <option value="SUPER_ADMIN">🔴 超級管理員</option>
            <option value="TOURNAMENT_DIRECTOR">🔵 賽事總監</option>
            <option value="VERIFIED_MEDIC">🟢 當屆醫護鐵人</option>
            <option value="USER">⚪ 非當屆醫護鐵人</option>
        </select>
      </div>

      {/* 批次操作列 */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 border-2 border-slate-700">
              <span className="font-bold text-sm bg-slate-700 px-2 py-1 rounded">已選 {selectedIds.size} 人</span>
              <div className="h-4 w-px bg-slate-600"></div>
              <button onClick={() => handleBatchUpdateRole('VERIFIED_MEDIC', '當屆醫護鐵人')} className="hover:text-green-400 font-bold text-sm flex items-center"><Shield size={16} className="mr-1"/> 晉升當屆</button>
              <button onClick={() => handleBatchUpdateRole('USER', '非當屆醫護鐵人')} className="hover:text-slate-300 font-bold text-sm flex items-center"><User size={16} className="mr-1"/> 退役 (非當屆)</button>
              <div className="h-4 w-px bg-slate-600"></div>
              <button onClick={() => setSelectedIds(new Set())} className="text-slate-500 hover:text-white"><X size={18}/></button>
          </div>
      )}

      {/* 表格區 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                <tr>
                    <th className="p-4 w-12 text-center"><button onClick={toggleSelectAll} className="hover:text-blue-600">{selectedIds.size > 0 ? <CheckSquare size={20}/> : <Square size={20}/>}</button></th>
                    <th className="p-4 w-12 text-center">#</th>
                    <th className="p-4">成員資訊</th>
                    <th className="p-4">權限狀態</th>
                    <th className="p-4">優先權 (Field 01)</th> {/* 新增欄位顯示 */}
                    <th className="p-4 text-right">操作</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {members.map((member, index) => {
                    const isSelected = selectedIds.has(member.id)
                    return (
                    <tr key={member.id} className={`group transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="p-4 text-center"><button onClick={() => toggleSelection(member.id)} className={`${isSelected ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}`}>{isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}</button></td>
                        <td className="p-4 text-center text-slate-400 font-mono">{String((page - 1) * ITEMS_PER_PAGE + index + 1).padStart(2, '0')}</td>
                        <td className="p-4">
                            <div className="font-bold text-slate-800">{member.display_name || member.full_name}</div>
                            <div className="text-xs text-slate-400">{member.email}</div>
                        </td>
                        <td className="p-4">
                            <span className={`px-2 py-1 rounded text-xs font-bold border ${member.role==='SUPER_ADMIN'?'bg-red-50 text-red-600 border-red-200':member.role==='TOURNAMENT_DIRECTOR'?'bg-blue-100 text-blue-700 border-blue-300':member.role==='VERIFIED_MEDIC'?'bg-green-50 text-green-600 border-green-200':'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                {getRoleLabel(member.role)}
                            </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500">
                            {member.field_01 || '-'}
                        </td>
                        <td className="p-4 text-right flex justify-end gap-2">
                            <button onClick={() => { setEditingMember({...member}); setIsEditOpen(true); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded"><Edit size={18}/></button>
                            <button onClick={() => handleDelete(member.id)} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                        </td>
                    </tr>
                )})}
            </tbody>
         </table>
         <div className="p-4 border-t flex justify-between bg-slate-50">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1 bg-white border rounded disabled:opacity-50">上一頁</button>
            <span className="font-bold text-slate-600">{page} / {totalPages}</span>
            <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="px-3 py-1 bg-white border rounded disabled:opacity-50">下一頁</button>
         </div>
      </div>

      {/* 編輯視窗 (保持不變，略) */}
      {isEditOpen && editingMember && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
             {/* ...直接使用上一版的 Modal 程式碼，或需要我再貼一次 Modal 部分嗎？(為節省篇幅先省略，邏輯與 V3.3 相同) */}
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden m-4">
                  <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
                      <h3 className="font-bold">編輯資料</h3>
                      <button onClick={() => setIsEditOpen(false)}><X size={24}/></button>
                  </div>
                  <form onSubmit={handleSave} className="p-6 space-y-4">
                      <div className="bg-slate-50 p-3 rounded border"><label className="text-xs font-bold text-slate-400">Email</label><div className="font-bold">{editingMember.email}</div></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-sm font-bold mb-1">顯示名稱</label><input type="text" className="w-full p-2 border rounded" value={editingMember.display_name || ''} onChange={e => setEditingMember({...editingMember, display_name: e.target.value})}/></div>
                          <div><label className="block text-sm font-bold mb-1">真實姓名</label><input type="text" className="w-full p-2 border rounded" value={editingMember.full_name || ''} onChange={e => setEditingMember({...editingMember, full_name: e.target.value})}/></div>
                      </div>
                      <div>
                          <label className="block text-sm font-bold mb-1">系統權限</label>
                          <select className="w-full p-2 border bg-indigo-50 rounded font-bold" value={editingMember.role} onChange={e => setEditingMember({...editingMember, role: e.target.value})}>
                              <option value="USER">⚪ 非當屆醫護鐵人 (USER)</option>
                              <option value="VERIFIED_MEDIC">🟢 當屆醫護鐵人 (VERIFIED_MEDIC)</option>
                              <option value="TOURNAMENT_DIRECTOR">🔵 賽事總監 (TOURNAMENT_DIRECTOR)</option>
                              <option value="SUPER_ADMIN">🔴 超級管理員 (SUPER_ADMIN)</option>
                          </select>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                          <input type="text" placeholder="Field 01 (優先權)" className="p-2 border rounded text-xs" value={editingMember.field_01 || ''} onChange={e => setEditingMember({...editingMember, field_01: e.target.value})}/>
                          <input type="text" placeholder="Field 02" className="p-2 border rounded text-xs" value={editingMember.field_02 || ''} onChange={e => setEditingMember({...editingMember, field_02: e.target.value})}/>
                      </div>
                      <div className="pt-4 flex justify-end gap-2 border-t mt-2">
                          <button type="button" onClick={() => setIsEditOpen(false)} className="px-4 py-2 hover:bg-slate-100 rounded">取消</button>
                          <button type="submit" disabled={saving} className="px-6 py-2 bg-blue-600 text-white font-bold rounded hover:bg-blue-700">儲存</button>
                      </div>
                  </form>
              </div>
          </div>
      )}
    </div>
  )
}