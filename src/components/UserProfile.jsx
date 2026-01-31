import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import Navbar from './Navbar'
import UserAvatar, { AVATAR_STYLES } from './UserAvatar' // 引入剛剛的元件
import { Save, User, CheckCircle } from 'lucide-react'

export default function UserProfile() {
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  
  // ✨ 數位 ID 設定
  const [selectedStyle, setSelectedStyle] = useState(1) // 預設 1

  useEffect(() => {
    fetchProfile()
    // 從 localStorage 讀取暫存的設定 (或是之後從 DB 讀)
    const savedStyle = localStorage.getItem('avatar_style')
    if (savedStyle) setSelectedStyle(parseInt(savedStyle))
  }, [])

  const fetchProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        let { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        
        // 如果還沒建立 profile，用 user 資料補
        if (!data) {
           data = { 
             id: user.id, 
             email: user.email, 
             full_name: user.email.split('@')[0], 
             initial: user.email.charAt(0).toUpperCase() 
           }
        } else {
           // 處理顯示文字 (取名字第一個字)
           const name = data.full_name || data.real_name || user.email
           data.initial = name.charAt(0).toUpperCase()
        }
        setProfile(data)
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveStyle = (styleId) => {
    setSelectedStyle(styleId)
    localStorage.setItem('avatar_style', styleId) // 暫存到本地，讓 Navbar 可以讀到
    // TODO: 未來這裡可以寫入 Supabase profiles 表單的 avatar_style 欄位
    alert(`已切換數位 ID 風格：${AVATAR_STYLES[styleId].name}`)
  }

  if (loading) return <div className="p-10 text-center">載入中...</div>

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      <Navbar />
      
      <div className="max-w-4xl mx-auto py-10 px-4">
        
        {/* --- 個人資訊卡 --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="bg-slate-900 h-32 relative">
             <div className="absolute inset-0 bg-gradient-to-r from-blue-900 to-slate-900 opacity-90"></div>
          </div>
          <div className="px-8 pb-8 relative">
             {/* 大頭像展示區 */}
             <div className="-mt-16 mb-4 flex justify-center">
                <UserAvatar styleType={selectedStyle} text={profile?.initial || 'M'} size="xl" className="shadow-2xl ring-4 ring-white" />
             </div>
             
             {/* 名字與職稱 (黃金版位) */}
             <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">{profile?.full_name || '未命名會員'}</h1>
                <p className="text-sm text-gray-500 mt-1 font-mono">{profile?.email}</p>
                <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold">
                   VIP 鐵人會員
                </div>
             </div>
          </div>
        </div>

        {/* --- 數位 ID 更衣室 --- */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
           <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center">
             <User size={24} className="mr-2 text-blue-600"/> 數位識別證 (Digital ID) 設定
           </h2>
           <p className="text-gray-500 mb-6 text-sm">選擇一款最能代表您風格的識別證樣式，這將顯示在您的導覽列與報名紀錄中。</p>

           <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {Object.values(AVATAR_STYLES).map((style) => (
                <button 
                  key={style.id}
                  onClick={() => handleSaveStyle(style.id)}
                  className={`relative group flex flex-col items-center p-4 rounded-xl border-2 transition-all ${selectedStyle === style.id ? 'border-blue-600 bg-blue-50/50' : 'border-gray-100 hover:border-gray-300 hover:bg-gray-50'}`}
                >
                  <div className="mb-4 transform group-hover:scale-110 transition-transform duration-300">
                    <UserAvatar styleType={style.id} text={profile?.initial || 'M'} size="md" />
                  </div>
                  <div className="text-center">
                    <h3 className={`font-bold text-sm mb-1 ${selectedStyle === style.id ? 'text-blue-700' : 'text-gray-700'}`}>{style.name}</h3>
                    <p className="text-[10px] text-gray-400">{style.desc}</p>
                  </div>
                  
                  {selectedStyle === style.id && (
                    <div className="absolute top-2 right-2 text-blue-600">
                      <CheckCircle size={18} fill="currentColor" className="text-white"/>
                    </div>
                  )}
                </button>
              ))}
           </div>
        </div>

      </div>
    </div>
  )
}