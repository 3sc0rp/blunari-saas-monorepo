import React, { Suspense } from 'react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2 } from 'lucide-react'

// Lazy load the main component
const WidgetVersionManagementComponent = React.lazy(() => import('./WidgetVersionManagement'))

interface WidgetVersionManagementLazyProps {
  widgetId: string
  className?: string
}

const WidgetVersionManagementLazy: React.FC<WidgetVersionManagementLazyProps> = (props) => {
  return (
    <Suspense
      fallback={
        <Alert className="flex items-center space-x-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          <AlertDescription>
            Loading version management...
          </AlertDescription>
        </Alert>
      }
    >
      <WidgetVersionManagementComponent {...props} />
    </Suspense>
  )
}

export default WidgetVersionManagementLazy