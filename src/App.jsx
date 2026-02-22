import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
// ✅ 正確的新路徑
import Login from "./pages/Login";
import AdminLayout from './layouts/AdminLayout'
import MemberCRM from './admin/MemberCRM'
import Dashboard from './admin/Dashboard'
import SystemStatus from './admin/SystemStatus'
import DataImportCenter from './admin/DataImportCenter' // 👈 坦克已就位
import RaceEvents from './pages/RaceEvents' // 賽事任務大廳
import RaceDetail from './pages/RaceDetail' // 智能派班與報名中心
import RaceBuilder from './admin/RaceBuilder' // 👇 新增：指揮官賽事兵工廠

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* 1. 登入頁面路由 */}
        <Route path="/login" element={<Login />} />
        
        {/* 👇 前線會員專區 */}
        {/* 賽事任務大廳 */}
        <Route path="/races" element={<RaceEvents />} />
        {/* 賽事報名與戰情佈署中心 */}
        <Route path="/race-detail" element={<RaceDetail />} />
        
        {/* 2. Admin 後台路由群組 */}
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="members" element={<MemberCRM />} />
          <Route path="system-status" element={<SystemStatus />} />
          {/* 這條路通了！不會再迷路被踢出去了 */}
          <Route path="import" element={<DataImportCenter />} />
          {/* 👇 新增這行：賽事建立中心 (兵工廠) */}
          <Route path="race-builder" element={<RaceBuilder />} />
        </Route>

        {/* 3. 預設路由：任何沒看過的網址，都導回登入頁 */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App