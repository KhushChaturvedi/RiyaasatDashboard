import { motion } from 'framer-motion'
import BrandsChart from '../components/charts/BrandsChart'
import { ChartSkeleton } from '../components/ui/SkeletonLoader'
import ErrorState from '../components/ui/ErrorState'
import { useBrands } from '../hooks/useSalesData'
import useAppStore from '../store/useAppStore'

export default function Brands() {
  const selectedYears = useAppStore((s) => s.selectedYears)
  const metric = useAppStore((s) => s.metric)
  const setMetric = useAppStore((s) => s.setMetric)
  const { data, loading, error, refetch } = useBrands()

  return (
    <div style={{ padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: 16,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h2
            style={{
              fontSize: 24,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)',
              marginBottom: 4,
            }}
          >
            Brand Performance
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Top 5 Bride &amp; Groom brands · Dept prefix "L " = Bride
          </p>
        </div>

        {/* Metric toggle */}
        <div
          style={{
            display: 'inline-flex',
            background: 'var(--bg-base)',
            borderRadius: 8,
            padding: 3,
            border: '1px solid var(--border)',
            gap: 2,
          }}
        >
          {['amount', 'qty'].map((m) => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              style={{
                padding: '5px 14px',
                borderRadius: 6,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                background: metric === m ? 'var(--accent)' : 'transparent',
                color: metric === m ? '#fff' : 'var(--text-secondary)',
              }}
            >
              {m === 'amount' ? 'Amount' : 'Quantity'}
            </button>
          ))}
        </div>
      </motion.div>

      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
          <ChartSkeleton height={260} />
          <ChartSkeleton height={260} />
        </div>
      )}

      {error && <ErrorState message={error} onRetry={refetch} />}

      {!loading && !error && data && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <BrandsChart data={data.years} metric={metric} years={selectedYears} />
        </motion.div>
      )}
    </div>
  )
}
