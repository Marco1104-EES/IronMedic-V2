import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Shield, Search, Save, Lock, Users, FileSpreadsheet, 
  Activity, Database, Settings, Zap, Fingerprint, 
  Terminal, AlertOctagon
} from 'lucide-react'

export default function UserPermission() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [logs, setLogs] = useState([]) 

  // 👑 企業級 VIP 名單
  const VIP_ROSTER = {
      'marco1104@gmail.com': { 
          rank: 'SUPER ADMIN', 
          label: '超級管理員', 
          color: 'text-red-500', 
          border: 'border-red-500/50',
          badgeBg: 'bg-red-500/20 text-red-300 border-red-500/30'
      },
      'mark780502@gmail.com': { 
          rank: 'ADMIN', 
          label: '系統管理員', 
          color: 'text-cyan-400', 
          border: 'border-cyan-500/50',
          badgeBg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
      }
  }

  // 權限矩陣
  const PERMISSION_CONFIG = [
    { 
      key: 'can_manage_events', 
      label: '賽事控制權 (OPS)', 
      desc: '允許新增、編輯、刪除賽事與組別設定', 
      icon: Activity, 
      activeColor: 'bg-blue-600 text-white',
      inactiveColor: 'bg-slate-800 text-slate-500'
    },
    { 
      key: 'can_export_data', 
      label: '資料匯出權 (DATA)', 
      desc: '允許下載 Excel 名單 (含個資)', 
      icon: FileSpreadsheet, 
      activeColor: 'bg-green-600 text-white',
      inactiveColor: 'bg-slate-800 text-slate-500',
      hasSubSettings: true 
    },
    { 
      key: 'can_manage_system', 
      label: '系統監控權 (SYS)', 
      desc: '允許查看系統日誌、流量分析與資料庫狀態', 
      icon: Database, 
      activeColor: 'bg-purple-600 text-white',
      inactiveColor: 'bg-slate-800 text-slate-500'
    },
    { 
      key: 'god_mode', 
      label: '超級權限 (ROOT)', 
      desc: '系統最高裁決權 (僅限 Super Admin)', 
      icon: Shield, 
      activeColor: 'bg-red-600 text-white',
      inactiveColor: 'bg-slate-800 text-slate-500',
      danger: true,
      locked: true // 永遠鎖定
    },
  ]

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
      .limit(3) 
    setLogs(data || [])
  }

  const handleSelectUser = (user) => {
    const safeUser = { ...user, permissions: user.permissions || {} }
    setSelectedUser(safeUser)
    fetchUserLogs(user.id)
  }

  const togglePermission = (key, isLocked) => {
    if (!selectedUser) return
    if (key === 'god_mode') {
        alert('⛔ 權限不足：此為 Root 層級權限，受系統安全鎖控制。');
        return;
    }
    
    const currentVal = selectedUser.permissions[key] || false
    setSelectedUser(prev => ({
      ...prev,
      permissions: { ...prev.permissions, [key]: !currentVal }
    }))
  }

  const handleSubSettings = (e) => {
      e.stopPropagation();
      alert('🔧 [模擬] 資料欄位控制面板...\n\n- 姓名: 允許\n- Email: 允許\n- 電話: 遮罩\n- 身分證: 隱藏');
  }

  const handleSaveChanges = async () => {
    if (!selectedUser) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ permissions: selectedUser.permissions })
        .eq('id', selectedUser.id)

      if (error) throw error

      // 寫入日誌
      const { data: { user: commander } } = await supabase.auth.getUser()
      await supabase.from('system_logs').insert([{
        level: 'WARNING',
        message: `權限變更: ${selectedUser.full_name || selectedUser.email}`,
        details: { target: selectedUser.id, by: commander?.id, new_perm: selectedUser.permissions }
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
    <div className="flex h-[calc(100vh-100px)] gap-4 animate-fade-in pb-4">
      
      {/* --- 左側：人員名冊 --- */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-gray-100 bg-slate-50">
           <h3 className="font-bold text-slate-700 flex items-center mb-3">
             <Users size={18} className="mr-2 text-blue-600"/> 帳號列表 (Accounts)
           </h3>
           <div className="relative">
             <Search size={16} className="absolute left-3 top-3 text-gray-400"/>
             <input 
               type="text" 
               placeholder="搜尋 ID 或姓名..."
               className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-md focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none font-mono"
               value={searchTerm}
               onChange={e => setSearchTerm(e.target.value)}
             />
           </div>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
           {loading ? (
             <div className="text-center py-10 text-gray-400 text-xs font-mono">LOADING...</div>
           ) : filteredUsers.map(user => {
             const isVip = VIP_ROSTER[user.email];
             return (
               <button
                 key={user.id}
                 onClick={() => handleSelectUser(user)}
                 className={`w-full text-left p-3 rounded-lg flex items-center transition-all border-l-4 ${
                   selectedUser?.id === user.id 
                     ? 'bg-slate-800 text-white border-blue-500 shadow-md' 
                     : 'hover:bg-slate-50 text-slate-600 border-transparent'
                 }`}
               >
                  <div className={`w-9 h-9 rounded flex items-center justify-center font-bold mr-3 text-xs font-mono ${selectedUser?.id === user.id ? 'bg-slate-600 text-blue-300' : 'bg-slate-200 text-slate-500'}`}>
                    {(user.full_name || user.email)[0].toUpperCase()}
                  </div>
                  <div className="overflow-hidden flex-1">
                     <div className="flex justify-between items-center">
                        <p className="font-bold truncate text-sm">{user.full_name || 'Unknown'}</p>
                        {isVip && <Zap size={12} className={isVip.color + ' animate-pulse'} />}
                     </div>
                     <p className={`text-[10px] truncate font-mono mt-0.5 ${selectedUser?.id === user.id ? 'text-slate-400' : 'text-gray-400'}`}>
                        {isVip ? isVip.label : 'User / 使用者'}
                     </p>
                  </div>
               </button>
             )
           })}
        </div>
      </div>

      {/* --- 右側：深色控制台 --- */}
      <div className="flex-1 bg-[#0f172a] rounded-xl shadow-2xl border border-slate-700 flex flex-col overflow-hidden relative">
        {selectedUser ? (
          <>
            {/* Header */}
            <div className="p-6 border-b border-slate-700 bg-[#1e293b] flex justify-between items-start">
               <div className="flex items-start">
                  <div className={`w-20 h-20 rounded-lg flex items-center justify-center text-4xl font-black shadow-lg mr-5 relative border-2 ${VIP_ROSTER[selectedUser.email]?.border || 'border-slate-600 bg-slate-800 text-slate-500'}`}>
                    {(selectedUser.full_name || selectedUser.email)[0].toUpperCase()}
                    {VIP_ROSTER[selectedUser.email] && (
                        <div className={`absolute -bottom-3 px-2 py-0.5 text-[10px] font-bold text-white bg-slate-900 border rounded tracking-wider ${VIP_ROSTER[selectedUser.email].border}`}>
                            {VIP_ROSTER[selectedUser.email].rank}
                        </div>
                    )}
                  </div>

                  <div>
                    <h2 className={`text-2xl font-black tracking-wide flex items-center ${VIP_ROSTER[selectedUser.email]?.color || 'text-white'}`}>
                      {selectedUser.full_name || 'UNNAMED'}
                    </h2>
                    
                    {/* 職稱 Badge */}
                    <div className="flex items-center mt-2 space-x-2">
                        {VIP_ROSTER[selectedUser.email] ? (
                            <span className={`flex items-center text-xs font-bold px-2 py-1 rounded border ${VIP_ROSTER[selectedUser.email].badgeBg}`}>
                               <Shield size={12} className="mr-1"/>
                               {VIP_ROSTER[selectedUser.email].label}
                            </span>
                        ) : (
                            <span className="flex items-center text-xs font-bold px-2 py-1 rounded border border-slate-600 text-slate-400 bg-slate-800">
                               <Users size={12} className="mr-1"/>
                               一般使用者
                            </span>
                        )}

                        <span className="flex items-center text-xs font-mono text-slate-500">
                           <Fingerprint size={12} className="mr-1"/>
                           {selectedUser.id.split('-')[0]}...
                        </span>
                    </div>
                    
                    <p className="text-slate-500 text-xs mt-1.5 font-mono">{selectedUser.email}</p>
                  </div>
               </div>

               <button 
                 onClick={handleSaveChanges}
                 disabled={saving}
                 className="flex items-center bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-lg font-bold shadow-lg transition-all active:scale-95 disabled:opacity-50 border border-blue-400"
               >
                 {saving ? <span className="animate-pulse">Saving...</span> : <><Save size={18} className="mr-2"/> 儲存設定</>}
               </button>
            </div>

            {/* 權限斷路器 */}
            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto custom-scrollbar bg-slate-900/50">
               {PERMISSION_CONFIG.map(perm => {
                 let isActive = selectedUser.permissions?.[perm.key] || false
                 let isLocked = false
                 let isGrayedOut = false

                 if (perm.key === 'god_mode') {
                     isActive = (selectedUser.email === 'marco1104@gmail.com');
                     isLocked = true;
                     isGrayedOut = !isActive;
                 }

                 return (
                   <div 
                     key={perm.key}
                     onClick={() => !isLocked && togglePermission(perm.key, isLocked)}
                     className={`
                        relative p-5 rounded-lg border-2 transition-all cursor-pointer group flex flex-col justify-between h-32
                        ${isGrayedOut 
                            ? 'border-slate-800 bg-slate-800/50 opacity-40 grayscale cursor-not-allowed' 
                            : isActive 
                                ? `border-transparent shadow-[0_0_20px_rgba(0,0,0,0.3)] ${perm.activeColor}` 
                                : `border-slate-700 hover:border-slate-500 hover:bg-slate-800 ${perm.inactiveColor}`
                        }
                     `}
                   >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                            <perm.icon size={24} className={isActive ? 'animate-pulse' : ''} />
                            <h4 className="ml-3 font-bold text-lg tracking-wide">{perm.label}</h4>
                        </div>
                        
                        {isLocked ? (
                            <Lock size={18} className="text-white/30"/>
                        ) : (
                            <div className={`w-3 h-3 rounded-full ${isActive ? 'bg-white shadow-[0_0_10px_white]' : 'bg-slate-600'}`}></div>
                        )}
                      </div>

                      <div className="flex justify-between items-end mt-4">
                          <p className={`text-xs font-mono leading-relaxed ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                              {perm.desc}
                          </p>
                          
                          {perm.hasSubSettings && isActive && (
                              <button 
                                onClick={handleSubSettings}
                                className="p-2 bg-white/20 hover:bg-white/30 rounded text-white transition-colors"
                              >
                                  <Settings size={16} />
                              </button>
                          )}
                      </div>
                   </div>
                 )
               })}
            </div>

            {/* 日誌區 (已修復 > 符號) */}
            <div className="p-4 border-t border-slate-700 bg-[#0f172a]">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center">
                 <Terminal size={12} className="mr-2"/> Audit Logs // 稽核紀錄
               </h4>
               <div className="space-y-1 font-mono text-xs">
                  {logs.length > 0 ? logs.map((log, idx) => (
                    <div key={log.id} className={`flex items-center ${idx === 0 ? 'text-green-400' : 'text-slate-500'}`}>
                      <span className="w-40 opacity-50">[{new Date(log.created_at).toLocaleString()}]</span>
                      <span className="flex-1">&gt; {log.message}</span>
                    </div>
                  )) : (
                    <p className="text-slate-600 italic">&gt; NO RECORDS FOUND.</p>
                  )}
               </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-600">
             <AlertOctagon size={64} className="mb-6 opacity-20"/>
             <h3 className="text-2xl font-black tracking-widest text-slate-500">READY</h3>
             <p className="text-sm font-mono mt-2 text-slate-600">Please select an account</p>
          </div>
        )}
      </div>
    </div>
  )
}