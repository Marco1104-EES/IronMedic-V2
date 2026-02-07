import React from 'react';
import { Shield } from 'lucide-react';

export default function UserAvatar({ user, text, styleType = 1, size = 'md', className = '' }) {
  
  // 1. 顯示文字優先順序
  let displayText = text || user?.badge_title || user?.email?.charAt(0).toUpperCase() || 'M';

  // 2. 顯示顏色：🔥 絕對優先讀取資料庫設定的顏色
  let bgColor = user?.badge_color || '#3b82f6'; // 資料庫沒設定才用藍色

  // 尺寸
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs', 
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };
  const baseSize = sizeClasses[size] || sizeClasses.md;

  // 紅點顯示條件：只有高權限者顯示 (超管 / 賽管)
  const showRedDot = ['SUPER_ADMIN', 'EVENT_MANAGER'].includes(user?.role);

  return (
    <div 
      className={`${baseSize} relative flex items-center justify-center rounded-xl border-2 border-slate-300 shadow-[0_4px_0_#475569] ${className}`}
      style={{ background: `linear-gradient(135deg, ${bgColor} 0%, #1e293b 100%)` }}
      title={user?.display_name || user?.email}
    >
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
      <Shield size={size === 'lg' || size === 'xl' ? 40 : 16} className="absolute text-white opacity-50" />
      
      <span className="relative z-10 font-black text-white font-serif tracking-widest drop-shadow-md whitespace-nowrap">
        {displayText}
      </span>
      
      {showRedDot && (
        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-white shadow-sm"></div>
      )}
    </div>
  );
}