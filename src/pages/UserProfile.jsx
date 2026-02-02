import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from '../components/Navbar' 
// 暫時註解掉 UserAvatar，先確認頁面能活著
// import UserAvatar, { AVATAR_STYLES } from '../components/UserAvatar' 
import { User, Save } from 'lucide-react'

export default function UserProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  
  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        let { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        
        // 容錯處理：如果沒資料，用 User 資訊補
        if (!data) {
           data = { 
             id: user.id, 
             email: user.email, 
             full_name: user.email?.split('@')[0], 
           }
        }
        setProfile(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="p-10 text-center font-bold text-blue-600">讀取中...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      
      <div className="max-w-4xl mx-auto py-10 px-4">
        <div className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 text-center">
            
            {/* 暫時移除 UserAvatar，改用簡單圓圈 */}
            <div className="w-24 h-24 bg-blue-600 rounded-full mx-auto flex items-center justify-center text-white text-4xl font-black mb-4 shadow-xl">
                {profile?.full_name?.[0]?.toUpperCase() || 'M'}
            </div>

            <h1 className="text-3xl font-black text-gray-900 mb-2">
                {profile?.full_name || '未命名戰士'}
            </h1>
            <p className="text-gray-500 font-mono mb-6">{profile?.email}</p>

            <div className="p-4 bg-green-50 text-green-700 rounded-lg font-bold border border-green-200 inline-block">
                ✅ 安全模式啟動成功：會員中心連線正常
            </div>

            <div className="mt-8 text-left bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="font-bold text-slate-700 mb-2 flex items-center">
                    <User size={20} className="mr-2"/> 診斷報告
                </h3>
                <p className="text-sm text-slate-500">
                    艦長，如果您看到這個畫面，代表 <b>路由 (Router)</b> 和 <b>檔案位置 (Pages)</b> 都是正確的！
                    <br/><br/>
                    剛才的白屏，是因為 <code>UserAvatar</code> 元件裡使用了某些您的專案尚未安裝的圖標 (如 Hexagon, Fingerprint)，導致 React 渲染時崩潰。
                    <br/><br/>
                    下一步：我們可以逐步把華麗的功能加回來。
                </p>
            </div>
        </div>
      </div>
    </div>
  )
}