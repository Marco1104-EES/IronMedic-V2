import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Login from './auth/Login' // 👈 關鍵：這裡的路徑必須對應到您剛剛建立的檔案
import AdminLayout from './layouts/AdminLayout'
import MemberCRM from './admin/MemberCRM'
import Dashboard from './admin/Dashboard'
import SystemStatus from './admin/SystemStatus'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 登入頁面路由 */}
        <Route path="/login" element={<Login />} />
        
        {/* 2. Admin 後台路由群組 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<MemberCRM />} />
          <Route path="system-status" element={<SystemStatus />} />
        </Route>

        {/* 3. 預設路由：任何沒看過的網址，都導回登入頁 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App