import React from 'react'
import { X, QrCode, Shield } from 'lucide-react'
import UserAvatar from './UserAvatar' // 引用同資料夾的 UserAvatar

export default function DigitalIDCard({ user, role, onClose }) {
  if (!user) return null

  // 企業權限對照表
  const ROLE_MAP = {
    'SUPER_ADMIN': { label: '超級管理員', color: 'bg-red-600', text: 'text-red-600' },
    'EVENT_MANAGER': { label: '賽事管理員', color: 'bg-blue-600', text: 'text-blue-600' },
    'VERIFIED_MEDIC': { label: '醫護鐵人', color: 'bg-green-600', text: 'text-green-600' },
    'USER': { label: '一般會員', color: 'bg-slate-500', text: 'text-slate-500' },
    'UNASSIGNED': { label: '訪客', color: 'bg-slate-400', text: 'text-slate-400' }
  }

  const currentRole = ROLE_MAP[role] || ROLE_MAP['USER']
  const displayName = user.display_name || user.email?.split('@')[0] || '會員';
  const avatarText = user.badge_title || user.email?.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in" onClick={onClose}>
      <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl overflow-hidden relative transform transition-all scale-100 border border-slate-500" onClick={e => e.stopPropagation()}>
        
        {/* 上半部色塊 */}
        <div className={`h-32 ${currentRole.color} relative`}>
            <div className="absolute top-4 right-4">
                <button onClick={onClose} className="bg-black/20 text-white p-2 rounded-full hover:bg-black/40 transition-colors"><X size={20}/></button>
            </div>
            <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
                <UserAvatar user={user} text={avatarText} size="xl" className="shadow-2xl border-4 border-white"/>
            </div>
        </div>

        {/* 下半部資訊 */}
        <div className="pt-16 pb-8 px-6 text-center">
            <h2 className="text-2xl font-black text-slate-900 mb-1 leading-tight">{displayName}</h2>
            <p className="text-slate-500 font-mono text-xs mb-4">{user.email}</p>
            
            <div className={`inline-flex items-center px-4 py-1.5 rounded-full ${currentRole.color} bg-opacity-10 ${currentRole.text} font-bold text-sm mb-6`}>
                <Shield size={14} className="mr-1.5"/>
                {currentRole.label}
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 mb-6 text-left relative group">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">UUID</p>
                <p className="font-mono text-xs text-slate-700 break-all select-all font-bold">{user.id}</p>
                <div className="absolute top-4 right-4 text-slate-300"><QrCode size={24}/></div>
                
                {/* 顯示擴充欄位範例 */}
                {user.field_01 && (
                    <div className="mt-2 pt-2 border-t border-slate-200">
                        <p className="text-[10px] text-slate-400 uppercase font-bold">備註</p>
                        <p className="text-xs text-slate-600">{user.field_01}</p>
                    </div>
                )}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono tracking-widest">ENTERPRISE IDENTITY VERIFIED</p>
        </div>
      </div>
    </div>
  )
}