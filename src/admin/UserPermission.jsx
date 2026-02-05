import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Search, Shield, User, CheckCircle, Loader2, Users, 
  Crown, Zap, HelpCircle, ArrowLeft, Lock 
} from 'lucide-react'

// 🎨 角色定義
const ROLE_DISPLAY = {
    SUPER_ADMIN: { label: '最高指揮官', color: 'text-red-600 border-red-200 bg-red-50', icon: Crown },
    EVENT_MANAGER: { label: '賽事管理員', color: 'text-blue-600 border-blue-200 bg-blue-50', icon: Shield },
    VERIFIED_MEDIC: { label: '醫護鐵人', color: 'text-green-600 border-green-200 bg-green-50', icon: Zap },
    USER: { label: '非當年度會員', color: 'text-purple-600 border-purple-200 bg-purple-50', icon: Users },
    UNASSIGNED: { label: '未篩選', color: 'text-orange-600 border-orange-200 bg-orange-50', icon: HelpCircle }
}

export default function UserPermission() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const ITEMS_PER_PAGE = 50

  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [currentUserRole, setCurrentUserRole] = useState('')
  const [showMobileDetail, setShowMobileDetail] = useState(false)

  const [stats, setStats] = useState({
    SUPER_ADMIN: 0, EVENT_MANAGER: 0, VERIFIED_MEDIC: 0, USER: 0, UNASSIGNED: 0
  })

  const CREATOR_EMAIL = 'marco1104@gmail.com'

  useEffect(() => {
    checkCurrentUserAndRole()
    fetchExactStats()
  }, [])

  useEffect(() => {
    setPage(0)
    setUsers([])
    setHasMore(true)
    const delaySearch = setTimeout(() => { fetchUsers(0, true) }, 500)
    return () => clearTimeout(delaySearch)
  }, [searchTerm, filterRole])

  // 1. 權限檢查 (包含 MedicMarco 的正常檢查)
  const checkCurrentUserAndRole = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
        setCurrentUserEmail(user.email)
        if (user.email === CREATOR_EMAIL) {
            setCurrentUserRole('SUPER_ADMIN') 
        } else {
            const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()
            if (data) setCurrentUserRole(data.role)
        }
    }
  }

  const canManageUsers = currentUserEmail === CREATOR_EMAIL || currentUserRole === 'SUPER_ADMIN'

  // 2. 統計 (修復 NaN 與 0)
  const fetchExactStats = async () => {
      try {
          const [resAdmin, resManager, resMedic, resUser, resNull] = await Promise.all([
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'SUPER_ADMIN'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'EVENT_MANAGER'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'VERIFIED_MEDIC'),
              supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'USER'),
              // 抓出所有 role 不在上述名單的 (含 NULL)
              supabase.from('profiles').select('*', { count: 'exact', head: true }).or('role.is.null,role.eq.""')
          ])

          setStats({
              SUPER_ADMIN: resAdmin.count || 0,
              EVENT_MANAGER: resManager.count || 0,
              VERIFIED_MEDIC: resMedic.count || 0,
              USER: resUser.count || 0,
              UNASSIGNED: resNull.count || 0
          })
      } catch (error) {
          console.error("統計失敗", error)
      }
  }

  // 3. 列表載入 (防崩潰 + 分頁)
  const fetchUsers = async (pageIndex = 0, isReset = false) => {
    setLoading(true)
    try {
      let query = supabase.from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .order('role', { ascending: true }) 
        .order('created_at', { ascending: false })
      
      if (filterRole !== 'ALL') {
          if (filterRole === 'UNASSIGNED') {
              query = query.is('role', null)
          } else {
              query = query.eq('role', filterRole)
          }
      }
      
      if (searchTerm) {
          query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      }

      const from = pageIndex * ITEMS_PER_PAGE
      const to = from + ITEMS_PER_PAGE - 1
      query = query.range(from, to)
      
      const { data, error } = await query
      if (error) throw error
      
      if (data.length < ITEMS_PER_PAGE) setHasMore(false)

      const processedData = data.map(u => ({
          ...u,
          // 🔥 這裡就是防止崩潰的關鍵：無效 role 強制轉 UNASSIGNED
          role: (!u.role || !ROLE_DISPLAY[u.role]) ? 'UNASSIGNED' : u.role 
      }))

      if (isReset) {
          setUsers(processedData)
      } else {
          setUsers(prev => [...prev, ...processedData])
      }

    } catch (error) { console.error('載入失敗:', error) } finally { setLoading(false) }
  }

  const handleLoadMore = () => {
      const nextPage = page + 1
      setPage(nextPage)
      fetchUsers(nextPage, false)
  }

  const handleUserClick = (user) => {
      setSelectedUser(user)
      setShowMobileDetail(true) 
  }

  const handleUpdateRole = async (newRole) => {
    if (!selectedUser) return
    
    if (selectedUser.email === CREATOR_EMAIL) {
        alert("⛔ 無法變更艦長 (Creator) 的權限。")
        return
    }

    if (!canManageUsers) { 
        alert("權限不足：您不是超級管理員。")
        return 
    }

    const oldRoleKey = selectedUser.role || 'UNASSIGNED'
    if (oldRoleKey === newRole) return

    const updatedUser = { ...selectedUser, role: newRole }
    setSelectedUser(updatedUser)
    setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u))

    setStats(prev => ({
        ...prev,
        [oldRoleKey]: Math.max(0, (prev[oldRoleKey] || 0) - 1), 
        [newRole]: (prev[newRole] || 0) + 1
    }))

    if (filterRole !== 'ALL' && filterRole !== newRole) {
        setUsers(prev => prev.filter(u => u.id !== selectedUser.id))
    }

    try {
      const dbRole = newRole === 'UNASSIGNED' ? null : newRole
      const { error } = await supabase.from('profiles').update({ role: dbRole }).eq('id', selectedUser.id)
      if (error) throw error
      
      await supabase.from('system_logs').insert([{
          level: 'CRITICAL',
          message: `權限變更: ${selectedUser.full_name} (${oldRoleKey} -> ${newRole})`,
          details: { target: selectedUser.email, by: currentUserEmail }
      }])

    } catch (error) { 
      alert("更新失敗：" + error.message) 
      const revertedUser = { ...selectedUser, role: selectedUser.role }
      setSelectedUser(revertedUser)
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? revertedUser : u))
      fetchExactStats()
    }
  }

  const toggleFilter = (role) => { 
      setFilterRole(prev => prev === role ? 'ALL' : role) 
  }

  // 🔥 防呆取值
  const getSafeConfig = (roleKey) => {
      return ROLE_DISPLAY[roleKey] || ROLE_DISPLAY.UNASSIGNED
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      <div className="flex overflow-x-auto gap-4 pb-2 md:grid md:grid-cols-5 md:pb-0 scrollbar-hide">
          {Object.keys(ROLE_DISPLAY).map(roleKey => {
              const config = getSafeConfig(roleKey)
              const Icon = config.icon
              const isActive = filterRole === roleKey
              
              return (
                  <button key={roleKey} onClick={() => toggleFilter(roleKey)} 
                      className={`min-w-[140px] p-4 rounded-xl border shadow-sm text-left group flex-shrink-0 transition-all duration-200
                      ${isActive 
                          ? `ring-2 ring-offset-1 transform scale-[1.02] ${config.color.split(' ')[1].replace('border-', 'border-')}` 
                          : 'bg-white hover:border-slate-300'
                      }
                      bg-white
                      `}
                      style={{ borderColor: isActive ? 'currentColor' : '' }}
                  >
                      <div className={`flex justify-between items-center mb-2 ${isActive ? config.color.split(' ')[0] : 'text-slate-500'}`}>
                          <div className="text-xs font-bold uppercase tracking-wider">{config.label}</div>
                          <Icon size={16} />
                      </div>
                      <div className="text-3xl font-black text-slate-800">{stats[roleKey] || 0}</div>
                      <div className={`h-1 w-full mt-3 rounded-full opacity-50 ${config.color.split(' ')[0].replace('text', 'bg')}`}></div>
                  </button>
              )
          })}
      </div>

      <div className="flex flex-col lg:flex-row h-[600px] gap-6 relative">
        <div className={`w-full lg:w-1/3 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                    <input type="text" placeholder="搜尋姓名..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-3 py-3 bg-white border border-slate-200 rounded-xl font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"/>
                    {loading && <Loader2 className="absolute right-3 top-3 animate-spin text-blue-500" size={16}/>}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {users.length === 0 && !loading ? (
                    <div className="text-center py-20 text-slate-400 text-sm font-bold">暫無資料</div>
                ) : (
                    <>
                        {users.map(user => {
                            const config = getSafeConfig(user.role) 
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
                        })}
                        {hasMore && !searchTerm && (
                            <button onClick={handleLoadMore} disabled={loading} className="w-full py-3 mt-2 text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl flex items-center justify-center">
                                {loading ? <Loader2 size={16} className="animate-spin mr-2"/> : <div className="mr-2">⬇</div>} 載入更多
                            </button>
                        )}
                    </>
                )}
            </div>
        </div>

        <div className={`lg:flex-1 bg-white lg:rounded-2xl lg:shadow-xl border border-slate-200 p-6 flex-col items-center fixed inset-0 z-50 lg:static lg:z-auto bg-white transition-transform duration-300 ${showMobileDetail ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:flex'}`}>
            <div className="w-full flex items-center justify-between mb-6 lg:hidden border-b pb-4">
                <button onClick={() => setShowMobileDetail(false)} className="flex items-center text-slate-600 font-bold bg-slate-100 px-4 py-2 rounded-lg active:scale-95"><ArrowLeft size={18} className="mr-2"/> 返回列表</button>
            </div>
            
            {selectedUser ? (
                <div className="w-full max-w-xl animate-scale-in flex flex-col h-full overflow-y-auto pb-20 lg:pb-0">
                    <div className="text-center mb-8 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        {(() => {
                            const config = getSafeConfig(selectedUser.role)
                            return (
                                <>
                                    <div className={`w-24 h-24 mx-auto rounded-3xl flex items-center justify-center text-4xl font-black text-white shadow-xl mb-4 ${config.color.split(' ')[0].replace('text', 'bg')}`}>
                                        {selectedUser.full_name?.[0] || 'U'}
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-800">{selectedUser.full_name}</h2>
                                    <p className="text-slate-500 font-mono mb-2">{selectedUser.email}</p>
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${config.color}`}>
                                        {config.label}
                                    </span>
                                </>
                            )
                        })()}
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {Object.keys(ROLE_DISPLAY).map((roleKey) => {
                            const config = getSafeConfig(roleKey)
                            const Icon = config.icon
                            const currentRole = selectedUser.role || 'UNASSIGNED'
                            const isCurrent = currentRole === roleKey
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
                                    {isCurrent ? <CheckCircle className={`text-${config.color.split('-')[1]}-500`} size={24}/> : <Icon className="text-slate-300 group-hover:text-slate-400" size={24}/>}
                                </button>
                            )
                        })}
                    </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-slate-300">
                    <User size={64} className="mb-4 opacity-20"/>
                    <div className="font-bold">請選擇人員</div>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}