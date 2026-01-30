import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { User, Phone, Mail, Award, Calendar, CreditCard, ShieldCheck, ArrowLeft, QrCode } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar' 

export default function UserProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) setProfile(data)
      } else {
        // God Mode: 沒登入時顯示範例資料，讓您看 UI 效果
        setProfile({
          full_name: '張鐵人',
          citizen_id: 'A123456789',
          phone: '0988-168-168',
          email: 'ironman@medic.com',
          uniform_size: 'L',
          join_date: '2023-01-01',
          role: 'official_member'
        })
      }
    } catch (error) { 
      console.error(error)
    } finally { 
      setLoading(false) 
    }
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50">載入中...</div>

  return (
    <div className="min-h-screen bg-gray-100 pb-20 font-sans">
      <Navbar />
      
      <div className="max-w-md mx-auto pt-8 px-4">
        {/* 返回按鈕 */}
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft size={20} className="mr-1"/> 返回首頁
        </button>

        <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">數位會員識別證</h1>
            <p className="text-gray-500 text-sm">Digital Member ID</p>
        </div>

        {/* 🪪 專業數位 ID 卡片 (開始) */}
        <div className="bg-white rounded-3xl overflow-hidden shadow-2xl border border-gray-200 relative">
          
          {/* 卡片頂部裝飾 */}
          <div className="h-32 bg-gradient-to-br from-slate-800 to-blue-900 relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-20">
                <ShieldCheck size={120} className="text-white"/>
             </div>
             <div className="absolute bottom-4 left-6">
                <p className="text-blue-200 text-xs tracking-widest uppercase font-semibold">IRON MEDIC MEMBER</p>
                <h2 className="text-white text-xl font-bold tracking-wide">醫護鐵人</h2>
             </div>
          </div>

          {/* 頭像與主要資訊 */}
          <div className="px-6 pb-8 relative">
             {/* 懸浮大頭照 */}
             <div className="absolute -top-12 right-6">
                <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg transform rotate-3">
                   <div className="w-full h-full bg-gray-200 rounded-xl flex items-center justify-center overflow-hidden">
                      {/* 如果有照片顯示照片，沒有顯示首字 */}
                      <span className="text-4xl font-bold text-slate-700">{profile?.full_name?.[0]}</span>
                   </div>
                </div>
             </div>

             <div className="mt-6 space-y-1">
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">姓名 / Name</label>
                <p className="text-3xl font-bold text-gray-900">{profile?.full_name}</p>
             </div>

             <div className="mt-6 grid grid-cols-2 gap-6">
                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">會員編號 / ID</label>
                    <p className="text-lg font-mono font-medium text-slate-700">{profile?.citizen_id || 'Pending'}</p>
                </div>
                <div>
                    <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">尺寸 / Size</label>
                    <p className="text-lg font-medium text-slate-700">{profile?.uniform_size || '-'}</p>
                </div>
             </div>

             <div className="mt-6">
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">聯絡資訊 / Contact</label>
                <div className="flex items-center mt-1 text-gray-700">
                    <Phone size={14} className="mr-2 text-blue-500"/> 
                    <span className="font-medium">{profile?.phone}</span>
                </div>
                <div className="flex items-center mt-1 text-gray-700">
                    <Mail size={14} className="mr-2 text-blue-500"/> 
                    <span className="text-sm truncate">{profile?.email}</span>
                </div>
             </div>

             {/* 底部條碼區 (模擬) */}
             <div className="mt-8 pt-6 border-t border-dashed border-gray-300 flex items-center justify-between">
                <div>
                   <p className="text-xs text-gray-400">加入日期</p>
                   <p className="text-sm font-bold text-gray-600">
                     {profile?.join_date ? new Date(profile.join_date).toLocaleDateString() : 'N/A'}
                   </p>
                </div>
                <div className="opacity-80">
                   {/* 假裝是一個 QR Code */}
                   <QrCode size={48} className="text-slate-800"/>
                </div>
             </div>
          </div>
        </div>
        {/* 🪪 卡片結束 */}

        <div className="mt-8 text-center">
            <p className="text-xs text-gray-400">
                此為數位會員憑證，請於賽事現場出示。<br/>
                資料由企業 ERP 系統統一管理，如需修改請洽管理員。
            </p>
        </div>

      </div>
    </div>
  )
}