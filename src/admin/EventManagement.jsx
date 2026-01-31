import { useState, useEffect } from 'react'
// 🟢 修正：只往上一層
import { supabase } from '../supabaseClient' 
import { Plus, Trash2, Edit, X, Calendar, MapPin, Layers, Loader2 } from 'lucide-react'
// 🟢 修正：往上一層找到 api
import { syncToGoogleSheets } from '../api/googleSheets' 

export default function EventManagement() {
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [isEditing, setIsEditing] = useState(false) 
  const [editId, setEditId] = useState(null)
  
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [categories, setCategories] = useState([
    { name: '全馬組 42K', quota: 100, type: 'Individual' }
  ])

  const initialForm = {
    name: '',
    date: '',
    location: '',
    status: 'open',
    image: ''
  }
  const [formData, setFormData] = useState(initialForm)
  
  const totalQuota = categories.reduce((sum, cat) => sum + (parseInt(cat.quota) || 0), 0)

  useEffect(() => { fetchEvents() }, [])

  const fetchEvents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from('events').select('*').order('date', { ascending: true })
      if (error) throw error
      setEvents(data || [])
    } catch (error) { console.error('讀取失敗:', error) } finally { setLoading(false) }
  }

  const handleAddCategory = () => setCategories([...categories, { name: '', quota: 50, type: 'Individual' }])
  const handleRemoveCategory = (index) => { if(categories.length > 1) { const n=[...categories]; n.splice(index,1); setCategories(n); } }
  const handleCategoryChange = (index, field, value) => { const n=[...categories]; n[index][field]=value; setCategories(n); }

  const handleEdit = (event) => {
    setIsEditing(true)
    setEditId(event.id)
    setFormData({
      name: event.name || event.title,
      date: event.date,
      location: event.location,
      status: event.status,
      image: event.image || ''
    })

    let parsedCats = []
    const rawCat = event.category
    let catArray = []
    
    if (Array.isArray(rawCat)) catArray = rawCat
    else if (typeof rawCat === 'string') catArray = rawCat.replace(/[{"}]/g, '').split(',')

    if (catArray.length > 0 && catArray[0] !== "") {
      parsedCats = catArray.map(c => {
        const cleanName = c.replace(/"/g, '') 
        const isRelay = cleanName.includes('[接力]')
        return {
          name: cleanName.replace('[接力] ', '').trim(),
          quota: 50,
          type: isRelay ? 'Relay' : 'Individual'
        }
      })
    } else {
      parsedCats = [{ name: '一般組', quota: 100, type: 'Individual' }]
    }
    
    setCategories(parsedCats)
    setShowModal(true)
  }

  const handleSave = async () => {
    if (isSubmitting) return; 
    if (!formData.name || !formData.date) { alert('請填寫賽事名稱與日期'); return }
    
    setIsSubmitting(true)

    try {
      const categoryStrings = categories.map(c => {
         const typeLabel = c.type === 'Relay' ? '[接力] ' : ''
         return `${typeLabel}${c.name}`
      })
      const cleanCategories = categoryStrings.map(s => s.replace(/,/g, ' ')) 
      const categoriesDBFormat = `{${cleanCategories.join(',')}}`
      const categoriesExcelFormat = categories.map(c => `${c.name}(${c.type==='Relay'?'接力':'個人'}/${c.quota}人)`).join(', ')

      const eventPayload = {
        name: formData.name,
        date: formData.date,
        location: formData.location || '地點待定',
        quota: totalQuota,
        status: formData.status,
        category: categoriesDBFormat,
        image: formData.image || 'https://images.unsplash.com/photo-1452626038306-9aae5e071dd3?w=800&q=80'
      }

      if (isEditing) {
        const { error } = await supabase.from('events').update(eventPayload).eq('id', editId)
        if (error) throw error
        alert('✅ 賽事更新成功！')
      } else {
        const { data, error } = await supabase.from('events').insert([eventPayload]).select()
        if (error) throw error
        
        syncToGoogleSheets({
          action: 'create_event',
          id: data[0].id,
          ...eventPayload,
          category: categoriesExcelFormat
        }).catch(err => console.error('Excel 背景同步失敗:', err))

        alert('✅ 賽事已發佈！(Excel 同步中...)')
      }

      setShowModal(false)
      setFormData(initialForm)
      setCategories([{ name: '全馬組 42K', quota: 100, type: 'Individual' }])
      setIsEditing(false)
      fetchEvents()

    } catch (error) {
      alert('❌ 操作失敗: ' + error.message)
    } finally {
      setIsSubmitting(false) 
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('確定刪除？')) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) setEvents(events.filter(e => e.id !== id))
  }

  const openNew = () => {
    setIsEditing(false)
    setFormData(initialForm)
    setCategories([{ name: '全馬組 42K', quota: 100, type: 'Individual' }])
    setShowModal(true)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-[600px] animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800 flex items-center">
          <Calendar className="mr-3 text-blue-600" /> 賽事管理
        </h2>
        <button 
          onClick={openNew} 
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold flex items-center shadow-md transition-transform active:scale-95"
        >
          <Plus size={18} className="mr-2"/> 新增賽事
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-gray-600 uppercase font-bold border-b">
            <tr>
              <th className="p-4">日期</th>
              <th className="p-4">賽事名稱</th>
              <th className="p-4">地點</th>
              <th className="p-4">狀態</th>
              <th className="p-4 text-right">總名額</th>
              <th className="p-4 text-center">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {events.map((event) => (
              <tr key={event.id} className="hover:bg-blue-50 transition-colors group">
                <td className="p-4 font-mono text-blue-600 font-bold">{event.date}</td>
                <td className="p-4 font-bold text-gray-800">
                  {event.name || event.title}
                  <div className="flex flex-wrap gap-1 mt-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    {(() => {
                      let cats = []
                      const raw = event.category
                      if (Array.isArray(raw)) cats = raw
                      else if (typeof raw === 'string') cats = raw.replace(/[{"}]/g, '').split(',')
                      
                      return cats.slice(0, 2).map((c, i) => (
                        <span key={i} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">
                          {c.replace(/"/g, '')}
                        </span>
                      ))
                    })()}
                  </div>
                </td>
                <td className="p-4 text-gray-500"><MapPin size={14} className="inline mr-1"/>{event.location}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    event.status === 'open' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {event.status === 'open' ? '報名中' : '其他'}
                  </span>
                </td>
                <td className="p-4 text-right font-mono">
                  <span className="font-bold text-gray-800">{event.quota}</span>
                </td>
                <td className="p-4 text-center">
                  <button onClick={() => handleEdit(event)} className="p-2 text-blue-500 hover:bg-blue-100 rounded mr-1" title="編輯">
                    <Edit size={16} />
                  </button>
                  <button onClick={() => handleDelete(event.id)} className="p-2 text-gray-400 hover:text-red-600 rounded" title="刪除">
                    <Trash2 size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col animate-scale-in">
            <div className="bg-gray-900 text-white p-4 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-lg">{isEditing ? '編輯賽事' : '新增賽事'}</h3>
              <button onClick={() => !isSubmitting && setShowModal(false)} disabled={isSubmitting} className="hover:text-red-400 transition-colors"><X size={20}/></button>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">賽事名稱</label>
                  <input value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如：2026 IRONMAN 70.3 Kenting" disabled={isSubmitting}/>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">日期</label>
                  <input type="date" value={formData.date} onChange={e=>setFormData({...formData, date: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" disabled={isSubmitting}/>
                </div>
                <div>
                   <label className="block text-sm font-bold text-gray-700 mb-1">地點</label>
                   <input value={formData.location} onChange={e=>setFormData({...formData, location: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" placeholder="例如：屏東恆春" disabled={isSubmitting}/>
                </div>
                <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1">狀態</label>
                    <select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value})} className="w-full border border-gray-300 p-2.5 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 outline-none" disabled={isSubmitting}>
                      <option value="open">🔥 報名中</option>
                      <option value="pending">⏳ 待開放</option>
                      <option value="prep">🤝 籌備中</option>
                      <option value="closed">⛔ 已截止</option>
                    </select>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6 shadow-inner">
                <div className="flex justify-between items-center mb-3 border-b border-gray-200 pb-2">
                    <h4 className="font-bold text-gray-800 flex items-center">
                        <Layers size={18} className="mr-2 text-blue-600"/> 賽事組別設定
                    </h4>
                    <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold">
                        總名額: {totalQuota} 人
                    </span>
                </div>
                
                <div className="flex gap-2 mb-2 text-xs font-bold text-gray-500 px-1">
                    <div className="flex-1">組別名稱</div>
                    <div className="w-24 text-center">名額</div>
                    <div className="w-28">類型</div>
                    <div className="w-8"></div>
                </div>

                <div className="space-y-3">
                    {categories.map((cat, index) => (
                        <div key={index} className="flex gap-2 items-start">
                            <div className="flex-1">
                                <input 
                                    placeholder="如: 全馬組" 
                                    value={cat.name}
                                    onChange={(e) => handleCategoryChange(index, 'name', e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded text-sm focus:border-blue-500 outline-none"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="w-24">
                                <input 
                                    type="number" 
                                    placeholder="0"
                                    value={cat.quota}
                                    onChange={(e) => handleCategoryChange(index, 'quota', e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded text-sm text-center focus:border-blue-500 outline-none"
                                    disabled={isSubmitting}
                                />
                            </div>
                            <div className="w-28">
                                <select 
                                    value={cat.type}
                                    onChange={(e) => handleCategoryChange(index, 'type', e.target.value)}
                                    className="w-full border border-gray-300 p-2 rounded text-sm bg-white focus:border-blue-500 outline-none"
                                    disabled={isSubmitting}
                                >
                                    <option value="Individual">👤 個人</option>
                                    <option value="Relay">🤝 接力</option>
                                </select>
                            </div>
                            <div className="w-8 flex justify-center pt-1">
                                {categories.length > 1 && (
                                    <button onClick={() => handleRemoveCategory(index)} disabled={isSubmitting} className="text-gray-400 hover:text-red-500 transition-colors" title="刪除此組別">
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                
                <button onClick={handleAddCategory} disabled={isSubmitting} className="mt-4 w-full py-2.5 border-2 border-dashed border-gray-300 text-gray-500 rounded-lg text-sm font-bold hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-all flex justify-center items-center">
                    <Plus size={16} className="mr-1"/> 新增一組
                </button>
              </div>

              <button 
                onClick={handleSave} 
                disabled={isSubmitting} 
                className={`w-full font-bold py-3.5 rounded-lg shadow-lg flex justify-center items-center transition-all ${isSubmitting ? 'bg-gray-400 text-gray-100 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={20}/> 
                    處理中... (同步 Excel)
                  </>
                ) : (
                  isEditing ? '確認更新賽事' : '確認發佈並同步至 Excel'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}