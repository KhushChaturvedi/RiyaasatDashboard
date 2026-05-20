import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { themes } from '../themes/themes'
import { formatDateTimeDisplay, getCurrentFinancialYear } from '../utils/dateUtils'

export default function Settings() {
  const theme = useAppStore((s) => s.theme)
  const setTheme = useAppStore((s) => s.setTheme)
  const lastDataRefresh = useAppStore((s) => s.lastDataRefresh)

  return (
    <div style={{ padding: 24 }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          Settings
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 28 }}>
          Appearance and application preferences
        </p>
      </motion.div>

      {/* Theme selector */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08 }}
        style={{ padding: 20, marginBottom: 20 }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>Theme</h3>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 18 }}>
          Preference is saved automatically.
        </p>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 12,
          }}
        >
          {Object.entries(themes).map(([key, t]) => {
            const isActive = theme === key
            return (
              <button
                key={key}
                onClick={() => setTheme(key)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 0,
                  borderRadius: 12,
                  border: isActive ? '2px solid var(--accent)' : '1.5px solid var(--border)',
                  background: isActive ? 'var(--accent-glow)' : 'transparent',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  transition: 'all 0.15s ease',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-hover)' }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border)' }}
              >
                {/* Preview gradient */}
                <div
                  style={{
                    height: 60,
                    background: `linear-gradient(135deg, ${t.previewBg} 40%, ${t.previewAccent}40 100%)`,
                    borderBottom: `1px solid ${t.swatchBorder}`,
                    position: 'relative',
                  }}
                >
                  {/* Accent dot */}
                  <div
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      right: 12,
                      width: 24,
                      height: 24,
                      borderRadius: '50%',
                      background: t.previewAccent,
                      opacity: 0.85,
                    }}
                  />
                  {isActive && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'var(--accent)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Check size={11} color="#fff" />
                    </div>
                  )}
                </div>
                <div style={{ padding: '8px 12px' }}>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: isActive ? 'var(--accent)' : 'var(--text-primary)',
                    }}
                  >
                    {t.name}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </motion.div>

      {/* App info */}
      <motion.div
        className="card"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        style={{ padding: 20 }}
      >
        <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
          App Info
        </h3>
        <div>
          {[
            { label: 'Version', value: 'v1.0.0' },
            { label: 'Financial Year', value: getCurrentFinancialYear() },
            {
              label: 'Last Data Refresh',
              value: lastDataRefresh ? formatDateTimeDisplay(lastDataRefresh) : 'No data loaded',
            },
            { label: 'Data Source', value: 'Supabase (PostgreSQL)' },
            { label: 'Sync', value: 'Real-time across all devices' },
          ].map(({ label, value }, i, arr) => (
            <div
              key={label}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border)' : 'none',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{label}</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{value}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  )
}
