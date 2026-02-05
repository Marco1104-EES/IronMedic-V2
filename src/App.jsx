import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './supabaseClient'

import Login from './pages/Login'
import Home from './pages/Home'
import UserProfile from './pages/UserProfile'

import AdminLayout from './layouts/AdminLayout'
import UserLayout from './layouts/UserLayout'

import AdminDashboard from './admin/AdminDashboard'
import EventManagement from './admin/EventManagement'
import UserPermission from './admin/UserPermission'
import MemberCRM from './admin/MemberCRM'
import DataImportCenter from './admin/DataImportCenter'
import SystemLogs from './admin/SystemLogs'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/" element={<UserLayout />}>
           <Route index element={<Navigate to="/home" replace />} />
           <Route path="home" element={<Home />} />
           <Route path="profile" element={session ? <UserProfile /> : <Navigate to="/login" />} />
        </Route>

        <Route path="/admin" element={session ? <AdminLayout /> : <Navigate to="/login" />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="events" element={<EventManagement />} />
          <Route path="members" element={<MemberCRM />} />
          <Route path="import" element={<DataImportCenter />} />
          <Route path="permissions" element={<UserPermission />} />
          <Route path="logs" element={<SystemLogs />} />
        </Route>

        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}