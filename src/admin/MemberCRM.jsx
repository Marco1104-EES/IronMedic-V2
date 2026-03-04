import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import DigitalIdCard from '../components/DigitalIdCard' 
import * as XLSX from 'xlsx' 
import { Search, Trash2, Edit, User, X, Shield, CheckSquare, Square, FileSpreadsheet, Upload, Download, Save, AlertCircle, Settings, ExternalLink, Zap, Crown, Flame, Cloud, Loader2, Ban, ShieldAlert, ShoppingCart, PlusCircle, ArrowUpDown, ChevronUp, ChevronDown, Users, Award, CheckCircle, XCircle } from 'lucide-react'

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

  // 🌟 精準統計：取消 ACTIVE 必須是「當屆會員」的嚴格限制，把非當屆醫護鐵人救回來
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
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'VERIFIED_MEDIC'), // 🌟 移除了 .eq('is_current_member', 'Y')
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
      else if (currentView === 'ACTIVE') query = query.eq('role', 'VERIFIED_MEDIC') // 🌟 核心修正：只要是醫護鐵人就撈出來，不再強迫必須繳費
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
      try {
          const { count, _exact, ...cleanData } = editingMember;

          const { error } = await supabase.from('profiles').update(cleanData).eq('id', editingMember.id)
          if (error) throw error
          
          setIsEditModalOpen(false)
          await fetchGlobalStats() 
          await fetchMembers()
          
      } catch (err) { alert("更新失敗: " + err.message) }
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
  const handleDelete = async (id) => { if(window.confirm('確定刪除?')) { await supabase.from('profiles').delete().eq('id', id); setMembers(prev => prev.filter(m => m.id !== id)); fetchGlobalStats() } }
  
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
                <p className="text-sm text-slate-500">MemberCRM V10.8 智慧解鎖版</p>
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
          <input type="text" placeholder="搜尋姓名、Email、電話..." className="w-full pl-4 pr-4 py-2 bg-slate-50 border rounded-lg outline-none" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}/>
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
                        <div className="flex items-center gap-1">大會資料 (L) {sortConfig.key==='medical_license' && <ArrowUpDown size={14}/>}</div>
                    </th>}
                    
                    {columnGroups.group2_event && <th className="p-4 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => handleSort('priority')}>
                        <div className="flex items-center gap-1">優先權分數 {sortConfig.key==='priority' && <ArrowUpDown size={14}/>}</div>
                    </th>}
                    
                    {columnGroups.group3_logistics && <th className="p-4 bg-amber-50 text-amber-700 hover:bg-amber-100">後勤</th>}
                    {columnGroups.group4_ext && <th className="p-4 bg-purple-50 text-purple-700">擴充</th>}
                    
                    <th className="p-4 text-right">操作</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {sortedMembers.map((member) => {
                    const isSelected = selectedIds.has(member.id)
                    const isInCart = exportCart.has(member.id)
                    return (
                    <tr key={member.id} className={`group transition-colors ${isSelected ? 'bg-blue-50' : isInCart ? 'bg-green-50/50' : 'hover:bg-slate-50'}`}>
                         <td className="p-4 text-center"><button onClick={() => toggleSelection(member.id)}><CheckSquare size={20} className={isSelected ? 'text-blue-600' : 'text-slate-300'}/></button></td>
                         
                         <td className="p-4">
                             <div className="font-bold text-slate-800 flex items-center gap-2">
                                 {member.full_name}
                                 {member.is_vip === 'Y' && <Crown size={14} className="text-amber-500"/>}
                                 {isInCart && <ShoppingCart size={14} className="text-green-600"/>}
                             </div>
                             <div className="text-xs text-slate-400 font-mono">{member.email}</div>
                         </td>

                         {columnGroups.group1_general && <td className="p-4 text-sm text-slate-600">
                             <div>{member.english_name}</div>
                             <div className="flex gap-1 mt-1"><span className="text-xs bg-slate-100 px-1 rounded">{member.medical_license}</span></div>
                         </td>}

                         {columnGroups.group2_event && <td className="p-4">
                             {renderPriorityIcon(member)}
                             <div className="flex gap-2 items-center mt-1">
                                 {member.is_current_member === 'Y' ? (
                                     <span className="text-[10px] text-green-600 bg-green-100 px-1.5 rounded flex items-center gap-0.5 font-bold"><CheckCircle size={10}/>當屆</span>
                                 ) : (
                                     <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded flex items-center gap-0.5 font-medium"><XCircle size={10}/>非當屆</span>
                                 )}
                                 <div className="text-xs text-slate-400 flex gap-1">
                                     {member.role} | 積分:{getPriorityScore(member)}
                                 </div>
                             </div>
                         </td>}

                         {columnGroups.group3_logistics && <td className="p-4 text-sm">
                             <div>尺: <span className="font-bold">{member.shirt_size}</span> | 住: {member.stay_pref}</div>
                             <div className="text-xs text-slate-400 truncate w-32">{member.address}</div>
                         </td>}

                         {columnGroups.group4_ext && <td className="p-4 text-xs text-purple-600 font-mono">{member.admin_note || '-'}</td>}

                         <td className="p-4 text-right flex justify-end gap-2">
                             <button onClick={() => handleEditClick(member)} className="p-2 text-blue-500 hover:bg-blue-50 rounded" title="編輯人員"><Edit size={16}/></button>
                             <button onClick={() => handleDelete(member.id)} className="p-2 text-red-400 hover:bg-red-50 rounded"><Trash2 size={16}/></button>
                         </td>
                    </tr>
                )})}
            </tbody>
         </table>
      </div>

      {/* 分頁控制 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 font-bold text-slate-600">上一頁</button>
          <span className="font-bold text-slate-600">第 {page} / {totalPages || 1} 頁</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-slate-100 rounded hover:bg-slate-200 disabled:opacity-50 font-bold text-slate-600">下一頁</button>
      </div>

      {/* ✏️ 整合數位 ID 卡的編輯視窗 */}
      {isEditModalOpen && editingMember && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 animate-fade-in backdrop-blur-md">
              <div className="bg-white/10 backdrop-blur-xl p-8 rounded-3xl shadow-2xl w-full max-w-5xl border border-white/20 flex flex-col md:flex-row gap-8 overflow-y-auto max-h-[90vh]">
                  
                  {/* 左邊：數位 ID 卡預覽 */}
                  <div className="w-full md:w-1/3 flex flex-col items-center justify-start pt-4">
                      <h4 className="text-white font-bold mb-4 flex items-center gap-2"><Award/> 數位戰術識別證</h4>
                      <DigitalIdCard member={editingMember} />
                  </div>

                  {/* 右邊：編輯表單 */}
                  <div className="w-full md:w-2/3 bg-white rounded-2xl p-6 shadow-xl">
                      <h3 className="text-2xl font-black text-slate-800 mb-6 flex items-center gap-2">
                          <Edit className="text-blue-600"/> 編輯人員資料
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                              <h4 className="font-bold text-slate-400 uppercase text-xs border-b pb-1">基本識別</h4>
                              <div><label className="block text-sm font-bold text-slate-700">姓名</label>
                              <input className="w-full border p-2 rounded" value={editingMember.full_name || ''} onChange={e => setEditingMember({...editingMember, full_name: e.target.value})}/></div>
                              <div><label className="block text-sm font-bold text-slate-700">Email (帳號)</label>
                              <input className="w-full border p-2 rounded bg-slate-100 text-slate-500" disabled value={editingMember.email || ''}/></div>
                              <div><label className="block text-sm font-bold text-slate-700">手機</label>
                              <input className="w-full border p-2 rounded" value={editingMember.phone || ''} onChange={e => setEditingMember({...editingMember, phone: e.target.value})}/></div>
                          </div>

                          <div className="space-y-4">
                              <h4 className="font-bold text-slate-400 uppercase text-xs border-b pb-1">戰略狀態</h4>
                              <div><label className="block text-sm font-bold text-slate-700">權限 Role</label>
                              <select className="w-full border p-2 rounded" value={editingMember.role || 'USER'} onChange={e => setEditingMember({...editingMember, role: e.target.value})}>
                                  <option value="USER">⚪ 一般會員</option>
                                  <option value="VERIFIED_MEDIC">🟢 醫護鐵人</option>
                                  <option value="TOURNAMENT_DIRECTOR">🔵 賽事總監</option>
                                  <option value="SUPER_ADMIN">🔴 超級管理員</option>
                              </select></div>
                              <div className="flex gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={editingMember.is_vip === 'Y'} onChange={e => setEditingMember({...editingMember, is_vip: e.target.checked ? 'Y' : 'N'})}/>
                                      <span className="font-bold text-amber-600">VIP 皇冠</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                      <input type="checkbox" checked={editingMember.is_current_member === 'Y'} onChange={e => setEditingMember({...editingMember, is_current_member: e.target.checked ? 'Y' : 'N'})}/>
                                      <span className="font-bold text-blue-600">當屆會員</span>
                                  </label>
                              </div>
                          </div>
                      </div>

                      <div className="mt-8 flex gap-4">
                          <button onClick={handleSaveMember} className="flex-1 bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-700 shadow-lg">💾 儲存變更</button>
                          <button onClick={() => setIsEditModalOpen(false)} className="flex-1 bg-slate-100 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-200">取消</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* 購物車 Modal (升級為 Excel 匯出提示) */}
      {isCartModalOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
             <div className="bg-white p-6 rounded-2xl shadow-xl max-w-sm w-full animate-fade-in-up">
                 <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 mx-auto"><Download size={24}/></div>
                 <h3 className="font-black text-xl mb-2 text-center text-slate-800">匯出完整資料</h3>
                 <p className="mb-6 text-slate-500 text-sm text-center">將匯出 {exportCart.size} 人的 A~AO 全部欄位（Excel 格式），方便您修改後丟入匯入中心。</p>
                 <button disabled={exporting} className="w-full font-bold bg-green-600 hover:bg-green-700 text-white py-3 rounded-xl mb-3 flex items-center justify-center gap-2 transition-colors disabled:opacity-50" onClick={handleExportCart}>
                     {exporting ? <Loader2 className="animate-spin" size={18}/> : <><FileSpreadsheet size={18}/> 產生並下載 XLSX</>}
                 </button>
                 <button className="w-full font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 py-3 rounded-xl transition-colors" onClick={()=>setIsCartModalOpen(false)}>返回</button>
             </div>
          </div>
      )}
    </div>
  )
}