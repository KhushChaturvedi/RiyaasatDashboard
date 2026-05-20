import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Tag, Users, Shirt, Database } from 'lucide-react'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/brands', icon: Tag, label: 'Brands' },
  { to: '/salesmen', icon: Users, label: 'Sales' },
  { to: '/designs', icon: Shirt, label: 'Designs' },
  { to: '/data', icon: Database, label: 'Data' },
]

export default function BottomNav() {
  return (
    <nav
      className="md:hidden"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        height: 64,
        background: 'var(--bg-surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      {navItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          style={({ isActive }) => ({
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 3,
            padding: '6px 16px',
            borderRadius: 8,
            textDecoration: 'none',
            color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
            transition: 'color 0.15s ease',
          })}
        >
          <Icon size={20} />
          <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
