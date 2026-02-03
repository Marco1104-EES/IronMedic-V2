// 定義系統中的權限階級
export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',     // 最高指揮官 (您)
  EVENT_MANAGER: 'EVENT_MANAGER', // 賽事官 (可管理賽事，不可刪人)
  VERIFIED_MEDIC: 'VERIFIED_MEDIC', // 醫護鐵人 (正式會員)
  USER: 'USER'                    // 一般路人
}

// 定義每個階級的顯示名稱與顏色 (UI用)
export const ROLE_CONFIG = {
  [ROLES.SUPER_ADMIN]: { label: '最高指揮官', color: 'text-red-600 bg-red-50 border-red-200' },
  [ROLES.EVENT_MANAGER]: { label: '賽事管理員', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  [ROLES.VERIFIED_MEDIC]: { label: '醫護鐵人', color: 'text-green-600 bg-green-50 border-green-200' },
  [ROLES.USER]: { label: '一般會員', color: 'text-slate-500 bg-slate-50 border-slate-200' },
}

// 權限檢查工具
export const checkPermission = (userRole, requiredRole) => {
  if (!userRole) return false;
  if (userRole === ROLES.SUPER_ADMIN) return true; // 最高指揮官擁有所有權限
  if (userRole === requiredRole) return true;
  return false;
}