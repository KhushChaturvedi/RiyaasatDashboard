import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import gsap from 'gsap'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

function AnimatedNumber({ target, prefix = '', suffix = '', isFloat = false }) {
  const ref = useRef(null)
  const tweenRef = useRef(null)

  useEffect(() => {
    if (tweenRef.current) tweenRef.current.kill()
    const obj = { val: 0 }
    tweenRef.current = gsap.to(obj, {
      val: target,
      duration: 1.5,
      ease: 'power3.out',
      onUpdate: () => {
        if (ref.current) {
          const formatted = isFloat
            ? obj.val.toLocaleString('en-IN', { maximumFractionDigits: 0 })
            : Math.round(obj.val).toLocaleString('en-IN')
          ref.current.textContent = `${prefix}${formatted}${suffix}`
        }
      },
    })
    return () => tweenRef.current?.kill()
  }, [target])

  return (
    <span ref={ref} className="tabular-nums">
      {prefix}0{suffix}
    </span>
  )
}

function TrendBadge({ pct }) {
  if (pct === null || pct === undefined) return null
  const isPos = pct > 0
  const isZero = pct === 0
  const Icon = isZero ? Minus : isPos ? TrendingUp : TrendingDown
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 12,
        fontWeight: 600,
        color: isZero ? 'var(--text-muted)' : isPos ? 'var(--success)' : 'var(--danger)',
      }}
    >
      <Icon size={12} />
      <span>{Math.abs(pct).toFixed(1)}%</span>
    </div>
  )
}

export default function StatCard({
  title,
  value,
  prefix = '',
  suffix = '',
  subtitle,
  growth,
  accentColor = 'var(--accent)',
  isFloat = false,
}) {
  return (
    <motion.div
      className="card card-hover"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        padding: '20px 24px',
        borderLeft: `3px solid ${accentColor}`,
        borderRadius: 12,
      }}
    >
      <p className="section-label" style={{ marginBottom: 12 }}>
        {title}
      </p>
      <p
        className="tabular-nums"
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: '-0.03em',
          color: 'var(--text-primary)',
          marginBottom: 10,
          lineHeight: 1,
        }}
      >
        <AnimatedNumber target={Number(value) || 0} prefix={prefix} suffix={suffix} isFloat={isFloat} />
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        {subtitle && (
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{subtitle}</span>
        )}
        {growth !== undefined && (
          <>
            {subtitle && <span style={{ color: 'var(--border)', fontSize: 12 }}>·</span>}
            <TrendBadge pct={growth} />
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>vs last year</span>
          </>
        )}
      </div>
    </motion.div>
  )
}
