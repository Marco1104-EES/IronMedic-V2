import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import Login from "./pages/Login";

import AdminLayout from './layouts/AdminLayout'

import MemberCRM from './admin/MemberCRM'

import Dashboard from './admin/Dashboard'

import SystemStatus from './admin/SystemStatus'

import DataImportCenter from './admin/DataImportCenter' 

import RaceEvents from './pages/RaceEvents' 

import RaceDetail from './pages/RaceDetail' 

import RaceBuilder from './admin/RaceBuilder' 
// 🌟 引入新做好的賽事管理清單頁面
import RaceManager from './admin/RaceManager' 


function App() {

  return (

    <BrowserRouter>

      <Routes>

        <Route path="/login" element={<Login />} />

        

        {/* 👇 前線會員專區 */}

        <Route path="/races" element={<RaceEvents />} />

        {/* 🌟 在網址後面加上 /:id，讓系統知道要接收變數 */}

        <Route path="/race-detail/:id" element={<RaceDetail />} />

        

        {/* Admin 後台路由群組 */}

        <Route path="/admin" element={<AdminLayout />}>

          <Route index element={<Navigate to="/admin/dashboard" replace />} />

          <Route path="dashboard" element={<Dashboard />} />

          <Route path="members" element={<MemberCRM />} />

          <Route path="system-status" element={<SystemStatus />} />

          <Route path="import" element={<DataImportCenter />} />

          {/* 🌟 賽事管理系列路由 */}
          <Route path="races" element={<RaceManager />} />        {/* 賽事清單總覽 */}
          <Route path="race-builder" element={<RaceBuilder />} /> {/* 建立新任務 */}

        </Route>



        <Route path="*" element={<Navigate to="/login" replace />} />

      </Routes>

    </BrowserRouter>

  )

}



export default App