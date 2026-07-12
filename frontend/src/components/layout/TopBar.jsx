import { Palette, Menu } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useAppStore from '../../store/useAppStore'
import { themes } from '../../themes/themes'
import { getComparisonYears, getCurrentYear } from '../../utils/dateUtils'
import useWindowWidth from '../../hooks/useWindowWidth'

const YEAR_OPTIONS = [
  { label: 'Current only', count: 0 },
  { label: '+ 1 year', count: 1 },
  { label: '+ 2 years', count: 2 },
  { label: '+ 3 years', count: 3 },
  { label: '+ 5 years', count: 5 },
]

function SyncDot({ showLabel = true }) {
  const syncStatus = useAppStore((s) => s.syncStatus)

  const colors = {
    synced: 'var(--success)',
    syncing: 'var(--warning)',
    error: 'var(--danger)',
  }
  const labels = { synced: 'In Sync', syncing: 'Syncing...', error: 'Offline' }
  const color = colors[syncStatus] || colors.synced

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <span
        style={{
          width: 7,
          height: 7,
          borderRadius: '50%',
          background: color,
          display: 'inline-block',
          flexShrink: 0,
          animation: syncStatus === 'synced' ? 'pulse-dot 2.5s ease-in-out infinite' : 'none',
        }}
      />
      {showLabel && (
        <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
          {labels[syncStatus]}
        </span>
      )}
    </div>
  )
}

function ThemePicker() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const [open, setOpen] = useState(false)

  return (
    <div id="topbar-theme" style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: open ? 'var(--accent)' : 'var(--text-secondary)',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--accent)' }}
        onMouseLeave={(e) => { if (!open) { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' } }}
      >
        <Palette size={15} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 8px)',
                zIndex: 50,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 8,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 6,
                minWidth: 180,
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {Object.entries(themes).map(([key, t]) => {
                const isActive = theme === key
                return (
                  <button
                    key={key}
                    onClick={() => { setTheme(key); setOpen(false) }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 4,
                      padding: '6px 4px',
                      borderRadius: 8,
                      border: isActive ? '1.5px solid var(--accent)' : '1.5px solid transparent',
                      background: isActive ? 'var(--accent-glow)' : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 18,
                        borderRadius: 4,
                        background: `linear-gradient(135deg, ${t.previewBg} 50%, ${t.previewAccent} 100%)`,
                        border: `1px solid ${t.swatchBorder}`,
                      }}
                    />
                    <span style={{ fontSize: 10, color: isActive ? 'var(--accent)' : 'var(--text-muted)', fontWeight: 500 }}>
                      {t.name}
                    </span>
                  </button>
                )
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function YearDropdown({ compact = false }) {
  const selectedYears = useAppStore((s) => s.selectedYears)
  const setSelectedYears = useAppStore((s) => s.setSelectedYears)
  const [open, setOpen] = useState(false)

  const currentCount = selectedYears.length - 1
  const current = YEAR_OPTIONS.find((o) => o.count === currentCount)?.label || `${selectedYears.length} yrs`

  return (
    <div id="topbar-year-dropdown" style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          height: compact ? 26 : 30,
          padding: compact ? '0 8px' : '0 10px',
          borderRadius: 6,
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          fontSize: compact ? 11 : 12,
          fontWeight: 500,
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          transition: 'all 0.15s ease',
          fontFamily: 'inherit',
          maxWidth: compact ? 130 : 'none',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        {getCurrentYear()} · {current}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                zIndex: 50,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '4px 0',
                minWidth: 160,
                boxShadow: 'var(--shadow-lg)',
              }}
            >
              {YEAR_OPTIONS.map((opt) => (
                <button
                  key={opt.count}
                  onClick={() => { setSelectedYears(getComparisonYears(opt.count)); setOpen(false) }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '100%',
                    padding: '8px 14px',
                    fontSize: 13,
                    color: opt.count === currentCount ? 'var(--accent)' : 'var(--text-primary)',
                    background: opt.count === currentCount ? 'var(--accent-glow)' : 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'inherit',
                    fontWeight: opt.count === currentCount ? 600 : 400,
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => { if (opt.count !== currentCount) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                  onMouseLeave={(e) => { if (opt.count !== currentCount) e.currentTarget.style.background = 'transparent' }}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default function TopBar({ title, onMenuClick }) {
  const period = useAppStore((s) => s.period)
  const setPeriod = useAppStore((s) => s.setPeriod)
  const theme = useAppStore((s) => s.theme)
  const width = useWindowWidth()
  const isMobile = width < 768
  const isDark = ['dark', 'navy', 'red', 'green', 'grey'].includes(theme)

  if (isMobile) {
    return (
      <header
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          zIndex: 30,
        }}
      >
        {/* Row 1: hamburger | title | sync dot */}
        <div
          style={{
            height: 44,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 10,
          }}
        >
          <button
            onClick={onMenuClick}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              flexShrink: 0,
            }}
          >
            <Menu size={16} />
          </button>

          <span
            style={{
              flex: 1,
              textAlign: 'center',
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--text-primary)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </span>

          <SyncDot showLabel={false} />
        </div>

        {/* Row 2: MTD/YTD | year selector */}
        <div
          style={{
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            gap: 8,
            background: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
          }}
        >
          <div
            id="topbar-period-toggle"
            style={{
              display: 'inline-flex',
              background: 'var(--bg-base)',
              borderRadius: 6,
              padding: 2,
              gap: 2,
            }}
          >
            {['mtd', 'ytd'].map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                style={{
                  width: 60,
                  height: 26,
                  borderRadius: 4,
                  border: 'none',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s ease',
                  background: period === p ? 'var(--accent)' : 'transparent',
                  color: period === p ? '#fff' : 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => { if (period !== p) e.currentTarget.style.color = 'var(--text-primary)' }}
                onMouseLeave={(e) => { if (period !== p) e.currentTarget.style.color = 'var(--text-secondary)' }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <YearDropdown compact />
        </div>
      </header>
    )
  }

  // Desktop layout — unchanged
  return (
    <header
      style={{
        height: 56,
        background: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        padding: '0 20px',
        gap: 12,
        flexShrink: 0,
        position: 'sticky',
        top: 0,
        zIndex: 30,
      }}
    >
      {/* Page title */}
      <span
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: 'var(--text-primary)',
          flex: '0 0 auto',
          minWidth: 0,
        }}
      >
        {title}
      </span>

      {/* Center: MTD/YTD toggle */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
        <div
          id="topbar-period-toggle"
          style={{
            display: 'inline-flex',
            background: 'var(--bg-base)',
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {['mtd', 'ytd'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              style={{
                width: 80,
                height: 30,
                borderRadius: 6,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                background: period === p ? 'var(--accent)' : 'transparent',
                color: period === p ? '#fff' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => { if (period !== p) e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={(e) => { if (period !== p) e.currentTarget.style.color = 'var(--text-secondary)' }}
            >
              {p.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: '0 0 auto' }}>
        <YearDropdown />
        <ThemePicker />
        <SyncDot />
      </div>
    </header>
  )
}
