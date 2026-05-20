import { useMemo } from 'react'
import { motion } from 'framer-motion'
import DepartmentsChart from '../components/charts/DepartmentsChart'
import { ChartSkeleton } from '../components/ui/SkeletonLoader'
import ErrorState from '../components/ui/ErrorState'
import { useDepartments } from '../hooks/useSalesData'
import useAppStore from '../store/useAppStore'

export default function Departments() {
  const selectedYears = useAppStore((s) => s.selectedYears)
  const metric = useAppStore((s) => s.metric)
  const setMetric = useAppStore((s) => s.setMetric)
  const { data, loading, error, refetch } = useDepartments()

  const groomData = useMemo(() => {
    if (!data?.years) return null
    const out = {}
    Object.entries(data.years).forEach(([yr, val]) => { out[yr] = val.groom || [] })
    return out
  }, [data])

  const brideData = useMemo(() => {
    if (!data?.years) return null
    const out = {}
    Object.entries(data.years).forEach(([yr, val]) => { out[yr] = val.bride || [] })
    return out
  }, [data])

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
            Department Performance
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Top 10 departments ranked by net performance · Bride &amp; Groom separate
          </p>
        </div>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {/* Groom chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          style={{ padding: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366F1', display: 'inline-block', flexShrink: 0 }} />
            <p className="section-label">GROOM DEPARTMENTS — TOP 10</p>
          </div>
          {loading && <ChartSkeleton height={360} />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && (
            <DepartmentsChart data={groomData} metric={metric} years={selectedYears} color="#6366F1" />
          )}
        </motion.div>

        {/* Bride chart */}
        <motion.div
          className="card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          style={{ padding: 20 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#EC4899', display: 'inline-block', flexShrink: 0 }} />
            <p className="section-label">BRIDE DEPARTMENTS — TOP 10</p>
          </div>
          {loading && <ChartSkeleton height={360} />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && (
            <DepartmentsChart data={brideData} metric={metric} years={selectedYears} color="#EC4899" />
          )}
        </motion.div>
      </div>
    </div>
  )
}
