import { Outlet, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Sidebar from './Sidebar'
import BottomNav from './BottomNav'
import TopBar from './TopBar'
import { useRealtime } from '../../hooks/useRealtime'

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/brands': 'Brand Performance',
  '/salesmen': 'Sales Team',
  '/designs': 'Design Analytics',
  '/departments': 'Departments',
  '/footfall': 'Footfall Analytics',
  '/data': 'Data Management',
  '/settings': 'Settings',
}

const pageVariants = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
}

export default function AppLayout() {
  const location = useLocation()
  const title = PAGE_TITLES[location.pathname] || 'Riyaasat'
  useRealtime()

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'var(--bg-base)',
    }}>
      <Sidebar />
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minWidth: 0,
        overflow: 'hidden',
      }}>
        <TopBar title={title} />
        <main style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          minHeight: 0,
        }}
          className="md:pb-0"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.25, ease: 'easeOut' }}
              style={{ minHeight: '100%', paddingBottom: 'env(safe-area-inset-bottom, 80px)' }}
              className="md:pb-0"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <BottomNav />
    </div>
  )
}
