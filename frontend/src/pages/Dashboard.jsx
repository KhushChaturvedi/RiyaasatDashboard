import { Suspense, useRef, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Float } from '@react-three/drei'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import StatCard from '../components/widgets/StatCard'
import { StatCardSkeleton } from '../components/ui/SkeletonLoader'
import ErrorState from '../components/ui/ErrorState'
import { useSummary, useTargetVsActual } from '../hooks/useSalesData'
import useAppStore from '../store/useAppStore'
import { formatCurrency } from '../utils/formatters'

function FloatingShape({ position, geometry, color, scale = 1, rotationSpeed = 0.3 }) {
  const meshRef = useRef()
  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.x += delta * rotationSpeed * 0.5
      meshRef.current.rotation.y += delta * rotationSpeed
    }
  })

  return (
    <Float speed={1} rotationIntensity={0.2} floatIntensity={0.3}>
      <mesh ref={meshRef} position={position} scale={scale}>
        {geometry}
        <meshPhongMaterial color={color} transparent opacity={0.06} wireframe />
      </mesh>
    </Float>
  )
}

function ParallaxGroup() {
  const groupRef = useRef()
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = state.pointer.x * 0.08
      groupRef.current.rotation.x = state.pointer.y * -0.04
    }
  })

  return (
    <group ref={groupRef}>
      <FloatingShape position={[-2, 1.5, -1]} geometry={<icosahedronGeometry args={[1, 0]} />} color="#6366F1" scale={1.4} />
      <FloatingShape position={[2, -1, -2]} geometry={<octahedronGeometry args={[1, 0]} />} color="#22D3EE" scale={0.9} rotationSpeed={0.4} />
      <FloatingShape position={[0, 2, -3]} geometry={<torusGeometry args={[0.8, 0.25, 8, 24]} />} color="#EC4899" scale={0.8} rotationSpeed={0.2} />
    </group>
  )
}

function ThreeBackground() {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 400,
        height: 400,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.8,
      }}
    >
      <Canvas camera={{ position: [0, 0, 7], fov: 50 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <ParallaxGroup />
      </Canvas>
    </div>
  )
}

function SummaryCards({ data, loading, error, refetch, selectedYears }) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
        {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    )
  }

  if (error) return <ErrorState message={error} onRetry={refetch} />
  if (!data) return null

  const current = data.years?.[String(selectedYears[0])]
  const prev = selectedYears[1] ? data.years?.[String(selectedYears[1])] : null

  const salesGrowth = prev?.total_sales
    ? ((current?.total_sales - prev.total_sales) / Math.abs(prev.total_sales)) * 100
    : undefined

  const qtyGrowth = prev?.total_qty
    ? ((current?.total_qty - prev.total_qty) / Math.abs(prev.total_qty)) * 100
    : undefined

  const cards = [
    {
      title: 'NET SALES',
      value: current?.total_sales || 0,
      prefix: '₹',
      growth: salesGrowth,
      subtitle: prev ? `vs ₹${(Math.abs(prev.total_sales) / 100000).toFixed(1)}L prior` : undefined,
      accentColor: 'var(--accent)',
      isFloat: true,
    },
    {
      title: 'TOTAL QUANTITY',
      value: current?.total_qty || 0,
      growth: qtyGrowth,
      subtitle: 'Units sold',
      accentColor: 'var(--accent-cyan)',
    },
    {
      title: 'TRANSACTIONS',
      value: current?.total_transactions || 0,
      subtitle: 'Unique documents',
      accentColor: 'var(--success)',
    },
    {
      title: 'TOP BRANCH',
      value: current?.top_branch?.amount || 0,
      prefix: '₹',
      subtitle: current?.top_branch?.name || '—',
      accentColor: 'var(--gold)',
      isFloat: true,
    },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
      {cards.map((card, i) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.08, duration: 0.35 }}
        >
          <StatCard {...card} />
        </motion.div>
      ))}
    </div>
  )
}

function AnimatedAmt({ value }) {
  const ref = useRef(null)
  const tweenRef = useRef(null)
  useEffect(() => {
    if (tweenRef.current) tweenRef.current.kill()
    const obj = { val: 0 }
    tweenRef.current = gsap.to(obj, {
      val: value,
      duration: 1.4,
      ease: 'power3.out',
      onUpdate: () => {
        if (ref.current) ref.current.textContent = formatCurrency(obj.val, true)
      },
    })
    return () => tweenRef.current?.kill()
  }, [value])
  return <span ref={ref} className="tabular-nums">{formatCurrency(0, true)}</span>
}

function achievementColor(pct) {
  if (pct === null || pct === undefined) return 'var(--text-muted)'
  if (pct >= 100) return 'var(--success)'
  if (pct >= 80) return '#F59E0B'
  return 'var(--danger)'
}

function ProgressBar({ pct }) {
  const clamped = Math.min(pct ?? 0, 100)
  const color = achievementColor(pct)
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'var(--border)', overflow: 'hidden', marginTop: 8 }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
        style={{ height: '100%', borderRadius: 3, background: color }}
      />
    </div>
  )
}

function TargetSection() {
  const selectedYears = useAppStore((s) => s.selectedYears)
  const { data, loading } = useTargetVsActual()

  if (loading) {
    return (
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }} style={{ marginTop: 20, padding: '20px 24px' }}>
        <p className="section-label" style={{ marginBottom: 16 }}>TARGET VS ACTUAL — COMPANY LEVEL</p>
        <div className="skeleton" style={{ height: 80, borderRadius: 8 }} />
      </motion.div>
    )
  }

  if (!data || (!data.company && !data.branches)) return null

  const year = String(selectedYears[0])
  const co = data.company?.[year]
  const branches = data.branches?.[year] || []
  const hasTarget = co?.target > 0 || branches.some((b) => b.target > 0)

  if (!hasTarget) {
    return (
      <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }} style={{ marginTop: 20, padding: '20px 24px' }}>
        <p className="section-label" style={{ marginBottom: 8 }}>TARGET VS ACTUAL</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
          No target data found for {year}. Upload a target file in Data Management to enable this widget.
        </p>
      </motion.div>
    )
  }

  return (
    <>
      {/* Company level */}
      {co && (
        <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }} style={{ marginTop: 20, padding: '20px 24px' }}>
          <p className="section-label" style={{ marginBottom: 16 }}>TARGET VS ACTUAL — COMPANY LEVEL</p>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 32, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.03em', lineHeight: 1 }}>
                <AnimatedAmt value={co.actual} />
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 6 }}>
                Target: {formatCurrency(co.target, true)}
              </p>
              <ProgressBar pct={co.achievement_pct} />
            </div>
            {co.achievement_pct !== null && (
              <div
                style={{
                  padding: '10px 20px',
                  borderRadius: 24,
                  background: `${achievementColor(co.achievement_pct)}18`,
                  border: `1px solid ${achievementColor(co.achievement_pct)}40`,
                  textAlign: 'center',
                  flexShrink: 0,
                }}
              >
                <p style={{ fontSize: 26, fontWeight: 800, color: achievementColor(co.achievement_pct), lineHeight: 1 }}>
                  {co.achievement_pct.toFixed(1)}%
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, fontWeight: 600 }}>Achieved</p>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Branch grid */}
      {branches.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.42 }} style={{ marginTop: 20 }}>
          <p className="section-label" style={{ marginBottom: 12 }}>TARGET VS ACTUAL — BRANCH LEVEL</p>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: 12,
            }}
          >
            {branches.map((b, i) => (
              <motion.div
                key={b.branch}
                className="card"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.44 + i * 0.04 }}
                style={{ padding: '14px 16px' }}
              >
                <p className="section-label" style={{ marginBottom: 8, fontSize: 10 }}>{b.branch}</p>
                <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>
                  <AnimatedAmt value={b.actual} />
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                  Target: {formatCurrency(b.target, true)}
                </p>
                <ProgressBar pct={b.achievement_pct} />
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                  {b.achievement_pct !== null && (
                    <span style={{ fontSize: 12, fontWeight: 700, color: achievementColor(b.achievement_pct) }}>
                      {b.achievement_pct.toFixed(1)}%
                    </span>
                  )}
                  {b.gap !== undefined && (
                    <span style={{ fontSize: 11, color: b.gap >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 500 }}>
                      {b.gap >= 0 ? `₹${formatCurrency(b.gap, true).replace('₹', '')} ahead` : `₹${formatCurrency(Math.abs(b.gap), true).replace('₹', '')} behind`}
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </>
  )
}

export default function Dashboard() {
  const selectedYears = useAppStore((s) => s.selectedYears)
  const { data, loading, error, refetch } = useSummary()

  return (
    <div
      style={{
        position: 'relative',
        padding: 24,
        minHeight: 'calc(100svh - 56px)',
        overflow: 'hidden',
      }}
    >
      <Suspense fallback={null}>
        <ThreeBackground />
      </Suspense>

      <div style={{ position: 'relative', zIndex: 1 }}>
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
            Sales Overview
          </h2>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            Net sales across all branches · Returns deducted
          </p>
        </motion.div>

        <SummaryCards
          data={data}
          loading={loading}
          error={error}
          refetch={refetch}
          selectedYears={selectedYears}
        />

        <TargetSection />

        {/* Year comparison grid */}
        {selectedYears.length > 1 && data && (
          <motion.div
            className="card"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.35 }}
            style={{ marginTop: 20, padding: '20px 24px' }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 16 }}>
              Year Comparison — Same Period
            </h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 12,
              }}
            >
              {selectedYears.map((yr) => {
                const yrData = data.years?.[String(yr)]
                return (
                  <div
                    key={yr}
                    style={{
                      borderRadius: 10,
                      padding: '14px 12px',
                      textAlign: 'center',
                      background: 'var(--bg-card-hover)',
                      border: '1px solid var(--border)',
                    }}
                  >
                    <p className="section-label" style={{ marginBottom: 6 }}>{yr}</p>
                    <p
                      className="tabular-nums"
                      style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}
                    >
                      {yrData ? formatCurrency(yrData.total_sales, true) : '—'}
                    </p>
                    <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {yrData ? `${yrData.total_qty?.toLocaleString('en-IN')} units` : ''}
                    </p>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
