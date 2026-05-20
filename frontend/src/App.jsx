import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import AppLayout from './components/layout/AppLayout'
import SplashScreen from './components/ui/SplashScreen'
import Dashboard from './pages/Dashboard'
import Brands from './pages/Brands'
import Salesmen from './pages/Salesmen'
import Designs from './pages/Designs'
import Departments from './pages/Departments'
import DataManagement from './pages/DataManagement'
import Footfall from './pages/Footfall'
import Settings from './pages/Settings'
import useAppStore from './store/useAppStore'
import { themes } from './themes/themes'

function App() {
  const theme = useAppStore((s) => s.theme)
  const [splashDone, setSplashDone] = useState(
    () => !!sessionStorage.getItem('splashShown')
  )

  useEffect(() => {
    const vars = themes[theme]?.vars || themes.light.vars
    const root = document.documentElement
    root.setAttribute('data-theme', theme)
    Object.entries(vars).forEach(([key, val]) => {
      root.style.setProperty(key, val)
    })
  }, [theme])

  return (
    <>
      {!splashDone && (
        <SplashScreen onComplete={() => {
          setSplashDone(true)
          sessionStorage.setItem('splashShown', 'true')
        }} />
      )}
      <div style={{ opacity: splashDone ? 1 : 0, transition: 'opacity 0.3s ease', pointerEvents: splashDone ? 'auto' : 'none' }}>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: 'var(--bg-surface)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                fontSize: '13px',
                borderRadius: '10px',
              },
            }}
          />
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/brands" element={<Brands />} />
              <Route path="/salesmen" element={<Salesmen />} />
              <Route path="/designs" element={<Designs />} />
              <Route path="/departments" element={<Departments />} />
              <Route path="/footfall" element={<Footfall />} />
              <Route path="/data" element={<DataManagement />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  )
}

export default App
