import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, User, Phone, Mail, Award, CheckCircle, AlertCircle, Edit, ArrowUpDown } from 'lucide-react'

// 內部小元件：編輯會員視窗 (Modal)
function EditMemberModal({ member, onClose, onSave }) {
  const [formData, setFormData] = useState({ ...member })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    // 儲存到資料庫
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        uniform_size: formData.uniform_size,
        citizen_id: formData.citizen_id
      })
      .eq('id', member.id)

    if (error) alert('更新失敗: ' + error.message)
    else {
      alert('更新成功！')
      onSave() // 通知外層重新抓資料
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-md">
        <h3 className="text-xl font-bold mb-4">編輯會員資料</h3>
        <div className="space-y-4">
          <div><label className="block text-sm font-bold text-gray-700">姓名</label><input name="full_name" value={formData.full_name || ''} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          <div><label className="block text-sm font-bold text-gray-700">身分證</label><input name="citizen_id" value={formData.citizen_id || ''} onChange={handleChange} className="w-full border p-2 rounded bg-gray-100" readOnly title="身分證是Key，不建議修改" /></div>
          <div><label className="block text-sm font-bold text-gray-700">手機</label><input name="phone" value={formData.phone || ''} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          <div><label className="block text-sm font-bold text-gray-700">Email</label><input name="email" value={formData.email || ''} onChange={handleChange} className="w-full border p-2 rounded" /></div>
          <div><label className="block text-sm font-bold text-gray-700">尺寸</label><input name="uniform_size" value={formData.uniform_size || ''} onChange={handleChange} className="w-full border p-2 rounded" /></div>
        </div>
        <div className="mt-6 flex justify-end space-x-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded">取消</button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">儲存</button>
        </div>
      </div>
    </div>
  )
}

// 主程式
export default function MemberCRM() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') 
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' }) // 排序設定
  const [editingMember, setEditingMember] = useState(null) // 正在編輯誰

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').limit(1000)
    setMembers(data || [])
    setLoading(false)
  }

  // 1. 排序邏輯
  const handleSort = (key) => {
    let direction = 'asc'
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc'
    }
    setSortConfig({ key, direction })
  }

  // 2. 資料處理 (搜尋 + 排序)
  const processedMembers = members
    .filter(m => {
      const term = searchTerm.toLowerCase()
      const match = (m.full_name?.toLowerCase().includes(term) || m.phone?.includes(term) || m.citizen_id?.includes(term))
      if (filter === 'valid') return match && m.citizen_id
      if (filter === 'invalid') return match && !m.citizen_id
      return match
    })
    .sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })

  // 表格標題元件 (可點擊排序)
  const SortableHeader = ({ label, sortKey, className = "" }) => (
    <th 
      className={`p-4 cursor-pointer hover:bg-gray-100 transition-colors select-none group ${className}`}
      onClick={() => handleSort(sortKey)}
    >
      <div className="flex items-center">
        {label}
        <ArrowUpDown size={14} className={`ml-1 text-gray-400 group-hover:text-blue-500 ${sortConfig.key === sortKey ? 'text-blue-600' : ''}`} />
      </div>
    </th>
  )

  return (
    <div className="bg-white rounded-lg shadow p-6 min-h-[500px]">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <User className="mr-2 text-blue-600" /> 會員戰情中心
          <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            {processedMembers.length} 人
          </span>
        </h2>
        {/* 按鈕區 (略，保持原樣) */}
      </div>

      <div className="relative mb-6">
        <input type="text" placeholder="🔍 搜尋..." className="w-full pl-12 pr-4 py-3 border rounded-xl outline-none shadow-sm" onChange={(e) => setSearchTerm(e.target.value)} />
        <Search className="absolute left-4 top-3.5 text-gray-400" size={24} />
      </div>

      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase font-medium border-b">
            <tr>
              <SortableHeader label="姓名" sortKey="full_name" />
              <SortableHeader label="身分證 / 手機" sortKey="citizen_id" />
              <SortableHeader label="Email" sortKey="email" />
              <SortableHeader label="尺寸" sortKey="uniform_size" />
              <SortableHeader label="狀態" sortKey="citizen_id" />
              <SortableHeader label="加入日期" sortKey="join_date" />
              <th className="p-4">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? <tr><td colSpan="7" className="p-8 text-center">載入中...</td></tr> : 
            processedMembers.map((member) => (
              <tr key={member.id} className="hover:bg-blue-50 transition-colors group">
                {/* ... (中間顯示欄位保持不變) ... */}
                <td className="p-4 font-bold">{member.full_name}</td>
                <td className="p-4"><div className="text-gray-600">{member.citizen_id}<br/>{member.phone}</div></td>
                <td className="p-4 text-gray-500">{member.email || '-'}</td>
                <td className="p-4 font-bold">{member.uniform_size}</td>
                <td className="p-4">{member.citizen_id ? <CheckCircle size={16} className="text-green-500"/> : <AlertCircle size={16} className="text-red-500"/>}</td>
                <td className="p-4">{member.join_date ? new Date(member.join_date).toLocaleDateString() : '-'}</td>
                
                {/* 操作按鈕 */}
                <td className="p-4">
                  <button 
                    onClick={() => setEditingMember(member)}
                    className="p-2 bg-white border border-gray-200 rounded-lg hover:bg-blue-50 hover:text-blue-600 text-gray-400 shadow-sm transition-all"
                    title="編輯資料"
                  >
                    <Edit size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 彈出視窗 */}
      {editingMember && (
        <EditMemberModal 
          member={editingMember} 
          onClose={() => setEditingMember(null)} 
          onSave={fetchMembers} 
        />
      )}
    </div>
  )
}