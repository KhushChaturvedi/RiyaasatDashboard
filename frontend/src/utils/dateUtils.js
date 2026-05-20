export function getCurrentYear() {
  return new Date().getFullYear()
}

export function getDefaultYears() {
  return [getCurrentYear()]
}

export function getComparisonYears(count) {
  const current = getCurrentYear()
  const years = [current]
  for (let i = 1; i <= count; i++) {
    years.push(current - i)
  }
  return years
}

export function formatDateDisplay(isoStr) {
  if (!isoStr) return '—'
  try {
    return new Date(isoStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return isoStr
  }
}

export function formatDateTimeDisplay(isoStr) {
  if (!isoStr) return '—'
  try {
    return new Date(isoStr).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return isoStr
  }
}

export function getPeriodLabel(period) {
  return period === 'mtd' ? 'Month to Date' : 'Year to Date'
}

export function getCurrentFinancialYear() {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  if (month >= 4) {
    return `${year}-${String(year + 1).slice(-2)}`
  }
  return `${year - 1}-${String(year).slice(-2)}`
}
