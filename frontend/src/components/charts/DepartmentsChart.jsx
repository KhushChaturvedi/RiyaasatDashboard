import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { formatCurrency, formatNumber } from '../../utils/formatters'
import EmptyState from '../ui/EmptyState'
import { Layers } from 'lucide-react'

function hexToRgb(hex) {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.substring(0, 2), 16)
  const g = parseInt(clean.substring(2, 4), 16)
  const b = parseInt(clean.substring(4, 6), 16)
  return `${r},${g},${b}`
}

function CustomTooltip({ active, payload, label, metric, color }) {
  if (!active || !payload?.length) return null
  const val = payload[0]?.value
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
      <p style={{ fontVariantNumeric: 'tabular-nums', color }}>
        {metric === 'amount' ? formatCurrency(val) : formatNumber(val)}
      </p>
    </div>
  )
}

export default function DepartmentsChart({ data, metric, years, color = '#6366F1' }) {
  const primaryYear = years?.[0]
  const primaryData = data?.[String(primaryYear)] || []

  if (!primaryData.length) {
    return <EmptyState icon={Layers} title="No department data" description="No department records found." />
  }

  const rgb = hexToRgb(color)
  const chartData = primaryData.map((item) => {
    const row = {
      name: item.dept_desc?.length > 22 ? item.dept_desc.substring(0, 22) + '…' : item.dept_desc,
    }
    years?.forEach((yr) => {
      const yrData = data?.[String(yr)] || []
      const match = yrData.find((d) => d.dept_desc === item.dept_desc)
      row[String(yr)] = metric === 'amount' ? match?.amount || 0 : match?.qty || 0
    })
    return row
  })

  const total = chartData.length
  const fmt = metric === 'amount' ? (v) => formatCurrency(v, true) : (v) => formatNumber(v, true)

  return (
    <ResponsiveContainer width="100%" height={Math.max(280, total * 38)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
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
          width={140}
          tick={{ fontSize: 11, fill: 'var(--text-secondary)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip metric={metric} color={color} />} />
        <Bar
          dataKey={String(years?.[0])}
          radius={[0, 4, 4, 0]}
          isAnimationActive
          animationDuration={800}
        >
          {chartData.map((_, i) => {
            const opacity = 1 - (i / Math.max(total - 1, 1)) * 0.55
            return <Cell key={i} fill={`rgba(${rgb},${opacity})`} />
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
