import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Search, Shield, User, CheckCircle, AlertTriangle, 
  Loader2, Users, Crown, Zap, Activity, X, ArrowLeft, Lock
} from 'lucide-react'
import { ROLES, ROLE_CONFIG } from '../lib/roles'

export default function UserPermission() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  
  // 當前操作者的資訊
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('') 
  
  const [showMobileDetail, setShowMobileDetail] = useState(false)

  const [stats, setStats] = useState({
    SUPER_ADMIN: 0, EVENT_MANAGER: 0, VERIFIED_MEDIC: 0, USER: 0
  })

  // 👑 絕對造物主：marco1104@gmail.com
  // 這是系統唯一的「神級」帳號，擁有無視規則的權力
  const CREATOR_EMAIL = 'marco1104@gmail.com'

  useEffect(() => {
    checkCurrentUserAndRole()
    fetchGlobalStats()
    fetchUsers()
  }, [])

  useEffect(() => {
    const delaySearch = setTimeout(() => { fetchUsers() }, 300)
    return () => clearTimeout(delaySearch)
  }, [searchTerm, filterRole])

  // 1. 驗明正身：確定是艦長還是凡人
  const checkCurrentUserAndRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        setCurrentUserEmail(user.email)
        
        // 🚀 如果是艦長，直接賦予最高權限 (程式碼級別豁免)
        if (user.email === CREATOR_EMAIL) {
            setCurrentUserRole('SUPER_ADMIN') 
        } else {
            // 凡人：去資料庫查 Role
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (data) setCurrentUserRole(data.role)
        }
    }
  }

  // 🔥 權限判斷：是艦長 OR 資料庫認證的超級管理員
  const canManageUsers = currentUserEmail === CREATOR_EMAIL || currentUserRole === 'SUPER_ADMIN'

  // 2. 統計數據 (修復：擴大掃描範圍，解決超過1000人統計不準的問題)
  const fetchGlobalStats = async () => {
      // ⚠️ Supabase 預設只回傳 1000 筆，這裡強制抓 10000 筆以確保統計正確
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .range(0, 9999) 
      
      if (error) return;

      const newStats = { SUPER_ADMIN: 0, EVENT_MANAGER: 0, VERIFIED_MEDIC: 0, USER: 0 }
      data.forEach(u => { 
          // 容錯處理：如果資料庫有奇怪的 role (如 null)，歸類為 USER
          const roleKey = u.role && newStats[u.role] !== undefined ? u.role : 'USER';
          newStats[roleKey]++ 
      })
      setStats(newStats)
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      let query = supabase.from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .order('role', { ascending: true }) // 官大的排前面
        .order('created_at', { ascending: false })
      
      if (filterRole !== 'ALL') query = query.eq('role', filterRole)
      if (searchTerm) query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      
      query = query.limit(100) // 列表只顯示前 100 個 (搜尋用)
      
      const { data, error } = await query
      if (error) throw error
      setUsers(data || [])
    } catch (error) { console.error('搜尋失敗:', error) } finally { setLoading(false) }
  }

  const handleUserClick = (user) => {
      setSelectedUser(user)
      setShowMobileDetail(true) 
  }

  // 3. 權限變更核心
  const handleUpdateRole = async (newRole) => {
    if (!selectedUser) return
    
    // 🛡️ 造物主保護：沒人可以動艦長
    if (selectedUser.email === CREATOR_EMAIL) {
        alert("⛔ 權限鎖定：無法變更「造物主 (Creator)」的權限。")
        return
    }

    // 🛡️ 權限檢查：只有艦長或超級管理員可以動手
    if (!canManageUsers) { 
        alert("權限不足：您不是超級管理員。")
        return 
    }

    const oldRole = selectedUser.role || 'USER'
    if (oldRole === newRole) return

    // 🚀 樂觀更新 (Optimistic UI)：不用等，直接變
    
    // A. 列表變色
    const updatedUser = { ...selectedUser, role: newRole }
    setSelectedUser(updatedUser)
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u))

    // B. 數字跳動 (關鍵修正：手動加減，保證同步)
    setStats(prev => ({
        ...prev,
        [oldRole]: Math.max(0, prev[oldRole] - 1), 
        [newRole]: (prev[newRole] || 0) + 1
    }))

    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', selectedUser.id)
      if (error) throw error
      
      // 寫入日誌
      await supabase.from('system_logs').insert([{
          level: 'CRITICAL',
          message: `權限變更: ${selectedUser.full_name} (${oldRole} -> ${newRole})`,
          details: { target: selectedUser.email, by: currentUserEmail }
      }])

    } catch (error) { 
      // ❌ 失敗回滾
      alert("資料庫更新失敗：" + error.message) 
      const revertedUser = { ...selectedUser, role: oldRole }
      setSelectedUser(revertedUser)
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? revertedUser : u))
      
      setStats(prev => ({
        ...prev,
        [oldRole]: prev[oldRole] + 1,
        [newRole]: Math.max(0, prev[newRole] - 1)
      }))
    }
  }

  const toggleFilter = (role) => { setFilterRole(prev => prev === role ? 'ALL' : role) }

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      
      {/* 頂部：數字統計卡 */}
      <div className="flex overflow-x-auto gap-4 pb-2 md:grid md:grid-cols-4 md:pb-0 scrollbar-hide">
          {Object.keys(stats).map(roleKey => {
              const config = ROLE_CONFIG[roleKey] || ROLE_CONFIG['USER']
              const isActive = filterRole === roleKey
              
              let Icon = Users
              if (roleKey === 'SUPER_ADMIN') Icon = Crown
              if (roleKey === 'EVENT_MANAGER') Icon = Shield
              if (roleKey === 'VERIFIED_MEDIC') Icon = Zap

              return (
                  <button key={roleKey} onClick={() => toggleFilter(roleKey)} className={`min-w-[140px] p-4 rounded-xl border shadow-sm text-left group flex-shrink-0 transition-all ${isActive ? `bg-${config.color.split('-')[1]}-600 text-white transform scale-105 border-${config.color.split('-')[1]}-700` : 'bg-white hover:border-blue-300'}`}>
                      <div className="flex justify-between items-center mb-2">
                          <div className={`text-xs font-bold uppercase tracking-wider ${isActive ? 'text-white/90' : config.color.split(' ')[0]}`}>{config.label}</div>
                          <Icon size={16} className={isActive ? 'text-white' : config.color.split(' ')[0]} />
                      </div>
                      <div className="text-3xl font-black">{stats[roleKey]}</div>
                  </button>
              )
          })}
      </div>

      <div className="flex flex-col lg:flex-row h-[600px] gap-6 relative">
        {/* 左側：人員列表 */}
        <div className={`w-full lg:w-1/3 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input type="text" placeholder="搜尋姓名、Email..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"/>
                </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {users.length === 0 && !loading ? (
                    <div className="text-center py-20 text-slate-400 text-sm font-bold">查無符合人員</div>
                ) : (
                    users.map(user => {
                        const config = ROLE_CONFIG[user.role] || ROLE_CONFIG['USER']
                        const isSelected = selectedUser?.id === user.id
                        const isCreator = user.email === CREATOR_EMAIL
                        
                        return (
                            <button key={user.id} onClick={() => handleUserClick(user)} className={`w-full text-left p-3 rounded-xl flex items-center transition-all ${isSelected ? 'bg-slate-800 text-white shadow-lg' : 'hover:bg-slate-50 border border-transparent'}`}>
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm mr-3 relative ${isSelected ? 'bg-white text-slate-900' : config.color.split(' ')[0].replace('text', 'bg') + ' text-white'}`}>
                                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                                    {isCreator && <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 border-2 border-white rounded-full"></div>}
                                </div>
                                <div className="overflow-hidden">
                                    <div className="font-bold truncate text-sm flex items-center">
                                        {user.full_name || '未命名'}
                                        {isCreator && <span className="ml-2 text-[10px] bg-yellow-400 text-black px-1 rounded font-black">CREATOR</span>}
                                    </div>
                                    <div className={`text-xs truncate ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</div>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>

        {/* 右側：詳細設定 */}
        <div className={`lg:flex-1 bg-white lg:rounded-2xl lg:shadow-xl border border-slate-200 p-6 flex-col items-center fixed inset-0 z-50 lg:static lg:z-auto bg-white transition-transform duration-300 ${showMobileDetail ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:flex'}`}>
            <div className="w-full flex items-center justify-between mb-6 lg:hidden border-b pb-4">
                <button onClick={() => setShowMobileDetail(false)} className="flex items-center text-slate-600 font-bold bg-slate-100 px-4 py-2 rounded-lg active:scale-95"><ArrowLeft size={18} className="mr-2"/> 返回列表</button>
            </div>
            
            {selectedUser ? (
                <div className="w-full max-w-xl animate-scale-in flex flex-col h-full overflow-y-auto pb-20 lg:pb-0">
                    <div className="text-center mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center text-4xl font-black text-white shadow-xl mb-4 ${ROLE_CONFIG[selectedUser.role]?.color.split(' ')[0].replace('text', 'bg')}`}>
                             {selectedUser.full_name?.[0] || 'U'}
                        </div>
                        <h2 className="text-2xl font-black text-slate-800">{selectedUser.full_name}</h2>
                        <p className="text-slate-500 font-mono mb-2">{selectedUser.email}</p>
                        
                        {selectedUser.email === CREATOR_EMAIL ? (
                            <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-black bg-yellow-400 text-black shadow-lg shadow-yellow-400/30">
                                <Crown size={14} className="mr-1"/> 絕對造物主
                            </span>
                        ) : (
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${ROLE_CONFIG[selectedUser.role]?.color}`}>
                                {ROLE_CONFIG[selectedUser.role]?.label}
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {Object.keys(ROLES).map((roleKey) => {
                            const config = ROLE_CONFIG[roleKey]
                            const isCurrent = selectedUser.role === roleKey
                            const isCreatorTarget = selectedUser.email === CREATOR_EMAIL
                            
                            const isDisabled = isCreatorTarget || !canManageUsers

                            return (
                                <button key={roleKey} onClick={() => handleUpdateRole(roleKey)} disabled={isCurrent || isDisabled} 
                                    className={`p-4 rounded-xl border-2 text-left transition-all active:scale-95 flex items-center justify-between group
                                        ${isCurrent ? `border-${config.color.split('-')[1]}-500 bg-${config.color.split('-')[1]}-50` : 'border-slate-100 hover:border-blue-300 hover:shadow-md bg-white'} 
                                        ${isDisabled && !isCurrent ? 'opacity-40 cursor-not-allowed grayscale' : ''}
                                    `}>
                                    <div>
                                        <span className={`font-bold block text-lg ${isCurrent ? config.color.split(' ')[0] : 'text-slate-700'}`}>{config.label}</span>
                                        <span className="text-xs text-slate-400 font-mono">{roleKey}</span>
                                    </div>
                                    {isCurrent && <CheckCircle className={`text-${config.color.split('-')[1]}-500`} size={24}/>}
                                    {isDisabled && !isCurrent && <Lock size={18} className="text-slate-300"/>}
                                </button>
                            )
                        })}
                    </div>
                    {selectedUser.email === CREATOR_EMAIL && (
                        <div className="mt-4 text-center text-yellow-600 text-xs font-bold bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                            🔒 此為艦長專屬帳號，權限已被系統鎖定，禁止變更。
                        </div>
                    )}
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-300">
                    <User size={64} className="mb-4 opacity-20"/>
                    <div className="font-bold">請從左側選擇人員</div>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}