import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx' 
import { Search, Trash2, Edit, User, X, Shield, CheckSquare, Square, FileSpreadsheet, Upload, Download, Save, AlertCircle, Settings, ExternalLink, Zap, Crown, Flame, Cloud, Loader2, Ban, ShieldAlert, ShoppingCart, PlusCircle, ArrowUpDown, ChevronUp, ChevronDown, Users, Award, CheckCircle, XCircle, HeartPulse, Activity, UserCheck } from 'lucide-react'

export default function MemberCRM() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const ITEMS_PER_PAGE = 20 
  
  // 📊 動態權限人數統計
  const [roleStats, setRoleStats] = useState({ SUPER_ADMIN: 0, TOURNAMENT_DIRECTOR: 0, VERIFIED_MEDIC: 0, USER: 0 })

  // 🛒 購物車
  const [exportCart, setExportCart] = useState(new Set())
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [exporting, setExporting] = useState(false)
  
  // ✏️ 編輯模式
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [savingMember, setSavingMember] = useState(false)

  // 🔽 排序系統
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' })

  // 📍 戰略視角
  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const currentView = searchParams.get('view') || 'ALL'

  // 👁️ 欄位戰略分組
  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false)
  const [columnGroups, setColumnGroups] = useState({
      group1_general: true,   // A~O
      group2_event: true,     // P~T
      group3_logistics: false,// F~J
      group4_ext: false       // Ext
  })

  const fileInputRef = useRef(null)

  useEffect(() => {
      setPage(1) 
      setSelectedIds(new Set()) 
      
      if (currentView === 'ALL') {
          setColumnGroups({ group1_general: true, group2_event: true, group3_logistics: false, group4_ext: false })
      } else if (currentView === 'COMMAND') {
          setColumnGroups({ group1_general: false, group2_event: true, group3_logistics: false, group4_ext: true })
      } else if (currentView === 'ACTIVE') {
          setColumnGroups({ group1_general: true, group2_event: true, group3_logistics: true, group4_ext: false })
      } else if (currentView === 'BLACKLIST') {
          setColumnGroups({ group1_general: true, group2_event: false, group3_logistics: false, group4_ext: true })
      }
  }, [currentView])

  useEffect(() => { 
      fetchMembers()
      fetchGlobalStats() 
  }, [page, searchTerm, currentView])

  const handleCardClick = (targetView) => {
      navigate(`/admin/members?view=${targetView}`)
  }

  const fetchGlobalStats = async () => {
      try {
          const [
              { count: superAdminCount },
              { count: directorCount },
              { count: medicCount },
              { count: userCount }
          ] = await Promise.all([
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'SUPER_ADMIN'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'TOURNAMENT_DIRECTOR'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'VERIFIED_MEDIC'), 
              supabase.from('profiles').select('*', { count: 'exact', head: true }).or('role.eq.USER,role.is.null') 
          ])

          setRoleStats({
              SUPER_ADMIN: superAdminCount || 0,
              TOURNAMENT_DIRECTOR: directorCount || 0,
              VERIFIED_MEDIC: medicCount || 0,
              USER: userCount || 0
          })
      } catch (err) {
          console.error("統計資料更新失敗:", err)
      }
  }

  const fetchMembers = async () => {
    try {
      setLoading(true)
      let query = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false })
      
      if (currentView === 'COMMAND') query = query.or('role.eq.SUPER_ADMIN,role.eq.TOURNAMENT_DIRECTOR,is_vip.eq.Y')
      else if (currentView === 'ACTIVE') query = query.eq('role', 'VERIFIED_MEDIC') 
      else if (currentView === 'RESERVE') query = query.or('role.eq.USER,role.is.null')
      else if (currentView === 'RISK') query = query.lt('license_expiry', new Date().toISOString().slice(0,10))
      else if (currentView === 'BLACKLIST') query = query.eq('is_blacklisted', 'Y')

      if (searchTerm) {
          query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`)
      }
      
      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      const { data, count, error } = await query.range(from, to)
      
      if (error) throw error
      setMembers(data || [])
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) { console.error('Error:', error) } finally { setLoading(false) }
  }

  const handleSort = (key) => {
      let direction = 'asc'
      if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc'
      setSortConfig({ key, direction })
  }
  const sortedMembers = useMemo(() => {
      if (!sortConfig.key) return members
      return [...members].sort((a, b) => {
          let aVal = a[sortConfig.key]
          let bVal = b[sortConfig.key]
          if (sortConfig.key === 'priority') { aVal = getPriorityScore(a); bVal = getPriorityScore(b) }
          if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
          if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
          return 0
      })
  }, [members, sortConfig])

  const handleEditClick = (member) => { setEditingMember({ ...member }); setIsEditModalOpen(true) }
  
  const handleSaveMember = async () => {
      if (!editingMember) return
      setSavingMember(true)
      try {
          const { count, _exact, ...cleanData } = editingMember;

          const { error } = await supabase.from('profiles').update(cleanData).eq('id', editingMember.id)
          if (error) throw error
          
          setIsEditModalOpen(false)
          await fetchGlobalStats() 
          await fetchMembers()
          alert("✅ 會員資料更新成功！")
      } catch (err) { 
          alert("更新失敗: " + err.message) 
      } finally {
          setSavingMember(false)
      }
  }

  function getPriorityScore(m) {
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

  const addToCart = () => {
      const newCart = new Set(exportCart); selectedIds.forEach(id => newCart.add(id)); setExportCart(newCart); setSelectedIds(new Set()); alert(`已將 ${selectedIds.size} 人加入購物車！目前共 ${newCart.size} 人。`)
  }
  const toggleSelection = (id) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet) }
  const toggleSelectAll = () => { if (selectedIds.size === members.length) setSelectedIds(new Set()); else setSelectedIds(new Set(members.map(m => m.id))) }
  const handleDelete = async (id) => { if(window.confirm('確定刪除此會員? (此操作無法復原)')) { await supabase.from('profiles').delete().eq('id', id); setMembers(prev => prev.filter(m => m.id !== id)); fetchGlobalStats() } }
  
  const handleFileUpload = async(e) => { /* 匯入邏輯隱藏以節省篇幅 */ }
  
  const handleExportCart = async() => { 
    if (exportCart.size === 0) return alert("購物車是空的！")
    setExporting(true)
    try {
        const { data: cartData, error } = await supabase.from('profiles').select('*').in('id', Array.from(exportCart)).order('created_at', { ascending: false })
        if (error) throw error

        const exportData = cartData.map(m => ({
            "姓名(A)": m.full_name || '',
            "出生年月日(B)": m.birthday || '',
            "身分證字號(C)": m.national_id || '',
            "手機(D)": m.phone || '',
            "e-mail(E)": m.contact_email || '',
            "通訊地址(F)": m.address || '',
            "賽事衣服(G)": m.shirt_size || '',
            "緊急聯繫人(H)": m.emergency_name || '',
            "緊急聯繫人電話(I)": m.emergency_phone || '',
            "緊急聯繫人關係(J)": m.emergency_relation || '',
            "英文名(K)": m.english_name || '',
            "醫護證照繳交情況(L)": m.medical_license || '',
            "飲食(M)": m.dietary_habit || '',
            "醫鐵履歷網址(N)": m.resume_url || '',
            "成就徽章(O)": m.badges || '',
            "醫鐵權限(P)": m.role || '',
            "當年度會員(Q)": m.is_current_member || '',
            "會員訓練(R)": m.training_status || '',
            "帶隊官(S)": m.is_team_leader || '',
            "新人(T)": m.is_new_member || '',
            "醫護證照有效期(U)": m.license_expiry || '',
            "三鐵服期限-25(V)": m.shirt_expiry_25 || '',
            "三鐵服期限-26(W)": m.shirt_expiry_26 || '',
            "VIP(X)": m.is_vip || '',
            "報名系統登入(Y)": m.email || '',
            "血型(Z)": m.blood_type || '',
            "病史(AA)": m.medical_history || '',
            "黑名單(AB)": m.is_blacklisted || '',
            "積分(AC)": m.total_points || 0,
            "場次(AD)": m.total_races || 0,
            "時數(AE)": m.volunteer_hours || 0,
            "等級(AF)": m.rank_level || '',
            "LineID(AG)": m.line_id || '',
            "FB(AH)": m.fb_id || '',
            "IG(AI)": m.ig_id || '',
            "備註(AJ)": m.admin_note || '',
            "領衣日(AK)": m.shirt_receive_date || '',
            "證書日(AL)": m.cert_send_date || '',
            "交通(AM)": m.transport_pref || '',
            "住宿(AN)": m.stay_pref || '',
            "眷屬(AO)": m.family_count || '',
            "Ext_01": m.ext_01 || '',
            "Ext_02": m.ext_02 || '',
            "Ext_03": m.ext_03 || '',
            "Ext_04": m.ext_04 || '',
            "Ext_05": m.ext_05 || '',
            "Ext_06": m.ext_06 || '',
            "Ext_07": m.ext_07 || '',
            "Ext_08": m.ext_08 || '',
            "Ext_09": m.ext_09 || '',
            "Ext_10": m.ext_10 || '',
            "Ext_11": m.ext_11 || '',
            "Ext_12": m.ext_12 || '',
            "Ext_13": m.ext_13 || '',
            "Ext_14": m.ext_14 || '',
            "Ext_15": m.ext_15 || '',
            "Ext_16": m.ext_16 || '',
            "Ext_17": m.ext_17 || '',
            "Ext_18": m.ext_18 || '',
            "Ext_19": m.ext_19 || '',
            "Ext_20": m.ext_20 || ''
        }))

        const ws = XLSX.utils.json_to_sheet(exportData)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "醫護鐵人名單")
        XLSX.writeFile(wb, `IronMedic_Members_${new Date().toISOString().slice(0,10)}.xlsx`)

        setIsCartModalOpen(false)
        setExportCart(new Set())
    } catch (err) { alert('匯出失敗: ' + err.message) } finally { setExporting(false) }
  }

  // 共用的 Input 元件，保持程式碼整潔
  const EditInput = ({ label, name, type = "text", options = [] }) => (
      <div>
          <label className="block text-xs font-bold text-slate-500 mb-1">{label}</label>
          {type === 'select' ? (
              <select className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white" 
                  value={editingMember[name] || ''} 
                  onChange={e => setEditingMember({...editingMember, [name]: e.target.value})}>
                  <option value="">請選擇</option>
                  {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
              </select>
          ) : (
              <input type={type} className="w-full border border-slate-300 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500" 
                  value={editingMember[name] || ''} 
                  onChange={e => setEditingMember({...editingMember, [name]: e.target.value})}/>
          )}
      </div>
  )

  return (
    <div className="space-y-6 pb-20 relative animate-fade-in">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv" className="hidden" />

      {/* Top Bar */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between items-end md:items-center">
            <div>
                <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                    全部人員總表 
                    <span className="text-xs px-2 py-1 rounded text-white bg-blue-600">{currentView}</span>
                </h1>
                <p className="text-sm text-slate-500">自動配對版 V10.8</p>
            </div>
            <div className="flex gap-2">
                 <button onClick={() => navigate('/admin/import')} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 shadow-sm flex items-center gap-1"><FileSpreadsheet size={16}/> 前往匯入中心</button>
                 <button onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)} className={`px-4 py-2 rounded-lg font-bold transition-all ${isColumnConfigOpen ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>欄位配置</button>
                 <button onClick={() => setIsCartModalOpen(true)} className={`px-4 py-2 rounded-lg font-bold shadow transition-all ${exportCart.size > 0 ? 'bg-green-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                     匯出購物車 ({exportCart.size})
                 </button>
            </div>
        </div>
        
        {/* 🔥 戰情統計卡 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in-down">
            <div onClick={() => handleCardClick('COMMAND')} className={`border p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all group ${currentView==='COMMAND'?'bg-red-100 border-red-300 ring-2 ring-red-400':'bg-red-50 border-red-100 hover:bg-red-100'}`}>
                <div className="bg-red-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform"><ShieldAlert size={20}/></div>
                <div><div className="text-xs text-red-400 font-bold uppercase">Super Admin</div><div className="text-xl font-black text-red-600 transition-all">{roleStats.SUPER_ADMIN}</div></div>
            </div>
            
            <div onClick={() => handleCardClick('COMMAND')} className={`border p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all group ${currentView==='COMMAND'?'bg-blue-100 border-blue-300 ring-2 ring-blue-400':'bg-blue-50 border-blue-100 hover:bg-blue-100'}`}>
                <div className="bg-blue-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform"><Shield size={20}/></div>
                <div><div className="text-xs text-blue-400 font-bold uppercase">Director</div><div className="text-xl font-black text-blue-600 transition-all">{roleStats.TOURNAMENT_DIRECTOR}</div></div>
            </div>
            
            <div onClick={() => handleCardClick('ACTIVE')} className={`border p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all group ${currentView==='ACTIVE'?'bg-green-100 border-green-300 ring-2 ring-green-400':'bg-green-50 border-green-100 hover:bg-green-100'}`}>
                <div className="bg-green-500 text-white p-2 rounded-lg group-hover:scale-110 transition-transform"><User size={20}/></div>
                <div><div className="text-xs text-green-400 font-bold uppercase">Medic</div><div className="text-xl font-black text-green-600 transition-all">{roleStats.VERIFIED_MEDIC}</div></div>
            </div>
            
            <div onClick={() => handleCardClick('RESERVE')} className={`border p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all group ${currentView==='RESERVE'?'bg-slate-200 border-slate-300 ring-2 ring-slate-400':'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}>
                <div className="bg-slate-400 text-white p-2 rounded-lg group-hover:scale-110 transition-transform"><Users size={20}/></div>
                <div><div className="text-xs text-slate-400 font-bold uppercase">User / Other</div><div className="text-xl font-black text-slate-600 transition-all">{roleStats.USER}</div></div>
            </div>
        </div>
      </div>

      {/* 欄位配置面板 */}
      {isColumnConfigOpen && (
          <div className="bg-white p-6 rounded-xl shadow-lg border border-blue-100 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fade-in">
               <label className={`p-4 rounded-xl border-2 cursor-pointer ${columnGroups.group1_general ? 'border-blue-500 bg-blue-50' : 'border-slate-100'}`}>
                   <input type="checkbox" checked={columnGroups.group1_general} onChange={() => setColumnGroups(p=>({...p, group1_general:!p.group1_general}))} className="mr-2"/> 大會資料 (A~O)
               </label>
               <label className={`p-4 rounded-xl border-2 cursor-pointer ${columnGroups.group2_event ? 'border-red-500 bg-red-50' : 'border-slate-100'}`}>
                   <input type="checkbox" checked={columnGroups.group2_event} onChange={() => setColumnGroups(p=>({...p, group2_event:!p.group2_event}))} className="mr-2"/> 賽事序列 (P~T)
               </label>
               <label className={`p-4 rounded-xl border-2 cursor-pointer ${columnGroups.group3_logistics ? 'border-amber-500 bg-amber-50' : 'border-slate-100'}`}>
                   <input type="checkbox" checked={columnGroups.group3_logistics} onChange={() => setColumnGroups(p=>({...p, group3_logistics:!p.group3_logistics}))} className="mr-2"/> 後勤統計 (F~J)
               </label>
               <label className={`p-4 rounded-xl border-2 cursor-pointer ${columnGroups.group4_ext ? 'border-purple-500 bg-purple-50' : 'border-slate-100'}`}>
                   <input type="checkbox" checked={columnGroups.group4_ext} onChange={() => setColumnGroups(p=>({...p, group4_ext:!p.group4_ext}))} className="mr-2"/> 擴充欄位 (Ext)
               </label>
          </div>
      )}

      {/* 搜尋列 */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <input type="text" placeholder="搜尋姓名、Email、電話..." className="w-full pl-4 pr-4 py-2 bg-slate-50 border rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
      </div>

      {/* 購物車操作列 */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 animate-bounce-in">
              <span className="font-bold text-sm">已選 {selectedIds.size} 人</span>
              <button onClick={addToCart} className="font-bold text-sm flex items-center hover:text-green-400"><PlusCircle size={16} className="mr-1"/> 加入購物車</button>
              <button onClick={() => setSelectedIds(new Set())}><X size={18}/></button>
          </div>
      )}

      {/* 資料表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto">
         <table className="w-full text-left min-w-[1200px]">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold cursor-pointer select-none">
                <tr>
                    <th className="p-4 w-12 text-center"><button onClick={toggleSelectAll}><CheckSquare size={20}/></button></th>
                    
                    <th className="p-4 w-48 bg-slate-50 hover:bg-slate-100" onClick={() => handleSort('full_name')}>
                        <div className="flex items-center gap-1">基本資料 (Name/Email) {sortConfig.key==='full_name' && <ArrowUpDown size={14}/>}</div>
                    </th>
                    
                    {columnGroups.group1_general && <th className="p-4 bg-blue-50 text-blue-700 hover:bg-blue-100" onClick={() => handleSort('medical_license')}>
                        <div className="flex items-center gap-1">大會資料 (證照/血型) {sortConfig.key==='medical_license' && <ArrowUpDown size={14}/>}</div>
                    </th>}
                    
                    {columnGroups.group2_event && <th className="p-4 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => handleSort('priority')}>
                        <div className="flex items-center gap-1">狀態與優先權 {sortConfig.key==='priority' && <ArrowUpDown size={14}/>}</div>
                    </th>}
                    
                    {columnGroups.group3_logistics && <th className="p-4 bg-amber-50 text-amber-700 hover:bg-amber-100">後勤資訊 (尺寸/交通/住宿/緊急聯絡人)</th>}
                    {columnGroups.group4_ext && <th className="p-4 bg-purple-50 text-purple-700">擴充註記 (Admin Note)</th>}
                    
                    <th className="p-4 text-right bg-slate-50">操作</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {sortedMembers.map((member) => {
                    const isSelected = selectedIds.has(member.id)
                    const isInCart = exportCart.has(member.id)
                    return (
                    <tr key={member.id} className={`group transition-colors ${isSelected ? 'bg-blue-50' : isInCart ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                         <td className="p-4 text-center"><button onClick={() => toggleSelection(member.id)}><CheckSquare size={20} className={isSelected ? 'text-blue-600' : 'text-slate-300 hover:text-blue-400'}/></button></td>
                         
                         <td className="p-4">
                             <div className="font-bold text-slate-800 flex items-center gap-2">
                                 {member.full_name}
                                 {member.is_vip === 'Y' && <Crown size={14} className="text-amber-500" title="VIP"/>}
                                 {isInCart && <ShoppingCart size={14} className="text-green-600" title="已在購物車"/>}
                             </div>
                             <div className="text-xs text-slate-400 font-mono">{member.email}</div>
                             <div className="text-[10px] text-slate-500 mt-1">{member.phone || '無電話'}</div>
                         </td>

                         {columnGroups.group1_general && <td className="p-4 text-sm text-slate-600">
                             <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{member.medical_license || '無證照資料'}</span>
                                 {member.blood_type && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">{member.blood_type}</span>}
                             </div>
                             <div className="text-xs text-slate-500">ID: {member.national_id || '-'}</div>
                         </td>}

                         {columnGroups.group2_event && <td className="p-4">
                             <div className="mb-1">{renderPriorityIcon(member)}</div>
                             <div className="flex gap-2 items-center mt-1 flex-wrap">
                                 {member.is_current_member === 'Y' ? (
                                     <span className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-bold"><CheckCircle size={10}/>當屆</span>
                                 ) : (
                                     <span className="text-[10px] text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded flex items-center gap-0.5 font-medium"><XCircle size={10}/>非當屆</span>
                                 )}
                                 <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                     {member.role === 'VERIFIED_MEDIC' ? '醫護鐵人' : member.role === 'USER' ? '一般會員' : member.role}
                                 </span>
                             </div>
                         </td>}

                         {columnGroups.group3_logistics && <td className="p-4 text-sm">
                             <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold" title="衣服尺寸">👕 {member.shirt_size || '?'}</span>
                                 <span className="text-xs text-slate-500" title="交通/住宿">{member.transport_pref || '-'} / {member.stay_pref || '-'}</span>
                             </div>
                             {member.emergency_name && (
                                 <div className="text-[10px] text-red-500 flex items-center gap-1 mt-1">
                                     <ShieldAlert size={10}/> {member.emergency_name} ({member.emergency_phone})
                                 </div>
                             )}
                             <div className="text-[10px] text-slate-400 truncate w-40 mt-1" title={member.address}>{member.address || '無地址'}</div>
                         </td>}

                         {columnGroups.group4_ext && <td className="p-4 text-xs text-purple-600 font-medium">
                             <div className="bg-purple-50 p-2 rounded-lg line-clamp-2" title={member.admin_note}>{member.admin_note || '無註記'}</div>
                         </td>}

                         <td className="p-4 text-right">
                             <div className="flex justify-end gap-2">
                                 <button onClick={() => handleEditClick(member)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-200 shadow-sm bg-white" title="編輯會員完整資料"><Edit size={16}/></button>
                                 <button onClick={() => handleDelete(member.id)} className="p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-200 shadow-sm bg-white" title="刪除此會員"><Trash2 size={16}/></button>
                             </div>
                         </td>
                    </tr>
                )})}
            </tbody>
         </table>
      </div>

      {/* 分頁控制 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-bold text-slate-600 transition-colors">上一頁</button>
          <span className="font-bold text-slate-600 bg-slate-50 px-4 py-1.5 rounded-lg border border-slate-200">第 {page} / {totalPages || 1} 頁</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-bold text-slate-600 transition-colors">下一頁</button>
      </div>

      {/* 🌟 全新 CRM 專業編輯面板 (去軍事化、全欄位) */}
      {isEditModalOpen && editingMember && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-sm" onClick={() => setIsEditModalOpen(false)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                  
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <UserCheck className="text-blue-600"/> 會員資料管理 (CRM)
                          <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border shadow-sm ml-2">ID: {editingMember.id.substring(0,8)}</span>
                      </h3>
                      <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
                  </div>

                  {/* Body (雙欄設計) */}
                  <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          
                          {/* 左欄：核心基本資料 */}
                          <div className="space-y-6">
                              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                  <h4 className="font-black text-slate-800 border-b pb-2 flex items-center gap-2"><User size={16} className="text-indigo-500"/> 核心基本資料</h4>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                      <EditInput label="中文姓名" name="full_name" />
                                      <EditInput label="英文姓名" name="english_name" />
                                  </div>
                                  
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">系統登入 Email (唯讀)</label>
                                      <input className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-100 text-slate-500 font-mono text-sm cursor-not-allowed" disabled value={editingMember.email || ''}/>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                      <EditInput label="身分證字號" name="national_id" />
                                      <EditInput label="生理性別" name="gender" type="select" options={['男', '女']} />
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                      <EditInput label="出生年月日" name="birthday" type="date" />
                                      <EditInput label="手機號碼" name="phone" />
                                  </div>
                                  <EditInput label="聯絡信箱 (可收信)" name="contact_email" type="email" />
                                  <EditInput label="通訊地址" name="address" />
                              </div>

                              {/* 權限與狀態 */}
                              <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm space-y-4">
                                  <h4 className="font-black text-blue-900 border-b border-blue-200 pb-2 flex items-center gap-2"><Shield size={16} className="text-blue-500"/> 系統權限與狀態</h4>
                                  
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">系統角色 (Role)</label>
                                      <select className="w-full border border-slate-300 p-2.5 rounded-lg outline-none font-bold bg-white focus:ring-2 focus:ring-blue-500" 
                                          value={editingMember.role || 'USER'} 
                                          onChange={e => setEditingMember({...editingMember, role: e.target.value})}>
                                          <option value="USER">⚪ 一般會員 (USER)</option>
                                          <option value="VERIFIED_MEDIC">🟢 醫護鐵人 (VERIFIED_MEDIC)</option>
                                          <option value="TOURNAMENT_DIRECTOR">🔵 賽事總監 (DIRECTOR)</option>
                                          <option value="SUPER_ADMIN">🔴 超級管理員 (ADMIN)</option>
                                      </select>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                      <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded">
                                          <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={editingMember.is_current_member === 'Y'} onChange={e => setEditingMember({...editingMember, is_current_member: e.target.checked ? 'Y' : 'N'})}/>
                                          <span className="font-bold text-sm text-slate-700">當屆會員</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-amber-50 rounded">
                                          <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={editingMember.is_vip === 'Y'} onChange={e => setEditingMember({...editingMember, is_vip: e.target.checked ? 'Y' : 'N'})}/>
                                          <span className="font-bold text-sm text-amber-700 flex items-center gap-1"><Crown size={14}/> VIP 身分</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-indigo-50 rounded">
                                          <input type="checkbox" className="w-4 h-4 accent-indigo-500" checked={editingMember.is_team_leader === 'Y'} onChange={e => setEditingMember({...editingMember, is_team_leader: e.target.checked ? 'Y' : 'N'})}/>
                                          <span className="font-bold text-sm text-indigo-700">帶隊教官</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-green-50 rounded">
                                          <input type="checkbox" className="w-4 h-4 accent-green-500" checked={editingMember.is_new_member === 'Y'} onChange={e => setEditingMember({...editingMember, is_new_member: e.target.checked ? 'Y' : 'N'})}/>
                                          <span className="font-bold text-sm text-green-700">新人標記</span>
                                      </label>
                                  </div>
                              </div>
                          </div>

                          {/* 右欄：後勤與備註 */}
                          <div className="space-y-6">
                              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                  <h4 className="font-black text-slate-800 border-b pb-2 flex items-center gap-2"><HeartPulse size={16} className="text-rose-500"/> 醫護與後勤資訊</h4>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                      <EditInput label="醫護證照種類" name="medical_license" />
                                      <EditInput label="證照有效期限" name="license_expiry" type="date" />
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                      <EditInput label="血型" name="blood_type" type="select" options={['A', 'B', 'O', 'AB', '未知']} />
                                      <EditInput label="衣服尺寸" name="shirt_size" type="select" options={['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']} />
                                  </div>

                                  <EditInput label="特殊病史與過敏" name="medical_history" />

                                  <div className="grid grid-cols-2 gap-4">
                                      <EditInput label="交通偏好" name="transport_pref" type="select" options={['自行前往', '需要共乘', '搭乘大眾運輸']} />
                                      <EditInput label="住宿偏好" name="stay_pref" type="select" options={['自行處理', '需要代訂']} />
                                  </div>
                              </div>

                              <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-100 shadow-sm space-y-4">
                                  <h4 className="font-black text-rose-900 border-b border-rose-200 pb-2 flex items-center gap-2"><AlertCircle size={16} className="text-rose-500"/> 緊急聯絡人</h4>
                                  <EditInput label="聯絡人姓名" name="emergency_name" />
                                  <div className="grid grid-cols-2 gap-4">
                                      <EditInput label="關係" name="emergency_relation" />
                                      <EditInput label="緊急電話" name="emergency_phone" />
                                  </div>
                              </div>

                              <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100 shadow-sm space-y-2">
                                  <h4 className="font-black text-amber-900 border-b border-amber-200 pb-2 flex items-center gap-2"><Settings size={16} className="text-amber-600"/> 管理員內部註記 (Admin Note)</h4>
                                  <textarea 
                                      className="w-full border border-amber-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none text-sm font-medium" 
                                      rows="3" 
                                      placeholder="僅管理員可見的內部備註..."
                                      value={editingMember.admin_note || ''}
                                      onChange={e => setEditingMember({...editingMember, admin_note: e.target.value})}
                                  ></textarea>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Footer Actions */}
                  <div className="p-5 border-t border-slate-200 bg-white flex gap-4 shrink-0 shadow-[0_-10px_15px_rgba(0,0,0,0.03)]">
                      <button onClick={handleSaveMember} disabled={savingMember} className="flex-1 bg-blue-600 text-white font-black py-3.5 rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-600/30 transition-all active:scale-95 flex justify-center items-center gap-2 disabled:opacity-70">
                          {savingMember ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 儲存會員資料
                      </button>
                      <button onClick={() => setIsEditModalOpen(false)} disabled={savingMember} className="w-1/3 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors active:scale-95 disabled:opacity-50">取消</button>
                  </div>
              </div>
          </div>
      )}

      {/* 購物車 Modal (升級為 Excel 匯出提示) */}
      {isCartModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] backdrop-blur-sm animate-fade-in" onClick={() => setIsCartModalOpen(false)}>
             <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-bounce-in" onClick={e => e.stopPropagation()}>
                 <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><Download size={32}/></div>
                 <h3 className="font-black text-2xl mb-3 text-center text-slate-800">匯出完整資料</h3>
                 <p className="mb-8 text-slate-500 text-sm text-center leading-relaxed">即將匯出 {exportCart.size} 位人員的 A~AO 全部欄位（Excel 格式），方便您進行離線處理或匯入中心。</p>
                 <button disabled={exporting} className="w-full font-black bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl mb-3 flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/30 disabled:opacity-50 active:scale-95" onClick={handleExportCart}>
                     {exporting ? <Loader2 className="animate-spin" size={20}/> : <><FileSpreadsheet size={20}/> 產生並下載 XLSX</>}
                 </button>
                 <button className="w-full font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl transition-colors active:scale-95" onClick={()=>setIsCartModalOpen(false)}>返回</button>
             </div>
          </div>
      )}
    </div>
  )
}