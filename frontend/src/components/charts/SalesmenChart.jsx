import { motion } from 'framer-motion'
import { formatCurrency } from '../../utils/formatters'
import EmptyState from '../ui/EmptyState'
import { Users } from 'lucide-react'

const RANK_STYLES = [
  { bg: 'var(--gold)', color: '#000', border: 'none' },
  { bg: '#94A3B8', color: '#000', border: 'none' },
  { bg: '#C97B3E', color: '#fff', border: 'none' },
]

function getRankStyle(rank) {
  if (rank <= 3) return RANK_STYLES[rank - 1]
  return { bg: 'var(--bg-card-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }
}

function SalesmanRow({ rank, salesman, maxAmount, compareYear, index }) {
  const { name, current_amount, comparisons = {} } = salesman
  const pct = compareYear ? comparisons[String(compareYear)]?.growth_pct : null
  const barWidth = maxAmount > 0 ? Math.max((current_amount / maxAmount) * 100, 2) : 0
  const rankStyle = getRankStyle(rank)

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Rank circle */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          background: rankStyle.bg,
          border: rankStyle.border,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 11,
          fontWeight: 700,
          color: rankStyle.color,
          flexShrink: 0,
        }}
      >
        {rank}
      </div>

      {/* Name + progress bar */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: 'var(--text-primary)',
            marginBottom: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {name}
        </div>
        <div
          style={{
            height: 4,
            borderRadius: 2,
            background: 'var(--border)',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${barWidth}%` }}
            transition={{ delay: index * 0.04 + 0.2, duration: 0.6, ease: 'easeOut' }}
            style={{
              height: '100%',
              borderRadius: 2,
              background: rank === 1
                ? 'var(--gold)'
                : rank <= 3
                ? 'var(--accent)'
                : 'var(--text-muted)',
            }}
          />
        </div>
      </div>

      {/* Amount + YoY */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div
          className="tabular-nums"
          style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}
        >
          {formatCurrency(current_amount, true)}
        </div>
        {pct !== null && pct !== undefined && (
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: pct >= 0 ? 'var(--success)' : 'var(--danger)',
              marginTop: 2,
            }}
          >
            {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}%
          </div>
        )}
      </div>
    </motion.div>
  )
}

export default function SalesmenChart({ salesmen = [], compareYear }) {
  if (!salesmen.length) {
    return <EmptyState icon={Users} title="No salesman data" description="No salesman records found for this period." />
  }

  const maxAmount = Math.max(...salesmen.map((s) => s.current_amount))

  return (
    <div>
      {salesmen.map((s, i) => (
        <SalesmanRow
          key={s.name}
          rank={i + 1}
          salesman={s}
          maxAmount={maxAmount}
          compareYear={compareYear}
          index={i}
        />
      ))}
    </div>
  )
}
