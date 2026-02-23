import { useState } from 'react'
import { Activity, ShieldAlert, FileText, CheckCircle, Smartphone, AlertTriangle, Calendar, MapPin, XCircle } from 'lucide-react'

// 模擬已報名的賽事資料
const MOCK_MY_RACES = [
    { id: 1, title: '2026 渣打台北公益馬拉松', date: '2026-02-28', slot: '全程馬拉松組', status: '審核中 (Tier 1)' },
    { id: 2, title: '2026 普悠瑪國際鐵人三項賽', date: '2026-03-15', slot: '接力組 - 🚴 自行車', status: '已錄取' }
]

export default function DigitalIdCard({ member }) {
  const [activeTab, setActiveTab] = useState('ID_CARD') // 'ID_CARD' 或 'MISSIONS'
  const [myRaces, setMyRaces] = useState(MOCK_MY_RACES)

  if (!member) return null

  const renderFieldValue = (value) => {
    return value && value.trim() !== '' ? value : <span className="text-slate-500 italic font-normal text-xs">無資料</span>
  }

  // 🚨 取消報名與釋出名額邏輯
  const handleCancelRace = (raceId) => {
      if(window.confirm("確定要取消報名並釋出名額嗎？\n\n系統提示：此操作將會同步通知 Line 任務群組。")) {
          setMyRaces(myRaces.filter(r => r.id !== raceId))
          alert("✅ 已成功為您取消報名並釋出名額。\n(未來將在此觸發 Webhook 同步至 Line 群組)")
      }
  }

  return (
    <div className="w-80 h-[36rem] rounded-[2rem] overflow-hidden shadow-2xl relative bg-slate-900 border border-slate-700 flex flex-col animate-fade-in-up font-sans">
      
      {/* 頂部雙頁籤切換器 */}
      <div className="flex bg-slate-800 p-1 m-4 rounded-xl relative z-20 shadow-inner border border-slate-700">
          <button 
              onClick={() => setActiveTab('ID_CARD')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'ID_CARD' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
              醫療識別證
          </button>
          <button 
              onClick={() => setActiveTab('MISSIONS')}
              className={`flex-1 py-2 text-xs font-black rounded-lg transition-all ${activeTab === 'MISSIONS' ? 'bg-amber-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white'}`}
          >
              任務派遣令 ({myRaces.length})
          </button>
      </div>

      {/* 頁面內容區 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pb-6 relative">
          
          {/* ========================================= */}
          {/* 頁籤 1：原始醫療識別卡 (ID Card)          */}
          {/* ========================================= */}
          {activeTab === 'ID_CARD' && (
              <div className="px-6 animate-fade-in">
                  <div className="text-center mb-6">
                      <h2 className="text-white font-black text-2xl tracking-wider">{member.full_name}</h2>
                      <div className="text-blue-400 text-xs font-bold mt-1 tracking-widest">{member.english_name || 'IRON MEDIC'}</div>
                  </div>

                  <div className="space-y-4">
                      {/* 血型與證照 */}
                      <div className="flex gap-3">
                          <div className="flex-1 bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/50 flex flex-col justify-center items-center">
                              <span className="text-[10px] text-slate-400 font-bold mb-1">血型 Blood</span>
                              <span className="text-2xl font-black text-red-500">{member.blood_type || '-'}</span>
                          </div>
                          <div className="flex-1 bg-slate-800/80 backdrop-blur rounded-xl p-3 border border-slate-700/50 flex flex-col justify-center items-center">
                              <span className="text-[10px] text-slate-400 font-bold mb-1 text-center">醫護證照 License</span>
                              {member.license_expiry && new Date(member.license_expiry) >= new Date() 
                                  ? <CheckCircle size={24} className="text-green-500 mt-1"/> 
                                  : <AlertTriangle size={24} className="text-amber-500 mt-1"/>}
                          </div>
                      </div>

                      {/* 緊急醫療資訊 */}
                      <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-4 border border-slate-700/50">
                          <h3 className="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-3 border-b border-slate-700 pb-2">
                              <Activity size={14} className="text-blue-400"/> 緊急醫療資訊
                          </h3>
                          <div className="text-sm text-slate-200 font-medium leading-relaxed min-h-[3rem]">
                              {renderFieldValue(member.medical_history)}
                          </div>
                      </div>

                      {/* 緊急聯絡人 */}
                      <div className="bg-slate-800/80 backdrop-blur rounded-2xl p-4 border border-slate-700/50 relative overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-red-500 to-red-600"></div>
                          <h3 className="text-[10px] font-bold text-slate-400 mb-1 ml-2">緊急聯絡人 Contact</h3>
                          <div className="text-sm text-white font-bold ml-2">
                              {renderFieldValue(member.emergency_name)} 
                              {member.emergency_relation && <span className="text-xs text-slate-400 font-normal ml-2">({member.emergency_relation})</span>}
                          </div>
                          <div className="text-sm font-mono text-red-400 mt-1 ml-2 flex items-center gap-1">
                              <Smartphone size={12}/> {renderFieldValue(member.emergency_phone)}
                          </div>
                      </div>

                      {/* QR Code */}
                      <div className="bg-white p-4 rounded-2xl flex flex-col items-center justify-center mt-6">
                          <img src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${member.id}`} alt="ID QR" className="w-32 h-32 rounded-lg" />
                          <div className="text-[10px] text-slate-400 font-mono mt-2">ID: {member.id?.substring(0,8).toUpperCase()}</div>
                      </div>
                  </div>
              </div>
          )}

          {/* ========================================= */}
          {/* 頁籤 2：任務派遣令 (Races & Cancellation)   */}
          {/* ========================================= */}
          {activeTab === 'MISSIONS' && (
              <div className="px-6 animate-fade-in space-y-4">
                  
                  {myRaces.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-48 text-slate-500">
                          <ShieldAlert size={40} className="mb-3 opacity-50"/>
                          <p className="text-sm font-bold">目前無待命的任務</p>
                          <p className="text-xs mt-1">請至賽事大廳進行佈署</p>
                      </div>
                  ) : (
                      myRaces.map((race, idx) => (
                          <div key={race.id} className="bg-slate-800 rounded-2xl p-4 border border-slate-700 hover:border-slate-500 transition-colors relative overflow-hidden group">
                              {/* 狀態標籤 */}
                              <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl">
                                  {race.status}
                              </div>
                              
                              <h4 className="font-bold text-white text-sm pr-16 mb-2 leading-snug">{race.title}</h4>
                              
                              <div className="space-y-1.5 mb-4">
                                  <div className="flex items-center text-xs text-slate-400 font-medium">
                                      <Calendar size={12} className="text-amber-400 mr-2"/> {race.date}
                                  </div>
                                  <div className="flex items-center text-xs text-slate-400 font-medium">
                                      <Flag size={12} className="text-green-400 mr-2"/> 棒次：{race.slot}
                                  </div>
                              </div>

                              {/* 🚨 釋出名額按鈕 */}
                              <button 
                                  onClick={() => handleCancelRace(race.id)}
                                  className="w-full py-2.5 rounded-xl border border-red-500/30 text-red-400 text-xs font-bold flex items-center justify-center gap-1.5 hover:bg-red-500/10 hover:text-red-300 transition-all active:scale-95"
                              >
                                  <XCircle size={14}/> 取消報名 (釋出名額)
                              </button>
                          </div>
                      ))
                  )}

                  <div className="mt-8 pt-4 border-t border-slate-700 text-center text-[10px] text-slate-500 leading-relaxed">
                      💡 當您取消報名，系統會立即空出賽事名額，<br/>並在未來自動推播至 Line 官方任務群組。
                  </div>
              </div>
          )}

      </div>
    </div>
  )
}