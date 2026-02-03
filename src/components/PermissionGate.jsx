import { useState, useEffect } from 'react'
import { supabase } from '../supabaseClient'
import { ROLES } from '../lib/roles'

export default function PermissionGate({ children, requiredRole = ROLES.SUPER_ADMIN, fallback = null }) {
  const [role, setRole] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const getRole = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        // 從 profiles 讀取最新的 role
        const { data } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()
        
        setRole(data?.role || ROLES.USER)
      }
      setLoading(false)
    }
    getRole()
  }, [])

  if (loading) return null; // 讀取中不顯示任何東西

  // 1. 如果是超級管理員，無條件放行
  if (role === ROLES.SUPER_ADMIN) return children;

  // 2. 否則檢查是否符合需求
  if (role === requiredRole) return children;

  // 3. 都不符合，顯示 fallback (通常是 null，即隱藏)
  return fallback;
}