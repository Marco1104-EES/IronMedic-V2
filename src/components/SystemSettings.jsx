import { useState } from 'react'
import { Settings, Shield, Globe, BarChart3, Save, Users, ToggleLeft, ToggleRight } from 'lucide-react'

export default function SystemSettings() {
  const [activeTab, setActiveTab] = useState('roles')
  const [siteName, setSiteName] = useState('IRON MEDIC 醫護鐵人賽事系統')
  const [maintenanceMode, setMaintenanceMode] = useState(false)

  // 1. 角色權限模擬資料
  const roles = [
    { id: 1, name: '張鐵人', email: 'admin@iron.com', role: 'Super Admin', color: 'bg-purple-100 text-purple-700' },
    { id: 2, name: '王小美', email: 'may@iron.com', role: 'Operator', color: 'bg-blue-100 text-blue-700' },
    { id: 3, name: '李大衛', email: 'david@iron.com', role: 'Operator', color: 'bg-blue-100 text-blue-700' },
    { id: 4, name: '訪客預設', email: '-', role: 'General Member', color: 'bg-gray-100 text-gray-600' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800 flex items-center">
        <Settings className="mr-3 text-blue-600" /> 系統全域設定
      </h2>

      {/* Tab 切換 */}
      <div className="flex space-x-2 border-b border-gray-200">
        <button onClick={() => setActiveTab('roles')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'roles' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>權限與角色</button>
        <button onClick={() => setActiveTab('seo')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'seo' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>SEO 與流量</button>
        <button onClick={() => setActiveTab('general')} className={`px-4 py-2 font-bold text-sm border-b-2 transition-colors ${activeTab === 'general' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>一般設定</button>
      </div>

      {/* 內容區 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 min-h-[400px]">
        
        {/* Tab 1: 權限管理 */}
        {activeTab === 'roles' && (
          <div className="animate-fade-in">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Shield size={20} className="mr-2 text-gray-500"/> 管理員與角色配置</h3>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr><th className="p-3 pl-4">姓名</th><th className="p-3">Email</th><th className="p-3">權限等級</th><th className="p-3 text-center">狀態</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {roles.map(r => (
                    <tr key={r.id}>
                      <td className="p-3 pl-4 font-bold">{r.name}</td>
                      <td className="p-3 text-gray-500">{r.email}</td>
                      <td className="p-3"><span className={`px-2 py-1 rounded text-xs font-bold ${r.color}`}>{r.role}</span></td>
                      <td className="p-3 text-center"><div className="w-2 h-2 rounded-full bg-green-500 mx-auto" title="Active"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: SEO 與流量 */}
        {activeTab === 'seo' && (
          <div className="animate-fade-in space-y-6">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><Globe size={20} className="mr-2 text-gray-500"/> 前台 SEO 設定</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">網站標題 (Meta Title)</label>
                <input value={siteName} onChange={(e)=>setSiteName(e.target.value)} className="w-full border rounded-lg p-2 text-gray-800" />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 mb-1">關鍵字 (Keywords)</label>
                <input defaultValue="馬拉松, 鐵人三項, 醫護鐵人, 賽事報名" className="w-full border rounded-lg p-2 text-gray-800" />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center"><BarChart3 size={20} className="mr-2 text-gray-500"/> 流量分析 (Google Analytics)</h3>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <label className="block text-xs font-bold text-gray-500 mb-1">GA4 追蹤碼 (Measurement ID)</label>
                <div className="flex gap-2">
                   <input defaultValue="G-XXXXXXXXXX" className="flex-1 border rounded-lg p-2 text-gray-800 font-mono" />
                   <button className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold">驗證</button>
                </div>
                <p className="text-xs text-gray-400 mt-2">目前狀態：🟢 已連線</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: 一般設定 */}
        {activeTab === 'general' && (
          <div className="animate-fade-in space-y-6">
             <div className="flex items-center justify-between bg-red-50 p-4 rounded-lg border border-red-100">
               <div>
                 <h4 className="font-bold text-red-800">系統維護模式</h4>
                 <p className="text-xs text-red-600">開啟後，前台將顯示「系統維護中」，僅管理員可登入。</p>
               </div>
               <button onClick={() => setMaintenanceMode(!maintenanceMode)} className="text-2xl text-red-600">
                 {maintenanceMode ? <ToggleRight size={40} className="text-red-600"/> : <ToggleLeft size={40} className="text-gray-400"/>}
               </button>
             </div>
             <div className="flex justify-end pt-4">
               <button className="flex items-center bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 shadow-md">
                 <Save size={18} className="mr-2"/> 儲存設定
               </button>
             </div>
          </div>
        )}

      </div>
    </div>
  )
}