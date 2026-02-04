import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { 
  Search, Shield, User, CheckCircle, AlertTriangle, 
  Loader2, Users, Crown, Zap, Activity, X, ArrowLeft 
} from 'lucide-react'
import { ROLES, ROLE_CONFIG } from '../lib/roles'

export default function UserPermission() {
  const [users, setUsers] = useState([])
  const [selectedUser, setSelectedUser] = useState(null)
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [currentUserEmail, setCurrentUserEmail] = useState('')
  const [showMobileDetail, setShowMobileDetail] = useState(false)

  const [stats, setStats] = useState({
    SUPER_ADMIN: 0, EVENT_MANAGER: 0, VERIFIED_MEDIC: 0, USER: 0
  })

  // 👑 緊急恢復：白名單
  const VIP_EMAILS = [
      'marco1104@gmail.com', 
      'mark780502@gmail.com',
      'pianopub1130@gmail.com'
  ]

  useEffect(() => {
    checkCurrentUser()
    fetchGlobalStats()
    fetchUsers()
  }, [])

  useEffect(() => {
    const delaySearch = setTimeout(() => { fetchUsers() }, 300)
    return () => clearTimeout(delaySearch)
  }, [searchTerm, filterRole])

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) setCurrentUserEmail(user.email)
  }

  // 🔥 只要在白名單，就是 Admin
  const isAdmin = VIP_EMAILS.includes(currentUserEmail);

  const fetchGlobalStats = async () => {
      const { data, error } = await supabase.from('profiles').select('role')
      if (error) return;
      const newStats = { SUPER_ADMIN: 0, EVENT_MANAGER: 0, VERIFIED_MEDIC: 0, USER: 0 }
      data.forEach(u => { if (newStats[u.role] !== undefined) newStats[u.role]++ })
      setStats(newStats)
  }

  const fetchUsers = async () => {
    setLoading(true)
    try {
      let query = supabase.from('profiles').select('id, email, full_name, role, avatar_url').order('role', { ascending: true }).order('created_at', { ascending: false })
      if (filterRole !== 'ALL') query = query.eq('role', filterRole)
      if (searchTerm) query = query.or(`full_name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      query = query.limit(100)
      const { data, error } = await query
      if (error) throw error
      setUsers(data || [])
    } catch (error) { console.error('搜尋失敗:', error) } finally { setLoading(false) }
  }

  const handleUserClick = (user) => {
      setSelectedUser(user)
      setShowMobileDetail(true) 
  }

  const handleUpdateRole = async (newRole) => {
    if (!selectedUser) return
    if (!isAdmin) { alert("權限不足"); return }

    try {
      const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', selectedUser.id)
      if (error) throw error
      
      await supabase.from('system_logs').insert([{
          level: 'CRITICAL',
          message: `權限變更: ${selectedUser.full_name} -> ${newRole}`,
          details: { target: selectedUser.email, by: currentUserEmail }
      }])

      alert(`權限更新完成！`)
      const updatedUser = { ...selectedUser, role: newRole }
      setSelectedUser(updatedUser)
      setUsers(prev => prev.map(u => u.id === selectedUser.id ? updatedUser : u))
      fetchGlobalStats() 
    } catch (error) { alert("更新失敗：" + error.message) }
  }

  const toggleFilter = (role) => { setFilterRole(prev => prev === role ? 'ALL' : role) }

  return (
    <div className="space-y-6 animate-fade-in pb-20 relative">
      <div className="flex overflow-x-auto gap-4 pb-2 md:grid md:grid-cols-4 md:pb-0 scrollbar-hide">
          {Object.keys(stats).map(roleKey => (
              <button key={roleKey} onClick={() => toggleFilter(roleKey)} className={`min-w-[140px] p-4 rounded-xl border shadow-sm text-left group flex-shrink-0 ${filterRole === roleKey ? 'bg-slate-800 text-white' : 'bg-white'}`}>
                  <div className="text-xs font-bold uppercase tracking-wider mb-2">{ROLE_CONFIG[roleKey]?.label}</div>
                  <div className="text-2xl font-black">{stats[roleKey]}</div>
              </button>
          ))}
      </div>

      <div className="flex flex-col lg:flex-row h-[600px] gap-6 relative">
        <div className={`w-full lg:w-1/3 bg-white rounded-2xl shadow-xl border flex flex-col ${showMobileDetail ? 'hidden lg:flex' : 'flex'}`}>
            <div className="p-4 border-b"><input type="text" placeholder="搜尋..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-4 pr-3 py-3 bg-slate-50 rounded-xl font-bold"/></div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {users.map(user => (
                    <button key={user.id} onClick={() => handleUserClick(user)} className={`w-full text-left p-3 rounded-xl flex items-center ${selectedUser?.id === user.id ? 'bg-slate-800 text-white' : 'hover:bg-slate-50'}`}>
                        <div className="font-bold">{user.full_name || 'U'}</div>
                    </button>
                ))}
            </div>
        </div>

        <div className={`lg:flex-1 bg-white lg:rounded-2xl lg:shadow-xl p-6 flex-col items-center fixed inset-0 z-50 lg:static lg:z-auto bg-white transition-transform ${showMobileDetail ? 'translate-x-0' : 'translate-x-full lg:translate-x-0 lg:flex'}`}>
            <div className="w-full flex items-center justify-between mb-6 lg:hidden border-b pb-4">
                <button onClick={() => setShowMobileDetail(false)} className="flex items-center text-slate-600 font-bold bg-slate-100 px-4 py-2 rounded-lg"><ArrowLeft size={18} className="mr-2"/> 返回</button>
            </div>
            {selectedUser ? (
                <div className="w-full max-w-xl">
                    <h2 className="text-2xl font-black text-center mb-8">{selectedUser.full_name}</h2>
                    <div className="grid grid-cols-1 gap-3">
                        {Object.keys(ROLES).map((roleKey) => (
                            <button key={roleKey} onClick={() => handleUpdateRole(roleKey)} disabled={selectedUser.role === roleKey || !isAdmin} className={`p-4 rounded-xl border-2 text-left ${selectedUser.role === roleKey ? 'border-blue-500 bg-blue-50' : 'hover:bg-slate-50'} ${!isAdmin && 'opacity-50'}`}>
                                <span className="font-bold">{ROLE_CONFIG[roleKey]?.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            ) : <div className="text-center text-slate-300">請選擇人員</div>}
        </div>
      </div>
    </div>
  )
}