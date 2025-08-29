import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface DashboardStore {
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  
  // Dashboard preferences
  refreshInterval: number
  setRefreshInterval: (interval: number) => void
  
  // Filters
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
  setDateRange: (range: { from: Date | undefined; to: Date | undefined }) => void
  
  // View preferences
  viewMode: 'table' | 'grid' | 'chart'
  setViewMode: (mode: 'table' | 'grid' | 'chart') => void
}

export const useDashboardStore = create<DashboardStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      
      refreshInterval: 30000, // 30 seconds
      setRefreshInterval: (interval) => set({ refreshInterval: interval }),
      
      dateRange: {
        from: new Date(new Date().setDate(new Date().getDate() - 7)),
        to: new Date()
      },
      setDateRange: (range) => set({ dateRange: range }),
      
      viewMode: 'table',
      setViewMode: (mode) => set({ viewMode: mode })
    }),
    {
      name: 'dashboard-storage',
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        refreshInterval: state.refreshInterval,
        viewMode: state.viewMode
      })
    }
  )
)