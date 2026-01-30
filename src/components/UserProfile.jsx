import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { User, Phone, Mail, Award, Calendar, Edit2, Save, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Navbar from './Navbar' 

export default function UserProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({})
  const navigate = useNavigate()

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        // 1. 如果是真的有登入的使用者
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
        if (data) {
          setProfile(data)
          setFormData(data)
        }
      } else {
        // 2. 🚨 上帝模式 (God Mode) 救援機制
        // 如果沒登入，我們就假裝您是最高指揮官，顯示模擬資料
        const godProfile = {
          id: 'god-mode',
          full_name: '最高指揮官 (God Mode)',
          citizen_id: 'A123456789',
          phone: '0988-168-168',
          email: 'admin@ironmedic.com',
          uniform_size: 'L',
          join_date: new Date().toISOString()
        }
        setProfile(godProfile)
        setFormData(godProfile)
      }
    } catch (error) { 
      console.error('Error:', error) 
    } finally { 
      setLoading(false) 
    }
  }

  const handleSave = async () => {
    if (profile.id === 'god-mode') {
      alert('上帝模式下無法真實儲存資料，但您的修改在畫面上會更新！')
      setProfile(formData)
      setEditing(false)
      return
    }

    try {
      const { error } = await supabase.from('profiles').update({
          full_name: formData.full_name,
          phone: formData.phone,
          uniform_size: formData.uniform_size,
        }).eq('id', profile.id)
      if (error) throw error
      alert('資料更新成功！')
      setProfile(formData)
      setEditing(false)
    } catch (error) { alert('更新失敗: ' + error.message) }
  }

  if (loading) return <div className="p-10 text-center">資料讀取中...</div>

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      
      {/* 手機版返回按鈕 */}
      <div className="md:hidden px-4 pt-4">
        <button onClick={() => navigate(-1)} className="flex items-center text-gray-500">
            <ArrowLeft size={20} className="mr-1"/> 返回
        </button>
      </div>

      <div className="max-w-4xl mx-auto py-6 px-4 md:py-10">
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-700"></div>
          <div className="px-6 md:px-8 pb-8 relative">
            <div className="absolute -top-12 left-6 md:-top-16 md:left-8">
              <div className="w-24 h-24 md:w-32 md:h-32 bg-white rounded-full p-1 shadow-lg">
                <div className="w-full h-full bg-gray-200 rounded-full flex items-center justify-center text-3xl md:text-4xl font-bold text-gray-500">
                  {profile?.full_name?.[0]}
                </div>
              </div>
            </div>
            
            <div className="mt-16 md:mt-20 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{profile?.full_name}</h1>
                <p className="text-sm text-gray-500 mt-1 flex items-center">
                  <Award size={16} className="mr-1 text-blue-500"/> 
                  會員編號: {profile?.citizen_id}
                </p>
              </div>
              <button 
                onClick={() => editing ? handleSave() : setEditing(true)}
                className={`w-full md:w-auto px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center shadow-sm 
                  ${editing ? 'bg-green-600 text-white' : 'bg-white border border-gray-300 text-gray-700'}`}
              >
                {editing ? <><Save size={18} className="mr-2"/> 儲存變更</> : <><Edit2 size={18} className="mr-2"/> 編輯資料</>}
              </button>
            </div>
          </div>
        </div>

        {/* 詳細資料卡片 */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 space-y-6">
           <h2 className="text-xl font-bold border-b pb-4 flex items-center text-gray-800">
             <User size={20} className="mr-2 text-blue-600"/> 詳細資料
           </h2>
           
           <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-12">
             <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-1">真實姓名</label>
               {editing ? <input value={formData.full_name} onChange={e=>setFormData({...formData, full_name:e.target.value})} className="border p-2 rounded w-full"/> : <p className="text-lg font-medium text-gray-800">{profile?.full_name}</p>}
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-1">手機號碼</label>
               {editing ? <input value={formData.phone} onChange={e=>setFormData({...formData, phone:e.target.value})} className="border p-2 rounded w-full"/> : <p className="text-lg font-medium text-gray-800 flex items-center"><Phone size={16} className="mr-2 text-gray-400"/>{profile?.phone}</p>}
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-1">電子信箱</label>
               <p className="text-lg font-medium text-gray-800 flex items-center truncate"><Mail size={16} className="mr-2 text-gray-400"/>{profile?.email}</p>
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-1">三鐵衣尺寸</label>
               {editing ? <input value={formData.uniform_size} onChange={e=>setFormData({...formData, uniform_size:e.target.value})} className="border p-2 rounded w-full"/> : <p className="text-lg font-medium text-gray-800">{profile?.uniform_size || '未設定'}</p>}
             </div>
             <div>
               <label className="block text-xs font-bold text-gray-400 uppercase mb-1">加入日期</label>
               <p className="text-lg font-medium text-gray-800 flex items-center"><Calendar size={16} className="mr-2 text-gray-400"/>{new Date(profile?.join_date).toLocaleDateString()}</p>
             </div>
           </div>
        </div>
      </div>
    </div>
  )
}