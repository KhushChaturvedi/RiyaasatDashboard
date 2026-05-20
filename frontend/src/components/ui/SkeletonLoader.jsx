function Skeleton({ style = {} }) {
  return (
    <div
      className="skeleton"
      style={style}
    />
  )
}

export function StatCardSkeleton() {
  return (
    <div className="card" style={{ padding: '20px 24px', borderLeft: '3px solid var(--border)' }}>
      <Skeleton style={{ height: 11, width: '55%', marginBottom: 14 }} />
      <Skeleton style={{ height: 32, width: '75%', marginBottom: 12 }} />
      <Skeleton style={{ height: 12, width: '40%' }} />
    </div>
  )
}

export function ChartSkeleton({ height = 300 }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <Skeleton style={{ height: 16, width: '35%', marginBottom: 20 }} />
      <Skeleton style={{ height }} />
    </div>
  )
}

export function TableSkeleton({ rows = 5 }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <Skeleton style={{ height: 16, width: '30%', marginBottom: 18 }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} style={{ height: 44 }} />
        ))}
      </div>
    </div>
  )
}

export default Skeleton
