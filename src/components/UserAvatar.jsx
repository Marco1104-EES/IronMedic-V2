import React from 'react';
import { Shield, Activity, Zap, Hexagon, Fingerprint, Radio } from 'lucide-react';

export const AVATAR_STYLES = {
  1: { id: 1, name: '醫療榮譽 (Medic Shield)', icon: Shield, desc: '守護者的象徵' },
  2: { id: 2, name: '心律動能 (Vitality Pulse)', icon: Activity, desc: '生命力的跳動' },
  3: { id: 3, name: '鐵人極速 (Speed Stream)', icon: Zap, desc: '速度與激情' },
  4: { id: 4, name: '六角蜂巢 (Tech Hexagon)', icon: Hexagon, desc: '堅固的系統核心' },
  6: { id: 6, name: '毛玻璃 (Glassmorphism)', icon: Fingerprint, desc: '現代極簡美學' },
  7: { id: 7, name: '識別環 (ID Ring)', icon: Radio, desc: '專業身份識別' },
  10: { id: 10, name: '呼吸燈 (Breathing)', icon: Activity, desc: '隨時在線' },
};

export default function UserAvatar({ user, text, styleType = 1, size = 'md', className = '' }) {
  
  // 1. 初始化：先給空值，不要急著給 'M'
  let displayText = text;
  let bgColor = '#3b82f6'; // 預設藍

  // 2. 身分判斷邏輯 (只要沒有外部強制給字，就跑這段)
  if (!displayText && user && user.email) {
      const email = user.email;
      
      if (email === 'marco1104@gmail.com') {
          displayText = '艦長';
          bgColor = '#dc2626'; // 紅
      } 
      else if (email === 'medicmarco1104@gmail.com') {
          displayText = '醫護';
          bgColor = '#16a34a'; // 綠
      } 
      else {
          // 其他人
          const metaName = user.user_metadata?.full_name || user.user_metadata?.name;
          displayText = metaName 
              ? metaName.substring(0, 2).toUpperCase() 
              : email.substring(0, 2).toUpperCase();
          
          // 雜湊算色
          let hash = 0;
          for (let i = 0; i < email.length; i++) {
            hash = email.charCodeAt(i) + ((hash << 5) - hash);
          }
          const c = (hash & 0x00ffffff).toString(16).toUpperCase();
          bgColor = '#' + '00000'.substring(0, 6 - c.length) + c;
      }
  }

  // 3. 最後防呆：真的什麼都沒有，才給 M
  if (!displayText) {
      displayText = 'M';
  }

  // 尺寸
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-xs',
    lg: 'w-16 h-16 text-lg',
    xl: 'w-24 h-24 text-2xl',
  };
  const baseSize = sizeClasses[size] || sizeClasses.md;

  // 4. 渲染 (Style 1)
  const renderContent = () => {
    // 為了確保文字顯示，這裡統一用我們算好的 bgColor 和 displayText
    switch (parseInt(styleType)) {
      case 1: 
        return (
          <div 
            className={`${baseSize} relative flex items-center justify-center rounded-xl border-2 border-slate-300 shadow-[0_4px_0_#475569] ${className}`}
            style={{ background: `linear-gradient(135deg, ${bgColor} 0%, #1e293b 100%)` }}
            title={user?.email}
          >
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
            <Shield size={size === 'lg' || size === 'xl' ? 40 : 16} className="absolute text-white opacity-50" />
            <span className="relative z-10 font-black text-white font-serif tracking-widest drop-shadow-md whitespace-nowrap">
                {displayText}
            </span>
            <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-600 rounded-full border border-white shadow-sm"></div>
          </div>
        );

      default:
        return (
          <div className={`${baseSize} flex items-center justify-center rounded-full text-white font-bold ${className}`} style={{ backgroundColor: bgColor }}>
            {displayText}
          </div>
        );
    }
  };

  return renderContent();
}