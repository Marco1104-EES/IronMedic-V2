import { useState, useEffect } from 'react'
import { X, User, Phone, CheckCircle, List, UserPlus, Clock, Ruler, Timer, Hash } from 'lucide-react'
import { syncToGoogleSheets } from '../api/googleSheets'
import { supabase } from '../supabaseClient'
import { useNavigate } from 'react-router-dom'

export default function RegistrationModal({ event, initialTab = 'register', onClose, onConfirm }) {
  const [activeTab, setActiveTab] = useState(initialTab) 
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [participants, setParticipants] = useState([]) 
  const [userData, setUserData] = useState(null) 
  const [checkingAuth, setCheckingAuth] = useState(true) 
  const navigate = useNavigate()

  // 進場資訊
  const [entryTime, setEntryTime] = useState(null)
  const [queueNumber, setQueueNumber] = useState(0)

  let categories = []
  const rawCat = event.category
  if (Array.isArray(rawCat)) categories = rawCat
  else if (typeof rawCat === 'string') categories = rawCat.replace(/[{"}]/g, '').split(',')

  useEffect(() => {
    fetchCurrentUser() 
    fetchParticipants()
    setEntryTime(new Date())
  }, [activeTab])

  const fetchCurrentUser = async () => {
    setCheckingAuth(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.user) {
      const user = session.user
      let profile = null
      const { data: profileById } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      profile = profileById
      if (!profile && user.email) {
        const { data: profileByEmail } = await supabase.from('profiles').select('*').eq('email', user.email).single()
        profile = profileByEmail
      }
      const smartName = profile?.full_name || profile?.real_name || profile?.name || profile?.['姓名'] || profile?.username || user.email?.split('@')[0]
      setUserData({
        name: smartName,
        phone: profile?.phone || profile?.mobile || '09xx-xxx-xxx',
        email: profile?.email || user.email,
        size: profile?.uniform_size || profile?.size || 'M',
        id: user.id
      })
    } else { setUserData(null) }
    setCheckingAuth(false)
  }

  const fetchParticipants = async () => {
    const { data } = await supabase
      .from('registrations')
      .select('*')
      .eq('event_id', event.id)
      .order('category', { ascending: true }) 
      .order('created_at', { ascending: false }) 
    
    const list = data || []
    setParticipants(list)

    if (queueNumber === 0) {
        setQueueNumber(list.length + 1 + Math.floor(Math.random() * 3))
    }
  }

  const groupedParticipants = participants.reduce((acc, curr) => {
    const cat = curr.category || '未分類'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(curr)
    return acc
  }, {})

  const handleSubmit = async () => {
    if (!userData) { alert('請先登入會員才能報名！'); navigate('/login'); return }
    if (!selectedCategory) { alert('請選擇一個參賽組別'); return }

    setLoading(true)
    const cleanCategory = selectedCategory.replace(/"/g, '')

    try {
      const { error } = await supabase.from('registrations').insert([{
        event_id: event.id,
        event_name: event.name || event.title,
        user_name: userData.name, 
        category: cleanCategory
      }])

      if (error) throw error

      syncToGoogleSheets({
        action: "new_registration",
        eventTitle: event.name || event.title,
        userName: userData.name,
        userPhone: userData.phone,
        userEmail: userData.email,
        uniformSize: userData.size,
        category: cleanCategory
      }).catch(err => console.error(err))

      setLoading(false)
      setStep(2)
      setTimeout(() => onConfirm(), 2000)

    } catch (e) {
      alert('報名失敗: ' + e.message)
      setLoading(false)
    }
  }

  // ✨ 極速格式化 (YYYY/MM/DD HH:mm:ss.SSS)
  const formatTimeDetail = (isoString) => {
    if (!isoString) return ''
    const d = new Date(isoString)
    
    const YYYY = d.getFullYear()
    const MM = (d.getMonth()+1).toString().padStart(2,'0')
    const DD = d.getDate().toString().padStart(2,'0')
    
    const HH = d.getHours().toString().padStart(2,'0')
    const mm = d.getMinutes().toString().padStart(2,'0')
    const ss = d.getSeconds().toString().padStart(2,'0')
    const SSS = d.getMilliseconds().toString().padStart(3,'0') // ✨ 毫秒關鍵

    return `${YYYY}/${MM}/${DD} ${HH}:${mm}:${ss}.${SSS}`
  }

  const formatEntryTime = (dateObj) => {
    if (!dateObj) return '--:--:--'
    return `${dateObj.getHours().toString().padStart(2,'0')}:${dateObj.getMinutes().toString().padStart(2,'0')}:${dateObj.getSeconds().toString().padStart(2,'0')}`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
          <h3 className="font-bold text-lg line-clamp-1">{event.name || event.title}</h3>
          <button onClick={onClose}><X size={24}/></button>
        </div>

        <div className="flex border-b border-gray-100">
          <button onClick={() => setActiveTab('register')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab==='register'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50':'text-gray-500 hover:bg-gray-50'}`}>
            <UserPlus size={16} className="mr-2"/> 我要報名
          </button>
          <button onClick={() => setActiveTab('list')} className={`flex-1 py-3 text-sm font-bold flex items-center justify-center transition-colors ${activeTab==='list'?'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50':'text-gray-500 hover:bg-gray-50'}`}>
            <List size={16} className="mr-2"/> 報名名單
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50">
          {activeTab === 'register' && (
            step === 1 ? (
              <>
                <div className="flex gap-3 mb-4">
                    <div className="flex-1 bg-blue-50 border border-blue-100 rounded-lg p-3 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-blue-500 font-bold uppercase tracking-wide flex items-center mb-1">
                            <Timer size={10} className="mr-1"/> 進場時間
                        </span>
                        <span className="text-xl font-mono font-bold text-blue-900 tracking-tight">
                            {formatEntryTime(entryTime)}
                        </span>
                    </div>
                    <div className="flex-1 bg-amber-50 border border-amber-100 rounded-lg p-3 flex flex-col items-center justify-center">
                        <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wide flex items-center mb-1">
                            <Hash size={10} className="mr-1"/> 目前順位
                        </span>
                        <span className="text-xl font-mono font-bold text-amber-900 tracking-tight">
                            #{queueNumber}
                        </span>
                    </div>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-100">
                  <h4 className="font-bold text-gray-800 mb-3 text-sm flex items-center"><Ruler size={16} className="mr-2 text-blue-600"/> 選擇參賽組別</h4>
                  <div className="space-y-2">
                    {categories.map((cat, idx) => {
                      const cleanCat = cat.replace(/"/g, '')
                      return (
                        <label key={idx} className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-all ${selectedCategory === cleanCat ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'}`}>
                          <div className="flex items-center">
                            <input type="radio" name="category" value={cleanCat} onChange={(e) => setSelectedCategory(e.target.value)} className="mr-3 w-4 h-4 text-blue-600"/>
                            <span className="text-gray-700 font-bold text-sm">{cleanCat}</span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                <div className="bg-white p-4 rounded-xl mb-6 border border-gray-100 shadow-sm">
                  <h4 className="font-bold text-gray-800 mb-3 text-sm border-b pb-2">報名者資料 (自動帶入)</h4>
                  {checkingAuth ? (
                    <div className="text-center py-2 text-gray-400 text-xs">讀取中...</div>
                  ) : userData ? (
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-gray-500">姓名</span><span className="font-bold text-blue-700 text-base">{userData.name}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">電話</span><span className="font-bold text-gray-800">{userData.phone}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-bold text-gray-800 truncate max-w-[200px]">{userData.email}</span></div>
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500"><p className="text-sm">您尚未登入</p><button onClick={()=>navigate('/login')} className="text-blue-600 font-bold underline mt-1 text-sm">前往登入</button></div>
                  )}
                </div>

                <button onClick={handleSubmit} disabled={loading || !userData} className={`w-full font-bold py-3.5 rounded-xl shadow-lg flex justify-center items-center transition-all ${loading || !userData ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
                  {loading ? <span className="animate-spin mr-2">⏳</span> : '確認送出報名 (Submit)'}
                </button>
              </>
            ) : (
              <div className="text-center py-10 bg-white rounded-xl shadow-sm">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce"><CheckCircle size={32} /></div>
                <h3 className="text-xl font-bold text-gray-800 mb-2">報名成功！</h3>
                <p className="text-gray-500 text-sm">系統已記錄您的成交時間。<br/>請至「報名名單」查看詳細毫秒數。</p>
              </div>
            )
          )}

          {activeTab === 'list' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-bold text-gray-800">已報名勇者名單</h4>
                <span className="bg-slate-200 text-slate-700 text-xs px-2 py-1 rounded-full font-bold">{participants.length} 人</span>
              </div>
              
              {participants.length === 0 ? (
                <div className="text-center py-12 bg-white rounded-xl border border-dashed border-gray-300"><p className="text-gray-400 text-sm">目前還沒有人報名<br/>快來搶頭香！</p></div>
              ) : (
                Object.keys(groupedParticipants).map((groupName, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="bg-slate-50 px-4 py-2 border-b border-gray-100 flex justify-between items-center">
                      <span className="font-bold text-slate-700 text-sm">{groupName.replace(/"/g, '')}</span>
                      <span className="text-xs text-slate-500 bg-white border px-1.5 py-0.5 rounded">{groupedParticipants[groupName].length} 人</span>
                    </div>
                    <div className="divide-y divide-gray-50">
                      {groupedParticipants[groupName].map((p, pIdx) => (
                        <div key={pIdx} className="p-3 flex items-center justify-between hover:bg-blue-50/50 transition-colors">
                           <div className="flex items-center">
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs mr-3 border border-blue-200">
                                {p.user_name?.[0]}
                              </div>
                              <span className="font-bold text-gray-700 text-sm">{p.user_name}</span>
                           </div>
                           {/* ✨ 精確到毫秒的時間顯示區 */}
                           <div className="flex items-center text-[10px] text-gray-500 font-mono tracking-tight">
                              <Clock size={10} className="mr-1 text-gray-400"/>
                              {formatTimeDetail(p.created_at)}
                           </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}