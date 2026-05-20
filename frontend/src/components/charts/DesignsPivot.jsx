import { motion } from 'framer-motion'
import { formatCurrency, formatNumber } from '../../utils/formatters'
import EmptyState from '../ui/EmptyState'
import { Shirt } from 'lucide-react'

function CategoryBadge({ category }) {
  const isBride = category === 'bride'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 20,
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.06em',
        background: isBride ? 'rgba(236,72,153,0.12)' : 'rgba(99,102,241,0.12)',
        color: isBride ? 'var(--bride-color)' : 'var(--groom-color)',
        border: isBride ? '1px solid rgba(236,72,153,0.25)' : '1px solid rgba(99,102,241,0.25)',
      }}
    >
      {isBride ? 'BRIDE' : 'GROOM'}
    </span>
  )
}

export default function DesignsPivot({ data, section = 'top' }) {
  const brideRaw = data?.[section]?.bride || []
  const groomRaw = data?.[section]?.groom || []

  const merged = [
    ...brideRaw.map((d) => ({ ...d, category: 'bride' })),
    ...groomRaw.map((d) => ({ ...d, category: 'groom' })),
  ].sort((a, b) => {
    if (section === 'top') return (b.amount || 0) - (a.amount || 0)
    return (a.amount || 0) - (b.amount || 0)
  })

  if (!merged.length) {
    return <EmptyState icon={Shirt} title="No designs found" description="No design data for this period." />
  }

  const isBottom = section === 'bottom'

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ minWidth: 640 }}>
        <thead>
          <tr>
            <th style={{ width: 40 }}>#</th>
            <th>Style</th>
            <th>Brand</th>
            <th>Department</th>
            <th>Category</th>
            <th style={{ textAlign: 'right' }}>Qty</th>
            <th style={{ textAlign: 'right' }}>Amount</th>
          </tr>
        </thead>
        <tbody>
          {merged.map((row, i) => (
            <motion.tr
              key={`${row.style_desc}-${i}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.22 }}
              style={{
                borderLeft: isBottom ? '2px solid var(--danger)' : '2px solid transparent',
              }}
            >
              <td style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: 12 }}>{i + 1}</td>
              <td>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '2px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontFamily: 'monospace',
                    fontWeight: 600,
                    background: 'var(--accent-glow)',
                    color: 'var(--accent)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {row.style_desc}
                </span>
              </td>
              <td style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{row.brand_desc}</td>
              <td
                style={{
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  maxWidth: 160,
                }}
              >
                <span
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={row.dept_desc}
                >
                  {row.dept_desc}
                </span>
              </td>
              <td><CategoryBadge category={row.category} /></td>
              <td
                className="tabular-nums"
                style={{ textAlign: 'right', fontWeight: 500, color: 'var(--text-primary)' }}
              >
                {formatNumber(row.qty)}
              </td>
              <td
                className="tabular-nums"
                style={{ textAlign: 'right', fontWeight: 600, color: 'var(--text-primary)' }}
              >
                {formatCurrency(row.amount, true)}
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
