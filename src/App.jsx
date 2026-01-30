import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Navbar from './components/Navbar'
import AdminDashboard from './components/AdminDashboard'
import Login from './components/Login'
import EventCard from './components/EventCard' // 假設您有這個
import UserProfile from './components/UserProfile' // ✨ 確保有引入這個

function PublicHome() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-12 px-4 text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-4">醫護鐵人賽事報名</h1>
        <div className="bg-white p-10 rounded shadow mt-8">
           <h3 className="text-xl font-bold text-gray-700">近期賽事列表</h3>
           <p className="text-gray-500 mt-2">(此處將顯示 EventCard 元件)</p>
        </div>
      </div>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PublicHome />} />
        <Route path="/login" element={<Login />} />
        
        {/* ✨ 關鍵：個人檔案路由 */}
        <Route path="/profile" element={<UserProfile />} />

        <Route path="/admin/*" element={<AdminDashboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App