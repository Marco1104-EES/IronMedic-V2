import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, User, Phone, Mail, Award, CheckCircle, AlertCircle } from 'lucide-react'

export default function MemberCRM() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filter, setFilter] = useState('all') // all, valid, invalid

  useEffect(() => {
    fetchMembers()
  }, [])

  const fetchMembers = async () => {
    setLoading(true)
    // 抓取所有會員資料，並依照加入日期排序 (最新的在最上面)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1000) // 先抓 1000 筆，避免瀏覽器卡死

    if (error) {
      console.error('Error fetching members:', error)
    } else {
      setMembers(data || [])
    }
    setLoading(false)
  }

  // 搜尋與篩選邏輯
  const filteredMembers = members.filter(m => {
    const term = searchTerm.toLowerCase()
    const matchSearch = (
      (m.full_name && m.full_name.toLowerCase().includes(term)) || 
      (m.phone && m.phone.includes(term)) || 
      (m.citizen_id && m.citizen_id.toLowerCase().includes(term))
    )
    
    if (filter === 'valid') return matchSearch && m.citizen_id
    if (filter === 'invalid') return matchSearch && !m.citizen_id
    return matchSearch
  })

  return (
    <div className="bg-white rounded-lg shadow p-6 min-h-[500px]">
      {/* 標題與篩選區 */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <User className="mr-2 text-blue-600" /> 會員戰情中心
          <span className="ml-3 text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
            總數: {members.length}
          </span>
        </h2>
        <div className="flex space-x-2">
          <button 
            onClick={() => setFilter('all')} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            全部
          </button>
          <button 
            onClick={() => setFilter('valid')} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'valid' ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            有效會員
          </button>
          <button 
            onClick={() => setFilter('invalid')} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${filter === 'invalid' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            資料異常
          </button>
        </div>
      </div>

      {/* 搜尋列 */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="🔍 搜尋姓名、身分證、手機..."
          className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none shadow-sm text-lg"
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-4 top-3.5 text-gray-400" size={24} />
      </div>

      {/* 資料列表 (Table) */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase font-medium border-b">
            <tr>
              <th className="p-4 whitespace-nowrap">姓名</th>
              <th className="p-4 whitespace-nowrap">身分證 / 手機</th>
              <th className="p-4 whitespace-nowrap">Email (帳號)</th>
              <th className="p-4 whitespace-nowrap">尺寸</th>
              <th className="p-4 whitespace-nowrap">資料完整度</th>
              <th className="p-4 whitespace-nowrap">加入日期</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr><td colSpan="6" className="p-12 text-center text-gray-500 text-lg">數據載入中...</td></tr>
            ) : filteredMembers.length === 0 ? (
              <tr><td colSpan="6" className="p-12 text-center text-gray-400 text-lg">找不到相關資料</td></tr>
            ) : (
              filteredMembers.map((member) => (
                <tr key={member.id} className="hover:bg-blue-50 transition-colors group">
                  <td className="p-4 font-bold text-gray-800 flex items-center">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3 text-blue-600 font-bold text-lg border-2 border-white shadow-sm">
                      {member.full_name?.[0] || '?'}
                    </div>
                    <span className="text-base">{member.full_name || '未命名'}</span>
                  </td>
                  <td className="p-4 text-gray-600">
                    <div className="flex items-center mb-1">
                      <Award size={16} className="mr-2 text-blue-400"/> 
                      <span className="font-mono font-medium">{member.citizen_id || <span className="text-red-400 text-xs bg-red-50 px-1 rounded">缺身分證</span>}</span>
                    </div>
                    <div className="flex items-center">
                      <Phone size={16} className="mr-2 text-green-500"/> 
                      <span className="font-mono">{member.phone || '-'}</span>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600">
                    <div className="flex items-center">
                      <Mail size={16} className="mr-2 text-gray-400"/> 
                      {member.email ? (
                        <span className="text-gray-700">{member.email}</span>
                      ) : (
                        <span className="text-xs bg-gray-100 text-gray-400 px-2 py-1 rounded">未綁定 (僅基本資料)</span>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="bg-slate-100 text-slate-700 px-3 py-1 rounded-md text-sm font-bold border border-slate-200">
                      {member.uniform_size || '-'}
                    </span>
                  </td>
                  <td className="p-4">
                    {member.citizen_id ? (
                      <span className="inline-flex items-center text-green-700 bg-green-50 px-3 py-1 rounded-full text-xs font-bold border border-green-100">
                        <CheckCircle size={14} className="mr-1.5"/> 資料完整
                      </span>
                    ) : (
                      <span className="inline-flex items-center text-red-700 bg-red-50 px-3 py-1 rounded-full text-xs font-bold border border-red-100 animate-pulse">
                        <AlertCircle size={14} className="mr-1.5"/> 缺漏關鍵資料
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-gray-500 font-mono text-xs">
                    {member.join_date ? new Date(member.join_date).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}