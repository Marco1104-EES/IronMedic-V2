import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// ✅ 正確的新路徑
import Login from "./pages/Login";
import AdminLayout from './layouts/AdminLayout'
import MemberCRM from './admin/MemberCRM'
import Dashboard from './admin/Dashboard'
import SystemStatus from './admin/SystemStatus'
import DataImportCenter from './admin/DataImportCenter' // 👈 坦克已就位

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
          {/* 👇 這條路通了！不會再迷路被踢出去了 */}
          <Route path="import" element={<DataImportCenter />} />
        </Route>

        {/* 3. 預設路由：任何沒看過的網址，都導回登入頁 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App