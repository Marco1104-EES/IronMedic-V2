import { useState, useEffect, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { Search, Trash2, Edit, User, X, Shield, CheckSquare, Square, FileSpreadsheet, Upload, Download, Save, AlertCircle, Settings, ExternalLink, Zap, Crown, Flame, Cloud, Loader2 } from 'lucide-react'

export default function MemberCRM() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 20 
  
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [exporting, setExporting] = useState(false)
  
  // 欄位指揮官
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState({
      full_name: true, role: true, is_vip: true, priority: true, license_expiry: true, status: true
  })

  // 匯出指揮官
  const [isExportModalOpen, setIsExportModalOpen] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => { fetchMembers(); setSelectedIds(new Set()) }, [page, searchTerm, filterRole])

  const fetchMembers = async () => {
    try {
      setLoading(true)
      let query = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false })
      if (searchTerm) query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,national_id.ilike.%${searchTerm}%`)
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

  // --- 優先權計算 ---
  const getPriorityScore = (m) => {
      let score = 0
      if (m.is_vip === 'Y') score += 9999
      if (m.is_current_member === 'Y') score += 40
      if (m.training_status === 'Y') score += 30
      if (m.is_new_member === 'Y') score += 20
      if (m.is_team_leader === 'Y') score += 10
      return score
  }

  const renderPriorityIcon = (m) => {
      const score = getPriorityScore(m)
      if (score >= 9000) return <span className="flex items-center text-amber-500 font-black bg-amber-50 px-2 py-1 rounded"><Crown size={16} className="mr-1"/> VIP</span>
      if (score >= 50) return <span className="flex items-center text-red-500 font-bold bg-red-50 px-2 py-1 rounded"><Flame size={16} className="mr-1"/> 極高</span>
      if (score >= 20) return <span className="flex items-center text-blue-500 font-bold bg-blue-50 px-2 py-1 rounded"><Zap size={16} className="mr-1"/> 高</span>
      return <span className="flex items-center text-slate-400"><Cloud size={16} className="mr-1"/> 一般</span>
  }

  const renderExpiryStatus = (dateStr) => {
      if (!dateStr) return <span className="text-slate-300">-</span>
      const today = new Date()
      const expiry = new Date(dateStr)
      const diffDays = Math.ceil((expiry - today) / (1000 * 60 * 60 * 24))
      if (diffDays < 0) return <span className="text-red-500 font-bold flex items-center bg-red-50 px-2 py-1 rounded border border-red-200"><div className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse"></div>已過期</span>
      if (diffDays < 90) return <span className="text-amber-500 font-bold flex items-center bg-amber-50 px-2 py-1 rounded border border-amber-200"><div className="w-2 h-2 rounded-full bg-amber-500 mr-2"></div>即將到期</span>
      return <span className="text-green-500 font-bold flex items-center bg-green-50 px-2 py-1 rounded border border-green-200"><div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>正常</span>
  }

  // --- 匯入 CSV (略過前2列) ---
  const handleFileUpload = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = async (event) => {
          try {
              const text = event.target.result
              const allRows = text.split('\n')
              
              // ⚠️ 略過前2列 (英文Key + 中文Header)
              const dataRows = allRows.slice(2).map(row => {
                  return row.split(',').map(c => c.trim().replace(/^"|"$/g, '')) 
              })

              if (dataRows.length === 0) return alert("❌ 無有效資料列")
              setLoading(true)
              let successCount = 0
              let failCount = 0

              for (const row of dataRows) {
                  if (row.length < 24) continue;

                  // 依據您的真實 CSV 順序 (A~Y)
                  const fullName = row[0]; const birthday = row[1]; const nationalId = row[2];
                  const phone = row[3]; const contactEmail = row[4]; const address = row[5];
                  const shirtSize = row[6]; const emerName = row[7]; const emerPhone = row[8]; const emerRelation = row[9];
                  const engName = row[10]; const medLicense = row[11]; const dietary = row[12];
                  const resumeUrl = row[13]; const badges = row[14]; const role = row[15];
                  const isCurrent = row[16]; const training = row[17]; const isTeamLeader = row[18]; const isNew = row[19];
                  const licenseExp = row[20]; const shirtExp25 = row[21]; const shirtExp26 = row[22]; 
                  const isVip = row[23]; const loginEmail = row[24]; // Y欄

                  if (!loginEmail || !loginEmail.includes('@')) { failCount++; continue; }

                  const payload = {
                      email: loginEmail,
                      full_name: fullName, role: role || 'USER',
                      is_vip: isVip, is_current_member: isCurrent,
                      training_status: training, is_new_member: isNew, is_team_leader: isTeamLeader,
                      license_expiry: licenseExp, resume_url: resumeUrl,
                      shirt_size: shirtSize, birthday: birthday, phone: phone,
                      national_id: nationalId, contact_email: contactEmail, address: address,
                      emergency_name: emerName, emergency_phone: emerPhone, emergency_relation: emerRelation,
                      english_name: engName, medical_license: medLicense, dietary_habit: dietary, badges: badges,
                      shirt_expiry_25: shirtExp25, shirt_expiry_26: shirtExp26,
                      updated_at: new Date()
                  }
                  
                  const { data: existing } = await supabase.from('profiles').select('id').eq('email', loginEmail).maybeSingle()
                  if (existing) {
                      await supabase.from('profiles').update(payload).eq('id', existing.id)
                  } else {
                      await supabase.from('profiles').insert([{ ...payload, id: crypto.randomUUID() }])
                  }
                  successCount++
              }

              alert(`匯入戰報：\n✅ 成功部屬：${successCount} 員\n⚠️ 無效略過：${failCount} 員`)
              fetchMembers()
          } catch (err) { alert("匯入失敗: " + err.message) } finally { setLoading(false); e.target.value = null }
      }
      reader.readAsText(file)
  }

  // --- 🔥 完整匯出 (Full Export - 雙抬頭版) ---
  const handleExport = async (type) => {
      setExporting(true)
      try {
          const { data: allData, error } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
          if (error) throw error
          if (!allData || allData.length === 0) return alert("沒有資料可匯出")

          let headerKeys = []  // 第1列：英文 Key
          let headerNames = [] // 第2列：中文名稱
          let dataMap = (m) => []

          if (type === 'FULL') {
              // 1. 定義英文 Key (對應程式邏輯)
              headerKeys = [
                  "FullName", "Birthday", "ID", "Phone", "e-mail", "Address",
                  "size", "Emergency Contact", "Emergency Phone", "Relationship", "English Name",
                  "Medical license", "Dietary habits", "IronMrdical Resume", "Achievement Badges", "Role",
                  "Current members", "2025 Member Training", "Team leader", "New members",
                  "License validity period", "Triathlon clothing expiration period-2025", "Triathlon clothing expiration period-2026", "VIP", "WIX mail"
              ]
              // 2. 定義中文名稱 (給人類看)
              headerNames = [
                  "姓名(A)", "出生年月日(B)", "身分證字號(C)", "手機(D)", "e-mail(E)", "通訊地址(F)",
                  "賽事衣服(G)", "緊急聯繫人(H)", "緊急聯繫人電話(I)", "緊急聯繫人關係(J)", "英文名(K)",
                  "醫護證照繳交情況(L)", "飲食(M)", "醫鐵履歷網址(N)", "成就徽章(O)", "醫鐵權限(P)",
                  "當年度會員(Q)", "會員訓練(R)", "帶隊官(S)", "新人(T)",
                  "醫護證照有效期(U)", "三鐵服期限-25(V)", "三鐵服期限-26(W)", "VIP(X)", "報名系統登入(Y)"
              ]

              dataMap = (m) => [
                  m.full_name, m.birthday, m.national_id, m.phone, m.contact_email, m.address,
                  m.shirt_size, m.emergency_name, m.emergency_phone, m.emergency_relation, m.english_name,
                  m.medical_license, m.dietary_habit, m.resume_url, m.badges, m.role,
                  m.is_current_member, m.training_status, m.is_team_leader, m.is_new_member,
                  m.license_expiry, m.shirt_expiry_25, m.shirt_expiry_26, m.is_vip, m.email
              ]
          } else if (type === 'INSURANCE') {
              headerKeys = ["FullName", "ID", "Birthday", "Phone"]
              headerNames = ["姓名", "身分證", "生日", "電話"]
              dataMap = (m) => [m.full_name, m.national_id, m.birthday, m.phone]
          } else if (type === 'SHIRT') {
              headerKeys = ["FullName", "Size", "Exp25", "Exp26"]
              headerNames = ["姓名", "衣服尺寸", "2025效期", "2026效期"]
              dataMap = (m) => [m.full_name, m.shirt_size, m.shirt_expiry_25, m.shirt_expiry_26]
          }

          // 3. 組合 CSV：Key列 + 中文列 + 資料列
          const csvContent = "\uFEFF" + [
              headerKeys.join(','), 
              headerNames.join(','),
              ...allData.map(m => dataMap(m).map(item => `"${item || ''}"`).join(','))
          ].join('\n')

          const url = URL.createObjectURL(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }))
          const link = document.createElement('a'); link.href = url; link.download = `IronMedic_${type}_${new Date().toISOString().slice(0,10)}.csv`; link.click()
          setIsExportModalOpen(false)
      } catch (err) { alert('匯出失敗: ' + err.message) } finally { setExporting(false) }
  }

  // --- 輔助函式 ---
  const toggleSelection = (id) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet) }
  const toggleSelectAll = () => { if (selectedIds.size === members.length) setSelectedIds(new Set()); else setSelectedIds(new Set(members.map(m => m.id))) }
  const handleBatchUpdate = async (field, value) => { if (!window.confirm(`確認更新 ${selectedIds.size} 筆資料？`)) return; await supabase.from('profiles').update({ [field]: value }).in('id', Array.from(selectedIds)); fetchMembers(); setSelectedIds(new Set()) }
  const handleDelete = async (id) => { if(window.confirm('確定刪除?')) { await supabase.from('profiles').delete().eq('id', id); setMembers(prev => prev.filter(m => m.id !== id)) } }

  return (
    <div className="space-y-6 pb-20 relative animate-fade-in">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />

      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
            <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                人員名冊 CRM 
                <span className="text-xs bg-slate-800 text-white px-2 py-1 rounded">V7.1 Dual Header</span>
            </h1>
            <p className="text-sm text-slate-500">真實戰場版 (雙抬頭)</p>
        </div>
        <div className="flex gap-2">
             <button onClick={() => fileInputRef.current.click()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-bold shadow hover:bg-blue-700 transition-all"><Upload size={18}/> 匯入</button>
             <button onClick={() => setIsExportModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-bold shadow hover:bg-green-700 transition-all"><Download size={18}/> 匯出</button>
             <button onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)} className={`p-2 rounded-lg transition-all ${isColumnConfigOpen ? 'bg-slate-200 text-slate-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`} title="欄位指揮官"><Settings size={20}/></button>
        </div>
      </div>

      {isColumnConfigOpen && (
          <div className="bg-white p-4 rounded-xl shadow border border-slate-200 grid grid-cols-2 md:grid-cols-6 gap-4 animate-fade-in-down mb-4">
              <div className="col-span-full text-xs font-bold text-slate-400 uppercase border-b pb-2 mb-2">顯示設定</div>
              {Object.keys(visibleColumns).map(key => (
                  <label key={key} className="flex items-center gap-2 cursor-pointer select-none hover:bg-slate-50 p-2 rounded">
                      <input type="checkbox" checked={visibleColumns[key]} onChange={() => setVisibleColumns(p => ({...p, [key]: !p[key]}))} className="rounded text-blue-600 focus:ring-blue-500"/>
                      <span className="text-sm font-bold text-slate-700 capitalize">{key.replace('_', ' ')}</span>
                  </label>
              ))}
          </div>
      )}

      {/* 搜尋列 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
            <Search className="absolute left-3 top-3 text-slate-400" size={20}/>
            <input type="text" placeholder="搜尋..." className="w-full pl-10 pr-4 py-2 bg-slate-50 border rounded-lg outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
        </div>
        <select className="px-4 py-2 bg-slate-50 border rounded-lg font-bold cursor-pointer hover:bg-slate-50" value={filterRole} onChange={e => setFilterRole(e.target.value)}>
            <option value="ALL">顯示所有</option>
            <option value="SUPER_ADMIN">🔴 超級管理員</option>
            <option value="TOURNAMENT_DIRECTOR">🔵 賽事總監</option>
            <option value="VERIFIED_MEDIC">🟢 醫護鐵人</option>
            <option value="USER">⚪ 一般會員</option>
        </select>
      </div>

      {/* 戰術指揮列 */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 border-2 border-slate-700 animate-bounce-in">
              <span className="font-bold text-sm bg-slate-700 px-2 py-1 rounded">已選 {selectedIds.size} 人</span>
              <div className="h-4 w-px bg-slate-600"></div>
              <button onClick={() => handleBatchUpdate('is_vip', 'Y')} className="hover:text-amber-400 font-bold text-sm flex items-center transition-colors"><Crown size={16} className="mr-1"/> 設為 VIP</button>
              <button onClick={() => handleBatchUpdate('role', 'VERIFIED_MEDIC')} className="hover:text-green-400 font-bold text-sm flex items-center transition-colors"><Shield size={16} className="mr-1"/> 晉升醫鐵</button>
              <div className="h-4 w-px bg-slate-600"></div>
              <button onClick={() => setSelectedIds(new Set())} className="text-slate-500 hover:text-white transition-colors"><X size={18}/></button>
          </div>
      )}

      {/* 資料表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
         <table className="w-full text-left min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold">
                <tr>
                    <th className="p-4 w-12 text-center"><button onClick={toggleSelectAll} className="hover:text-blue-600">{selectedIds.size > 0 ? <CheckSquare size={20} className="text-blue-600"/> : <Square size={20}/>}</button></th>
                    {visibleColumns.full_name && <th className="p-4">成員資訊</th>}
                    {visibleColumns.role && <th className="p-4">權限狀態</th>}
                    {visibleColumns.is_vip && <th className="p-4">VIP</th>}
                    {visibleColumns.priority && <th className="p-4">報名優先權</th>}
                    {visibleColumns.license_expiry && <th className="p-4">證照效期</th>}
                    {visibleColumns.status && <th className="p-4">其他資訊</th>}
                    <th className="p-4 text-right">操作</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {members.map((member) => {
                    const isSelected = selectedIds.has(member.id)
                    return (
                    <tr key={member.id} className={`group transition-colors ${isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'}`}>
                        <td className="p-4 text-center"><button onClick={() => toggleSelection(member.id)} className={isSelected ? 'text-blue-600' : 'text-slate-300 hover:text-slate-500'}>{isSelected ? <CheckSquare size={20}/> : <Square size={20}/>}</button></td>
                        
                        {visibleColumns.full_name && (
                            <td className="p-4">
                                <div className="font-bold text-slate-800">{member.display_name || member.full_name}</div>
                                <div className="text-xs text-slate-400 font-mono">{member.email}</div>
                            </td>
                        )}

                        {visibleColumns.role && (
                            <td className="p-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold border ${member.role==='SUPER_ADMIN'?'bg-red-50 text-red-600 border-red-200':member.role==='VERIFIED_MEDIC'?'bg-green-50 text-green-600 border-green-200':'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                    {member.role === 'TOURNAMENT_DIRECTOR' ? '賽事總監' : member.role}
                                </span>
                            </td>
                        )}

                        {visibleColumns.is_vip && (
                            <td className="p-4">
                                {member.is_vip === 'Y' && <Crown size={20} className="text-amber-500 fill-amber-500 drop-shadow-sm"/>}
                            </td>
                        )}

                        {visibleColumns.priority && (
                            <td className="p-4">
                                {renderPriorityIcon(member)}
                            </td>
                        )}

                        {visibleColumns.license_expiry && (
                            <td className="p-4 text-sm">
                                {renderExpiryStatus(member.license_expiry)}
                            </td>
                        )}

                        {visibleColumns.status && (
                            <td className="p-4 text-sm text-slate-500 flex gap-2">
                                {member.resume_url && (
                                    <a href={member.resume_url} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline flex items-center font-bold bg-blue-50 px-2 py-1 rounded">
                                        <ExternalLink size={14} className="mr-1"/> 醫鐵履歷
                                    </a>
                                )}
                            </td>
                        )}

                        <td className="p-4 text-right flex justify-end gap-2">
                            <button onClick={() => handleDelete(member.id)} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 size={18}/></button>
                        </td>
                    </tr>
                )})}
            </tbody>
         </table>
         <div className="p-4 border-t flex justify-between bg-slate-50">
            <button disabled={page===1} onClick={() => setPage(p=>p-1)} className="px-3 py-1 bg-white border rounded disabled:opacity-50 font-bold text-slate-600 hover:bg-slate-100">上一頁</button>
            <span className="font-bold text-slate-600 flex items-center">第 {page} 頁 / 共 {totalPages} 頁</span>
            <button disabled={page===totalPages} onClick={() => setPage(p=>p+1)} className="px-3 py-1 bg-white border rounded disabled:opacity-50 font-bold text-slate-600 hover:bg-slate-100">下一頁</button>
         </div>
      </div>

      {/* 匯出 Modal */}
      {isExportModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border-t-4 border-green-500">
                  <h3 className="text-xl font-black text-slate-800 mb-4 flex items-center"><Download className="mr-2 text-green-600"/> 匯出指揮官</h3>
                  <div className="space-y-3">
                      <button onClick={() => handleExport('FULL')} disabled={exporting} className="w-full p-4 border-2 border-slate-100 rounded-xl hover:border-blue-500 hover:bg-blue-50 text-left font-bold flex justify-between group transition-all disabled:opacity-50">
                          <span className="flex items-center">
                              {exporting ? <Loader2 className="animate-spin mr-2"/> : <Settings className="mr-2 text-slate-400 group-hover:text-blue-500"/>} 
                              完整資料備份 (含中文標題)
                          </span> 
                          <span className="text-slate-300 group-hover:text-blue-500">→</span>
                      </button>
                      <button onClick={() => handleExport('INSURANCE')} disabled={exporting} className="w-full p-4 border-2 border-slate-100 rounded-xl hover:border-green-500 hover:bg-green-50 text-left font-bold flex justify-between group transition-all disabled:opacity-50">
                          <span className="flex items-center"><Shield className="mr-2 text-slate-400 group-hover:text-green-500"/> 保險專用名單</span> <span className="text-slate-300 group-hover:text-green-500">→</span>
                      </button>
                  </div>
                  <button onClick={() => setIsExportModalOpen(false)} className="mt-6 w-full py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-lg transition-colors">取消任務</button>
              </div>
          </div>
      )}

    </div>
  )
}