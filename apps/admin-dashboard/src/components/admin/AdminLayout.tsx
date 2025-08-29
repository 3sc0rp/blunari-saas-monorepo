import { SidebarProvider } from "@/components/ui/sidebar"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { AdminHeader } from "@/components/admin/AdminHeader"
import { useDashboardStore } from "@/stores/dashboardStore"
import { Outlet } from "react-router-dom"

interface AdminLayoutProps {
  children?: React.ReactNode
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { sidebarOpen } = useDashboardStore()

  return (
    <SidebarProvider defaultOpen={sidebarOpen}>
      <div className="flex min-h-screen w-full bg-gradient-subtle">
        <AdminSidebar />
        
        <div className="flex flex-1 flex-col overflow-hidden">
          <AdminHeader />
          
          <main className="flex-1 overflow-auto bg-background/50 backdrop-blur-sm">
            <div className="container mx-auto p-6 space-y-6">
              {children || <Outlet />}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}