import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, LabelList,
} from 'recharts'
import { Users, TrendingUp, Calendar, MapPin, RefreshCw } from 'lucide-react'
import StatCard from '../components/widgets/StatCard'
import { StatCardSkeleton } from '../components/ui/SkeletonLoader'
import { footfallAPI, salesAPI } from '../services/api'
import { formatCurrency, formatNumber } from '../utils/formatters'
import { BRANCHES } from '../utils/constants'

const CYAN = '#22D3EE'
const CYAN_DIM = 'rgba(34,211,238,0.35)'
const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pill(label, active, onClick) {
  return (
    <button
      key={label}
      onClick={onClick}
      style={{
        padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s ease',
        border: active ? 'none' : '1px solid var(--border)',
        background: active ? CYAN : 'transparent',
        color: active ? '#fff' : 'var(--text-secondary)',
      }}
    >
      {label}
    </button>
  )
}

function SectionLabel({ children, style }) {
  return (
    <p style={{
      fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
      color: 'var(--text-muted)', marginBottom: 16, ...style,
    }}>
      {children}
    </p>
  )
}

function EmptyMsg({ msg = 'No data for selected filters.' }) {
  return (
    <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      {msg}
    </div>
  )
}

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-surface)', border: '1px solid var(--border)',
      borderRadius: 8, padding: '10px 14px', fontSize: 12,
    }}>
      <p style={{ fontWeight: 600, marginBottom: 4, color: 'var(--text-primary)' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color || CYAN }}>
          {p.name}: {formatNumber(p.value)}
        </p>
      ))}
    </div>
  )
}

// ─── Controls ────────────────────────────────────────────────────────────────

function Controls({ period, setPeriod, years, setYears, branch, setBranch }) {
  const compareOptions = [CURRENT_YEAR - 1, CURRENT_YEAR - 2, CURRENT_YEAR - 3]
    .filter((y) => !years.includes(y))

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      flexWrap: 'wrap', marginBottom: 24,
    }}>
      {/* Period toggle */}
      <div style={{
        display: 'flex', gap: 4, padding: 3,
        background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 22,
      }}>
        {pill('YTD', period === 'ytd', () => setPeriod('ytd'))}
        {pill('MTD', period === 'mtd', () => setPeriod('mtd'))}
      </div>

      {/* Year chips */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {years.map((y) => (
          <div key={y} style={{
            display: 'flex', alignItems: 'center', gap: 4,
            padding: '4px 10px', borderRadius: 16,
            background: y === years[0] ? `${CYAN}18` : 'var(--bg-card-hover)',
            border: `1px solid ${y === years[0] ? CYAN + '55' : 'var(--border)'}`,
            fontSize: 12, fontWeight: 600,
            color: y === years[0] ? CYAN : 'var(--text-secondary)',
          }}>
            {y}
            {y !== years[0] && (
              <button
                onClick={() => setYears(years.filter((x) => x !== y))}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--text-muted)', fontSize: 12, padding: 0, lineHeight: 1,
                }}
              >×</button>
            )}
          </div>
        ))}
        {compareOptions.length > 0 && (
          <select
            value=""
            onChange={(e) => { if (e.target.value) setYears([...years, Number(e.target.value)]) }}
            style={{
              padding: '4px 8px', borderRadius: 8, fontSize: 12,
              border: '1px solid var(--border)', background: 'var(--bg-card)',
              color: 'var(--text-muted)', cursor: 'pointer',
            }}
          >
            <option value="">+ Compare</option>
            {compareOptions.map((y) => <option key={y} value={y}>+{y}</option>)}
          </select>
        )}
      </div>

      {/* Branch filter */}
      <select
        value={branch}
        onChange={(e) => setBranch(e.target.value)}
        style={{
          padding: '5px 10px', borderRadius: 8, fontSize: 12,
          border: '1px solid var(--border)', background: 'var(--bg-card)',
          color: 'var(--text-secondary)', cursor: 'pointer',
        }}
      >
        <option value="all">All Branches</option>
        {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
    </div>
  )
}

// ─── Section 1: Summary Cards ─────────────────────────────────────────────

function SummarySection({ ffData, salesData, loading, years, period }) {
  if (loading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        {[...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)}
      </div>
    )
  }

  const yr = String(years[0])
  const ff = ffData?.years?.[yr]
  const sales = salesData?.years?.[yr]

  const totalFF = ff?.total || 0
  const totalSales = sales?.total_sales || 0
  const avgPerVisitor = totalFF > 0 ? Math.round(totalSales / totalFF) : 0
  const avgDaily = ff?.avg_daily || 0
  const topBranch = ff?.top_branch

  const prevYr = years[1] ? String(years[1]) : null
  const prevFF = prevYr ? (ffData?.years?.[prevYr]?.total || 0) : null
  const ffGrowth = prevFF ? ((totalFF - prevFF) / Math.abs(prevFF)) * 100 : undefined

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
      {[
        {
          title: 'TOTAL FOOTFALL',
          value: totalFF,
          subtitle: period === 'mtd' ? 'This month' : 'Financial YTD',
          growth: ffGrowth,
          accentColor: CYAN,
        },
        {
          title: 'BEST BRANCH',
          value: topBranch?.footfall || 0,
          subtitle: topBranch?.name || '—',
          accentColor: 'var(--accent)',
        },
        {
          title: 'AVG SALE PER VISITOR',
          value: avgPerVisitor,
          prefix: '₹',
          subtitle: totalSales ? `Total sales: ${formatCurrency(totalSales, true)}` : 'No sales data',
          accentColor: 'var(--success)',
          isFloat: true,
        },
        {
          title: 'AVG DAILY FOOTFALL',
          value: avgDaily,
          subtitle: 'Visitors per day',
          accentColor: 'var(--warning)',
          isFloat: true,
        },
      ].map((card, i) => (
        <motion.div key={card.title} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}>
          <StatCard {...card} />
        </motion.div>
      ))}
    </div>
  )
}

// ─── Section 2: Branch Bar Chart ──────────────────────────────────────────

function BranchSection({ ffData, loading, years }) {
  if (loading) return <div className="card skeleton" style={{ height: 260, borderRadius: 12, marginBottom: 20 }} />

  const yr = String(years[0])
  const byBranch = ffData?.years?.[yr]?.by_branch || []
  if (!byBranch.length) return null

  const prevYr = years[1] ? String(years[1]) : null
  const prevMap = {}
  if (prevYr) {
    ;(ffData?.years?.[prevYr]?.by_branch || []).forEach((r) => { prevMap[r.branch] = r.footfall })
  }

  const chartData = byBranch.map((r) => ({
    branch: r.branch.replace('RYST-', ''),
    footfall: r.footfall,
    prev: prevMap[r.branch] || 0,
    change: prevMap[r.branch] ? Math.round(((r.footfall - prevMap[r.branch]) / prevMap[r.branch]) * 100) : null,
  }))

  return (
    <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
      style={{ padding: '20px 24px', marginBottom: 20 }}>
      <SectionLabel>BRANCH WISE FOOTFALL</SectionLabel>
      <ResponsiveContainer width="100%" height={Math.max(160, byBranch.length * 42)}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 0, right: 60, bottom: 0, left: 60 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
          <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
            tickFormatter={(v) => formatNumber(v, true)} />
          <YAxis type="category" dataKey="branch" tick={{ fontSize: 12, fill: 'var(--text-secondary)' }}
            axisLine={false} tickLine={false} width={58} />
          <Tooltip content={<ChartTooltip />} />
          {prevYr && (
            <Bar dataKey="prev" name={String(years[1])} fill={CYAN_DIM} radius={[0, 3, 3, 0]} barSize={10} />
          )}
          <Bar dataKey="footfall" name={String(years[0])} fill={CYAN} radius={[0, 4, 4, 0]} barSize={prevYr ? 10 : 18}>
            <LabelList dataKey="footfall" position="right" formatter={(v) => formatNumber(v, true)}
              style={{ fontSize: 11, fill: 'var(--text-muted)' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// ─── Section 3: Monthly Trend ────────────────────────────────────────────

function MonthlyTrendSection({ trendData, loading, years }) {
  if (loading) return <div className="card skeleton" style={{ height: 240, borderRadius: 12, marginBottom: 20 }} />

  const yr0 = String(years[0])
  const rows0 = trendData?.years?.[yr0] || []
  if (!rows0.length) return null

  const FY_ORDER = [4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2, 3]
  const allMonths = [...new Set(
    Object.values(trendData?.years || {}).flatMap((arr) => arr.map((r) => r.month_num))
  )].sort((a, b) => FY_ORDER.indexOf(a) - FY_ORDER.indexOf(b))

  const byYearMap = {}
  years.forEach((y) => {
    byYearMap[String(y)] = {}
    ;(trendData?.years?.[String(y)] || []).forEach((r) => { byYearMap[String(y)][r.month_num] = r })
  })

  const chartData = allMonths.map((mn) => {
    const row = { month_num: mn, month: byYearMap[yr0][mn]?.month || String(mn) }
    years.forEach((y) => {
      row[String(y)] = byYearMap[String(y)][mn]?.footfall || 0
    })
    return row
  })

  const colors = [CYAN, 'var(--text-muted)']

  return (
    <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}
      style={{ padding: '20px 24px', marginBottom: 20 }}>
      <SectionLabel>MONTHLY FOOTFALL TREND</SectionLabel>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
          <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
            tickFormatter={(v) => formatNumber(v, true)} width={44} />
          <Tooltip content={<ChartTooltip />} />
          {years.map((y, i) => (
            <Line key={y} type="monotone" dataKey={String(y)} name={String(y)}
              stroke={colors[i] || CYAN_DIM} strokeWidth={i === 0 ? 2.5 : 1.5}
              strokeDasharray={i === 0 ? undefined : '4 3'}
              dot={i === 0 ? { fill: CYAN, r: 3 } : false}
              activeDot={{ r: 5 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  )
}

// ─── Section 4: Daily Detail ─────────────────────────────────────────────

function DailySection({ availableMonths, years }) {
  const [monthNum, setMonthNum] = useState(CURRENT_MONTH)
  const [dailyYear, setDailyYear] = useState(years[0])
  const [dailyBranch, setDailyBranch] = useState('all')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await footfallAPI.getDaily({ year: dailyYear, month_num: monthNum, branch: dailyBranch })
      if (res.success) setData(res.data)
    } catch {}
    finally { setLoading(false) }
  }, [dailyYear, monthNum, dailyBranch])

  useEffect(() => { load() }, [load])

  const WEEKENDS = ['Sat', 'Sun']
  const days = data?.days || []

  return (
    <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.36 }}
      style={{ marginBottom: 20, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
        <SectionLabel style={{ marginBottom: 0 }}>DAILY FOOTFALL DETAIL</SectionLabel>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select value={monthNum} onChange={(e) => setMonthNum(Number(e.target.value))}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
            {availableMonths.map((m) => (
              <option key={`${m.year}-${m.month_num}`} value={m.month_num}>{m.label}</option>
            ))}
            {!availableMonths.length && <option value={monthNum}>Month {monthNum}</option>}
          </select>
          {years.length > 1 && (
            <select value={dailyYear} onChange={(e) => setDailyYear(Number(e.target.value))}
              style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          )}
          <select value={dailyBranch} onChange={(e) => setDailyBranch(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 12, cursor: 'pointer' }}>
            <option value="all">All Branches</option>
            {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <button onClick={load} style={{ padding: 5, borderRadius: 6, border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="skeleton" style={{ height: 200, margin: 16, borderRadius: 8 }} />
      ) : days.length === 0 ? (
        <EmptyMsg />
      ) : (
        <>
          {/* Bar chart */}
          <div style={{ padding: '16px 20px 0' }}>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={days} margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false}
                  tickFormatter={(v) => formatNumber(v, true)} width={36} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="footfall" name="footfall" radius={[2, 2, 0, 0]}>
                  {days.map((d, i) => (
                    <Cell key={i} fill={WEEKENDS.includes(d.weekday) ? 'rgba(34,211,238,0.45)' : CYAN} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--bg-card-hover)' }}>
                  {['Day', 'Date', 'Weekday', 'Footfall'].map((h) => (
                    <th key={h} style={{
                      padding: '8px 14px', textAlign: h === 'Footfall' ? 'right' : 'left',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                      color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map((d) => (
                  <tr key={d.day} style={{
                    borderBottom: '1px solid var(--border)',
                    background: WEEKENDS.includes(d.weekday) ? 'rgba(34,211,238,0.04)' : 'transparent',
                  }}>
                    <td style={{ padding: '7px 14px', color: 'var(--text-muted)', fontSize: 12 }}>{d.day}</td>
                    <td style={{ padding: '7px 14px', color: 'var(--text-secondary)', fontSize: 12 }}>{d.date || '—'}</td>
                    <td style={{ padding: '7px 14px', color: WEEKENDS.includes(d.weekday) ? CYAN : 'var(--text-muted)', fontSize: 12 }}>{d.weekday || '—'}</td>
                    <td style={{ padding: '7px 14px', textAlign: 'right', fontWeight: d.footfall > 0 ? 600 : 400, color: d.footfall > 0 ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {d.footfall > 0 ? formatNumber(d.footfall) : '—'}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg-card-hover)', fontWeight: 700 }}>
                  <td colSpan={3} style={{ padding: '8px 14px', fontSize: 12, color: 'var(--text-secondary)' }}>TOTAL</td>
                  <td style={{ padding: '8px 14px', textAlign: 'right', fontSize: 13, color: CYAN }}>{formatNumber(data?.total || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </>
      )}
    </motion.div>
  )
}

// ─── Section 5: Conversion Table ─────────────────────────────────────────

function ConversionSection({ convData, loading, years }) {
  if (loading) return <div className="card skeleton" style={{ height: 200, borderRadius: 12, marginBottom: 20 }} />

  const yr = String(years[0])
  const rows = convData?.years?.[yr] || []
  if (!rows.length) return null

  function convColor(pct) {
    if (pct >= 20) return 'var(--success)'
    if (pct >= 10) return 'var(--warning)'
    return 'var(--danger)'
  }

  return (
    <motion.div className="card" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.44 }}
      style={{ marginBottom: 20, overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <SectionLabel style={{ marginBottom: 0 }}>FOOTFALL TO SALES CONVERSION</SectionLabel>
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--bg-card-hover)' }}>
              {['Branch', 'Footfall', 'Transactions', 'Conversion %'].map((h) => (
                <th key={h} style={{
                  padding: '10px 16px', textAlign: h === 'Branch' ? 'left' : 'right',
                  fontSize: 10, fontWeight: 700, letterSpacing: '0.06em',
                  color: 'var(--text-muted)', borderBottom: '1px solid var(--border)',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <motion.tr key={row.branch}
                initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.04 }}
                style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px 16px', fontWeight: 600, color: 'var(--text-primary)' }}>{row.branch}</td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {formatNumber(row.footfall)}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right', color: 'var(--text-secondary)' }}>
                  {formatNumber(row.transactions)}
                </td>
                <td style={{ padding: '10px 16px', textAlign: 'right' }}>
                  <span style={{ fontWeight: 700, color: convColor(row.conversion_pct) }}>
                    {row.conversion_pct?.toFixed(1)}%
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function Footfall() {
  const [period, setPeriod] = useState('ytd')
  const [years, setYears] = useState([CURRENT_YEAR])
  const [branch, setBranch] = useState('all')

  const [ffData, setFfData] = useState(null)
  const [trendData, setTrendData] = useState(null)
  const [convData, setConvData] = useState(null)
  const [salesData, setSalesData] = useState(null)
  const [availableMonths, setAvailableMonths] = useState([])
  const [loading, setLoading] = useState(true)

  const yearsParam = years.join(',')

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [ffRes, trendRes, convRes, salesRes, monthsRes] = await Promise.allSettled([
        footfallAPI.getSummary({ period, years: yearsParam }),
        footfallAPI.getMonthlyTrend({ years: yearsParam }),
        footfallAPI.getConversion({ period, years: yearsParam }),
        salesAPI.getSummary({ period, years: yearsParam }),
        footfallAPI.getAvailableMonths(),
      ])

      if (ffRes.status === 'fulfilled' && ffRes.value?.success) setFfData(ffRes.value.data)
      if (trendRes.status === 'fulfilled' && trendRes.value?.success) setTrendData(trendRes.value.data)
      if (convRes.status === 'fulfilled' && convRes.value?.success) setConvData(convRes.value.data)
      if (salesRes.status === 'fulfilled' && salesRes.value?.success) setSalesData(salesRes.value.data)
      if (monthsRes.status === 'fulfilled' && monthsRes.value?.success) setAvailableMonths(monthsRes.value.data.months || [])
    } catch {}
    finally { setLoading(false) }
  }, [period, yearsParam])

  useEffect(() => { loadData() }, [loadData])

  return (
    <div style={{ padding: 24, width: '100%' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
        style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: 4 }}>
          Footfall Analytics
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
          Visitor traffic and sales conversion across branches
        </p>
      </motion.div>

      <Controls
        period={period} setPeriod={setPeriod}
        years={years} setYears={setYears}
        branch={branch} setBranch={setBranch}
      />

      <SummarySection ffData={ffData} salesData={salesData} loading={loading} years={years} period={period} />
      <BranchSection ffData={ffData} loading={loading} years={years} />
      <MonthlyTrendSection trendData={trendData} loading={loading} years={years} />
      <DailySection availableMonths={availableMonths} years={years} />
      <ConversionSection convData={convData} loading={loading} years={years} />
    </div>
  )
}
