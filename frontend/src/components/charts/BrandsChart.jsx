import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList, Cell,
} from 'recharts'
import { formatCurrency, formatNumber } from '../../utils/formatters'
import EmptyState from '../ui/EmptyState'
import { Tag } from 'lucide-react'

const GROOM_COLOR = '#6366F1'
const BRIDE_COLOR = '#EC4899'

function CustomTooltip({ active, payload, label, metric }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13,
        color: 'var(--text-primary)',
        boxShadow: 'var(--shadow-lg)',
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.fill, fontVariantNumeric: 'tabular-nums' }}>
          {metric === 'amount' ? formatCurrency(p.value) : formatNumber(p.value)}
        </p>
      ))}
    </div>
  )
}

function BrandBar({ data, metric, years, category, accentColor }) {
  const primaryYear = years[0]
  const primaryData = data?.[String(primaryYear)]?.[category.toLowerCase()] || []

  if (!primaryData.length) {
    return <EmptyState icon={Tag} title="No data" description={`No ${category} brands found.`} />
  }

  const chartData = primaryData.map((item) => {
    const row = { name: item.brand }
    years.forEach((yr) => {
      const yrData = data?.[String(yr)]?.[category.toLowerCase()] || []
      const match = yrData.find((b) => b.brand === item.brand)
      row[String(yr)] = match?.value || 0
    })
    return row
  })

  const fmt = metric === 'amount' ? (v) => formatCurrency(v, true) : (v) => formatNumber(v, true)

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 60, left: 0, bottom: 0 }}>
        <XAxis
          type="number"
          tickFormatter={fmt}
          tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip metric={metric} />} />
        {years.map((yr, i) => (
          <Bar
            key={yr}
            dataKey={String(yr)}
            fill={accentColor}
            radius={[0, 4, 4, 0]}
            isAnimationActive
            animationDuration={800}
            opacity={1 - i * 0.25}
          >
            {i === 0 && (
              <LabelList
                dataKey={String(yr)}
                position="right"
                formatter={fmt}
                style={{ fontSize: 10, fill: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  )
}

export default function BrandsChart({ data, metric, years }) {
  const sections = [
    { label: 'GROOM', cat: 'Groom', color: GROOM_COLOR, dot: '♦' },
    { label: 'BRIDE', cat: 'Bride', color: BRIDE_COLOR, dot: '♦' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
      {sections.map(({ label, cat, color, dot }) => (
        <div key={cat} className="card" style={{ padding: '20px 20px 16px' }}>
          {/* Pill badge header */}
          <div style={{ marginBottom: 20 }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '4px 12px',
                borderRadius: 20,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                background: `${color}18`,
                color,
                border: `1px solid ${color}30`,
              }}
            >
              {dot} {label} TOP {years.length > 1 ? years.length * 5 : 5}
            </span>
          </div>
          <BrandBar data={data} metric={metric} years={years} category={cat} accentColor={color} />
        </div>
      ))}
    </div>
  )
}
