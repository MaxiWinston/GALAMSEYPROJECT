import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppNav } from './components/AppNav'
import { TelemetryProvider } from './context/TelemetryProvider'
import { AuthProvider, useAuth } from './context/AuthContext'
import { DashboardPage } from './pages/DashboardPage'
import { DataLogPage } from './pages/DataLogPage'
import { LoginPage } from './pages/LoginPage'

function ProtectedLayout() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-zinc-950 text-zinc-200">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-teal-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle className="opacity-25" cx="12" cy="12" r="10" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-xs font-medium tracking-widest text-zinc-500 uppercase">Loading session...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <AppNav />
      <div className="flex min-h-0 flex-1 flex-col">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/data" element={<DataLogPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  )
}

function AppContent() {
  const { user } = useAuth()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="*" element={<ProtectedLayout />} />
      </Routes>
    </BrowserRouter>
  )
}

function App() {
  return (
    <AuthProvider>
      <TelemetryProvider>
        <AppContent />
      </TelemetryProvider>
    </AuthProvider>
  )
}

export default App

