import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import useAppStore from '../../store/useAppStore'
import { getCurrentYear, getComparisonYears } from '../../utils/dateUtils'

const COMPARE_OPTIONS = [
  { label: 'Current year only', count: 0 },
  { label: '+ 1 previous year', count: 1 },
  { label: '+ 2 previous years', count: 2 },
  { label: '+ 3 previous years', count: 3 },
  { label: '+ 5 previous years', count: 5 },
]

export default function YearSelector({ id }) {
  const selectedYears = useAppStore((s) => s.selectedYears)
  const setSelectedYears = useAppStore((s) => s.setSelectedYears)
  const [open, setOpen] = useState(false)

  const currentCount = selectedYears.length - 1
  const currentLabel = COMPARE_OPTIONS.find((o) => o.count === currentCount)?.label || `${selectedYears.length} years`

  return (
    <div style={{ position: 'relative' }} id={id}>
      <button
        onClick={() => setOpen((o) => !o)}
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
          color: 'var(--text-primary)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          transition: 'border-color 0.15s ease',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-hover)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)' }}
      >
        <span>{currentLabel}</span>
        <ChevronDown size={13} style={{ color: 'var(--text-muted)' }} />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 20 }} onClick={() => setOpen(false)} />
            <motion.div
              style={{
                position: 'absolute',
                right: 0,
                top: 'calc(100% + 6px)',
                zIndex: 30,
                background: 'var(--bg-surface)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '4px 0',
                minWidth: 190,
                boxShadow: 'var(--shadow-lg)',
              }}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12 }}
            >
              {COMPARE_OPTIONS.map((opt) => (
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
