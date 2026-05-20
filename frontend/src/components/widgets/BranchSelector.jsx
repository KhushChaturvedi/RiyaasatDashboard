import { useState } from 'react'
import { ChevronDown, MapPin } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function BranchSelector({ branches = [], value, onChange, placeholder = 'Select Branch', loading = false }) {
  const [open, setOpen] = useState(false)

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => { if (!loading) setOpen((o) => !o) }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 12px',
          borderRadius: 8,
          border: '1px solid var(--border)',
          background: 'var(--bg-card)',
          fontSize: 13,
          fontWeight: 500,
          color: value ? 'var(--text-primary)' : 'var(--text-muted)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          minWidth: 160,
          transition: 'border-color 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        <MapPin size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left' }}>{loading ? 'Loading branches...' : value || placeholder}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setOpen(false)} />
            <motion.div
              style={{
                position: 'absolute',
                left: 0,
                top: 'calc(100% + 6px)',
                zIndex: 30,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '4px 0',
                minWidth: '100%',
                maxHeight: 240,
                overflowY: 'auto',
                boxShadow: 'var(--shadow-lg)',
              }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
            >
              {loading ? (
                <p style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>Loading branches...</p>
              ) : branches.length === 0 ? (
                <p style={{ padding: '10px 14px', fontSize: 13, color: 'var(--text-muted)' }}>No branches found</p>
              ) : (
                branches.map((b) => (
                  <button
                    key={b}
                    onClick={() => { onChange(b); setOpen(false) }}
                    style={{
                      display: 'flex',
                      width: '100%',
                      padding: '8px 14px',
                      fontSize: 13,
                      color: b === value ? 'var(--accent)' : 'var(--text-primary)',
                      background: b === value ? 'var(--accent-glow)' : 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontFamily: 'inherit',
                      fontWeight: b === value ? 600 : 400,
                      transition: 'background 0.1s ease',
                    }}
                    onMouseEnter={(e) => { if (b !== value) e.currentTarget.style.background = 'var(--bg-card-hover)' }}
                    onMouseLeave={(e) => { if (b !== value) e.currentTarget.style.background = 'transparent' }}
                  >
                    {b}
                  </button>
                ))
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
