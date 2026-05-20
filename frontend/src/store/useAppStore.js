import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getCurrentYear } from '../utils/dateUtils'

const useAppStore = create(
  persist(
    (set) => ({
      theme: 'light',
      setTheme: (theme) => set({ theme }),

      period: 'ytd',
      setPeriod: (period) => set({ period }),

      selectedYears: [getCurrentYear()],
      setSelectedYears: (years) => set({ selectedYears: years }),

      selectedBranch: null,
      setSelectedBranch: (branch) => set({ selectedBranch: branch }),

      metric: 'amount',
      setMetric: (metric) => set({ metric }),

      sidebarCollapsed: false,
      setSidebarCollapsed: (val) => set({ sidebarCollapsed: val }),

      syncStatus: 'synced',
      setSyncStatus: (status) => set({ syncStatus: status }),

      lastDataRefresh: null,
      setLastDataRefresh: (ts) => set({ lastDataRefresh: ts }),
    }),
    {
      name: 'riyaasat-app-store',
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
)

export default useAppStore
