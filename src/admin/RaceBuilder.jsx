import { useState } from 'react'
import { Calendar, MapPin, Clock, ImagePlus, Flag, Plus, Trash2, Save, ShieldAlert, Activity, Users, Settings } from 'lucide-react'

export default function RaceBuilder() {
  const [raceData, setRaceData] = useState({
      title: '',
      date: '',
      gatherTime: '',
      location: '',
      type: '馬拉松',
      status: 'UPCOMING',
      imageUrl: '',
      isHot: false
  })

  const [slots, setSlots] = useState([
      { id: Date.now(), name: '全程組 (醫護鐵人)', capacity: 10, genderLimit: 'ANY' }
  ])

  const addSlot = () => {
      setSlots([...slots, { id: Date.now(), name: '', capacity: 1, genderLimit: 'ANY' }])
  }

  const removeSlot = (id) => {
      if(slots.length === 1) return alert('至少需要保留一個賽段陣型！')
      setSlots(slots.filter(s => s.id !== id))
  }

  const updateSlot = (id, field, value) => {
      setSlots(slots.map(s => s.id === id ? { ...s, [field]: value } : s))
  }

  const handleSaveRace = () => {
      if(!raceData.title || !raceData.date || !raceData.location) {
          return alert("請填寫完整的賽事基本情報（名稱、日期、地點）！")
      }
      
      const emptySlot = slots.find(s => !s.name)
      if(emptySlot) {
          return alert("有賽段/棒次名稱未填寫，請確認陣型佈署！")
      }

      console.log("準備寫入資料庫的賽事結構：", { ...raceData, slots })
      alert(`🎉 賽事「${raceData.title}」佈署成功！\n共建立 ${slots.length} 個賽段，總需求兵力：${slots.reduce((acc, curr) => acc + Number(curr.capacity), 0)} 人。`)
  }

  return (
    <div className="space-y-6 pb-20 animate-fade-in text-slate-800 w-full">
      
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  <Flag className="text-blue-600"/> 賽事建立中心 <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded font-bold border border-slate-200">Race Builder</span>
              </h2>
              <p className="text-slate-500 text-sm mt-1">模組化賽事兵工廠。請在此建立新的任務情報與陣型插槽。</p>
          </div>
          <button onClick={handleSaveRace} className="px-8 py-3 bg-slate-900 hover:bg-blue-600 text-white rounded-xl font-black shadow-lg transition-all active:scale-95 flex items-center gap-2">
              <Save size={18}/> 簽署並發佈賽事
          </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 w-full">
          
          <div className="xl:col-span-1 space-y-6">
              
              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-black text-lg mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Activity className="text-blue-500"/> 基本情報 (General Info)
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">賽事名稱</label>
                          <input type="text" placeholder="例如：2026 普悠瑪國際鐵人三項賽" className="w-full border border-slate-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                              value={raceData.title} onChange={e => setRaceData({...raceData, title: e.target.value})}/>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Calendar size={14}/> 日期</label>
                              <input type="date" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none" 
                                  value={raceData.date} onChange={e => setRaceData({...raceData, date: e.target.value})}/>
                          </div>
                          <div>
                              <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><Clock size={14}/> 集合時間</label>
                              <input type="time" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none" 
                                  value={raceData.gatherTime} onChange={e => setRaceData({...raceData, gatherTime: e.target.value})}/>
                          </div>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><MapPin size={14}/> 集合地點</label>
                          <input type="text" placeholder="例如：台東縣・活水湖" className="w-full border border-slate-300 p-2.5 rounded-lg outline-none" 
                              value={raceData.location} onChange={e => setRaceData({...raceData, location: e.target.value})}/>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1 flex items-center gap-1"><ImagePlus size={14}/> 宣傳海報圖片 (URL)</label>
                          <input type="text" placeholder="https://..." className="w-full border border-slate-300 p-2.5 rounded-lg outline-none text-sm font-mono" 
                              value={raceData.imageUrl} onChange={e => setRaceData({...raceData, imageUrl: e.target.value})}/>
                      </div>
                  </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
                  <h3 className="font-black text-lg mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                      <Settings className="text-slate-500"/> 賽事屬性 (Attributes)
                  </h3>
                  <div className="space-y-4">
                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">賽事類型 (影響裝備防呆檢查)</label>
                          <select className="w-full border border-slate-300 p-2.5 rounded-lg outline-none font-bold text-blue-700 bg-blue-50/30"
                              value={raceData.type} onChange={e => setRaceData({...raceData, type: e.target.value})}>
                              <option value="馬拉松">馬拉松 (一般路跑)</option>
                              <option value="鐵人三項">鐵人三項 (🚨 強制檢查三鐵衣)</option>
                              <option value="二鐵">二鐵 (🚨 強制檢查三鐵衣)</option>
                              <option value="游泳">水上/游泳 (🚨 強制檢查三鐵衣)</option>
                              <option value="自行車">自行車</option>
                              <option value="路跑接力">路跑接力</option>
                          </select>
                      </div>

                      <div>
                          <label className="block text-sm font-bold text-slate-700 mb-1">初始發佈狀態</label>
                          <select className="w-full border border-slate-300 p-2.5 rounded-lg outline-none font-bold"
                              value={raceData.status} onChange={e => setRaceData({...raceData, status: e.target.value})}>
                              <option value="UPCOMING">🟡 即將開放 (預熱收集意願)</option>
                              <option value="OPEN">🟢 招募中 (正式開放報名)</option>
                              <option value="FULL">⚫ 任務滿編 (鎖定名額)</option>
                          </select>
                      </div>

                      <label className="flex items-center gap-2 p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors">
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
                          <h3 className="font-black text-xl text-slate-800 flex items-center gap-2">
                              <Users className="text-blue-600"/> 陣型佈署器 (Slot Builder)
                          </h3>
                          <p className="text-xs text-slate-500 mt-1">設定這場賽事需要幾種棒次/組別，以及各自的需求人數。</p>
                      </div>
                      <button onClick={addSlot} className="flex items-center gap-1 bg-blue-100 text-blue-700 hover:bg-blue-200 px-4 py-2 rounded-lg font-bold text-sm transition-colors">
                          <Plus size={16}/> 新增賽段
                      </button>
                  </div>

                  <div className="space-y-4">
                      {slots.map((slot, index) => (
                          <div key={slot.id} className="p-5 rounded-xl border-2 border-slate-100 bg-slate-50 relative group hover:border-blue-300 transition-all">
                              
                              <div className="absolute -left-3 -top-3 w-8 h-8 bg-slate-800 text-white rounded-full flex items-center justify-center font-black text-sm border-4 border-white shadow-sm">
                                  {index + 1}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                  <div className="md:col-span-6">
                                      <label className="block text-xs font-bold text-slate-500 mb-1">賽段 / 棒次名稱</label>
                                      <input type="text" placeholder="例如：接力組 - 🏊 游泳 (1.9km)" className="w-full border border-slate-300 p-2 rounded outline-none font-bold text-slate-800"
                                          value={slot.name} onChange={e => updateSlot(slot.id, 'name', e.target.value)} />
                                  </div>
                                  
                                  <div className="md:col-span-2">
                                      <label className="block text-xs font-bold text-slate-500 mb-1">需求人數</label>
                                      <input type="number" min="1" className="w-full border border-slate-300 p-2 rounded outline-none text-center font-bold text-blue-600"
                                          value={slot.capacity} onChange={e => updateSlot(slot.id, 'capacity', e.target.value)} />
                                  </div>

                                  <div className="md:col-span-3">
                                      <label className="block text-xs font-bold text-slate-500 mb-1">性別限制</label>
                                      <select className={`w-full border border-slate-300 p-2 rounded outline-none text-sm font-bold ${slot.genderLimit === 'F' ? 'bg-pink-50 text-pink-600 border-pink-200' : 'text-slate-600'}`}
                                          value={slot.genderLimit} onChange={e => updateSlot(slot.id, 'genderLimit', e.target.value)}>
                                          <option value="ANY">無限制</option>
                                          <option value="F">🚨 限定女性</option>
                                          <option value="M">🚨 限定男性</option>
                                      </select>
                                  </div>

                                  <div className="md:col-span-1 flex items-end justify-end">
                                      <button onClick={() => removeSlot(slot.id)} className="p-2 text-red-400 hover:bg-red-100 hover:text-red-600 rounded-lg transition-colors mb-0.5" title="刪除此賽段">
                                          <Trash2 size={20}/>
                                      </button>
                                  </div>
                              </div>
                              
                              <div className="mt-3 flex gap-2">
                                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-1 rounded-md font-mono flex items-center gap-1">
                                      <ShieldAlert size={10}/> Slot ID: {slot.id}
                                  </span>
                                  {slot.genderLimit === 'F' && <span className="text-[10px] bg-pink-100 text-pink-600 px-2 py-1 rounded-md font-bold">前端將阻擋男性會員報名此欄位</span>}
                              </div>
                          </div>
                      ))}
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-between">
                      <span className="font-bold text-blue-800">總兵力需求預估：</span>
                      <span className="text-2xl font-black text-blue-600">{slots.reduce((acc, curr) => acc + Number(curr.capacity || 0), 0)} <span className="text-sm">人</span></span>
                  </div>
              </div>
          </div>
      </div>
    </div>
  )
}