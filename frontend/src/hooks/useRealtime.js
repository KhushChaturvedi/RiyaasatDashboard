import { useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import useAppStore from '../store/useAppStore'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
)

export function useRealtime(onSalesChange, onUploadChange) {
  const setSyncStatus = useAppStore((s) => s.setSyncStatus)
  const setLastDataRefresh = useAppStore((s) => s.setLastDataRefresh)

  useEffect(() => {
    setSyncStatus('syncing')

    const channel = supabase
      .channel('riyaasat-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'sales_data' },
        (payload) => {
          setSyncStatus('syncing')
          setLastDataRefresh(new Date().toISOString())
          if (onSalesChange) onSalesChange(payload)
          setTimeout(() => setSyncStatus('synced'), 1000)
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'upload_log' },
        (payload) => {
          if (onUploadChange) onUploadChange(payload)
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') setSyncStatus('synced')
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') setSyncStatus('error')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
