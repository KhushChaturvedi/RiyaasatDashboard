import useAppStore from '../../store/useAppStore'

export default function PeriodToggle({ id }) {
  const period = useAppStore((s) => s.period)
  const setPeriod = useAppStore((s) => s.setPeriod)

  return (
    <div
      id={id}
      style={{
        display: 'inline-flex',
        background: 'var(--bg-base)',
        borderRadius: 8,
        padding: 3,
        gap: 2,
      }}
    >
      {['mtd', 'ytd'].map((p) => (
        <button
          key={p}
          onClick={() => setPeriod(p)}
          style={{
            width: 72,
            height: 30,
            borderRadius: 6,
            border: 'none',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s ease',
            background: period === p ? 'var(--accent)' : 'transparent',
            color: period === p ? '#fff' : 'var(--text-secondary)',
          }}
        >
          {p.toUpperCase()}
        </button>
      ))}
    </div>
  )
}
