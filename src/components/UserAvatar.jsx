import React from 'react';
import { Shield, Activity, Zap, Hexagon, Trophy, Fingerprint, Radio } from 'lucide-react';

export const AVATAR_STYLES = {
  1: { id: 1, name: '醫療榮譽 (Medic Shield)', icon: Shield, desc: '守護者的象徵' },
  2: { id: 2, name: '心律動能 (Vitality Pulse)', icon: Activity, desc: '生命力的跳動' },
  3: { id: 3, name: '鐵人極速 (Speed Stream)', icon: Zap, desc: '速度與激情' },
  4: { id: 4, name: '六角蜂巢 (Tech Hexagon)', icon: Hexagon, desc: '堅固的系統核心' },
  6: { id: 6, name: '毛玻璃 (Glassmorphism)', icon: Fingerprint, desc: '現代極簡美學' },
  7: { id: 7, name: '識別環 (ID Ring)', icon: Radio, desc: '專業身份識別' },
  10: { id: 10, name: '呼吸燈 (Breathing)', icon: Activity, desc: '隨時在線' },
};

export default function UserAvatar({ styleType = 1, text = 'M', size = 'md', className = '' }) {
  // 尺寸設定
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-24 h-24 text-2xl',
    xl: 'w-32 h-32 text-4xl',
  };

  const baseSize = sizeClasses[size] || sizeClasses.md;

  // --- CSS 魔術區 ---
  const renderContent = () => {
    switch (parseInt(styleType)) {
      case 1: // 醫療榮譽 (金屬盾牌感)
        return (
          <div className={`${baseSize} relative flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 border-2 border-slate-300 shadow-[0_4px_0_#475569] ${className}`}>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
            <Shield size={size === 'lg' || size === 'xl' ? 40 : 16} className="absolute text-slate-600 opacity-50" />
            <span className="relative z-10 font-black text-slate-100 font-serif tracking-widest drop-shadow-md">{text}</span>
            {/* 紅十字點綴 */}
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border border-white shadow-sm"></div>
          </div>
        );

      case 2: // 心律動能 (螢光心跳)
        return (
          <div className={`${baseSize} relative flex items-center justify-center rounded-full bg-black border border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.6)] ${className}`}>
             <span className="absolute inset-0 rounded-full border-2 border-green-500/50 animate-ping"></span>
             <span className="font-mono font-bold text-green-400 animate-pulse">{text}</span>
             <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-green-900/50 to-transparent rounded-b-full"></div>
          </div>
        );

      case 3: // 鐵人極速 (流線漸層)
        return (
          <div className={`${baseSize} relative flex items-center justify-center rounded-full p-[3px] bg-gradient-to-tr from-yellow-400 via-red-500 to-blue-600 animate-spin-slow ${className}`}>
            <div className="w-full h-full bg-slate-900 rounded-full flex items-center justify-center relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-white/10 skew-x-12 transform -translate-x-4"></div>
               <span className="font-bold italic text-white z-10 pr-1">{text}</span>
            </div>
          </div>
        );

      case 4: // 六角蜂巢 (科技)
        return (
          <div 
            className={`${baseSize} flex items-center justify-center bg-slate-800 text-cyan-400 font-mono font-bold border-2 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.4)] ${className}`}
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}
          >
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(6,182,212,0.1)_50%,transparent_75%)] bg-[length:250%_250%] animate-shine"></div>
            {text}
          </div>
        );

      case 6: // 毛玻璃 (現代)
        return (
          <div className={`${baseSize} relative flex items-center justify-center rounded-2xl bg-white/30 backdrop-blur-md border border-white/60 shadow-lg ${className}`}>
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-400 opacity-30 blur-lg rounded-full -z-10"></div>
            <span className="font-bold text-slate-800">{text}</span>
          </div>
        );

      case 7: // 識別環 (雙色環)
        return (
          <div className={`${baseSize} relative flex items-center justify-center rounded-full p-[4px] ${className}`} style={{ background: 'conic-gradient(#ef4444 0% 50%, #3b82f6 50% 100%)' }}>
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center border-2 border-white shadow-inner">
               <span className="font-bold text-slate-700">{text}</span>
            </div>
          </div>
        );

      case 10: // 呼吸燈 (在線感)
        return (
          <div className={`${baseSize} relative flex items-center justify-center rounded-full bg-slate-900 border border-slate-700 shadow-lg ${className}`}>
             <div className="absolute inset-0 rounded-full bg-green-500 blur-md opacity-40 animate-pulse-slow"></div>
             <span className="relative z-10 font-bold text-white">{text}</span>
             <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full z-20"></div>
          </div>
        );

      default: // 預設
        return (
          <div className={`${baseSize} flex items-center justify-center rounded-full bg-blue-600 text-white font-bold ${className}`}>
            {text}
          </div>
        );
    }
  };

  return renderContent();
}