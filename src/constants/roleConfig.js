// src/constants/roleConfig.js
// V21.0 單一真理中心 (Single Source of Truth)

export const VIP_ROSTER = {
    'marco1104@gmail.com': { 
        rank: 'SUPER ADMIN', 
        label: '超級管理員', 
        color: 'text-red-500', 
        bg: 'bg-red-500',
        border: 'border-red-500',
        badge: 'bg-red-100 text-red-600 border-red-200'
    },
    'mark780502@gmail.com': { 
        rank: 'ADMIN', 
        label: '系統管理員', 
        color: 'text-cyan-500', 
        bg: 'bg-cyan-500',
        border: 'border-cyan-500',
        badge: 'bg-cyan-100 text-cyan-600 border-cyan-200'
    }
};

// 預設雜魚樣式
export const DEFAULT_USER = {
    rank: 'USER',
    label: '一般會員',
    color: 'text-slate-500',
    bg: 'bg-slate-500',
    border: 'border-slate-300',
    badge: 'bg-slate-100 text-slate-500 border-slate-200'
};