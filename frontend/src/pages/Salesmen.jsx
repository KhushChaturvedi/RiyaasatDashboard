import { useState } from 'react'
import { motion } from 'framer-motion'
import * as Tabs from '@radix-ui/react-tabs'
import SalesmenChart from '../components/charts/SalesmenChart'
import BranchSelector from '../components/widgets/BranchSelector'
import { TableSkeleton } from '../components/ui/SkeletonLoader'
import ErrorState from '../components/ui/ErrorState'
import { useSalesmenCompany, useSalesmenBranch } from '../hooks/useSalesData'
import { BRANCHES } from '../utils/constants'
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

function CompanyTab({ selectedYears }) {
  const { data, loading, error, refetch } = useSalesmenCompany()
  const compareYear = selectedYears[1]
  return (
    <div className="card" style={{ padding: 20, marginTop: 16 }}>
      {loading && <TableSkeleton rows={10} />}
      {error && <ErrorState message={error} onRetry={refetch} />}
      {!loading && !error && (
        <SalesmenChart salesmen={data?.salesmen || []} compareYear={compareYear} />
      )}
    </div>
  )
}

function BranchTab({ selectedYears }) {
  const [branch, setBranch] = useState(null)
  const { data, loading, error, refetch } = useSalesmenBranch(branch)
  const compareYear = selectedYears[1]

  return (
    <div style={{ marginTop: 16 }}>
      <div style={{ marginBottom: 16 }}>
        <BranchSelector branches={BRANCHES} value={branch} onChange={setBranch} />
      </div>
      {!branch && (
        <div
          className="card"
          style={{
            padding: '40px 24px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: 13,
          }}
        >
          Select a branch above to view its top salesmen.
        </div>
      )}
      {branch && (
        <div className="card" style={{ padding: 20 }}>
          {loading && <TableSkeleton rows={5} />}
          {error && <ErrorState message={error} onRetry={refetch} />}
          {!loading && !error && (
            <SalesmenChart salesmen={data?.salesmen || []} compareYear={compareYear} />
          )}
        </div>
      )}
    </div>
  )
}

export default function Salesmen() {
  const selectedYears = useAppStore((s) => s.selectedYears)
  const [activeTab, setActiveTab] = useState('company')

  return (
    <div style={{ padding: 24 }}>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        style={{ marginBottom: 24 }}
      >
        <h2
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-primary)',
            marginBottom: 4,
          }}
        >
          Sales Team Performance
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Ranked by net sales · Growth vs same period prior year
        </p>
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
            }}
          >
            <Tabs.Trigger
              value="company"
              style={tabTriggerStyle(activeTab === 'company')}
            >
              Company Level
            </Tabs.Trigger>
            <Tabs.Trigger
              value="branch"
              style={tabTriggerStyle(activeTab === 'branch')}
            >
              Branch Level
            </Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="company">
            <CompanyTab selectedYears={selectedYears} />
          </Tabs.Content>
          <Tabs.Content value="branch">
            <BranchTab selectedYears={selectedYears} />
          </Tabs.Content>
        </Tabs.Root>
      </motion.div>
    </div>
  )
}
