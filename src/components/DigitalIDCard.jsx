import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Shield, Activity, Phone, Database, Award, User, CheckCircle2, ChevronRight } from 'lucide-react'

export default function DigitalIdCard({ member }) {
  const [isFlipped, setIsFlipped] = useState(false)

  // 🛡️ 1. 資料防呆 (Data Safety)
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

  // 🆔 2. ID 格式化
  const formatId = (id) => {
      if (!id || id === 'UNKNOWN') return 'NO-ID';
      return id.length > 8 ? `${id.substring(0, 4)}-${id.substring(id.length-4)}`.toUpperCase() : id;
  }

  // 🎨 3. 經典版配色系統 (復刻截圖中的金色漸層)
  const getRoleStyle = (role) => {
      switch(role) {
          case 'SUPER_ADMIN': 
              return { 
                  gradient: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800', 
                  icon: '🛡️', 
                  label: '超級管理員',
                  sub: 'ADMINISTRATOR'
              };
          case 'TOURNAMENT_DIRECTOR': 
              return { 
                  gradient: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800', 
                  icon: '🔵', 
                  label: '賽事總監',
                  sub: 'DIRECTOR'
              };
          case 'VERIFIED_MEDIC': 
              return { 
                  // 這是截圖中的「金色漸層」風格
                  gradient: 'bg-gradient-to-r from-amber-100 via-yellow-200 to-amber-100 text-amber-900 border border-amber-200', 
                  icon: '⭐', 
                  label: '高級緊急救護員', // 這裡可以動態帶入 data.medical_license
                  sub: 'MEDIC TEAM'
              };
          default: 
              return { 
                  gradient: 'bg-slate-100 text-slate-600', 
                  icon: '👤', 
                  label: '一般會員',
                  sub: 'MEMBER'
              };
      }
  }
  const roleStyle = getRoleStyle(data.role);
  
  // 如果是醫護，顯示真實證照名稱；否則顯示預設職稱
  const displayTitle = data.role === 'VERIFIED_MEDIC' && data.medical_license ? data.medical_license : roleStyle.label;

  return (
    <div className="w-full flex justify-center items-center py-4 bg-slate-50">
      {/* 📱 容器：模仿手機螢幕比例 */}
      <div 
        className="group perspective-1000 w-[300px] h-[520px] cursor-pointer select-none relative rounded-[40px] shadow-2xl bg-white border-4 border-slate-800"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        {/* 手機劉海 (裝飾用) */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-xl z-20"></div>

        <div className={`relative w-full h-full transition-all duration-500 transform preserve-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          
          {/* ================= 正面 (Front) - 經典白底設計 ================= */}
          <div className="absolute w-full h-full backface-hidden bg-slate-50 rounded-[36px] overflow-hidden flex flex-col items-center pt-10 pb-6 px-4">
              
              {/* 1. 頂部 LOGO (海軍藍風格) */}
              <div className="mb-6 flex flex-col items-center text-slate-800">
                  <Shield size={48} fill="#1e293b" className="text-slate-800 drop-shadow-sm mb-2"/>
              </div>

              {/* 2. 主要白色卡片 (有陰影) */}
              <div className="w-full bg-white rounded-2xl shadow-lg p-5 flex flex-col items-center gap-3 relative">
                  
                  {/* 頭像 (灰色圓形占位符) */}
                  <div className="w-20 h-20 bg-slate-200 rounded-full border-4 border-white shadow-sm flex items-center justify-center -mt-10">
                      <User size={40} className="text-white"/>
                  </div>

                  {/* 姓名 */}
                  <h2 className="text-2xl font-black text-slate-900 tracking-wide">
                      {data.full_name}
                  </h2>

                  {/* ✨ 金色職位框 (復刻重點) */}
                  <div className={`w-full ${roleStyle.gradient} py-3 rounded-lg flex flex-col items-center justify-center shadow-sm`}>
                      <div className="flex items-center gap-1 font-black text-sm">
                          <span>{roleStyle.icon}</span>
                          <span>{displayTitle}</span>
                      </div>
                      <div className="text-[10px] font-bold opacity-60 tracking-widest mt-0.5">
                          {roleStyle.sub}
                      </div>
                  </div>

                  {/* 資格狀態 (綠色打勾) */}
                  <div className="flex items-center gap-1.5 text-sm font-bold text-green-600 bg-green-50 px-3 py-1 rounded-full mt-1">
                      <CheckCircle2 size={16} fill="currentColor" className="text-white"/>
                      <span>資格有效 (Active)</span>
                  </div>

                  {/* 制服尺寸 */}
                  <div className="text-xs text-slate-400 font-medium mt-1">
                      制服尺寸：<span className="text-slate-600 font-bold">{data.shirt_size}</span>
                  </div>
              </div>

              {/* 3. 底部資訊 */}
              <div className="mt-auto flex flex-col items-center gap-1">
                   <div className="text-xs text-slate-400">證照效期：{data.license_expiry || '無'}</div>
                   <div className="text-[10px] text-slate-300 font-mono mt-2 flex items-center gap-1">
                       <ChevronRight size={10} className="animate-pulse"/> 點擊翻轉查看條碼
                   </div>
              </div>
          </div>

          {/* ================= 背面 (Back) - 簡潔資訊 ================= */}
          <div className="absolute w-full h-full backface-hidden bg-slate-800 rounded-[36px] overflow-hidden rotate-y-180 flex flex-col text-white pt-12 pb-6 px-6">
               
               <div className="flex items-center gap-2 mb-6 border-b border-slate-600 pb-4">
                   <Activity className="text-green-400"/>
                   <h3 className="font-bold text-lg">緊急醫療資訊</h3>
               </div>

               <div className="space-y-6 flex-1">
                   <div className="flex justify-between items-center bg-slate-700/50 p-3 rounded-xl">
                       <span className="text-xs text-slate-400">血型 Blood</span>
                       <span className="text-2xl font-black">{data.blood_type || '-'}</span>
                   </div>

                   <div>
                       <div className="text-xs text-slate-400 mb-1">緊急聯絡人 Contact</div>
                       <div className="bg-slate-700/50 p-3 rounded-xl border-l-4 border-red-400">
                           <div className="font-bold text-sm">{data.emergency_contact || '無資料'}</div>
                       </div>
                   </div>

                   <div className="bg-white p-4 rounded-xl flex flex-col items-center gap-2 shadow-lg mt-4">
                       <QRCodeSVG value={`https://ironmedic.com/member/${data.id}`} size={140} />
                       <span className="text-[10px] text-slate-500 font-mono">ID: {formatId(data.id)}</span>
                   </div>
               </div>

               <div className="text-center text-[10px] text-slate-500 mt-auto">
                   IRON MEDIC DIGITAL ID
               </div>
          </div>

        </div>
      </div>
    </div>
  )
}