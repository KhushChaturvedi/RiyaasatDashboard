import { useState } from 'react'
import { motion } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import DesignsPivot from '../components/charts/DesignsPivot'
import { ChartSkeleton } from '../components/ui/SkeletonLoader'
import ErrorState from '../components/ui/ErrorState'
import { useDesigns } from '../hooks/useSalesData'
import useAppStore from '../store/useAppStore'

const tabTriggerStyle = (isActive) => ({
  padding: '7px 18px',
  borderRadius: 7,
  border: 'none',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
  background: isActive ? 'var(--accent)' : 'transparent',
  color: isActive ? '#fff' : 'var(--text-secondary)',
  outline: 'none',
})

export default function Designs() {
  const metric = useAppStore((s) => s.metric)
  const setMetric = useAppStore((s) => s.setMetric)
  const { data, loading, error, refetch } = useDesigns()
  const [activeTab, setActiveTab] = useState('top')

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
            Design Analytics
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Top &amp; bottom performing designs · Bride &amp; Groom combined
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

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List
            style={{
              display: 'inline-flex',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: 3,
              gap: 2,
              marginBottom: 16,
            }}
          >
            <Tabs.Trigger value="top" style={tabTriggerStyle(activeTab === 'top')}>
              Top 10
            </Tabs.Trigger>
            <Tabs.Trigger value="bottom" style={tabTriggerStyle(activeTab === 'bottom')}>
              Bottom 5
            </Tabs.Trigger>
          </Tabs.List>

          {loading && (
            <div>
              <ChartSkeleton height={300} />
            </div>
          )}
          {error && <ErrorState message={error} onRetry={refetch} />}

          {!loading && !error && data && (
            <>
              <Tabs.Content value="top">
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <DesignsPivot data={data} section="top" metric={metric} />
                </div>
              </Tabs.Content>
              <Tabs.Content value="bottom">
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  <DesignsPivot data={data} section="bottom" metric={metric} />
                </div>
              </Tabs.Content>
            </>
          )}
        </Tabs.Root>
      </motion.div>
    </div>
  )
}
