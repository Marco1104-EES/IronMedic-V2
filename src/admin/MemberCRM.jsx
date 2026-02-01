import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient' // 🟢 確保路徑正確
import { Search, User, Mail, Phone, Shield, Filter, Download, ChevronsLeft, ChevronsRight, MoreHorizontal, CheckCircle } from 'lucide-react'

export default function MemberCRM() {
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  useEffect(() => { fetchMembers() }, [])

  const fetchMembers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) console.error('Error:', error)
    else setMembers(data || [])
    setLoading(false)
  }

  const filteredMembers = members.filter(m => {
    const matchSearch = (m.full_name || '').includes(searchTerm) || 
                        (m.email || '').includes(searchTerm) || 
                        (m.phone || '').includes(searchTerm)
    if (filterType === 'all') return matchSearch
    if (filterType === 'admin') return matchSearch && (m.email?.includes('admin') || m.role === 'admin')
    return matchSearch
  })

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      {/* 頂部控制台 */}
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 flex items-center">
            <User className="mr-3 text-blue-600"/> 會員情報中心 (CRM)
          </h2>
          <p className="text-gray-500 text-sm mt-1 font-bold">目前總兵力: <span className="text-blue-600">{members.length}</span> 人</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setFilterType(filterType === 'all' ? 'admin' : 'all')} className={`flex items-center px-4 py-2 border rounded-lg text-sm font-bold transition-all ${filterType === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-300' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>
             <Filter size={16} className="mr-2"/> {filterType === 'all' ? '篩選管理員' : '顯示全部'}
           </button>
           <button className="flex items-center px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-700 shadow-md">
             <Download size={16} className="mr-2"/> 匯出戰力名單
           </button>
        </div>
      </div>

      {/* 搜尋卡 */}
      <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
         <div className="relative w-full">
            <Search size={18} className="absolute left-4 top-3.5 text-gray-400"/>
            <input 
              type="text" 
              placeholder="輸入代號、Email 或電話進行搜索..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-transparent rounded-lg focus:bg-gray-50 outline-none text-sm font-medium transition-colors"
            />
         </div>
      </div>

      {/* 企業級表格 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider text-xs border-b border-gray-200">
              <tr>
                <th className="p-4 w-16">#</th>
                <th className="p-4">成員資訊</th>
                <th className="p-4">聯絡方式</th>
                <th className="p-4">裝備尺寸</th>
                <th className="p-4">權限等級</th>
                <th className="p-4 text-right">入伍日期</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan="6" className="p-10 text-center text-gray-400"><span className="animate-pulse">讀取情報數據中...</span></td></tr>
              ) : filteredMembers.length === 0 ? (
                <tr><td colSpan="6" className="p-10 text-center text-gray-400">查無此人</td></tr>
              ) : (
                filteredMembers.map((m, idx) => (
                  <tr key={m.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer">
                    <td className="p-4 text-gray-400 font-mono text-xs">{idx + 1}</td>
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center font-black mr-3 shadow-sm border border-white">
                          {(m.full_name || m.email)[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-gray-800">{m.full_name || '未命名'}</p>
                          <p className="text-[10px] text-gray-400 font-mono">ID: {m.id.slice(0, 8)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center text-gray-600 text-xs font-medium">
                          <Mail size={12} className="mr-2 text-blue-400"/> {m.email}
                        </div>
                        <div className="flex items-center text-gray-600 text-xs">
                          <Phone size={12} className="mr-2 text-green-500"/> {m.phone || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {m.uniform_size ? (
                        <span className="w-8 h-8 flex items-center justify-center bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200">
                          {m.uniform_size}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="p-4">
                      {m.email?.includes('admin') || m.role === 'admin' ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black bg-purple-100 text-purple-700 border border-purple-200">
                          <Shield size={10} className="mr-1"/> ADMIN
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          <CheckCircle size={10} className="mr-1"/> MEMBER
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right text-gray-400 text-xs font-mono">
                      {new Date(m.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}