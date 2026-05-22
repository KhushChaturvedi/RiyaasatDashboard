import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Tag, Users, Shirt, Layers, Database, Settings,
  ChevronLeft, ChevronRight, UserCheck, X,
} from 'lucide-react'
import useAppStore from '../../store/useAppStore'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', id: 'nav-dashboard' },
  { to: '/brands', icon: Tag, label: 'Brands', id: 'nav-brands' },
  { to: '/salesmen', icon: Users, label: 'Salesmen', id: 'nav-salesmen' },
  { to: '/designs', icon: Shirt, label: 'Designs', id: 'nav-designs' },
  { to: '/departments', icon: Layers, label: 'Departments', id: 'nav-departments' },
  { to: '/footfall', icon: UserCheck, label: 'Footfall', id: 'nav-footfall' },
  { to: '/data', icon: Database, label: 'Data', id: 'nav-data' },
  { to: '/settings', icon: Settings, label: 'Settings', id: 'nav-settings' },
]

function NavItems({ collapsed, onItemClick }) {
  return navItems.map(({ to, icon: Icon, label, id }) => (
    <NavLink
      key={to}
      to={to}
      id={id}
      title={collapsed ? label : undefined}
      onClick={onItemClick}
      style={({ isActive }) => ({
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        height: 40,
        padding: '0 12px',
        borderRadius: 8,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: 500,
        transition: 'background 0.15s ease, color 0.15s ease',
        boxShadow: isActive ? 'inset 3px 0 0 var(--accent)' : 'none',
        background: isActive ? 'var(--accent-glow)' : 'transparent',
        color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      })}
      onMouseEnter={(e) => {
        if (!e.currentTarget.classList.contains('active')) {
          e.currentTarget.style.background = 'var(--bg-card-hover)'
        }
      }}
      onMouseLeave={(e) => {
        if (!e.currentTarget.getAttribute('aria-current')) {
          e.currentTarget.style.background = e.currentTarget.style.background.includes('accent')
            ? 'var(--accent-glow)' : 'transparent'
        }
      }}
    >
      <Icon size={18} style={{ flexShrink: 0 }} />
      <AnimatePresence>
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  ))
}

export default function Sidebar({ mobileOpen, onMobileClose }) {
  const collapsed = useAppStore((s) => s.sidebarCollapsed)
  const setCollapsed = useAppStore((s) => s.setSidebarCollapsed)

  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    const checkTheme = () => {
      const theme = document.documentElement.getAttribute('data-theme')
      setIsDark(['dark', 'navy', 'red', 'green', 'grey'].includes(theme))
    }
    checkTheme()
    const observer = new MutationObserver(checkTheme)
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  const logoImg = (
    <img
      src="/riyaasat-logo.png"
      alt="Riyaasat"
      style={{
        height: collapsed ? 28 : 40,
        width: 'auto',
        maxWidth: collapsed ? 40 : 160,
        objectFit: 'contain',
        objectPosition: 'left center',
        transition: 'all 0.2s ease',
        display: 'block',
        filter: isDark ? 'brightness(0) invert(1)' : 'none',
      }}
    />
  )

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 220 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className="hidden md:flex flex-col shrink-0 h-screen sticky top-0 overflow-hidden"
        style={{
          background: 'var(--bg-surface)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Logo area */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: collapsed ? '0 8px' : '0 8px 0 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          {logoImg}
          <button
            onClick={() => setCollapsed(!collapsed)}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-card-hover)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              flexShrink: 0,
              transition: 'background 0.15s ease, color 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--accent-glow)'
              e.currentTarget.style.color = 'var(--accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--bg-card-hover)'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav items */}
        <nav
          style={{
            flex: 1,
            padding: '12px 8px',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          <NavItems collapsed={collapsed} />
        </nav>

        {/* Version */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <AnimatePresence>
            {!collapsed && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{ fontSize: 10, color: 'var(--text-muted)' }}
              >
                v1.0.0
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.aside>

      {/* Mobile sidebar overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -260 }}
            animate={{ x: 0 }}
            exit={{ x: -260 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="md:hidden"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 260,
              zIndex: 100,
              background: 'var(--bg-surface)',
              borderRight: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Logo + close */}
            <div
              style={{
                height: 64,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 8px 0 16px',
                borderBottom: '1px solid var(--border)',
                flexShrink: 0,
              }}
            >
              <img
                src="/riyaasat-logo.png"
                alt="Riyaasat"
                style={{
                  height: 40,
                  width: 'auto',
                  maxWidth: 160,
                  objectFit: 'contain',
                  objectPosition: 'left center',
                  display: 'block',
                  filter: isDark ? 'brightness(0) invert(1)' : 'none',
                }}
              />
              <button
                onClick={onMobileClose}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-card-hover)',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Nav items */}
            <nav
              style={{
                flex: 1,
                padding: '12px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                overflowY: 'auto',
              }}
            >
              <NavItems collapsed={false} onItemClick={onMobileClose} />
            </nav>

            {/* Version */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>v1.0.0</p>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  )
}
