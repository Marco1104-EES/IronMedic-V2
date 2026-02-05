import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { Users, Trophy, Shield, Activity, Zap } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    admins: 0,
    managers: 0,
    medics: 0
  })

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    // 平行撈取數據，加快速度
    const [resTotal, resAdmin, resManager, resMedic] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'SUPER_ADMIN'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'EVENT_MANAGER'),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'VERIFIED_MEDIC')
    ])

    setStats({
      totalUsers: resTotal.count || 0,
      admins: resAdmin.count || 0,
      managers: resManager.count || 0,
      medics: resMedic.count || 0
    })
  }

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* 頂部標題 */}
      <div>
        <h2 className="text-2xl font-black text-slate-800">營運總覽</h2>
        <div className="flex items-center mt-1">
          <div className="w-2 h-2 rounded-full bg-green-500 mr-2 animate-pulse"></div>
          <span className="text-xs font-bold text-slate-400 tracking-wider">SYSTEM ONLINE</span>
        </div>
      </div>

      {/* 數據儀表板 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* 卡片 1 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Users size={64} className="text-blue-600"/>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">總會員數</p>
          <h3 className="text-4xl font-black text-slate-800">{stats.totalUsers}</h3>
          <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 w-full"></div>
          </div>
        </div>

        {/* 卡片 2 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Shield size={64} className="text-red-600"/>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">指揮官 & 管理員</p>
          <h3 className="text-4xl font-black text-slate-800">{stats.admins + stats.managers}</h3>
          <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-red-500 w-[80%]"></div>
          </div>
        </div>

        {/* 卡片 3 */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden group hover:shadow-md transition-all">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap size={64} className="text-green-600"/>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">醫護鐵人</p>
          <h3 className="text-4xl font-black text-slate-800">{stats.medics}</h3>
          <div className="mt-4 h-1 w-full bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-green-500 w-[60%]"></div>
          </div>
        </div>

        {/* 卡片 4 */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <Activity size={64} className="text-white"/>
          </div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">系統狀態</p>
          <h3 className="text-2xl font-black text-green-400 flex items-center">
            98.9% <span className="text-xs text-slate-400 ml-2 font-normal">正常運作</span>
          </h3>
          <p className="text-[10px] text-slate-500 mt-4 font-mono">SERVER LOAD: LOW</p>
        </div>

      </div>
    </div>
  )
}