import { useState, useEffect, useCallback } from 'react'
import { footfallAPI } from '../services/api'
import useAppStore from '../store/useAppStore'

export function useFootfallSummary() {
  const { selectedYears } = useAppStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await footfallAPI.getSummary({ years: selectedYears.join(',') })
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load footfall summary')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selectedYears])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useFootfallMonthlyTrend() {
  const { selectedYears } = useAppStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await footfallAPI.getMonthlyTrend({ years: selectedYears.join(',') })
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load monthly trend')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selectedYears])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useFootfallDaily(year, month, branch) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { year }
      if (month) params.month = month
      if (branch) params.branch = branch
      const res = await footfallAPI.getDaily(params)
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load daily footfall')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [year, month, branch])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useFootfallConversion() {
  const { selectedYears } = useAppStore()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await footfallAPI.getConversion({ years: selectedYears.join(',') })
      setData(res.success ? res.data : null)
      if (!res.success) setError(res.error || 'Failed to load conversion data')
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [selectedYears])

  useEffect(() => { fetch() }, [fetch])
  return { data, loading, error, refetch: fetch }
}

export function useFootfallBranches() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    footfallAPI.getBranches()
      .then((res) => {
        if (res.success) setBranches(res.data.branches || [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return { branches, loading }
}
