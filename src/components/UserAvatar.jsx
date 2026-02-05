import React from 'react';
import { Shield, Activity, Zap, Hexagon, Fingerprint, Radio } from 'lucide-react';

export default function UserAvatar({ user, text, styleType = 1, size = 'md', className = '' }) {
  
  // --- 1. 核心邏輯：決定要顯示什麼字 & 什麼顏色 ---
  let displayText = text || 'M';
  let bgColor = '#3b82f6'; // 預設藍

  if (user && user.email) {
      const email = user.email;
      
      // 🔥 特例判斷：讓您一眼分辨是誰
      if (email === 'marco1104@gmail.com') {
          displayText = "艦長";
          bgColor = '#dc2626'; // 紅色 (Commander)
      } 
      else if (email === 'medicmarco1104@gmail.com') {
          displayText = "醫護";
          bgColor = '#16a34a'; // 綠色 (Medic)
      } 
      else {
          // 其他人：優先抓 Google 名字 (如 "陳小明" -> 抓 "陳小")
          const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
          if (metaName) {
              // 如果是中文，抓前兩個字；英文抓前兩個字母
              displayText = metaName.substring(0, 2).toUpperCase();
          } else {
              // 沒名字抓 Email 前兩碼
              displayText = email.substring(0, 2).toUpperCase();
          }
          
          // 自動算顏色
          let hash = 0;
          for (let i = 0; i < email.length; i++) {
            hash = email.charCodeAt(i) + ((hash << 5) - hash);
          }
          const c = (hash & 0x00ffffff).toString(16).toUpperCase();
          bgColor = '#' + '00000'.substring(0, 6 - c.length) + c;
      }
  }

  // --- 2. 尺寸設定 ---
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs', // 字體調小一點以免中文塞不下
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };
  const baseSize = sizeClasses[size] || sizeClasses.md;

  // --- 3. 渲染樣式 (Style 1 盾牌) ---
  // 無論外面傳什麼 styleType，為了讓您看清楚字，統一用這套最清楚的邏輯
  return (
    <div 
      className={`${baseSize} relative flex items-center justify-center rounded-xl border-2 border-white shadow-md transition-transform hover:scale-105 ${className}`}
      style={{ 
        background: `linear-gradient(135deg, ${bgColor} 0%, #1e293b 100%)` 
      }}
      title={user?.email || 'User'}
    >
      {/* 背景紋路 */}
      <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
      
      {/* 盾牌圖示 (淡化) */}
      <Shield className="absolute text-white opacity-20 w-full h-full p-1" />
      
      {/* 🔥 顯示文字 (中文) */}
      <span className="relative z-10 font-black text-white drop-shadow-md select-none leading-none tracking-tight">
        {displayText}
      </span>

      {/* 狀態燈 */}
      <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-green-400 rounded-full border border-white shadow-sm animate-pulse"></div>
    </div>
  );
}