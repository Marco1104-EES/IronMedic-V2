import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Shield, Activity, Phone, Database, Award, User, ChevronRight, Zap } from 'lucide-react'

export default function DigitalIdCard({ member }) {
  const [isFlipped, setIsFlipped] = useState(false)

  // 🛡️ 資料防呆 (若資料缺失，顯示預設值)
  const defaultData = {
    full_name: "未知人員",
    role: "USER",
    id: "UNKNOWN",
    email: "-",
    medical_license: "無",
    blood_type: "Unknown",
    phone: "-",
    emergency_contact: "無資料",
    expiry: "-",
    points: 0,
    shirt_size: "M"
  }
  const data = { ...defaultData, ...member }

  // 🆔 ID 格式化 (ABCD-1234)
  const formatId = (id) => {
      if (!id || id === 'UNKNOWN') return 'NO-ID';
      return id.length > 8 ? `${id.substring(0, 4)}-${id.substring(id.length-4)}`.toUpperCase() : id;
  }

  // 📊 等級計算
  const safePoints = Number(data.points) || 0;
  const level = Math.floor(safePoints / 100) + 1;

  // 🎨 角色配色 (APP 風格標籤)
  const getRoleBadge = (role) => {
      switch(role) {
          case 'SUPER_ADMIN': return { bg: 'bg-red-100 text-red-700 border-red-200', label: '超級管理員', icon: '🛡️' };
          case 'TOURNAMENT_DIRECTOR': return { bg: 'bg-blue-100 text-blue-700 border-blue-200', label: '賽事總監', icon: '🔵' };
          case 'VERIFIED_MEDIC': return { bg: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: '醫護鐵人', icon: '⚕️' };
          default: return { bg: 'bg-slate-100 text-slate-600 border-slate-200', label: '一般會員', icon: '👤' };
      }
  }
  const badge = getRoleBadge(data.role);

  return (
    <div className="w-full flex justify-center items-center py-6 bg-slate-50 rounded-3xl">
      {/* 📱 模擬手機外框 */}
      <div 
        className="group perspective-1000 w-[320px] h-[520px] cursor-pointer select-none relative"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-all duration-500 transform preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* ================= 正面 (Front) - APP 個人首頁風格 ================= */}
          <div className="absolute w-full h-full backface-hidden bg-white rounded-[30px] shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
              
              {/* 頂部 Header (Iron Medic) */}
              <div className="h-16 bg-slate-900 flex items-center justify-center relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <h3 className="text-white font-black tracking-widest text-lg flex items-center gap-2">
                      <Shield size={20} className="text-blue-400"/> IRON MEDIC
                  </h3>
              </div>

              {/* 頭像與主要資訊 */}
              <div className="flex-1 flex flex-col items-center pt-6 px-6">
                  {/* 頭像框 (模擬 APP 頭像) */}
                  <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-3 shadow-inner border-4 border-white ring-2 ring-slate-100">
                      <User size={40} className="text-slate-400"/>
                  </div>

                  {/* 姓名 */}
                  <h2 className="text-2xl font-black text-slate-800 mb-1">{data.full_name}</h2>
                  <p className="text-xs text-slate-400 font-mono mb-4">{data.email}</p>

                  {/* 職稱金牌 (模擬您的截圖) */}
                  <div className={`w-full py-2 rounded-xl border flex items-center justify-center gap-2 mb-2 ${badge.bg} shadow-sm`}>
                      <span className="text-lg">{badge.icon}</span>
                      <span className="font-bold text-sm tracking-wide">{badge.label}</span>
                  </div>

                  {/* 資格狀態 */}
                  <div className="flex items-center gap-2 text-xs font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full mb-6">
                      <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                      資格有效 (Active)
                  </div>

                  {/* 數據列 (ID / 尺寸) */}
                  <div className="w-full grid grid-cols-2 gap-3 mb-6">
                      <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                          <div className="text-[10px] text-slate-400 uppercase">制服尺寸</div>
                          <div className="font-bold text-slate-700">{data.shirt_size || '-'}</div>
                      </div>
                      <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                          <div className="text-[10px] text-slate-400 uppercase">System ID</div>
                          <div className="font-mono font-bold text-slate-700 text-xs">{formatId(data.id)}</div>
                      </div>
                  </div>

                  {/* 底部提示 */}
                  <div className="mt-auto mb-4 flex flex-col items-center gap-1 opacity-50">
                      <ChevronRight className="animate-bounce-x" size={16}/>
                      <span className="text-[10px]">點擊翻轉查看醫療卡</span>
                  </div>
              </div>
          </div>

          {/* ================= 背面 (Back) - 醫療與 QR Code ================= */}
          <div className="absolute w-full h-full backface-hidden bg-slate-800 text-white rounded-[30px] shadow-2xl overflow-hidden border border-slate-700 rotate-y-180 flex flex-col">
               
               {/* 背面 Header */}
               <div className="h-16 bg-red-900 flex items-center px-6 gap-3">
                   <Activity className="text-white" size={24}/>
                   <div>
                       <h3 className="font-bold text-base">緊急醫療資訊</h3>
                       <p className="text-[10px] text-red-200">Emergency Profile</p>
                   </div>
               </div>

               {/* 內容區 */}
               <div className="flex-1 p-6 flex flex-col">
                   
                   {/* 證照區塊 */}
                   <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 mb-4">
                       <div className="text-[10px] text-slate-400 uppercase mb-1 flex items-center gap-1">
                           <Award size={12}/> Medical License
                       </div>
                       <div className="text-xl font-bold text-emerald-400">
                           {data.medical_license || '無醫療證照'}
                       </div>
                       <div className="text-[10px] text-slate-400 mt-1">
                           效期: {data.license_expiry || 'N/A'}
                       </div>
                   </div>

                   {/* 緊急聯絡人 */}
                   <div className="bg-slate-700/50 p-4 rounded-xl border border-slate-600 mb-6">
                       <div className="text-[10px] text-slate-400 uppercase mb-1 flex items-center gap-1">
                           <Phone size={12}/> Emergency Contact
                       </div>
                       <div className="text-sm font-bold text-white break-words">
                           {data.emergency_contact || '無資料'}
                       </div>
                   </div>

                   {/* QR Code (置底) */}
                   <div className="mt-auto bg-white p-3 rounded-xl self-center shadow-lg">
                       <QRCodeSVG value={`https://ironmedic.com/member/${data.id}`} size={120} />
                   </div>
                   <p className="text-center text-[10px] text-slate-500 mt-2 font-mono">
                       SCAN FOR FULL PROFILE
                   </p>
               </div>
          </div>

        </div>
      </div>
    </div>
  )
}