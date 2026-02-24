import { useState, useEffect } from 'react'
import { Calendar, MapPin, Clock, ImagePlus, Flag, Plus, Trash2, Save, ShieldAlert, Activity, Users, Settings, Flame, ExternalLink, Loader2, Edit3, Handshake, Send } from 'lucide-react'
import { supabase } from '../supabaseClient'
import { useLocation, useNavigate } from 'react-router-dom'

export default function RaceBuilder() {
  const location = useLocation()
  const navigate = useNavigate()
  
  const searchParams = new URLSearchParams(location.search)
  const editId = searchParams.get('id')

  const [raceData, setRaceData] = useState({
      title: '', date: '', startTime: '', location: '', type: '馬拉松', status: 'OPEN', imageUrl: '', isHot: false
  })
  const [slots, setSlots] = useState([])
  const [isSubmitting, setIsSubmitting] = useState(false) 
  const [isFetchingData, setIsFetchingData] = useState(false)

  const SLOT_TEMPLATES = {
      '馬拉松': [ { group: '一般組別', name: '全程馬拉松組', capacity: 10, genderLimit: 'ANY' }, { group: '一般組別', name: '半程馬拉松組', capacity: 10, genderLimit: 'ANY' } ],
      '鐵人三項': [ { group: '個人組', name: '全程 226 組 (需三鐵衣)', capacity: 5, genderLimit: 'ANY' }, { group: '接力組', name: '🏊 游泳棒 (需三鐵衣)', capacity: 3, genderLimit: 'ANY' } ],
      '二鐵': [ { group: '個人組', name: '標準賽 (跑-騎-跑)', capacity: 10, genderLimit: 'ANY' } ],
      '游泳': [ { group: '一般組別', name: '3000m 挑戰組', capacity: 5, genderLimit: 'ANY' } ],
      '自行車': [ { group: '一般組別', name: '競賽組', capacity: 10, genderLimit: 'ANY' } ],
      '路跑接力': [ ...Array.from({ length: 7 }, (_, i) => ({ group: 'A組 - 競賽組', name: `第${i + 1}棒`, capacity: 1, genderLimit: 'ANY' })) ]
  }

  useEffect(() => {
      if (editId) {
          fetchExistingRace(editId)
      } else {
          const template = SLOT_TEMPLATES['馬拉松'].map((s, i) => ({ ...s, id: Date.now() + i }))
          setSlots(template)
      }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId])

  const fetchExistingRace = async (id) => {
      setIsFetchingData(true)
      try {
          const { data, error } = await supabase.from('races').select('*').eq('id', id).single()
          if (error) throw error
          if (data) {
              setRaceData({
                  title: data.name, date: data.date, startTime: data.gather_time || '', 
                  location: data.location, type: data.type, status: data.status, 
                  imageUrl: data.image_url || '', isHot: data.is_hot
              })
              setSlots(data.slots_data || [])
          }
      } catch (error) {
          alert("讀取賽事資料失敗，請回清單重試。")
          navigate('/admin/races')
      } finally {
          setIsFetchingData(false)
      }
  }

  const handleTypeChange = (e) => {
      const newType = e.target.value
      setRaceData({...raceData, type: newType})
      
      if (window.confirm("更改賽事類型會重置下方的「任務名額配置模板」，確定要重置嗎？\n(如果您已經手動編輯過名單，建議點選取消)")) {
          const template = SLOT_TEMPLATES[newType] || [];
          setSlots(template.map((slot, index) => ({ ...slot, id: Date.now() + index })));
      }
  }

  const addSlot = () => {
      const lastGroup = slots[slots.length - 1]?.group || '一般組別';
      setSlots([...slots, { id: Date.now(), group: lastGroup, name: '', capacity: 1, genderLimit: 'ANY' }])
  }

  const removeSlot = (id) => { setSlots(slots.filter(s => s.id !== id)) }
  const updateSlot = (id, field, value) => { setSlots(slots.map(s => s.id === id ? { ...s, [field]: value } : s)) }

  const handleSaveRace = async () => {
      if(!raceData.title || !raceData.date || !raceData.location) return alert("請填寫完整的賽事資訊！")
      if (slots.length === 0) return alert("請至少建立一個賽段！")
      const emptySlot = slots.find(s => !s.name || !s.group); if(emptySlot) return alert("有「隊伍/組別」或「賽段名稱」未填寫！")

      setIsSubmitting(true);
      try {
          const totalRequired = slots.reduce((acc, curr) => acc + Number(curr.capacity), 0);
          const payload = {
              name: raceData.title, date: raceData.date, location: raceData.location,
              type: raceData.type, status: raceData.status, image_url: raceData.imageUrl,
              is_hot: raceData.isHot, gather_time: raceData.startTime, 
              medic_required: totalRequired, slots_data: slots 
          };

          if (editId) {
              const { error } = await supabase.from('races').update(payload).eq('id', editId)
              if (error) throw error;
              alert(`🎉 賽事「${raceData.title}」更新成功！`);
              navigate('/admin/races') 
          } else {
              payload.medic_registered = 0; 
              const { error } = await supabase.from('races').insert([payload])
              if (error) throw error;
              alert(`🎉 賽事「${raceData.title}」發佈成功！`);
              navigate('/admin/races') 
          }
      } catch (error) {
          alert(`儲存失敗：${error.message}`);
      } finally {
          setIsSubmitting(false);
      }
  }

  const openImageLink = () => {
      if (raceData.imageUrl && raceData.imageUrl.startsWith('http')) {
          window.open(raceData.imageUrl, '_blank', 'noopener,noreferrer');
      } else { alert("請輸入有效的圖片 URL (以 http:// 或 https:// 開頭)"); }
  }

  if (isFetchingData) return <div className="h-64 flex items-center justify-center text-slate-500"><Loader2 className="animate-spin mr-2"/> 讀取賽事資料中...</div>

  // 動態渲染發佈狀態的圖示
  const renderStatusIcon = (status) => {
      switch(status) {
          case 'OPEN': return <Activity size={16} className="text-green-500"/>;
          case 'NEGOTIATING': return <Handshake size={16} className="text-amber-500"/>;
          case 'SUBMITTED': return <Send size={16} className="text-slate-600"/>;
          case 'FULL': return <Users size={16} className="text-red-500"/>;
          default: return <Clock size={16} className="text-slate-400"/>;
      }
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-800 w-full">
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  {editId ? <Edit3 className="text-amber-500"/> : <Flag className="text-blue-600"/>}
                  {editId ? '編輯任務情報' : '建立新任務'} 
              </h2>
              <p className="text-slate-500 text-sm mt-1">{editId ? '修改賽事屬性與排班名額，儲存後將即時生效。' : '請在此設定賽事的基本資訊、屬性，並規劃各組別的賽段與人力需求。'}</p>
          </div>
          <button onClick={handleSaveRace} disabled={isSubmitting} className={`px-8 py-3 rounded-xl font-black shadow-lg transition-all flex items-center gap-2 ${isSubmitting ? 'bg-slate-400 text-white cursor-not-allowed' : editId ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/30' : 'bg-slate-900 hover:bg-blue-600 text-white'}`}>
              {isSubmitting ? <><Loader2 className="animate-spin" size={18}/> 儲存中...</> : <><Save size={18}/> {editId ? '確認並更新賽事' : '簽署並發佈賽事'}</>}
          </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
          <div className="xl:col-span-1 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-black text-lg mb-4 flex items-center gap-2 border-b border-slate-100 pb-3"><Activity className="text-blue-500"/> 賽事資訊 (General Info)</h3>
                  <div className="space-y-4">
                      <div><label className="block text-sm font-bold text-slate-700 mb-1">賽事名稱</label><input type="text" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none" value={raceData.title} onChange={e => setRaceData({...raceData, title: e.target.value})}/></div>
                      <div className="grid grid-cols-2 gap-4">
                          <div><label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Calendar size={14}/> 日期</label><input type="date" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none cursor-text" value={raceData.date} onChange={e => setRaceData({...raceData, date: e.target.value})}/></div>
                          <div><label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Clock size={14}/> 比賽最早鳴槍時間</label><input type="text" placeholder="例如: 05:30" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none cursor-text" value={raceData.startTime} onChange={e => setRaceData({...raceData, startTime: e.target.value})}/></div>
                      </div>
                      <div><label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><MapPin size={14}/> 集合地點</label><input type="text" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none" value={raceData.location} onChange={e => setRaceData({...raceData, location: e.target.value})}/></div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><ImagePlus size={14}/> 宣傳海報圖片 (URL)</label>
                          <div className="flex gap-2 items-center">
                              <input type="text" placeholder="https://..." className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm font-mono flex-1" value={raceData.imageUrl} onChange={e => setRaceData({...raceData, imageUrl: e.target.value})}/>
                              <button onClick={openImageLink} className="px-3 py-2.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors text-xs font-bold flex items-center gap-1 whitespace-nowrap" title="在新分頁預覽圖片"><ExternalLink size={14} />網頁連結測試確認</button>
                          </div>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-black text-lg mb-4 flex items-center gap-2 border-b border-slate-100 pb-3"><Settings className="text-slate-500"/> 賽事屬性 (Attributes)</h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">賽事類型 (影響裝備檢查)</label>
                          <select className="w-full border border-slate-300 p-2.5 rounded-lg outline-none font-bold text-blue-700 bg-blue-50/30 cursor-pointer hover:bg-blue-50" value={raceData.type} onChange={handleTypeChange}>
                              <option value="馬拉松">馬拉松 (一般路跑)</option><option value="鐵人三項">鐵人三項 (🚨 強制檢查三鐵衣)</option><option value="二鐵">二鐵</option><option value="游泳">水上/游泳</option><option value="自行車">自行車</option><option value="路跑接力">路跑接力</option>
                          </select>
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                              任務生命週期狀態
                          </label>
                          <div className="relative">
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                                  {renderStatusIcon(raceData.status)}
                              </div>
                              {/* 🌟 擴充了狀態選項 */}
                              <select className="w-full border border-slate-300 py-2.5 pl-9 pr-4 rounded-lg outline-none font-bold cursor-pointer hover:border-blue-400 transition-colors bg-white appearance-none" value={raceData.status} onChange={e => setRaceData({...raceData, status: e.target.value})}>
                                  <option value="OPEN">🟢 招募中 (開放報名)</option>
                                  <option value="NEGOTIATING">🤝 洽談中 (意願收集/預備)</option>
                                  <option value="SUBMITTED">📤 已送名單 (鎖定/停止報名)</option>
                                  <option value="FULL">⚫ 滿編 (停止報名，開放候補)</option>
                              </select>
                          </div>
                      </div>
                      <label className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-xl cursor-pointer hover:bg-red-100 transition-colors">
                          <input type="checkbox" className="w-5 h-5 accent-red-500" checked={raceData.isHot} onChange={e => setRaceData({...raceData, isHot: e.target.checked})}/>
                          <span className="font-bold text-red-600 flex items-center gap-1"><Flame size={18}/> 標記為「火熱賽事」</span>
                      </label>
                  </div>
              </div>
          </div>

          <div className="xl:col-span-2">
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 min-h-full">
                  <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                      <div>
                          <h3 className="font-black text-xl text-slate-800 flex items-center gap-2"><Users className="text-blue-600"/> 任務名額配置 (Slot Allocation)</h3>
                          <p className="text-xs text-slate-500 mt-1">您可以自由調整隊伍、棒次名稱與需求人數。</p>
                      </div>
                      <button onClick={addSlot} className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm"><Plus size={16}/> 新增賽段</button>
                  </div>

                  <div className="space-y-4">
                      {slots.map((slot, index) => (
                          <div key={slot.id} className="p-5 rounded-xl border-2 border-slate-100 bg-slate-50 relative group hover:border-blue-300 transition-all">
                              <div className="absolute -left-3 -top-3 w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center font-black text-sm border-4 border-white shadow-sm">{index + 1}</div>
                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                  <div className="md:col-span-3"><label className="block text-xs font-bold text-slate-500 mb-1">隊伍 / 組別</label><input type="text" placeholder="例如：A組" className="w-full border border-slate-300 p-2 rounded outline-none font-bold text-blue-700 bg-white cursor-text" value={slot.group} onChange={e => updateSlot(slot.id, 'group', e.target.value)} /></div>
                                  <div className="md:col-span-4"><label className="block text-xs font-bold text-slate-500 mb-1">賽段 / 棒次名稱</label><input type="text" placeholder="例如：第1棒：游泳" className="w-full border border-slate-300 p-2 rounded outline-none font-bold text-slate-800 bg-white cursor-text" value={slot.name} onChange={e => updateSlot(slot.id, 'name', e.target.value)} /></div>
                                  <div className="md:col-span-2"><label className="block text-xs font-bold text-slate-500 mb-1">需求人數</label><input type="number" min="1" className="w-full border border-slate-300 p-2 rounded outline-none text-center font-bold text-blue-600 bg-white cursor-text" value={slot.capacity} onChange={e => updateSlot(slot.id, 'capacity', e.target.value)} /></div>
                                  <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-slate-500 mb-1">性別限制</label>
                                      <select className={`w-full border border-slate-300 p-2 rounded outline-none text-xs font-bold ${slot.genderLimit === 'F' ? 'bg-pink-50 text-pink-600 border-pink-200' : 'bg-white text-slate-600'}`} value={slot.genderLimit} onChange={e => updateSlot(slot.id, 'genderLimit', e.target.value)}>
                                          <option value="ANY">無</option><option value="F">🚨 限女</option><option value="M">🚨 限男</option>
                                      </select>
                                  </div>
                                  <div className="md:col-span-1 flex items-end justify-end"><button onClick={() => removeSlot(slot.id)} className="p-2 text-red-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors mb-0.5"><Trash2 size={20}/></button></div>
                              </div>
                          </div>
                      ))}
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