import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// === 前台 ===
import UserProfile from './pages/UserProfile';
import Login from './pages/Login';
import Home from './pages/Home';

// === 後台 ===
import AdminLayout from './layouts/AdminLayout'; 
import AdminDashboard from './admin/AdminDashboard';
// 🔥 解除封印：引入 MemberCRM
import MemberCRM from './admin/MemberCRM'; 

export default function App() {
  return (
    <div className="App">
      <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/home" element={<Home />} />
          <Route path="/profile" element={<UserProfile />} />

          {/* 後台路由 */}
          <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              
              {/* 🔥 解除封印：接通會員管理頁面 */}
              <Route path="members" element={<MemberCRM />} />
              
          </Route>

          <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </div>
  );
}