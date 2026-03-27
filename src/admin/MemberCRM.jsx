import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import * as XLSX from 'xlsx' 
import { Search, Trash2, Edit, User, X, Shield, CheckSquare, Square, FileSpreadsheet, Upload, Download, Save, AlertCircle, Settings, ExternalLink, Zap, Crown, Flame, Cloud, Loader2, Ban, ShieldAlert, ShoppingCart, PlusCircle, ArrowUpDown, ChevronUp, ChevronDown, Users, Award, CheckCircle, XCircle, HeartPulse, Activity, UserCheck, RefreshCw } from 'lucide-react'

const FIELD_TRANSLATION_MAP = {
    '姓名': 'full_name',
    '英文姓名': 'english_name',
    '身分證': 'national_id',
    '性別': 'gender',
    '生日': 'birthday',
    '電話': 'phone',
    '聯絡信箱': 'contact_email',
    '地址': 'address',
    '醫護證照': 'medical_license',
    '證照期限': 'license_expiry',
    '血型': 'blood_type',
    '衣服尺寸': 'shirt_size',
    '病史': 'medical_history',
    '交通': 'transport_pref',
    '住宿': 'stay_pref',
    '緊急聯絡人': 'emergency_name',
    '關係': 'emergency_relation',
    '緊急電話': 'emergency_phone'
};

const FieldEditor = ({ label, name, type = "text", options = [], value, onChange, isHighlighted }) => {
    const [localValue, setLocalValue] = useState(value || '');

    useEffect(() => {
        setLocalValue(value || '');
    }, [value]);

    const baseClass = "w-full border p-2.5 rounded-lg outline-none transition-all duration-500 text-slate-800 font-medium";
    const normalClass = "border-slate-300 focus:ring-2 focus:ring-blue-500 bg-white";
    // 🌟 智慧異動高亮：加上明顯的橘黃色光暈
    const highlightClass = "border-amber-400 ring-4 ring-amber-500/50 bg-amber-50 shadow-[0_0_15px_rgba(245,158,11,0.3)]";
    const combinedClass = `${baseClass} ${isHighlighted ? highlightClass : normalClass}`;

    const handleBlur = () => {
        onChange(name, localValue);
    };

    return (
        <div className="relative">
            <label className="block text-xs font-bold text-slate-500 mb-1 flex items-center gap-1">
                {label} 
                {isHighlighted && <span className="text-[10px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black animate-bounce">異動待確認</span>}
            </label>
            {type === 'select' ? (
                <select 
                    className={combinedClass} 
                    value={localValue} 
                    onChange={e => {
                        setLocalValue(e.target.value);
                        onChange(name, e.target.value); 
                    }}
                >
                    <option value="">請選擇</option>
                    {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                </select>
            ) : (
                <input 
                    type={type} 
                    className={combinedClass} 
                    value={localValue} 
                    onChange={e => setLocalValue(e.target.value)} 
                    onBlur={handleBlur} 
                />
            )}
        </div>
    );
};

export default function MemberCRM() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  
  // 🌟 搜尋超級進化：導入 Debounce 機制
  const [searchInput, setSearchInput] = useState('') // 即時響應的輸入值
  const [searchTerm, setSearchTerm] = useState('')   // 觸發資料庫過濾的值
  
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const ITEMS_PER_PAGE = 20 

  const [roleStats, setRoleStats] = useState({ SUPER_ADMIN: 0, TOURNAMENT_DIRECTOR: 0, VERIFIED_MEDIC: 0, USER: 0, BLACKLISTED: 0 })

  const [exportCart, setExportCart] = useState(new Set())
  const [isCartModalOpen, setIsCartModalOpen] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [exporting, setExporting] = useState(false)
  const [exportingAll, setExportingAll] = useState(false) 
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState(null)
  const [savingMember, setSavingMember] = useState(false)
  
  // ⚡【新增】一鍵解除綁定 Loading 狀態
  const [isUnlockLoading, setIsUnlockLoading] = useState(false)

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'desc' })

  const location = useLocation()
  const navigate = useNavigate()
  const searchParams = new URLSearchParams(location.search)
  const currentView = searchParams.get('view') || 'ALL'
  
  const targetId = searchParams.get('targetId')

  const [isColumnConfigOpen, setIsColumnConfigOpen] = useState(false)
  const [columnGroups, setColumnGroups] = useState({
      group1_general: true,   
      group2_event: true,     
      group3_logistics: false,
      group4_ext: false       
  })

  const [highlightFields, setHighlightFields] = useState([])

  const fileInputRef = useRef(null)

  // 🌟 Debounce 引擎：打字停頓 250ms 後，無感重整下方表格，體驗極致流暢
  useEffect(() => {
      const timer = setTimeout(() => {
          if (searchTerm !== searchInput) {
              setSearchTerm(searchInput);
              setPage(1); 
          }
      }, 250);
      return () => clearTimeout(timer);
  }, [searchInput, searchTerm]);

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchTerm, currentView])

  useEffect(() => {
      if (targetId && members.length > 0 && !isEditModalOpen) {
          const targetMember = members.find(m => m.id === targetId);
          if (targetMember) {
              handleEditClick(targetMember, true); 
              navigate(`/admin/members?view=${currentView}`, { replace: true });
          } else {
              setSearchInput(targetId.substring(0,8)); 
          }
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetId, members])

  const handleCloseEditModal = () => {
      setIsEditModalOpen(false);
      setHighlightFields([]);
      setEditingMember(null);
  }

  const handleCardClick = (targetView) => {
      navigate(`/admin/members?view=${targetView}`)
  }

  const fetchGlobalStats = async () => {
      try {
          const [
              { count: superAdminCount },
              { count: directorCount },
              { count: medicCount },
              { count: userCount },
              { count: blacklistedCount }
          ] = await Promise.all([
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'SUPER_ADMIN').or('is_blacklisted.is.null,is_blacklisted.eq.N'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'TOURNAMENT_DIRECTOR').or('is_blacklisted.is.null,is_blacklisted.eq.N'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'VERIFIED_MEDIC').or('is_blacklisted.is.null,is_blacklisted.eq.N'), 
              supabase.from('profiles').select('*', { count: 'exact', head: true }).or('role.eq.USER,role.is.null').or('is_blacklisted.is.null,is_blacklisted.eq.N'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_blacklisted', 'Y')
          ])

          setRoleStats({
              SUPER_ADMIN: superAdminCount || 0,
              TOURNAMENT_DIRECTOR: directorCount || 0,
              VERIFIED_MEDIC: medicCount || 0,
              USER: userCount || 0,
              BLACKLISTED: blacklistedCount || 0 
          })
      } catch (err) {
          console.error("統計資料更新失敗:", err)
      }
  }

  const fetchMembers = async () => {
    try {
      setLoading(true)
      let query = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false })
      
      if (currentView !== 'BLACKLIST') {
          query = query.or('is_blacklisted.is.null,is_blacklisted.eq.N');
      }

      if (currentView === 'COMMAND') {
          query = query.or('role.eq.SUPER_ADMIN,role.eq.TOURNAMENT_DIRECTOR,is_vip.eq.Y');
      } 
      else if (currentView === 'ACTIVE') {
          query = query.or('role.eq.VERIFIED_MEDIC,role.eq.TOURNAMENT_DIRECTOR,role.eq.SUPER_ADMIN');
      } 
      else if (currentView === 'RESERVE') {
          query = query.or('role.eq.USER,role.is.null');
      } 
      else if (currentView === 'RISK') {
          query = query.lt('license_expiry', new Date().toISOString().slice(0,10));
      } 
      else if (currentView === 'BLACKLIST') {
          query = query.eq('is_blacklisted', 'Y');
      }

      // 🌟 核心防護修復：智慧判斷 UUID 格式，避免資料庫因欄位型別衝突而假死
      if (searchTerm) {
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);
          if (isUUID) {
              query = query.eq('id', searchTerm);
          } else {
              query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,national_id.ilike.%${searchTerm}%`);
          }
      }
      
      const from = (page - 1) * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      const { data, count, error } = await query.range(from, to)
      
      if (error) throw error
      setMembers(data || [])
      setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE))
    } catch (error) { 
      console.error('資料載入異常:', error);
      // 確保出錯時不會殘留上一筆資料造成誤導
      setMembers([]); 
    } finally { 
      setLoading(false) 
    }
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

  const handleEditClick = (member, fromRadar = false) => { 
      setEditingMember({ ...member });
      
      let fieldsToHighlight = [];
      if (fromRadar || member.basic_edit_count > 0 || member.med_edit_count > 0) {
          fieldsToHighlight = [
              'full_name', 'english_name', 'national_id', 'gender', 'birthday', 'phone', 'contact_email', 'address',
              'emergency_name', 'emergency_relation', 'emergency_phone',
              'medical_license', 'license_expiry', 'blood_type', 'shirt_size', 'medical_history', 'transport_pref', 'stay_pref'
          ];
      }
      setHighlightFields(fieldsToHighlight);
      
      setIsEditModalOpen(true); 
  }
  
  const handleSaveMember = async () => {
      if (!editingMember) return
      setSavingMember(true)
      try {
          const { count, _exact, basic_edit_count, med_edit_count, ...safeDbPayload } = editingMember;

          const { error } = await supabase.from('profiles').update(safeDbPayload).eq('id', editingMember.id)
          if (error) throw error
          
          handleCloseEditModal()
          await fetchGlobalStats() 
          await fetchMembers()
          alert("系統提示：會員資料審核與更新成功。")
      } catch (err) { 
          alert("資料更新失敗: " + err.message) 
      } finally {
          setSavingMember(false)
      }
  }

  // ==========================================
  // ⚡【新增】上帝捷徑：強制解除帳號綁定 (重置帳號媒合)
  // ==========================================
  const handleForceUnlockBinding = async (userId, userFullName) => {
      const confirmMsg = `🛡️🛡️🛡️ 帳號重置警報 🛡️🛡️🛡️\n\n您確定要強制將【${userFullName}】解除帳號綁定 (重置帳號媒合狀態) 嗎？\n\n這通常用於以下情況：\n1. 您或會員【不小心帳號媒合錯誤】(綁到錯誤的 Google/信箱)。\n2. 會員更換 Email，需要重新綁定。\n\n執行後，系統將洗掉她的 ID 並將信箱強制改回資料庫建檔的原始信箱 (marietai@ms1.url.com.tw)，這會讓該人員下次登入時【重新走一次帳號媒合流程】。\n這不是刪除資料，她過去的紀錄會保留，只是身分需要重新核對。`;
      if (!window.confirm(confirmMsg)) return;

      setIsUnlockLoading(true);
      try {
          // 企業級安全 UUID 生成
          const newRandomUuid = crypto.randomUUID(); 
          const originalEmail = 'marietai@ms1.url.com.tw'; // 強制恢復預設信箱

          const { error } = await supabase
              .from('profiles')
              .update({ 
                  id: newRandomUuid,  // 洗掉舊 ID
                  email: originalEmail // 恢復信箱
              })
              .eq('id', userId);

          if (error) throw error;

          // 更新前端狀態，讓畫面瞬間變過來
          setMembers(prevMembers =>
            prevMembers.map(member =>
              member.id === userId ? { ...member, id: newRandomUuid, email: originalEmail } : member
            )
          );

          if (editingMember && editingMember.id === userId) {
              setEditingMember({ ...editingMember, id: newRandomUuid, email: originalEmail });
          }

          alert(`🎉【${userFullName}】已強制解除綁定！\n信箱已恢復為：${originalEmail}\nID已重置。她下次登入系統時，將會重新彈出『首次帳號核對綁定』視窗，讓她自己重新帳號媒合。`);

      } catch (error) {
          console.error("解鎖綁定失敗:", error)
          alert('❌ 解鎖綁定失敗 (可能受限於資料庫約束)：' + error.message);
      } finally {
          setIsUnlockLoading(false);
      }
  }

  function getPriorityScore(m) {
      let score = 0
      if (m.is_vip === 'Y') score += 9999              
      if (m.is_team_leader === 'Y') score += 40        
      if (m.is_new_member === 'Y') score += 30         
      if (m.training_status === 'Y') score += 20       
      if (m.is_current_member === 'Y') score += 10     
      return score
  }

  const renderPriorityIcon = (m) => {
      const tags = [];
      if (m.is_vip === 'Y') {
          tags.push(<span key="vip" className="flex items-center text-[10px] text-amber-600 font-black bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"><Crown size={12} className="mr-1"/> VIP</span>);
      }
      if (m.is_team_leader === 'Y') {
          tags.push(<span key="leader" className="flex items-center text-[10px] text-red-600 font-black bg-red-50 border border-red-200 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"><Flame size={12} className="mr-1"/> 帶隊官</span>);
      }
      if (m.is_new_member === 'Y') {
          tags.push(<span key="newbie" className="flex items-center text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"><Activity size={12} className="mr-1"/> 新人</span>);
      }
      if (m.training_status === 'Y') {
          tags.push(<span key="training" className="flex items-center text-[10px] text-blue-600 font-bold bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded shadow-sm whitespace-nowrap"><Zap size={12} className="mr-1"/> 訓練</span>);
      }
      if (m.is_current_member === 'Y' && tags.length === 0) {
          tags.push(<span key="current" className="flex items-center text-[10px] text-slate-500 font-bold bg-slate-50 border border-slate-200 px-1.5 py-0.5 rounded whitespace-nowrap"><CheckCircle size={12} className="mr-1"/> 當屆</span>);
      }
      if (tags.length === 0) {
          tags.push(<span key="normal" className="flex items-center text-[10px] text-slate-400 whitespace-nowrap"><Cloud size={12} className="mr-1"/> 一般</span>);
      }

      return <div className="flex flex-wrap items-center gap-1.5">{tags}</div>;
  }

  const addToCart = () => {
      const newCart = new Set(exportCart); selectedIds.forEach(id => newCart.add(id)); setExportCart(newCart); setSelectedIds(new Set()); alert(`已加入 ${selectedIds.size} 人。目前共 ${newCart.size} 人待匯出。`)
  }
  const toggleSelection = (id) => { const newSet = new Set(selectedIds); if (newSet.has(id)) newSet.delete(id); else newSet.add(id); setSelectedIds(newSet) }
  const toggleSelectAll = () => { if (selectedIds.size === members.length) setSelectedIds(new Set()); else setSelectedIds(new Set(members.map(m => m.id))) }
  
  const handleDelete = async (id) => { 
      if(window.confirm('系統確認：確定要停權/刪除此會員嗎？\n\n(此操作將會把會員移至停權黑名單，並在系統備註中留下刪除紀錄，以確保資料安全性)')) { 
          
          const memberToDelete = members.find(m => m.id === id);
          if (!memberToDelete) return;

          const today = new Date().toISOString().split('T')[0];
          const currentNote = memberToDelete.admin_note || '';
          const newNote = currentNote ? `${currentNote}\n[系統紀錄] 人員已於 ${today} 刪除/停權` : `[系統紀錄] 人員已於 ${today} 刪除/停權`;

          try {
              const { error } = await supabase.from('profiles').update({
                  is_blacklisted: 'Y',
                  admin_note: newNote
              }).eq('id', id);

              if (error) throw error;

              if (currentView !== 'BLACKLIST') {
                  setMembers(prev => prev.filter(m => m.id !== id));
              } else {
                  fetchMembers(); 
              }
              
              fetchGlobalStats(); 
              alert('系統訊息：人員已成功標記為停權/刪除，並保留歷史紀錄。');

          } catch (err) {
              console.error('刪除作業失敗:', err);
              alert('刪除作業發生異常：' + err.message);
          }
      } 
  }
  
  const handleFileUpload = async(e) => {  }
  
  const generateExcel = (cartData, filename) => {
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
      XLSX.writeFile(wb, filename)
  }

  const handleExportCart = async() => { 
    if (exportCart.size === 0) return alert("匯出清單為空。")
    setExporting(true)
    try {
        const { data: cartData, error } = await supabase.from('profiles').select('*').in('id', Array.from(exportCart)).order('created_at', { ascending: false })
        if (error) throw error

        generateExcel(cartData, `IronMedic_Selected_${new Date().toISOString().slice(0,10)}.xlsx`)
        
        setIsCartModalOpen(false)
        setExportCart(new Set())
    } catch (err) { alert('系統匯出失敗: ' + err.message) } finally { setExporting(false) }
  }

  const handleExportAll = async() => {
      if(!window.confirm(`確定要匯出目前【${currentView}】分類下的所有人員資料嗎？\n(這將無視分頁，打包整個資料庫區塊)`)) return;
      setExportingAll(true);
      
      try {
          let query = supabase.from('profiles').select('*').order('created_at', { ascending: false })
          
          if (currentView !== 'BLACKLIST') {
              query = query.or('is_blacklisted.is.null,is_blacklisted.eq.N');
          }

          if (currentView === 'COMMAND') {
              query = query.or('role.eq.SUPER_ADMIN,role.eq.TOURNAMENT_DIRECTOR,is_vip.eq.Y');
          } 
          else if (currentView === 'ACTIVE') {
              query = query.or('role.eq.VERIFIED_MEDIC,role.eq.TOURNAMENT_DIRECTOR,role.eq.SUPER_ADMIN');
          } 
          else if (currentView === 'RESERVE') {
              query = query.or('role.eq.USER,role.is.null');
          } 
          else if (currentView === 'RISK') {
              query = query.lt('license_expiry', new Date().toISOString().slice(0,10));
          } 
          else if (currentView === 'BLACKLIST') {
              query = query.eq('is_blacklisted', 'Y');
          }

          // 🌟 同樣在匯出時進行智慧判斷，保護資料庫防呆
          if (searchTerm) {
              const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(searchTerm);
              if (isUUID) {
                  query = query.eq('id', searchTerm);
              } else {
                  query = query.or(`email.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,national_id.ilike.%${searchTerm}%`);
              }
          }

          const { data: allData, error } = await query;
          if (error) throw error;
          
          if(allData.length === 0) return alert("此分類下沒有任何資料可匯出。");

          generateExcel(allData, `IronMedic_All_${currentView}_${new Date().toISOString().slice(0,10)}.xlsx`)
          alert(`✅ 成功匯出 ${allData.length} 筆資料！`);
          
      } catch (err) { alert('全庫匯出失敗: ' + err.message) } finally { setExportingAll(false) }
  }

  const handleFieldChange = useCallback((name, value) => {
      setEditingMember(prev => ({ ...prev, [name]: value }));
  }, []);

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
                <p className="text-sm text-slate-500">系統資料庫檢視模式 V10.9.2 (左側凍結排版)</p>
            </div>
            <div className="flex gap-2 items-center">
                 <button onClick={() => navigate('/admin/import')} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold hover:bg-slate-200 shadow-sm flex items-center gap-1"><FileSpreadsheet size={16}/> 前往匯入中心</button>
                 <button onClick={() => setIsColumnConfigOpen(!isColumnConfigOpen)} className={`px-4 py-2 rounded-lg font-bold transition-all ${isColumnConfigOpen ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>欄位配置</button>
                 
                 <button onClick={handleExportAll} disabled={exportingAll} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md shadow-indigo-600/30 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50">
                     {exportingAll ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
                     匯出本頁全庫
                 </button>

                 <button onClick={() => setIsCartModalOpen(true)} className={`px-4 py-2 rounded-lg font-bold shadow transition-all ${exportCart.size > 0 ? 'bg-green-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                     選擇匯出購物車 ({exportCart.size})
                 </button>
            </div>
        </div>
        
        {/* 狀態統計卡 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in-down">
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

            <div onClick={() => handleCardClick('BLACKLIST')} className={`border p-3 rounded-xl flex items-center gap-3 cursor-pointer transition-all group ${currentView==='BLACKLIST'?'bg-slate-800 border-slate-900 ring-2 ring-slate-500':'bg-white border-slate-200 hover:bg-slate-100'}`}>
                <div className={`${currentView==='BLACKLIST'?'bg-slate-700':'bg-slate-800'} text-white p-2 rounded-lg group-hover:scale-110 transition-transform`}><Ban size={20}/></div>
                <div><div className={`text-xs font-bold uppercase ${currentView==='BLACKLIST'?'text-slate-400':'text-slate-500'}`}>停權人員</div><div className={`text-xl font-black transition-all ${currentView==='BLACKLIST'?'text-white':'text-slate-800'}`}>{roleStats.BLACKLISTED}</div></div>
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

      {/* 🌟 真・即時漸進式過濾搜尋列 (無懸浮卡片，直接反應在下方表格) */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Search className="h-5 w-5 text-slate-400" />
              </div>
              <input 
                  type="text" 
                  autoComplete="off"
                  placeholder="超級搜尋：輸入姓名、Email、電話、身分證字號..." 
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all font-bold text-slate-700 shadow-sm" 
                  value={searchInput} 
                  onChange={e => setSearchInput(e.target.value)}
              />
              {searchInput && (
                  <button 
                      onClick={() => { setSearchInput(''); setSearchTerm(''); }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-red-500 transition-colors"
                      title="清除搜尋"
                  >
                      <XCircle size={20} />
                  </button>
              )}
          </div>
      </div>

      {/* 批次操作列 */}
      {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-4 animate-bounce-in">
              <span className="font-bold text-sm">已選擇 {selectedIds.size} 筆</span>
              <button onClick={addToCart} className="font-bold text-sm flex items-center hover:text-green-400"><PlusCircle size={16} className="mr-1"/> 加入匯出清單</button>
              <button onClick={() => setSelectedIds(new Set())}><X size={18}/></button>
          </div>
      )}

      {/* 資料表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden overflow-x-auto relative">
         <table className="w-full text-left whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-bold cursor-pointer select-none">
                <tr>
                    <th className="px-4 py-2.5 w-12 text-center sticky left-0 z-20 bg-slate-50 shadow-[1px_0_0_#e2e8f0]">
                        <button onClick={toggleSelectAll}><CheckSquare size={18}/></button>
                    </th>
                    <th className="px-4 py-2.5 w-24 text-center sticky left-[48px] z-20 bg-slate-50 shadow-[2px_0_5px_rgba(0,0,0,0.06)]">
                        管理作業
                    </th>
                    
                    <th className="px-4 py-2.5 w-48 bg-slate-50 hover:bg-slate-100" onClick={() => handleSort('full_name')}>
                        <div className="flex items-center gap-1">基本資料 (Name/Email) {sortConfig.key==='full_name' && <ArrowUpDown size={14}/>}</div>
                    </th>
                    
                    {columnGroups.group1_general && <th className="px-4 py-2.5 bg-blue-50/50 text-blue-700 hover:bg-blue-100/50" onClick={() => handleSort('medical_license')}>
                        <div className="flex items-center gap-1">大會資料 (證照/血型) {sortConfig.key==='medical_license' && <ArrowUpDown size={14}/>}</div>
                    </th>}
                    
                    {columnGroups.group2_event && <th className="px-4 py-2.5 bg-red-50/50 text-red-700 hover:bg-red-100/50" onClick={() => handleSort('priority')}>
                        <div className="flex items-center gap-1">狀態與優先順序 {sortConfig.key==='priority' && <ArrowUpDown size={14}/>}</div>
                    </th>}
                    
                    {columnGroups.group3_logistics && <th className="px-4 py-2.5 bg-amber-50/50 text-amber-700 hover:bg-amber-100/50">後勤資訊 (尺寸/交通/住宿/緊急聯絡人)</th>}
                    {columnGroups.group4_ext && <th className="px-4 py-2.5 bg-purple-50/50 text-purple-700">擴充註記 (Admin Note)</th>}
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
                {sortedMembers.map((member) => {
                    const isSelected = selectedIds.has(member.id)
                    const isInCart = exportCart.has(member.id)
                    const isBlacklisted = member.is_blacklisted === 'Y'

                    const rowBgClass = isBlacklisted ? 'bg-slate-50 opacity-60 hover:opacity-100' : isSelected ? 'bg-blue-50' : isInCart ? 'bg-green-50/50' : 'bg-white hover:bg-slate-50';
                    const stickyBgClass = isBlacklisted ? 'bg-slate-50' : isSelected ? 'bg-blue-50' : isInCart ? 'bg-green-50' : 'bg-white group-hover:bg-slate-50';

                    return (
                    <tr key={member.id} className={`group transition-colors ${rowBgClass}`}>
                         <td className={`px-4 py-2.5 text-center sticky left-0 z-10 shadow-[1px_0_0_#e2e8f0] transition-colors ${stickyBgClass}`}>
                             <button onClick={() => toggleSelection(member.id)}><CheckSquare size={20} className={isSelected ? 'text-blue-600' : 'text-slate-300 hover:text-blue-400'}/></button>
                         </td>
                         
                         <td className={`px-4 py-2.5 text-center sticky left-[48px] z-10 shadow-[2px_0_5px_rgba(0,0,0,0.04)] transition-colors ${stickyBgClass}`}>
                             <div className="flex justify-center gap-2">
                                 <button onClick={() => handleEditClick(member)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors border border-transparent hover:border-blue-200 shadow-sm bg-white/80" title="編輯會員紀錄"><Edit size={16}/></button>
                                 {!isBlacklisted && (
                                     <button onClick={() => handleDelete(member.id)} className="p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-200 shadow-sm bg-white/80" title="刪除並加入停權名單"><Trash2 size={16}/></button>
                                 )}
                             </div>
                         </td>
                         
                         <td className="px-4 py-2.5">
                             <div className="font-bold text-slate-800 flex items-center gap-2">
                                 {member.full_name}
                                 {isBlacklisted && <Ban size={14} className="text-slate-500" title="已停權"/>}
                                 {member.is_vip === 'Y' && !isBlacklisted && <Crown size={14} className="text-amber-500" title="VIP"/>}
                                 {isInCart && <ShoppingCart size={14} className="text-green-600" title="待匯出"/>}
                             </div>
                             <div className="text-xs text-slate-400 font-mono">{member.email}</div>
                             <div className="text-[10px] text-slate-500 mt-1">{member.phone || '無聯絡電話'}</div>
                         </td>

                         {columnGroups.group1_general && <td className="px-4 py-2.5 text-sm text-slate-600">
                             <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">{member.medical_license || '未提供證照資料'}</span>
                                 {member.blood_type && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">{member.blood_type}</span>}
                             </div>
                             <div className="text-xs text-slate-500">ID: {member.national_id || '-'}</div>
                         </td>}

                         {columnGroups.group2_event && <td className="px-4 py-2.5">
                             {isBlacklisted ? (
                                 <span className="flex items-center text-slate-500 font-bold bg-slate-200 px-2 py-1 rounded w-max"><Ban size={16} className="mr-1"/> 帳號已停權</span>
                             ) : (
                                 <>
                                     <div className="mb-1">{renderPriorityIcon(member)}</div>
                                     <div className="flex gap-2 items-center mt-1 flex-wrap">
                                         <span className="text-[10px] font-bold text-slate-500 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                             {member.role === 'VERIFIED_MEDIC' ? '醫護鐵人' : member.role === 'USER' ? '一般會員' : member.role}
                                         </span>
                                     </div>
                                 </>
                             )}
                         </td>}

                         {columnGroups.group3_logistics && <td className="px-4 py-2.5 text-sm">
                             <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold" title="衣服尺寸">👕 {member.shirt_size || '?'}</span>
                                 <span className="text-xs text-slate-500" title="交通/住宿">{member.transport_pref || '-'} / {member.stay_pref || '-'}</span>
                             </div>
                             {member.emergency_name && (
                                 <div className="text-[10px] text-red-500 flex items-center gap-1 mt-1">
                                     <ShieldAlert size={10}/> {member.emergency_name} ({member.emergency_phone})
                                 </div>
                             )}
                             <div className="text-[10px] text-slate-400 truncate w-40 mt-1" title={member.address}>{member.address || '無聯絡地址'}</div>
                         </td>}

                         {columnGroups.group4_ext && <td className="px-4 py-2.5 text-xs text-purple-600 font-medium whitespace-normal min-w-[200px]">
                             <div className="bg-purple-50 p-2 rounded-lg line-clamp-2" title={member.admin_note}>{member.admin_note || '無註記資訊'}</div>
                         </td>}
                    </tr>
                )})}
            </tbody>
         </table>
      </div>

      {/* 分頁控制 */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200 mt-4">
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-bold text-slate-600 transition-colors">上一頁</button>
          <span className="font-bold text-slate-600 bg-slate-50 px-4 py-1.5 rounded-lg border border-slate-200">第 {page} 頁，共 {totalPages || 1} 頁</span>
          <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-slate-100 rounded-lg hover:bg-slate-200 disabled:opacity-50 font-bold text-slate-600 transition-colors">下一頁</button>
      </div>

      {/* CRM 編輯面板 */}
      {isEditModalOpen && editingMember && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[100] p-4 animate-fade-in backdrop-blur-sm" onClick={handleCloseEditModal}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
                  
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                      <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                          <UserCheck className="text-blue-600"/> 會員資料管理中心
                          <span className="text-xs font-bold text-slate-500 bg-white px-2 py-1 rounded border shadow-sm ml-2">系統 ID: {editingMember.id.substring(0,8)}</span>
                      </h3>
                      <button onClick={handleCloseEditModal} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
                  </div>

                  {/* Body */}
                  <div className="p-6 overflow-y-auto custom-scrollbar bg-slate-50 flex-1">
                      
                      {highlightFields.length > 0 && (
                          <div className="mb-6 bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-3 shadow-sm animate-bounce-in">
                              <Zap size={20} className="text-amber-500 shrink-0 mt-0.5"/>
                              <div>
                                  <div className="text-sm font-black text-amber-800">智慧異動高亮提醒</div>
                                  <div className="text-xs font-bold text-amber-600/80 mt-1">
                                      系統已將該會員近期變更的資料欄位特別標示 (橘黃色高亮)。請審核後點擊儲存以完成更新。
                                  </div>
                              </div>
                          </div>
                      )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {/* 左欄：核心資料 */}
                          <div className="space-y-6">
                              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                  <h4 className="font-black text-slate-800 border-b pb-2 flex items-center gap-2"><User size={16} className="text-indigo-500"/> 核心基本資料</h4>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                      <FieldEditor label="中文姓名" name="full_name" value={editingMember.full_name} onChange={handleFieldChange} isHighlighted={highlightFields.includes('full_name')} />
                                      <FieldEditor label="英文姓名" name="english_name" value={editingMember.english_name} onChange={handleFieldChange} isHighlighted={highlightFields.includes('english_name')} />
                                  </div>
                                  
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">登入帳號 Email (無法修改)</label>
                                      <input className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-100 text-slate-500 font-mono text-sm cursor-not-allowed" disabled value={editingMember.email || ''}/>
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                      <FieldEditor label="身分證字號" name="national_id" value={editingMember.national_id} onChange={handleFieldChange} isHighlighted={highlightFields.includes('national_id')} />
                                      <FieldEditor label="性別" name="gender" type="select" options={['男', '女']} value={editingMember.gender} onChange={handleFieldChange} isHighlighted={highlightFields.includes('gender')} />
                                  </div>

                                  <div className="grid grid-cols-2 gap-4">
                                      <FieldEditor label="出生年月日" name="birthday" type="date" value={editingMember.birthday} onChange={handleFieldChange} isHighlighted={highlightFields.includes('birthday')} />
                                      <FieldEditor label="連絡電話" name="phone" value={editingMember.phone} onChange={handleFieldChange} isHighlighted={highlightFields.includes('phone')} />
                                  </div>
                                  <FieldEditor label="聯絡信箱" name="contact_email" type="email" value={editingMember.contact_email} onChange={handleFieldChange} isHighlighted={highlightFields.includes('contact_email')} />
                                  <FieldEditor label="通訊地址" name="address" value={editingMember.address} onChange={handleFieldChange} isHighlighted={highlightFields.includes('address')} />
                              </div>

                              <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-sm space-y-4">
                                  <h4 className="font-black text-blue-900 border-b border-blue-200 pb-2 flex items-center gap-2"><Shield size={16} className="text-blue-500"/> 系統權限狀態</h4>
                                  
                                  <div>
                                      <label className="block text-xs font-bold text-slate-500 mb-1">身分配置 (Role)</label>
                                      <select className="w-full border border-slate-300 p-2.5 rounded-lg outline-none font-bold bg-white focus:ring-2 focus:ring-blue-500" 
                                          value={editingMember.role || 'USER'} 
                                          onChange={e => setEditingMember({...editingMember, role: e.target.value})}>
                                          <option value="USER">⚪ 一般人員 (USER)</option>
                                          <option value="VERIFIED_MEDIC">🟢 醫護鐵人 (VERIFIED_MEDIC)</option>
                                          <option value="TOURNAMENT_DIRECTOR">🔵 賽事總監 (DIRECTOR)</option>
                                          <option value="SUPER_ADMIN">🔴 系統管理員 (ADMIN)</option>
                                      </select>
                                  </div>

                                  <div className="grid grid-cols-2 gap-3 bg-white p-3 rounded-lg border border-slate-200">
                                      <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-slate-50 rounded">
                                          <input type="checkbox" className="w-4 h-4 accent-blue-600" checked={editingMember.is_current_member === 'Y'} onChange={e => setEditingMember({...editingMember, is_current_member: e.target.checked ? 'Y' : 'N'})}/>
                                          <span className="font-bold text-sm text-slate-700">當屆會籍資格</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-amber-50 rounded">
                                          <input type="checkbox" className="w-4 h-4 accent-amber-500" checked={editingMember.is_vip === 'Y'} onChange={e => setEditingMember({...editingMember, is_vip: e.target.checked ? 'Y' : 'N'})}/>
                                          <span className="font-bold text-sm text-amber-700 flex items-center gap-1"><Crown size={14}/> 核心幹部 (VIP)</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-indigo-50 rounded">
                                          <input type="checkbox" className="w-4 h-4 accent-indigo-500" checked={editingMember.is_team_leader === 'Y'} onChange={e => setEditingMember({...editingMember, is_team_leader: e.target.checked ? 'Y' : 'N'})}/>
                                          <span className="font-bold text-sm text-indigo-700">帶隊教官資格</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-green-50 rounded">
                                          <input type="checkbox" className="w-4 h-4 accent-green-500" checked={editingMember.is_new_member === 'Y'} onChange={e => setEditingMember({...editingMember, is_new_member: e.target.checked ? 'Y' : 'N'})}/>
                                          <span className="font-bold text-sm text-green-700">新人身份標記</span>
                                      </label>
                                      <label className="flex items-center gap-2 cursor-pointer p-1 hover:bg-blue-50 rounded col-span-2 border-t pt-2 mt-1">
                                          <input type="checkbox" className="w-4 h-4 accent-blue-500" checked={editingMember.training_status === 'Y'} onChange={e => setEditingMember({...editingMember, training_status: e.target.checked ? 'Y' : 'N'})}/>
                                          <span className="font-bold text-sm text-blue-700 flex items-center gap-1"><Activity size={14}/> 本年度訓練結業狀態</span>
                                      </label>
                                  </div>
                              </div>
                          </div>

                          {/* 右欄：後勤與備註 */}
                          <div className="space-y-6">
                              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                  <h4 className="font-black text-slate-800 border-b pb-2 flex items-center gap-2"><HeartPulse size={16} className="text-rose-500"/> 後勤與醫療資訊</h4>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                      <FieldEditor label="醫護證照級別" name="medical_license" type="select" options={['EMT-1', 'EMT-2', 'EMTP', '醫師', '醫療線上護理師']} value={editingMember.medical_license} onChange={handleFieldChange} isHighlighted={highlightFields.includes('medical_license')} />
                                      <FieldEditor label="證照有效期限" name="license_expiry" type="date" value={editingMember.license_expiry} onChange={handleFieldChange} isHighlighted={highlightFields.includes('license_expiry')} />
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-4">
                                      <FieldEditor label="血型" name="blood_type" type="select" options={['A', 'B', 'O', 'AB', '未知']} value={editingMember.blood_type} onChange={handleFieldChange} isHighlighted={highlightFields.includes('blood_type')} />
                                      <FieldEditor label="服裝尺寸" name="shirt_size" type="select" options={['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL']} value={editingMember.shirt_size} onChange={handleFieldChange} isHighlighted={highlightFields.includes('shirt_size')} />
                                  </div>

                                  <FieldEditor label="特殊病史註記" name="medical_history" value={editingMember.medical_history} onChange={handleFieldChange} isHighlighted={highlightFields.includes('medical_history')} />

                                  <div className="grid grid-cols-2 gap-4">
                                      <FieldEditor label="交通需求" name="transport_pref" type="select" options={['自行前往', '需要共乘', '搭乘大眾運輸']} value={editingMember.transport_pref} onChange={handleFieldChange} isHighlighted={highlightFields.includes('transport_pref')} />
                                      <FieldEditor label="住宿安排" name="stay_pref" type="select" options={['自行處理', '需要代訂']} value={editingMember.stay_pref} onChange={handleFieldChange} isHighlighted={highlightFields.includes('stay_pref')} />
                                  </div>
                              </div>

                              <div className="bg-rose-50/50 p-5 rounded-xl border border-rose-100 shadow-sm space-y-4">
                                  <h4 className="font-black text-rose-900 border-b border-rose-200 pb-2 flex items-center gap-2"><AlertCircle size={16} className="text-rose-500"/> 緊急聯繫資訊</h4>
                                  <FieldEditor label="緊急聯絡人" name="emergency_name" value={editingMember.emergency_name} onChange={handleFieldChange} isHighlighted={highlightFields.includes('emergency_name')} />
                                  <div className="grid grid-cols-2 gap-4">
                                      <FieldEditor label="關係" name="emergency_relation" value={editingMember.emergency_relation} onChange={handleFieldChange} isHighlighted={highlightFields.includes('emergency_relation')} />
                                      <FieldEditor label="聯絡電話" name="emergency_phone" value={editingMember.emergency_phone} onChange={handleFieldChange} isHighlighted={highlightFields.includes('emergency_phone')} />
                                  </div>
                              </div>

                              <div className="bg-amber-50/50 p-5 rounded-xl border border-amber-100 shadow-sm space-y-2 relative">
                                  <h4 className="font-black text-amber-900 border-b border-amber-200 pb-2 flex items-center gap-2"><Settings size={16} className="text-amber-600"/> 系統內部備註 (僅管理員可見)</h4>
                                  
                                  <div className="flex items-center gap-2 mb-2">
                                      <label className="flex items-center gap-2 cursor-pointer p-1.5 hover:bg-amber-100/50 rounded-lg">
                                          <input type="checkbox" className="w-4 h-4 accent-slate-800" checked={editingMember.is_blacklisted === 'Y'} onChange={e => setEditingMember({...editingMember, is_blacklisted: e.target.checked ? 'Y' : 'N'})}/>
                                          <span className="font-black text-sm text-slate-800 flex items-center gap-1"><Ban size={14}/> 將此會員標記為停權(黑名單)</span>
                                      </label>
                                  </div>

                                  <textarea 
                                      className="w-full border border-amber-200 p-3 rounded-lg outline-none focus:ring-2 focus:ring-amber-400 bg-white resize-none text-sm font-medium" 
                                      rows="3" 
                                      placeholder="紀錄查核、停權或其他相關系統備註事項..."
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
                          {savingMember ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} 儲存變更
                      </button>
                      <button onClick={handleCloseEditModal} disabled={savingMember} className="w-1/3 bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl hover:bg-slate-200 transition-colors active:scale-95 disabled:opacity-50">放棄並返回</button>
                  </div>
                  
                  {/* ⚡【新增】上帝捷徑：強制解除帳號綁定 (重置帳號媒合) */}
                  <div className="bg-slate-50 p-5 flex flex-col gap-3 rounded-b-[2rem]">
                      <button 
                          onClick={() => handleForceUnlockBinding(editingMember.id, editingMember.full_name)} 
                          disabled={isUnlockLoading}
                          className="w-full py-3 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 font-black rounded-xl transition-all flex justify-center items-center gap-2 active:scale-95 disabled:opacity-50"
                      >
                          {isUnlockLoading ? <Loader2 className="animate-spin" size={16}/> : <Zap size={16}/>} ⚡ 強制解除帳號綁定 (重置帳號媒合狀態)
                      </button>
                  </div>

              </div>
          </div>
      )}

      {/* 匯出購物車 Modal */}
      {isCartModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[110] backdrop-blur-sm animate-fade-in" onClick={() => setIsCartModalOpen(false)}>
             <div className="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full animate-bounce-in" onClick={e => e.stopPropagation()}>
                 <div className="w-16 h-16 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 mx-auto"><Download size={32}/></div>
                 <h3 className="font-black text-2xl mb-3 text-center text-slate-800">匯出選擇資料</h3>
                 <p className="mb-8 text-slate-500 text-sm text-center leading-relaxed">即將匯出您勾選的 {exportCart.size} 位人員的 A~AO 全部欄位（Excel 格式），方便您進行離線處理。</p>
                 <button disabled={exporting} className="w-full font-black bg-green-600 hover:bg-green-700 text-white py-4 rounded-xl mb-3 flex items-center justify-center gap-2 transition-all shadow-lg shadow-green-600/30 disabled:opacity-50 active:scale-95" onClick={handleExportCart}>
                     {exporting ? <Loader2 className="animate-spin" size={20}/> : <><FileSpreadsheet size={20}/> 執行匯出作業</>}
                 </button>
                 <button className="w-full font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 py-4 rounded-xl transition-colors active:scale-95" onClick={()=>setIsCartModalOpen(false)}>關閉視窗</button>
             </div>
          </div>
      )}
    </div>
  )
}