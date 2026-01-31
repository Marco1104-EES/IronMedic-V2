import { useState, useEffect } from 'react'
// 🟢 修正：只往上一層
import { supabase } from '../supabaseClient' 
import { Search, Shield, Save, User, UserCheck, Lock } from 'lucide-react'

export default function UserPermission() {
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedUser, setSelectedUser] = useState(null)
  const [saving, setSaving] = useState(false)
  
  const PERMISSIONS_LIST = [
    { key: 'manage_events', label: '賽事管理', desc: '允許新增、編輯、刪除賽事' },
    { key: 'manage_registrations', label: '報名數據', desc: '允許查看個資與匯出 Excel' },
    { key: 'view_logs', label: '系統監控', desc: '允許查看錯誤日誌與 API 狀態' },
    { key: 'god_mode', label: 'God Mode', desc: '最高權限 (危險)' },
  ]

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at', { ascending: false })
    setUsers(data || [])
    setLoading(false)
  }

  const filteredUsers = users.filter(u => 
    (u.full_name?.includes(search) || u.email?.includes(search) || u.real_name?.includes(search))
  )

  const handleUserClick = (user) => {
    const currentPerms = user.permissions || {}
    setSelectedUser({ ...user, permissions: currentPerms })
  }

  const togglePermission = (key) => {
    if (!selectedUser) return
    const newPerms = { ...selectedUser.permissions, [key]: !selectedUser.permissions[key] }
    setSelectedUser({ ...selectedUser, permissions: newPerms })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase.from('profiles')
        .update({ permissions: selectedUser.permissions })
        .eq('id', selectedUser.id)
      
      if (error) throw error
      alert('✅ 權限設定已同步！')
      setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u))
    } catch (e) {
      alert('儲存失敗: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-140px)] animate-fade-in">
      
      {/* 左側：人員搜尋列表 */}
      <div className="lg:col-span-4 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-3 text-gray-400"/>
            <input 
              type="text" 
              placeholder="搜尋姓名、Email..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm font-medium"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {filteredUsers.map(user => (
            <button 
              key={user.id} 
              onClick={() => handleUserClick(user)}
              className={`w-full text-left p-3 rounded-lg flex items-center transition-all ${selectedUser?.id === user.id ? 'bg-blue-600 text-white shadow-md' : 'hover:bg-gray-50 text-gray-700'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black mr-3 ${selectedUser?.id === user.id ? 'bg-white text-blue-600' : 'bg-slate-200 text-slate-600'}`}>
                {(user.full_name || user.email)[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{user.full_name || '未命名'}</p>
                <p className={`text-xs truncate font-mono ${selectedUser?.id === user.id ? 'text-blue-200' : 'text-gray-400'}`}>{user.email}</p>
              </div>
              {user.permissions && Object.values(user.permissions).some(v=>v) && (
                <Shield size={14} className={selectedUser?.id === user.id ? 'text-white' : 'text-blue-500'}/>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 右側：IAM 設定面板 */}
      <div className="lg:col-span-8 bg-white rounded-xl shadow-sm border border-gray-200 p-8 flex flex-col relative">
        {selectedUser ? (
          <>
            <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
              <div className="flex items-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center text-3xl font-black mr-5 shadow-lg">
                  {(selectedUser.full_name || selectedUser.email)[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="text-2xl font-black text-gray-900">{selectedUser.full_name || '未命名用戶'}</h2>
                  <p className="text-gray-500 font-mono text-sm mb-2">{selectedUser.email}</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-bold border border-slate-200">
                    <Lock size={10} className="mr-1"/> UUID: {selectedUser.id}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleSave} 
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold flex items-center shadow-lg transition-transform active:scale-95 disabled:opacity-50"
              >
                {saving ? '儲存中...' : <><Save size={18} className="mr-2"/> 套用變更</>}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PERMISSIONS_LIST.map(perm => {
                const isActive = selectedUser.permissions?.[perm.key] || false
                return (
                  <div 
                    key={perm.key} 
                    onClick={() => togglePermission(perm.key)}
                    className={`cursor-pointer p-5 rounded-xl border-2 transition-all flex justify-between items-center group ${isActive ? 'border-green-500 bg-green-50/50' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <div>
                      <span className={`font-bold text-base block mb-1 ${isActive ? 'text-green-800' : 'text-gray-700'}`}>{perm.label}</span>
                      <span className="text-xs text-gray-400">{perm.desc}</span>
                    </div>
                    <div className={`w-14 h-8 rounded-full flex items-center transition-colors p-1 ${isActive ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'}`}>
                      <div className="w-6 h-6 bg-white rounded-full shadow-md"></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-300">
            <UserCheck size={80} className="mb-4 text-slate-200"/>
            <p className="text-xl font-bold text-gray-400">請從左側選擇一位操作者</p>
            <p className="text-sm text-gray-400">以開始設定系統存取權限</p>
          </div>
        )}
      </div>
    </div>
  )
}