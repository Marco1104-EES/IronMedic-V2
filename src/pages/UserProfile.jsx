import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar' 
import UserAvatar from '../components/UserAvatar'
import { Save, Loader2, Database, User, Shield, Phone } from 'lucide-react'

export default function UserProfile() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState(null)
  
  // 1. 初始化：讀取資料庫
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // 🔥 這裡改用 maybeSingle() 防止報錯，並讀取所有欄位
        let { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle()
        
        if (data) {
            setProfile(data)
        }
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  // 2. 更新資料：寫入資料庫
  const handleUpdate = async (e) => {
      e.preventDefault()
      setSaving(true)
      try {
          const { error } = await supabase
              .from('profiles')
              .update(profile)
              .eq('id', profile.id)

          if (error) throw error
          alert('✅ 資料更新成功！戰略欄位已同步。')
      } catch (error) {
          alert('❌ 更新失敗：' + error.message)
      } finally {
          setSaving(false)
      }
  }

  // 3. 欄位變更處理
  const handleChange = (key, value) => {
      setProfile(prev => ({ ...prev, [key]: value }))
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600" size={48}/>
        <p className="mt-4 text-slate-400 font-bold">連線中央資料庫中...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* 導航列 */}
      <Navbar />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8 animate-fade-in">
        
        {/* === 頂部身分識別區 === */}
        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="h-32 bg-slate-800 relative">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"></div>
            </div>
            <div className="px-8 pb-8 text-center relative">
                {/* 頭像置中懸浮 */}
                <div className="-mt-16 mb-4 inline-block">
                    <UserAvatar 
                        user={profile} 
                        size="xl" 
                        className="border-4 border-white shadow-2xl"
                    />
                </div>
                
                <h1 className="text-3xl font-black text-slate-900 mb-1">
                    {profile?.display_name || profile?.full_name || '未命名人員'}
                </h1>
                
                <div className="flex justify-center items-center gap-2 mb-6">
                    <span className="font-mono text-slate-400 text-sm">{profile?.email}</span>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border 
                        ${profile?.role === 'SUPER_ADMIN' ? 'bg-red-50 text-red-600 border-red-200' : 
                          profile?.role === 'VERIFIED_MEDIC' ? 'bg-green-50 text-green-600 border-green-200' : 
                          'bg-slate-100 text-slate-500 border-slate-200'}`}>
                        {profile?.badge_title || profile?.role}
                    </span>
                </div>
            </div>
        </div>

        {/* === 資料編輯區 === */}
        <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* 左側：基本資料 */}
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center">
                        <User size={18} className="mr-2 text-blue-600"/> 基本資料
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">顯示名稱</label>
                            <input 
                                type="text" 
                                value={profile?.display_name || ''} 
                                onChange={e => handleChange('display_name', e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">真實姓名</label>
                            <input 
                                type="text" 
                                value={profile?.full_name || ''} 
                                onChange={e => handleChange('full_name', e.target.value)}
                                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase mb-1">聯絡電話</label>
                            <div className="relative">
                                <Phone size={16} className="absolute left-3 top-3.5 text-slate-400"/>
                                <input 
                                    type="text" 
                                    value={profile?.phone || ''} 
                                    onChange={e => handleChange('phone', e.target.value)}
                                    className="w-full pl-10 p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 outline-none font-mono"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 右側：30個戰略欄位 (Strategic Fields) */}
            <div className="lg:col-span-2">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-slate-800 flex items-center">
                            <Database size={18} className="mr-2 text-indigo-600"/> 擴充資料庫 (30 Fields)
                        </h3>
                        <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded">Enterprise Only</span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {/* 自動生成 30 個輸入框 */}
                        {Array.from({ length: 30 }).map((_, i) => {
                            const fieldKey = `field_${String(i + 1).padStart(2, '0')}`; 
                            return (
                                <div key={fieldKey} className="group">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1 group-hover:text-indigo-500 transition-colors">
                                        {fieldKey.replace('_', ' ')}
                                    </label>
                                    <input 
                                        type="text"
                                        placeholder="-"
                                        value={profile?.[fieldKey] || ''}
                                        onChange={e => handleChange(fieldKey, e.target.value)}
                                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-sm text-slate-700 focus:border-indigo-500 focus:bg-white outline-none transition-all font-mono"
                                    />
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* 儲存按鈕區 */}
                <div className="mt-6 flex justify-end">
                    <button 
                        type="submit"
                        disabled={saving}
                        className="px-8 py-4 bg-slate-900 text-white rounded-xl font-bold shadow-xl hover:bg-slate-800 hover:shadow-2xl active:scale-95 transition-all flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <><Loader2 className="animate-spin mr-2"/> 儲存中...</>
                        ) : (
                            <><Save className="mr-2"/> 儲存所有變更</>
                        )}
                    </button>
                </div>
            </div>

        </form>
      </main>
    </div>
  )
}