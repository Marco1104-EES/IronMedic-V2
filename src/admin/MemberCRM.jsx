import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { VIP_ROSTER, DEFAULT_USER } from '../constants/roleConfig'
import { 
  Search, User, Mail, Phone, Shield, Edit2, Save, X, 
  ChevronLeft, ChevronRight, Loader2 
} from 'lucide-react'

export default function MemberCRM() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('') // 搜尋關鍵字
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 20

  const [editingMember, setEditingMember] = useState(null)
  const [editForm, setEditForm] = useState({})

  // 🔥 核子級搜尋核心：當 searchTerm 或 page 改變時，自動觸發
  useEffect(() => {
    // 防抖動機制 (Debounce)：手指離開鍵盤 300ms 後才發射，避免資料庫過熱
    const delaySearch = setTimeout(() => {
        fetchMembers()
    }, 300)

    return () => clearTimeout(delaySearch)
  }, [searchTerm, page])

  const fetchMembers = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1)

      // 🔍 搜尋邏輯：只要有字，就立刻過濾
      if (searchTerm) {
        // 使用 ilike 進行模糊比對 (姓名、Email、電話、身分證)
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,id_number.ilike.%${searchTerm}%`)
      }

      const { data, count, error } = await query

      if (error) throw error
      setMembers(data || [])
      setTotalCount(count || 0)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  // 當使用者打字時，將頁碼歸零，確保從第一頁開始看
  const handleSearchInput = (e) => {
      setSearchTerm(e.target.value)
      setPage(0) 
  }

  // --- 編輯功能 (不變) ---
  const startEdit = (member) => {
      setEditingMember(member.id)
      setEditForm({ ...member })
  }

  const saveEdit = async () => {
      try {
          const { error } = await supabase
            .from('profiles')
            .update({
                full_name: editForm.full_name,
                phone: editForm.phone,
                email: editForm.email,
                uniform_size: editForm.uniform_size,
                id_number: editForm.id_number // 記得這裡也要能改
            })
            .eq('id', editingMember)

          if (error) throw error

          // 寫入稽核
          const { data: { user } } = await supabase.auth.getUser()
          await supabase.from('system_logs').insert([{
             level: 'WARNING',
             message: `修改資料: ${editForm.full_name}`,
             details: { target: editingMember, by: user.email, changes: editForm }
          }])

          alert('✅ 資料已更新')
          setEditingMember(null)
          fetchMembers() 
      } catch (err) {
          alert('失敗: ' + err.message)
      }
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE)

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <User className="mr-3 text-blue-600"/> 會員戰情中心 (CRM)
          </h2>
          <p className="text-slate-500 text-sm mt-1 font-bold">目前總兵力: <span className="text-blue-600">{totalCount}</span> 人</p>
        </div>
      </div>

      {/* 🔍 即時搜尋雷達 (無按鈕) */}
      <div className="relative group">
         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {loading ? <Loader2 size={20} className="text-blue-500 animate-spin"/> : <Search size={20} className="text-slate-400 group-focus-within:text-blue-500 transition-colors"/>}
         </div>
         <input 
           type="text" 
           placeholder="啟動即時搜尋：輸入姓名、Email、電話或身分證..." 
           value={searchTerm}
           onChange={handleSearchInput}
           className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none text-lg font-bold text-slate-800 shadow-sm transition-all placeholder:font-normal"
           autoFocus
         />
         <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none">
             <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-1 rounded">Real-time</span>
         </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-4 w-16">#</th>
                <th className="p-4">成員資訊</th>
                <th className="p-4">聯絡方式 / 身分證</th>
                <th className="p-4">尺寸</th>
                <th className="p-4">權限</th>
                <th className="p-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && members.length === 0 ? (
                <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold">雷達掃描中...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan="6" className="p-20 text-center text-slate-400">雷達範圍內無目標</td></tr>
              ) : (
                members.map((m, idx) => {
                  const isEditing = editingMember === m.id
                  const roleStyle = VIP_ROSTER[m.email] || DEFAULT_USER

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 text-slate-400 font-mono text-xs">{page * ITEMS_PER_PAGE + idx + 1}</td>
                      
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-3 border text-xs ${roleStyle.badge}`}>
                            {(m.full_name?.[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            {isEditing ? (
                                <input className="border-2 border-blue-400 rounded p-1 text-xs w-24 mb-1 font-bold" value={editForm.full_name} onChange={e=>setEditForm({...editForm, full_name: e.target.value})} autoFocus/>
                            ) : (
                                <p className="font-bold text-slate-800 text-base">{m.full_name || '未命名'}</p>
                            )}
                            <p className="text-[10px] text-slate-400 font-mono">ID: {m.id.slice(0,6)}</p>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-slate-600 text-xs font-medium">
                            <Mail size={12} className="mr-2 text-blue-400"/> 
                            {isEditing ? <input className="border rounded p-1 w-40" value={editForm.email} onChange={e=>setEditForm({...editForm, email: e.target.value})} /> : m.email}
                          </div>
                          <div className="flex items-center text-slate-600 text-xs">
                            <Phone size={12} className="mr-2 text-green-500"/> 
                            {isEditing ? <input className="border rounded p-1 w-32" value={editForm.phone} onChange={e=>setEditForm({...editForm, phone: e.target.value})} /> : (m.phone || '-')}
                          </div>
                           {/* 新增身分證顯示與編輯 */}
                          <div className="flex items-center text-slate-400 text-xs font-mono">
                            <Shield size={12} className="mr-2"/> 
                            {isEditing ? <input className="border rounded p-1 w-32" value={editForm.id_number} placeholder="身分證" onChange={e=>setEditForm({...editForm, id_number: e.target.value})} /> : (m.id_number || '未登錄')}
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                         {isEditing ? (
                             <input className="border rounded p-1 w-10 text-center font-bold" value={editForm.uniform_size} onChange={e=>setEditForm({...editForm, uniform_size: e.target.value})} />
                         ) : (
                             <span className="w-8 h-8 flex items-center justify-center bg-white text-slate-700 rounded-lg text-sm font-black border border-slate-200 shadow-sm">{m.uniform_size || '-'}</span>
                         )}
                      </td>

                      <td className="p-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold border ${roleStyle.badge}`}>
                          {roleStyle.rank}
                        </span>
                      </td>

                      <td className="p-4 text-center">
                        {isEditing ? (
                            <div className="flex justify-center gap-2">
                                <button onClick={saveEdit} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-md transition-transform active:scale-90"><Save size={16}/></button>
                                <button onClick={() => setEditingMember(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300 transition-transform active:scale-90"><X size={16}/></button>
                            </div>
                        ) : (
                            <button onClick={() => startEdit(m)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                                <Edit2 size={18}/>
                            </button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* 分頁器 */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center sticky bottom-0">
            <span className="text-xs text-slate-500 font-bold">
                第 {page + 1} 頁 / 共 {totalPages || 1} 頁
            </span>
            <div className="flex gap-2">
                <button 
                    disabled={page === 0}
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-sm font-bold text-slate-600 shadow-sm"
                >
                    上一頁
                </button>
                <button 
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage(p => p + 1)}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-50 text-sm font-bold text-slate-600 shadow-sm"
                >
                    下一頁
                </button>
            </div>
        </div>
      </div>
    </div>
  )
}