import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { VIP_ROSTER, DEFAULT_USER } from '../constants/roleConfig'
import { 
  Search, User, Mail, Phone, Shield, Edit2, Save, X, 
  Loader2, Database, Calendar, MapPin, HeartPulse, Award, Star, Zap
} from 'lucide-react'

// 教官職位定義
const INSTRUCTOR_ROLES = [
    { key: 'TEAM_LEADER', label: '帶隊教官', color: 'bg-indigo-100 text-indigo-700 border-indigo-300' },
    { key: 'MEDIC_INSTRUCTOR', label: '醫護教官', color: 'bg-rose-100 text-rose-700 border-rose-300' },
    { key: 'TRACK_INSTRUCTOR', label: '賽道教官', color: 'bg-amber-100 text-amber-700 border-amber-300' },
]

// 優先權定義
const PRIORITY_STATUS = [
    { key: 'NEW_MEMBER', label: '新加入會員', color: 'bg-green-100 text-green-700' },
    { key: 'TRAINED', label: '大會受訓', color: 'bg-purple-100 text-purple-700' },
    { key: 'GENERAL', label: '一般報名', color: 'bg-slate-100 text-slate-600' },
]

export default function MemberCRM() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('') 
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const ITEMS_PER_PAGE = 20

  const [editingMember, setEditingMember] = useState(null)
  const [editForm, setEditForm] = useState({})
  const [debugMsg, setDebugMsg] = useState('系統就緒')

  useEffect(() => {
    const delaySearch = setTimeout(() => { fetchMembers() }, 500)
    return () => clearTimeout(delaySearch)
  }, [searchTerm, page])

  const fetchMembers = async () => {
    setLoading(true)
    setDebugMsg(`正在搜尋: "${searchTerm}"...`)
    try {
      let query = supabase.from('profiles').select('*', { count: 'exact' }).order('created_at', { ascending: false })
      if (searchTerm) query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%,id_number.ilike.%${searchTerm}%`)
      const from = page * ITEMS_PER_PAGE
      const to = (page + 1) * ITEMS_PER_PAGE - 1
      query = query.range(from, to)
      const { data, count, error } = await query
      if (error) throw error
      setMembers(data || [])
      setTotalCount(count || 0)
      setDebugMsg(`✅ 搜尋完成。本頁 ${data?.length || 0} 筆`)
    } catch (error) { setDebugMsg(`❌ 搜尋失敗: ${error.message}`) } finally { setLoading(false) }
  }

  const startEdit = (member) => {
      setEditingMember(member.id)
      setEditForm({ ...member })
  }

  const saveEdit = async () => {
      try {
          const { error } = await supabase.from('profiles').update({
              full_name: editForm.full_name,
              phone: editForm.phone,
              email: editForm.email,
              uniform_size: editForm.uniform_size,
              id_number: editForm.id_number,
              instructor_role: editForm.instructor_role, // 新欄位
              priority_status: editForm.priority_status // 新欄位
          }).eq('id', editingMember)

          if (error) throw error
          alert('✅ 資料已更新')
          setEditingMember(null)
          fetchMembers() 
      } catch (err) { alert('失敗: ' + err.message) }
  }

  const toggleInstructor = (roleKey) => {
      setEditForm(prev => ({ ...prev, instructor_role: prev.instructor_role === roleKey ? null : roleKey }))
  }

  const setPriority = (statusKey) => {
      setEditForm(prev => ({ ...prev, priority_status: statusKey }))
  }

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE) || 1

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center">
            <User className="mr-3 text-blue-600"/> 會員資料中心
          </h2>
          <p className="text-xs font-mono text-slate-500 mt-2 bg-slate-100 p-2 rounded flex items-center">
             <Database size={12} className="mr-2"/> {debugMsg}
          </p>
        </div>
      </div>

      <div className="relative group">
         <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            {loading ? <Loader2 size={20} className="text-blue-500 animate-spin"/> : <Search size={20} className="text-slate-400 group-focus-within:text-blue-500 transition-colors"/>}
         </div>
         <input type="text" placeholder="搜尋姓名、Email、電話、身分證..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setPage(0)}} className="w-full pl-12 pr-4 py-4 bg-white border-2 border-slate-200 rounded-xl font-bold"/>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-xs border-b border-slate-200">
              <tr>
                <th className="p-4 w-16">#</th>
                <th className="p-4">數位 ID 與身分</th>
                <th className="p-4">教官職位 / 優先權</th>
                <th className="p-4">聯絡資訊</th>
                <th className="p-4">尺寸</th>
                <th className="p-4 text-center">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && members.length === 0 ? (
                <tr><td colSpan="6" className="p-20 text-center text-slate-400 font-bold">讀取中...</td></tr>
              ) : members.length === 0 ? (
                <tr><td colSpan="6" className="p-20 text-center text-slate-400">查無資料</td></tr>
              ) : (
                members.map((m, idx) => {
                  const isEditing = editingMember === m.id
                  const instructor = INSTRUCTOR_ROLES.find(r => r.key === (isEditing ? editForm.instructor_role : m.instructor_role))
                  const priority = PRIORITY_STATUS.find(p => p.key === (isEditing ? editForm.priority_status : m.priority_status)) || PRIORITY_STATUS[2]

                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="p-4 text-slate-400 font-mono text-xs">{page * ITEMS_PER_PAGE + idx + 1}</td>
                      
                      {/* 數位 ID 區 */}
                      <td className="p-4">
                        <div className="flex items-center">
                          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg mr-4 border-2 shadow-sm ${instructor ? 'bg-yellow-400 text-slate-900 border-yellow-500' : 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                            {(m.full_name?.[0] || 'U').toUpperCase()}
                          </div>
                          <div>
                            {isEditing ? (
                                <input className="border-2 border-blue-400 rounded p-1 text-sm font-bold w-32 mb-1" value={editForm.full_name} onChange={e=>setEditForm({...editForm, full_name: e.target.value})} />
                            ) : (
                                <p className="font-bold text-slate-800 text-lg">{m.full_name || '未命名'}</p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono">ID: {m.id.slice(0,6)}</span>
                                {m.role === 'SUPER_ADMIN' && <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-bold">ADMIN</span>}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 教官與優先權 (直觀按鈕) */}
                      <td className="p-4">
                          {isEditing ? (
                              <div className="space-y-3">
                                  <div className="flex flex-wrap gap-2">
                                      {INSTRUCTOR_ROLES.map(role => (
                                          <button key={role.key} onClick={() => toggleInstructor(role.key)} className={`px-2 py-1 rounded text-[10px] font-bold border ${editForm.instructor_role === role.key ? role.color : 'bg-white border-slate-200 text-slate-400'}`}>
                                              {role.label}
                                          </button>
                                      ))}
                                  </div>
                                  <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
                                      {PRIORITY_STATUS.map(status => (
                                          <button key={status.key} onClick={() => setPriority(status.key)} className={`px-2 py-1 rounded-full text-[10px] font-bold border ${editForm.priority_status === status.key ? 'bg-blue-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}>
                                              {status.label}
                                          </button>
                                      ))}
                                  </div>
                              </div>
                          ) : (
                              <div className="space-y-2">
                                  {instructor ? (
                                      <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold border ${instructor.color}`}>
                                          <Star size={12} className="mr-1 fill-current"/> {instructor.label}
                                      </span>
                                  ) : <span className="text-xs text-slate-400">- 無教官職 -</span>}
                                  
                                  <div className="flex items-center">
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${priority.color}`}>
                                          {priority.key === 'GENERAL' ? '一般' : <Zap size={10} className="mr-1 fill-current"/>}
                                          {priority.label}
                                      </span>
                                  </div>
                              </div>
                          )}
                      </td>

                      <td className="p-4">
                        <div className="flex flex-col space-y-1">
                          <div className="flex items-center text-slate-600 text-xs font-medium"><Mail size={12} className="mr-2 text-blue-400"/> {isEditing ? <input className="border rounded p-1 w-32" value={editForm.email} onChange={e=>setEditForm({...editForm, email: e.target.value})} /> : m.email}</div>
                          <div className="flex items-center text-slate-600 text-xs"><Phone size={12} className="mr-2 text-green-500"/> {isEditing ? <input className="border rounded p-1 w-32" value={editForm.phone} onChange={e=>setEditForm({...editForm, phone: e.target.value})} /> : (m.phone || '-')}</div>
                        </div>
                      </td>

                      <td className="p-4">
                          {isEditing ? <input className="border rounded p-1 w-10 text-center font-bold" value={editForm.uniform_size} onChange={e=>setEditForm({...editForm, uniform_size: e.target.value})} /> : <span className="w-8 h-8 flex items-center justify-center bg-white text-slate-700 rounded-lg text-sm font-black border border-slate-200 shadow-sm">{m.uniform_size || '-'}</span>}
                      </td>

                      <td className="p-4 text-center">
                        {isEditing ? (
                            <div className="flex justify-center gap-2">
                                <button onClick={saveEdit} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 shadow-md"><Save size={16}/></button>
                                <button onClick={() => setEditingMember(null)} className="p-2 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"><X size={16}/></button>
                            </div>
                        ) : (
                            <button onClick={() => startEdit(m)} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={18}/></button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center sticky bottom-0">
            <span className="text-xs text-slate-500 font-bold">第 {page + 1} 頁 / 共 {totalPages} 頁 (總數: {totalCount})</span>
            <div className="flex gap-2">
                <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600">上一頁</button>
                <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-bold text-slate-600">下一頁</button>
            </div>
        </div>
      </div>
    </div>
  )
}