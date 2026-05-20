import { useState, useEffect, useCallback } from 'react'
import { salesAPI } from '../services/api'
import useAppStore from '../store/useAppStore'

function buildParams(period, selectedYears, extra = {}) {
  return {
    period,
    years: selectedYears.join(','),
    ...extra,
  }
}

export function useSummary() {
  const { period, selectedYears } = useAppStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await salesAPI.getSummary(buildParams(period, selectedYears))
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load summary')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [period, selectedYears])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useBrands() {
  const { period, selectedYears, metric } = useAppStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await salesAPI.getBrands(buildParams(period, selectedYears, { metric }))
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load brands')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [period, selectedYears, metric])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useSalesmenCompany() {
  const { period, selectedYears } = useAppStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await salesAPI.getSalesmenCompany(buildParams(period, selectedYears))
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load salesmen data')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [period, selectedYears])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useSalesmenBranch(branch) {
  const { period, selectedYears } = useAppStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    if (!branch) return
    setLoading(true)
    setError(null)
    try {
      const res = await salesAPI.getSalesmenBranch(buildParams(period, selectedYears, { branch }))
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load branch salesmen')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [period, selectedYears, branch])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useDesigns() {
  const { period, selectedYears, metric } = useAppStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await salesAPI.getDesigns(buildParams(period, selectedYears, { metric }))
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load designs')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [period, selectedYears, metric])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useDepartments() {
  const { period, selectedYears, metric } = useAppStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await salesAPI.getDepartments(buildParams(period, selectedYears, { metric }))
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load departments')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [period, selectedYears, metric])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useBranches() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    salesAPI.getBranches()
      .then((res) => {
        if (res.success) setBranches(res.data.branches || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { branches, loading }
}

export function useTargetVsActual() {
  const { period, selectedYears } = useAppStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await salesAPI.getTargetVsActual(buildParams(period, selectedYears))
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load target data')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [period, selectedYears])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}
