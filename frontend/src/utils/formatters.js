export function formatCurrency(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return '₹0'
  const num = Number(value)
  if (compact) {
    if (Math.abs(num) >= 10000000) return `₹${(num / 10000000).toFixed(1)}Cr`
    if (Math.abs(num) >= 100000) return `₹${(num / 100000).toFixed(1)}L`
    if (Math.abs(num) >= 1000) return `₹${(num / 1000).toFixed(1)}K`
  }
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num)
}

export function formatNumber(value, compact = false) {
  if (value === null || value === undefined || isNaN(value)) return '0'
  const num = Number(value)
  if (compact) {
    if (Math.abs(num) >= 10000000) return `${(num / 10000000).toFixed(1)}Cr`
    if (Math.abs(num) >= 100000) return `${(num / 100000).toFixed(1)}L`
    if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(1)}K`
  }
  return new Intl.NumberFormat('en-IN').format(Math.round(num))
}

export function formatGrowth(pct) {
  if (pct === null || pct === undefined) return null
  const rounded = Math.round(Number(pct) * 10) / 10
  return rounded > 0 ? `+${rounded}%` : `${rounded}%`
}

export function growthColor(pct) {
  if (pct === null || pct === undefined) return 'var(--text-muted)'
  return Number(pct) >= 0 ? 'var(--success)' : 'var(--danger)'
}

export function formatFileSize(bytes) {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}
