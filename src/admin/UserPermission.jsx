import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Search, Shield, User, Save, CheckCircle, AlertTriangle, Loader2, Users, Crown, Zap, Activity, Filter, X } from 'lucide-react'
import { ROLES, ROLE_CONFIG } from '../lib/roles'

export default function UserPermission() {
  const [users, setUsers] = useState([]) // 顯示在列表的用戶
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // 🔍 篩選狀態
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('ALL') // ALL, SUPER_ADMIN, EVENT_MANAGER...

  const [currentUserEmail, setCurrentUserEmail] = useState('')
  
  // 📊 全域戰略統計 (真實數據)
  const [stats, setStats] = useState({
    SUPER_ADMIN: 0,
    EVENT_MANAGER: 0,
    VERIFIED_MEDIC: 0,
    USER: 0
  })

  // 👑 絕對白名單
  const VIP_EMAILS = [
      'marco1104@gmail.com', 
      'mark780502@gmail.com'
  ]

  useEffect(() => {
    checkCurrentUser()
    fetchGlobalStats() // 先抓統計
    fetchUsers()       // 再抓列表
  }, [])

  // 當篩選條件改變時，重新抓取列表
  useEffect(() => {
    const delaySearch = setTimeout(() => {
        fetchUsers()
    }, 300)
    return () => clearTimeout(delaySearch)
  }, [searchTerm, filterRole])

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserEmail(user.email)
  }

  const isCommander = VIP_EMAILS.includes(currentUserEmail);

  // 🌍 1. 抓取全域統計 (不受搜尋影響)
  const fetchGlobalStats = async () => {
      // 這裡用一個高效的 RPC 或者分組查詢會更好，但為了簡單，我們先抓全表的 role
      // 如果人數破萬，建議改用 Supabase Database Function
      const { data, error } = await supabase.from('profiles').select('role')
      if (error) return;

      const newStats = { SUPER_ADMIN: 0, EVENT_MANAGER: 0, VERIFIED_MEDIC: 0, USER: 0 }
      data.forEach(u => {
          if (newStats[u.role] !== undefined) newStats[u.role]++
      })
      setStats(newStats)
  }

  // 🔍 2. 抓取列表 (受搜尋與卡片篩選影響)
  const fetchUsers = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('profiles')
        .select('id, email, full_name, role, avatar_url')
        .order('role', { ascending: true }) 
        .order('created_at', { ascending: false })
      
      // A. 卡片篩選 (如果有點擊上方卡片)
      if (filterRole !== 'ALL') {
          query = query.eq('role', filterRole)
      }

      // B. 文字搜尋
      if (searchTerm) {
        query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      }

      // 限制數量 (避免一次拉太多)
      query = query.limit(100)

      const { data, error } = await query
      if (error) throw error
      
      setUsers(data || [])

    } catch (error) {
      console.error('搜尋失敗:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateRole = async (newRole) => {
    if (!selectedUser) return
    if (!isCommander) {
        alert("權限不足：只有最高指揮官可以晉升人員。")
        return
    }

    if (selectedUser.email === currentUserEmail && newRole !== 'SUPER_ADMIN') {
        if (!window.confirm("警告：您正在移除自己的最高指揮權！確定嗎？")) return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', selectedUser.id)

      if (error) throw error

      await supabase.from('system_logs').insert([{
          level: 'CRITICAL',
          message: `權限變更: ${selectedUser.full_name} -> ${newRole}`,
          details: { target: selectedUser.email, by: currentUserEmail }
      }])

      alert(`授勳完成！${selectedUser.full_name} -> ${ROLE_CONFIG[newRole]?.label}`)
      
      // 更新本地
      const updatedUser = { ...selectedUser, role: newRole }
      setSelectedUser(updatedUser)
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u))
      
      // 重要：更新全域統計
      fetchGlobalStats() 

    } catch (error) {
      alert("授勳失敗：" + error.message)
    }
  }

  // 點擊卡片切換篩選
  const toggleFilter = (role) => {
      if (filterRole === role) {
          setFilterRole('ALL') // 取消篩選
      } else {
          setFilterRole(role)  // 套用篩選
      }
  }

  return (
    <div className="space-y-6 animate-fade-in pb-20">
      
      {/* 📊 互動式戰略儀表板 (點擊可篩選) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          {/* 指揮官卡片 */}
          <button 
            onClick={() => toggleFilter('SUPER_ADMIN')}
            className={`p-4 rounded-xl border shadow-sm transition-all text-left group
                ${filterRole === 'SUPER_ADMIN' 
                    ? 'bg-red-600 border-red-700 ring-2 ring-red-300 transform scale-105' 
                    : 'bg-white border-red-100 hover:border-red-300 hover:shadow-md'
                }`}
          >
              <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${filterRole === 'SUPER_ADMIN' ? 'text-red-100' : 'text-red-600'}`}>最高指揮官</span>
                  <Crown size={16} className={filterRole === 'SUPER_ADMIN' ? 'text-white' : 'text-red-500'}/>
              </div>
              <div className={`text-2xl font-black ${filterRole === 'SUPER_ADMIN' ? 'text-white' : 'text-slate-800'}`}>
                  {stats.SUPER_ADMIN} <span className={`text-xs font-normal ${filterRole === 'SUPER_ADMIN' ? 'text-red-200' : 'text-slate-400'}`}>人</span>
              </div>
          </button>

          {/* 賽事官卡片 */}
          <button 
            onClick={() => toggleFilter('EVENT_MANAGER')}
            className={`p-4 rounded-xl border shadow-sm transition-all text-left group
                ${filterRole === 'EVENT_MANAGER' 
                    ? 'bg-blue-600 border-blue-700 ring-2 ring-blue-300 transform scale-105' 
                    : 'bg-white border-blue-100 hover:border-blue-300 hover:shadow-md'
                }`}
          >
              <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${filterRole === 'EVENT_MANAGER' ? 'text-blue-100' : 'text-blue-600'}`}>賽事管理員</span>
                  <Shield size={16} className={filterRole === 'EVENT_MANAGER' ? 'text-white' : 'text-blue-500'}/>
              </div>
              <div className={`text-2xl font-black ${filterRole === 'EVENT_MANAGER' ? 'text-white' : 'text-slate-800'}`}>
                  {stats.EVENT_MANAGER} <span className={`text-xs font-normal ${filterRole === 'EVENT_MANAGER' ? 'text-blue-200' : 'text-slate-400'}`}>人</span>
              </div>
          </button>

          {/* 醫護鐵人卡片 */}
          <button 
            onClick={() => toggleFilter('VERIFIED_MEDIC')}
            className={`p-4 rounded-xl border shadow-sm transition-all text-left group
                ${filterRole === 'VERIFIED_MEDIC' 
                    ? 'bg-green-600 border-green-700 ring-2 ring-green-300 transform scale-105' 
                    : 'bg-white border-green-100 hover:border-green-300 hover:shadow-md'
                }`}
          >
              <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${filterRole === 'VERIFIED_MEDIC' ? 'text-green-100' : 'text-green-600'}`}>醫護鐵人</span>
                  <Zap size={16} className={filterRole === 'VERIFIED_MEDIC' ? 'text-white' : 'text-green-500'}/>
              </div>
              <div className={`text-2xl font-black ${filterRole === 'VERIFIED_MEDIC' ? 'text-white' : 'text-slate-800'}`}>
                  {stats.VERIFIED_MEDIC} <span className={`text-xs font-normal ${filterRole === 'VERIFIED_MEDIC' ? 'text-green-200' : 'text-slate-400'}`}>人</span>
              </div>
          </button>

          {/* 一般會員卡片 */}
          <button 
            onClick={() => toggleFilter('USER')}
            className={`p-4 rounded-xl border shadow-sm transition-all text-left group
                ${filterRole === 'USER' 
                    ? 'bg-slate-600 border-slate-700 ring-2 ring-slate-300 transform scale-105' 
                    : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-md'
                }`}
          >
              <div className="flex justify-between items-center mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider ${filterRole === 'USER' ? 'text-slate-100' : 'text-slate-500'}`}>一般會員</span>
                  <Users size={16} className={filterRole === 'USER' ? 'text-white' : 'text-slate-400'}/>
              </div>
              <div className={`text-2xl font-black ${filterRole === 'USER' ? 'text-white' : 'text-slate-800'}`}>
                  {stats.USER} <span className={`text-xs font-normal ${filterRole === 'USER' ? 'text-slate-300' : 'text-slate-400'}`}>人</span>
              </div>
          </button>
      </div>

      <div className="flex flex-col lg:flex-row h-[600px] gap-6">
        
        {/* 左側列表 */}
        <div className="w-full lg:w-1/3 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50">
                
                {/* 顯示目前的篩選狀態 */}
                {filterRole !== 'ALL' && (
                    <div className="mb-2 flex items-center justify-between bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold">
                        <span>正在篩選: {ROLE_CONFIG[filterRole]?.label}</span>
                        <button onClick={() => setFilterRole('ALL')} className="hover:text-blue-900"><X size={14}/></button>
                    </div>
                )}

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        placeholder="搜尋姓名、Email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-3 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:border-blue-500 font-bold text-slate-700 transition-all"
                    />
                    {loading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={16}/>}
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {users.length === 0 && !loading ? (
                    <div className="text-center py-20 text-slate-400 text-sm font-bold">
                        {filterRole !== 'ALL' ? `該分類下無人員` : '查無符合人員'}
                    </div>
                ) : (
                    users.map(user => {
                        const config = ROLE_CONFIG[user.role] || ROLE_CONFIG['USER'];
                        const isSelected = selectedUser?.id === user.id;

                        return (
                            <button 
                                key={user.id}
                                onClick={() => setSelectedUser(user)}
                                className={`w-full text-left p-3 rounded-xl transition-all duration-200 flex items-center group ${isSelected ? 'bg-slate-800 text-white shadow-lg transform scale-[1.02]' : 'hover:bg-slate-50 border border-transparent'}`}
                            >
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-sm mr-3 shadow-sm transition-colors ${isSelected ? 'bg-white text-slate-900' : config.color.split(' ')[0].replace('text', 'bg') + ' text-white'}`}>
                                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                                </div>
                                <div className="overflow-hidden flex-1">
                                    <div className={`font-bold truncate text-sm ${isSelected ? 'text-white' : 'text-slate-800'}`}>{user.full_name || '未命名'}</div>
                                    <div className={`text-xs truncate font-mono ${isSelected ? 'text-slate-400' : 'text-slate-500'}`}>{user.email}</div>
                                </div>
                                {user.role === 'SUPER_ADMIN' && <Crown size={14} className="text-yellow-400 ml-2"/>}
                            </button>
                        )
                    })
                )}
            </div>
        </div>

        {/* 右側控制台 (不變，保持功能) */}
        <div className="flex-1 bg-white rounded-2xl shadow-xl border border-slate-200 p-8 flex flex-col justify-center items-center relative overflow-hidden">
            {selectedUser ? (
                <div className="w-full max-w-2xl animate-scale-in flex flex-col h-full">
                    {/* 1. 用戶檔案卡 */}
                    <div className="flex items-center p-6 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-black text-3xl text-white shadow-lg mr-6 ${ROLE_CONFIG[selectedUser.role]?.color.split(' ')[0].replace('text', 'bg') || 'bg-slate-400'}`}>
                            {selectedUser.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-slate-800">{selectedUser.full_name || '未命名'}</h2>
                            <p className="text-slate-500 font-mono text-sm mb-2">{selectedUser.email}</p>
                            <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${ROLE_CONFIG[selectedUser.role]?.color}`}>
                                {ROLE_CONFIG[selectedUser.role]?.label}
                            </span>
                        </div>
                        <div className="ml-auto text-right hidden md:block">
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Current Status</p>
                            <div className="flex items-center justify-end text-green-500 font-bold text-sm">
                                <Activity size={14} className="mr-1"/> Active
                            </div>
                        </div>
                    </div>

                    {/* 2. 權限賦予區 */}
                    <div className="flex-1 overflow-y-auto pr-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center">
                            <Shield size={14} className="mr-2"/> 權限層級賦予 (Role Assignment)
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {Object.keys(ROLES).map((roleKey) => {
                                const config = ROLE_CONFIG[roleKey];
                                const isCurrent = selectedUser.role === roleKey;
                                
                                return (
                                    <button
                                        key={roleKey}
                                        onClick={() => handleUpdateRole(roleKey)}
                                        disabled={isCurrent || !isCommander}
                                        className={`
                                            relative flex flex-col p-4 rounded-xl border-2 transition-all duration-200 text-left
                                            ${isCurrent 
                                                ? `border-${config.color.split('-')[1]}-500 bg-${config.color.split('-')[1]}-50 ring-2 ring-${config.color.split('-')[1]}-200` 
                                                : 'border-slate-100 hover:border-blue-300 hover:shadow-md bg-white'
                                            }
                                            ${!isCommander ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                                        `}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className={`font-black text-lg ${isCurrent ? config.color.split(' ')[0] : 'text-slate-700'}`}>
                                                {config.label}
                                            </span>
                                            {isCurrent && <CheckCircle className={`text-${config.color.split('-')[1]}-500`} size={20}/>}
                                        </div>
                                        <div className="text-xs text-slate-400 font-mono mb-2">{roleKey}</div>
                                        <div className="mt-auto pt-2 text-[10px] text-slate-500 border-t border-slate-100">
                                            {roleKey === 'SUPER_ADMIN' && '擁有系統最高指揮權。'}
                                            {roleKey === 'EVENT_MANAGER' && '可建立賽事、管理報名。'}
                                            {roleKey === 'VERIFIED_MEDIC' && '通過審核的醫護鐵人。'}
                                            {roleKey === 'USER' && '一般註冊會員。'}
                                        </div>
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="text-center text-slate-300">
                    <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-slate-100">
                        <Search size={32} className="text-slate-300"/>
                    </div>
                    <h3 className="text-xl font-bold mb-2 text-slate-400">等待指令</h3>
                    <p className="text-sm text-slate-400">請從左側清單選擇一名人員進行授勳</p>
                </div>
            )}
        </div>
      </div>
    </div>
  )
}