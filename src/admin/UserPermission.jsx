import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Shield, Search, Save, AlertTriangle, CheckCircle, Lock, 
  Users, FileSpreadsheet, Activity, Database, History, Settings, ChevronDown 
} from 'lucide-react'

export default function UserPermission() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState([]) 

  // 權限定義
  const PERMISSION_CONFIG = [
    { 
      key: 'can_manage_events', 
      label: '賽事控制權', // (修正)
      desc: '允許新增、編輯、刪除賽事與組別設定', 
      icon: Activity, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50' 
    },
    { 
      key: 'can_export_data', 
      label: '資料匯出權', // (修正)
      desc: '允許下載 Excel 名單 (可點擊設定個別欄位)', // (修正)
      icon: FileSpreadsheet, 
      color: 'text-green-600', 
      bg: 'bg-green-50',
      hasSubSettings: true // ✨ 新增：代表有細項可以設定
    },
    { 
      key: 'can_manage_system', 
      label: '系統監控權', 
      desc: '允許查看系統日誌、流量分析與資料庫狀態', 
      icon: Database, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50' 
    },
    { 
      key: 'god_mode', 
      label: '超級權限者', // (修正)
      desc: '系統最高裁決權 (僅限指定開發者)', // (修正)
      icon: Shield, 
      color: 'text-red-600', 
      bg: 'bg-red-50',
      danger: true,
      locked: true // ✨ 新增：標記為鎖定項目
    },
  ]

  const DEV_EMAIL = 'marco1104@gmail.com'; // 👑 唯一真神

  useEffect(() => { fetchUsers() }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data } = await supabase.from('profiles').select('*').order('created_at')
    setUsers(data || [])
    setLoading(false)
  }

  const fetchUserLogs = async (userId) => {
    const { data } = await supabase
      .from('system_logs')
      .select('*')
      .ilike('details->>target_user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
    setLogs(data || [])
  }

  const handleSelectUser = (user) => {
    const safeUser = {
      ...user,
      permissions: user.permissions || {}
    }
    setSelectedUser(safeUser)
    fetchUserLogs(user.id)
  }

  const togglePermission = (key, isDanger, isLocked) => {
    if (!selectedUser) return
    
    // 🔴 鎖定邏輯：如果是 God Mode，完全禁止修改
    if (key === 'god_mode') {
        alert('⛔ 存取拒絕：此權限層級為「系統鎖定」，無法手動變更。');
        return;
    }

    // 一般權限切換
    const currentVal = selectedUser.permissions[key] || false
    
    setSelectedUser(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [key]: !currentVal
      }
    }))
  }

  // 模擬打開「資料匯出權」的細項設定 (示意用)
  const handleSubSettings = (e) => {
      e.stopPropagation(); // 防止觸發 toggle
      alert('🔧 細項控制面板：\n\n在此處勾選可匯出的欄位：\n[v] 姓名\n[v] Email\n[ ] 電話 (隱藏)\n[ ] 身分證 (隱藏)');
  }

  const handleSaveChanges = async () => {
    if (!selectedUser) return
    setSaving(true)

    try {
      // 1. 更新資料庫
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: selectedUser.permissions })
        .eq('id', selectedUser.id)

      if (error) throw error

      // 2. 寫入日誌
      const { data: { user: commander } } = await supabase.auth.getUser()
      await supabase.from('system_logs').insert([{
        level: 'WARNING',
        message: `權限變更: ${selectedUser.full_name || selectedUser.email}`,
        details: {
           target_user_id: selectedUser.id,
           commander_id: commander?.id,
           new_permissions: selectedUser.permissions
        }
      }])

      alert('✅ 權限設定已更新。')
      setUsers(users.map(u => u.id === selectedUser.id ? selectedUser : u))
      fetchUserLogs(selectedUser.id)

    } catch (e) {
      alert('更新失敗: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const filteredUsers = users.filter(u => 
    (u.full_name || '').includes(searchTerm) || (u.email || '').includes(searchTerm)
  )

  return (
    <div className="flex h-[calc(100vh-100px)] gap-6 animate-fade-in pb-10">
      
      {/* 左側：人員清單 */}
      <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-slate-50">
           <h3 className="font-bold text-gray-700 flex items-center mb-3">
             <Users size={18} className="mr-2 text-blue-600"/> 人員列表
           </h3>
           <div className="relative">
             <Search size={16} className="absolute left-3 top-3 text-gray-400"/>
             <input 
               type="text" 
               placeholder="搜尋人員..."
               className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
           {loading ? (
             <div className="text-center py-10 text-gray-400 text-sm">載入中...</div>
           ) : filteredUsers.map(user => (
             <button
               key={user.id}
               onClick={() => handleSelectUser(user)}
               className={`w-full text-left p-3 rounded-lg flex items-center transition-all ${
                 selectedUser?.id === user.id 
                   ? 'bg-slate-900 text-white shadow-md' 
                   : 'hover:bg-gray-50 text-gray-700'
               }`}
             >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-3 text-xs ${selectedUser?.id === user.id ? 'bg-slate-700 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {(user.full_name || user.email)[0].toUpperCase()}
                </div>
                <div className="overflow-hidden">
                   <p className="font-bold truncate text-sm">{user.full_name || '未命名人員'}</p>
                   <p className={`text-xs truncate ${selectedUser?.id === user.id ? 'text-slate-400' : 'text-gray-400'}`}>{user.email}</p>
                </div>
                {/* 狀態燈號：只有 Marco 有皇冠 */}
                {user.email === DEV_EMAIL && (
                   <Shield size={14} className="ml-auto text-yellow-400 fill-yellow-400" title="Super User"/>
                )}
             </button>
           ))}
        </div>
      </div>

      {/* 右側：權限控制台 */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden relative">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-8 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex justify-between items-start">
               <div className="flex items-center">
                  <div className="w-20 h-20 bg-slate-200 rounded-2xl flex items-center justify-center text-3xl font-black text-slate-500 shadow-inner mr-6 relative">
                    {(selectedUser.full_name || selectedUser.email)[0].toUpperCase()}
                    {selectedUser.email === DEV_EMAIL && (
                        <div className="absolute -top-2 -right-2 bg-yellow-400 text-yellow-900 p-1.5 rounded-full shadow-md border-2 border-white">
                            <Shield size={16} fill="currentColor"/>
                        </div>
                    )}
                  </div>
                  <div>
                    <h2 className="text-2xl font-black text-gray-800 flex items-center">
                      {selectedUser.full_name || '未命名人員'}
                      <span className="ml-3 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                        {selectedUser.email === DEV_EMAIL ? 'SUPER USER' : (selectedUser.role || 'USER')}
                      </span>
                    </h2>
                    <p className="text-gray-500 font-mono text-sm mt-1 flex items-center">
                      <Lock size={12} className="mr-1"/> UUID: {selectedUser.id}
                    </p>
                    <p className="text-gray-500 text-sm mt-0.5">{selectedUser.email}</p>
                  </div>
               </div>

               <button 
                 onClick={handleSaveChanges}
                 disabled={saving}
                 className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-blue-200 transition-transform active:scale-95 disabled:opacity-50"
               >
                 {saving ? '寫入中...' : <><Save size={18} className="mr-2"/> 套用變更</>}
               </button>
            </div>

            {/* 開關矩陣 */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto">
               {PERMISSION_CONFIG.map(perm => {
                 // 邏輯判斷：
                 // 1. 如果是 god_mode，只有 Marco 是 true，其他人強制 false
                 // 2. 如果是 god_mode，對所有人都是 locked (Marco 也不能把自己降級，防手殘)
                 let isActive = selectedUser.permissions?.[perm.key] || false
                 let isLocked = false
                 let isGrayedOut = false

                 if (perm.key === 'god_mode') {
                     isActive = (selectedUser.email === DEV_EMAIL); // 強制覆蓋：只有 Marco 是啟用的
                     isLocked = true; // 永遠鎖定
                     isGrayedOut = !isActive; // 如果不是 Marco，就變灰色
                 }

                 return (
                   <div 
                     key={perm.key}
                     className={`border-2 rounded-2xl p-5 transition-all relative group 
                     ${isGrayedOut 
                        ? 'border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed grayscale' 
                        : isActive 
                            ? (perm.danger ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50 cursor-pointer') 
                            : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50 cursor-pointer'
                     }`}
                     onClick={() => !isLocked && togglePermission(perm.key, perm.danger, isLocked)}
                   >
                      <div className="flex justify-between items-start mb-2">
                        <div className={`p-2 rounded-lg ${isGrayedOut ? 'bg-gray-200 text-gray-400' : (perm.bg + ' ' + perm.color)}`}>
                           <perm.icon size={24} />
                        </div>
                        
                        {/* 開關 UI */}
                        {isLocked ? (
                            <Lock size={20} className="text-gray-400 mt-1"/>
                        ) : (
                            <div className={`w-12 h-6 rounded-full p-1 transition-colors ${isActive ? (perm.danger ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-300'}`}>
                                <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${isActive ? 'translate-x-6' : ''}`}></div>
                            </div>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-end">
                          <div>
                            <h4 className={`font-bold text-lg ${isActive ? 'text-gray-900' : 'text-gray-600'}`}>
                                {perm.label}
                            </h4>
                            <p className="text-xs text-gray-500 mt-1 font-medium">
                                {perm.desc}
                            </p>
                          </div>
                          
                          {/* 資料匯出權的細項設定按鈕 */}
                          {perm.hasSubSettings && isActive && (
                              <button 
                                onClick={handleSubSettings}
                                className="p-1.5 bg-white border border-green-200 rounded-lg text-green-600 hover:bg-green-100 hover:border-green-300 transition-colors shadow-sm"
                                title="設定個別資料欄位"
                              >
                                  <Settings size={16} />
                              </button>
                          )}
                      </div>

                      {perm.danger && isActive && (
                        <div className="absolute top-2 right-12 px-2 py-0.5 bg-red-600 text-white text-[10px] font-bold rounded animate-pulse">
                          SUPER USER
                        </div>
                      )}
                   </div>
                 )
               })}
            </div>

            {/* 稽核日誌 */}
            <div className="px-8 pb-8 mt-auto">
               <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                 <History size={12} className="mr-2"/> 權限變更履歷
               </h4>
               <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
                  {logs.length > 0 ? logs.map(log => (
                    <div key={log.id} className="flex text-xs text-gray-600 font-mono border-b border-gray-100 last:border-0 pb-1">
                      <span className="w-32 text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
                      <span className="flex-1 font-bold text-slate-700">{log.message}</span>
                    </div>
                  )) : (
                    <p className="text-xs text-gray-400 italic text-center">尚無變更紀錄</p>
                  )}
               </div>
            </div>

          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-300">
             <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mb-4">
               <Shield size={48} />
             </div>
             <h3 className="text-xl font-bold text-gray-400">權限設定中心 (IAM)</h3>
             <p className="text-sm mt-2">請從左側選擇人員以管理其存取級別</p>
          </div>
        )}
      </div>
    </div>
  )
}