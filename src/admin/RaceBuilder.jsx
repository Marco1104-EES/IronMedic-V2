import { useState, useEffect } from 'react'
import { Calendar, MapPin, Clock, ImagePlus, Flag, Plus, Trash2, Save, ShieldAlert, Activity, Users, Settings, Flame, ExternalLink, Loader2, Edit3, Handshake, Send, Wand2, UsersRound, Crown, Sprout, XCircle, AlertCircle, CheckCircle } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useLocation, useNavigate } from 'react-router-dom'

export default function RaceBuilder() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const searchParams = new URLSearchParams(location.search)
  const editId = searchParams.get('id')

  const [raceData, setRaceData] = useState({
      title: '', date: '', startTime: '', location: '', type: '馬拉松', status: 'OPEN', imageUrl: '', isHot: false, openTime: ''
  })
  const [slots, setSlots] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(!!editId)
  
  const [newSlot, setNewSlot] = useState({ group: '一般組別', name: '', capacity: 1, genderLimit: 'None' })

  useEffect(() => {
      if (editId) fetchRaceData(editId)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  const fetchRaceData = async (id) => {
      try {
          const { data, error } = await supabase.from('races').select('*').eq('id', id).single()
          if (error) throw error
          
          if (data) {
              setRaceData({
                  title: data.name || '',
                  date: data.date || '',
                  startTime: data.gather_time || '',
                  location: data.location || '',
                  type: data.type || '馬拉松',
                  status: data.status || 'OPEN',
                  imageUrl: data.image_url || '',
                  isHot: data.is_hot || false,
                  // 防呆：確保如果有資料才轉換時間格式
                  openTime: data.open_time ? new Date(data.open_time).toISOString().slice(0, 16) : ''
              })
              setSlots(data.slots_data || [])
          }
      } catch (error) {
          alert('載入賽事資料失敗，請確認網路或資料庫狀態。')
          navigate('/admin/races')
      } finally {
          setLoading(false)
      }
  }

  const handleAddSlot = () => {
      if (!newSlot.name) return alert('請輸入賽段名稱')
      setSlots([...slots, { id: Date.now().toString(), ...newSlot, filled: 0, assignee: null }])
      setNewSlot({ ...newSlot, name: '', capacity: 1 }) 
  }

  const handleRemoveSlot = (id) => {
      const slotToRemove = slots.find(s => s.id === id)
      if (slotToRemove && slotToRemove.filled > 0) {
          return alert('此賽段已有報名人員，無法直接刪除！請先清空名單。')
      }
      setSlots(slots.filter(s => s.id !== id))
  }

  const handleCapacityChange = (id, newCap) => {
      setSlots(slots.map(s => s.id === id ? { ...s, capacity: Number(newCap) } : s))
  }

  const handleGenderLimitChange = (id, newLimit) => {
      setSlots(slots.map(s => s.id === id ? { ...s, genderLimit: newLimit } : s))
  }

  const handleRemoveAssignee = (slotId, participantIdOrName) => {
      setSlots(slots.map(s => {
          if (s.id === slotId && s.assignee) {
              const assigneesArray = s.assignee.split('|').map(str => {
                  try { return JSON.parse(str); } catch(e) { return { id: str, name: str, isLegacy: true }; }
              });
              
              const newAssigneesArray = assigneesArray.filter(p => p.id !== participantIdOrName && p.name !== participantIdOrName);
              
              const newAssigneeString = newAssigneesArray.map(p => p.isLegacy ? p.name : JSON.stringify(p)).join('|');
              
              return { ...s, filled: Math.max(0, s.filled - 1), assignee: newAssigneeString };
          }
          return s;
      }))
  }

  const handleAssignRole = (slotId, participantIdOrName, roleTag) => {
      setSlots(slots.map(s => {
          if (s.id === slotId && s.assignee) {
              const assigneesArray = s.assignee.split('|').map(str => {
                  try { return JSON.parse(str); } catch(e) { return { id: str, name: str, isLegacy: true }; }
              });
              
              const updatedAssignees = assigneesArray.map(p => {
                  if (p.id === participantIdOrName || p.name === participantIdOrName) {
                      return { ...p, roleTag: roleTag || null };
                  }
                  return p;
              });
              
              const newAssigneeString = updatedAssignees.map(p => p.isLegacy ? p.name : JSON.stringify(p)).join('|');
              return { ...s, assignee: newAssigneeString };
          }
          return s;
      }))
  }

  const handleSaveRace = async () => {
      if (!raceData.title || !raceData.date) return alert('請至少填寫賽事名稱與日期')
      
      setIsSubmitting(true)
      
      // 🌟 移除 city 欄位，避免 schema error
      const payload = {
          name: raceData.title,
          date: raceData.date,
          gather_time: raceData.startTime,
          location: raceData.location,
          type: raceData.type,
          status: raceData.status,
          image_url: raceData.imageUrl,
          slots_data: slots,
          is_hot: raceData.isHot,
          medic_required: slots.reduce((acc, curr) => acc + Number(curr.capacity || 0), 0),
          medic_registered: slots.reduce((acc, curr) => acc + Number(curr.filled || 0), 0),
      }

      // 💡 防呆：如果使用者有設定 openTime，我們才嘗試送出 open_time 欄位。
      // 如果您的資料庫還沒建這個欄位，這裡會被 Supabase 擋下，所以請務必先去後台建立！
      if (raceData.openTime) {
          payload.open_time = new Date(raceData.openTime).toISOString();
      }

      try {
          if (editId) {
              const { error } = await supabase.from('races').update(payload).eq('id', editId)
              if (error) {
                  // 特別攔截 open_time 找不到的錯誤
                  if (error.message.includes('Could not find the \'open_time\' column')) {
                      throw new Error('儲存失敗：您尚未在資料庫(races)中建立「open_time」欄位！請先建立，或者清除開放時間後再儲存。');
                  }
                  throw error;
              }
              alert('賽事更新成功！')
          } else {
              const { error } = await supabase.from('races').insert([payload])
              if (error) {
                  if (error.message.includes('Could not find the \'open_time\' column')) {
                      throw new Error('建立失敗：您尚未在資料庫(races)中建立「open_time」欄位！請先建立，或者清除開放時間後再儲存。');
                  }
                  throw error;
              }
              alert('賽事建立成功！')
          }
          navigate('/admin/races')
      } catch (error) {
          alert(error.message)
      } finally {
          setIsSubmitting(false)
      }
  }

  if (loading) return <div className="h-[60vh] flex items-center justify-center text-slate-400"><Loader2 className="animate-spin mr-2"/> 載入賽事資料中...</div>

  return (
    <div className="space-y-6 md:space-y-8 animate-fade-in pb-20">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Wand2 className="text-amber-500"/> {editId ? '編輯任務參數' : '建立新任務'}
              </h2>
              <p className="text-slate-500 font-medium text-sm mt-1">設定賽事細節、招募名額與時間分流控制</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
              <button onClick={() => navigate('/admin/races')} className="flex-1 md:flex-none px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">取消</button>
              <button onClick={handleSaveRace} disabled={isSubmitting} className="flex-1 md:flex-none px-6 py-3 bg-blue-600 text-white rounded-xl font-black shadow-lg shadow-blue-600/30 hover:bg-blue-700 hover:shadow-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {isSubmitting ? <Loader2 size={18} className="animate-spin"/> : <Save size={18}/>} 
                  {editId ? '儲存變更' : '發布任務'}
              </button>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
          
          <div className="lg:col-span-7 space-y-6 md:space-y-8">
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-4"><Settings className="text-blue-500"/> 基本賽事資訊</h3>
                  
                  <div className="space-y-5">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">賽事名稱 <span className="text-red-500">*</span></label>
                          <input type="text" className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors font-black text-slate-800 text-lg" placeholder="例如：2026 台北馬拉松" value={raceData.title} onChange={e => setRaceData({...raceData, title: e.target.value})}/>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Calendar size={16} className="text-slate-400"/> 賽事日期 <span className="text-red-500">*</span></label>
                              <input type="date" className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors font-medium text-slate-700" value={raceData.date} onChange={e => setRaceData({...raceData, date: e.target.value})}/>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Clock size={16} className="text-slate-400"/> 集合/鳴槍時間</label>
                              <input type="time" className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors font-medium text-slate-700" value={raceData.startTime} onChange={e => setRaceData({...raceData, startTime: e.target.value})}/>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><MapPin size={16} className="text-slate-400"/> 詳細地點</label>
                          {/* 🌟 拔除原本的「縣市分類」，這裡直接讓管理員填寫地點 */}
                          <input type="text" className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-blue-500 transition-colors font-medium text-slate-700" placeholder="例如：台北市政府廣場" value={raceData.location} onChange={e => setRaceData({...raceData, location: e.target.value})}/>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Clock size={16} className="text-purple-500"/> 預計開放報名時間 (Time-Gated)</label>
                          <input type="datetime-local" className="w-full border-2 border-purple-200 p-3 rounded-xl outline-none focus:border-purple-500 transition-colors font-black text-purple-900 bg-purple-50" value={raceData.openTime} onChange={e => setRaceData({...raceData, openTime: e.target.value})}/>
                          <p className="text-xs text-slate-500 mt-1.5 font-medium leading-relaxed">
                              設定後將啟動梯次分流：<br/>
                              🔹 Day 0 (開放當日至午夜)：僅限 <span className="text-blue-600 font-bold">帶隊教官</span><br/>
                              🔹 Day 1 (隔日 00:00 起)：開放 <span className="text-emerald-600 font-bold">新人、當屆訓練</span><br/>
                              🔹 Day 2 (第三日 00:00 起)：全面開放 <span className="text-slate-700 font-bold">所有當屆會員</span><br/>
                              (VIP 無視天數隨時可報，未設定則視為全面開放)
                          </p>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8">
                  <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-4"><ImagePlus className="text-indigo-500"/> 視覺與狀態控制</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">賽事類型</label>
                          <select className="w-full border-2 border-slate-200 p-3 rounded-xl outline-none focus:border-indigo-500 transition-colors font-bold text-indigo-900 bg-indigo-50" value={raceData.type} onChange={e => setRaceData({...raceData, type: e.target.value})}>
                              <option value="馬拉松">馬拉松</option>
                              <option value="越野賽">越野賽</option>
                              <option value="自行車">自行車</option>
                              <option value="鐵人三項">鐵人三項</option>
                              <option value="二鐵">二鐵</option>
                              <option value="游泳">游泳</option>
                              <option value="路跑接力">路跑接力</option>
                              <option value="其他">其他</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-2">招募狀態</label>
                          <select className={`w-full border-2 p-3 rounded-xl outline-none font-bold transition-colors ${raceData.status === 'OPEN' ? 'bg-green-50 border-green-200 text-green-700 focus:border-green-500' : raceData.status === 'FULL' ? 'bg-red-50 border-red-200 text-red-700 focus:border-red-500' : raceData.status === 'UPCOMING' ? 'bg-amber-50 border-amber-200 text-amber-700 focus:border-amber-500' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-slate-500'}`} value={raceData.status} onChange={e => setRaceData({...raceData, status: e.target.value})}>
                              <option value="UPCOMING">⏳ 即將開放 (UPCOMING)</option>
                              <option value="OPEN">🟢 招募中 (OPEN)</option>
                              <option value="FULL">🔴 滿編/停止招募 (FULL)</option>
                              <option value="NEGOTIATING">🤝 洽談中 (NEGOTIATING)</option>
                              <option value="SUBMITTED">✅ 已送大會名單 (SUBMITTED)</option>
                          </select>
                      </div>
                  </div>

                  <div className="mb-6">
                      <label className="flex items-center gap-3 cursor-pointer p-4 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-colors">
                          <input type="checkbox" className="w-5 h-5 accent-orange-500" checked={raceData.isHot} onChange={e => setRaceData({...raceData, isHot: e.target.checked})}/>
                          <div>
                              <div className="font-black text-orange-700 flex items-center gap-1"><Flame size={16}/> 標記為熱門/重點賽事</div>
                              <div className="text-xs text-orange-600/80 font-medium">將在賽事大廳中加上火焰特效凸顯</div>
                          </div>
                      </label>
                  </div>

                  {/* 🌟 圖片區塊瘦身：拔除輸入網址，統一使用系統預設圖 */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                          <ImagePlus className="text-slate-400" size={18}/>
                          <span className="font-bold text-slate-700 text-sm">賽事主視覺</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-4">系統將自動套用高質感的預設賽事背景，讓前台大廳保持一致的視覺風格，無需手動上傳圖片。</p>
                      
                      <div className="rounded-xl overflow-hidden border-2 border-slate-200 h-32 relative bg-[url('https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&q=80&w=600')] bg-cover bg-center">
                          <div className="absolute inset-0 bg-slate-900/40"></div>
                          <div className="absolute inset-0 flex items-center justify-center">
                              <span className="font-black tracking-widest text-white/90 drop-shadow-md">系統通用預設背景</span>
                          </div>
                      </div>
                  </div>
              </div>
          </div>

          <div className="lg:col-span-5 space-y-6 md:space-y-8">
              
              <div className="bg-slate-900 rounded-2xl shadow-xl shadow-slate-900/20 border border-slate-800 p-6 md:p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-bl-full blur-2xl"></div>
                  
                  <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2 border-b border-slate-700 pb-4"><UsersRound className="text-blue-400"/> 任務名額與賽段設定</h3>
                  
                  <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-6 shadow-inner">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-400 mb-1">賽段/組別分類</label>
                              <input type="text" className="w-full border border-slate-600 bg-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 text-white text-sm" placeholder="例: 全馬組" value={newSlot.group} onChange={e => setNewSlot({...newSlot, group: e.target.value})}/>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-400 mb-1">特定配速/任務名稱</label>
                              <input type="text" className="w-full border border-slate-600 bg-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 text-white text-sm" placeholder="例: 4:30 列車" value={newSlot.name} onChange={e => setNewSlot({...newSlot, name: e.target.value})}/>
                          </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                              <label className="block text-xs font-bold text-slate-400 mb-1">需求人數</label>
                              <input type="number" min="1" className="w-full border border-slate-600 bg-slate-900 p-2.5 rounded-lg outline-none focus:border-blue-500 text-white text-sm font-mono" value={newSlot.capacity} onChange={e => setNewSlot({...newSlot, capacity: parseInt(e.target.value) || 1})}/>
                          </div>
                          <div>
                              <label className="block text-xs font-bold text-slate-400 mb-1">性別限制</label>
                              <select className="w-full border border-slate-600 bg-slate-900 p-2.5 rounded-lg outline-none focus:border-pink-500 text-white text-sm" value={newSlot.genderLimit} onChange={e => setNewSlot({...newSlot, genderLimit: e.target.value})}>
                                  <option value="None">無限制</option>
                                  <option value="F">🚺 限女性</option>
                              </select>
                          </div>
                      </div>
                      <button onClick={handleAddSlot} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/50">
                          <Plus size={18}/> 新增至賽段列表
                      </button>
                  </div>

                  <div className="space-y-4 max-h-[600px] overflow-y-auto custom-scrollbar pr-2">
                      {slots.length === 0 && (
                          <div className="text-center py-8 border-2 border-dashed border-slate-700 rounded-xl text-slate-500 font-medium">尚未新增任何賽段</div>
                      )}
                      
                      {slots.map((slot, index) => {
                          const assignees = slot.assignee ? slot.assignee.split('|').map(str => {
                              try { return JSON.parse(str); } catch(e) { return { id: str, name: str, isLegacy: true }; }
                          }) : [];
                          
                          return (
                          <div key={slot.id} className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group">
                              <div className="bg-slate-50 p-3 border-b border-slate-200 flex justify-between items-center">
                                  <div className="flex flex-col">
                                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{slot.group}</span>
                                      <span className="font-black text-slate-800 text-base">{slot.name} {slot.genderLimit === 'F' && <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full ml-1 align-middle border border-pink-200">限女</span>}</span>
                                  </div>
                                  <button onClick={() => handleRemoveSlot(slot.id)} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="刪除此賽段"><Trash2 size={16}/></button>
                              </div>
                              <div className="p-4">
                                  <div className="flex items-center gap-3 mb-4">
                                      <div className="flex-1">
                                          <label className="block text-[10px] font-bold text-slate-400 mb-1">開放名額</label>
                                          <input type="number" min="1" className="w-full border border-slate-200 p-2 rounded outline-none text-sm font-bold focus:border-blue-500 text-slate-700" value={slot.capacity} onChange={e => handleCapacityChange(slot.id, e.target.value)}/>
                                      </div>
                                      <div className="flex-1">
                                          <label className="block text-[10px] font-bold text-slate-400 mb-1">已報名</label>
                                          <div className="w-full bg-slate-100 p-2 rounded text-sm font-black text-slate-500 text-center border border-transparent">
                                              {slot.filled || 0}
                                          </div>
                                      </div>
                                  </div>

                                  {assignees.length > 0 ? (
                                      <div className="space-y-2 border-t border-slate-100 pt-3">
                                          <div className="text-[10px] font-bold text-blue-600 flex items-center gap-1 mb-2"><CheckCircle size={10}/> 報名名單與職務指派</div>
                                          {assignees.map((p, i) => (
                                              <div key={i} className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-50 p-2 rounded border border-slate-100 gap-2">
                                                  <div className="flex items-center gap-2">
                                                      <span className="text-xs font-black text-slate-700 truncate max-w-[120px]">{p.isLegacy ? p.name.split('#')[0] : p.name}</span>
                                                      {p.isVip && <Crown size={12} className="text-amber-500"/>}
                                                      {p.isNew && <Sprout size={12} className="text-green-500"/>}
                                                  </div>
                                                  <div className="flex items-center gap-1 w-full sm:w-auto">
                                                      <select 
                                                          className="text-[10px] border border-slate-200 rounded p-1 outline-none bg-white font-bold flex-1 sm:w-[90px]"
                                                          value={p.roleTag || ""}
                                                          onChange={(e) => handleAssignRole(slot.id, p.id || p.name, e.target.value)}
                                                      >
                                                          <option value="">一般參賽</option>
                                                          <option value="帶隊教官">🛡️ 帶隊教官</option>
                                                          <option value="賽道教官">🚩 賽道教官</option>
                                                          <option value="醫護教官">🏥 醫護教官</option>
                                                          <option value="官方代表">👑 官方代表</option>
                                                      </select>
                                                      <button onClick={() => handleRemoveAssignee(slot.id, p.id || p.name)} className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-100 rounded transition-colors" title="強制移除此人"><XCircle size={14}/></button>
                                                  </div>
                                              </div>
                                          ))}
                                      </div>
                                  ) : (
                                      <div className="text-xs text-slate-400 font-medium text-center py-2">目前尚無人員報名此賽段</div>
                                  )}
                              </div>
                          </div>
                      )})}
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-blue-800">總人力需求預估：</span>
                      <span className="text-2xl font-black text-blue-600">{slots.reduce((acc, curr) => acc + Number(curr.capacity || 0), 0)} <span className="text-sm">人</span></span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  )
}