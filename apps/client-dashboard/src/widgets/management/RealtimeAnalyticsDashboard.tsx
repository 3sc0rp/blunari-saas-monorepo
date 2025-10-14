import React, { useMemo, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Activity,
  Users,
  TrendingUp,
  Clock,
  Zap,
  AlertTriangle,
  RefreshCw,
  Eye,
  MousePointer,
  ShoppingCart,
  Bug
} from 'lucide-react'
import { useRealtimeAnalytics } from './useRealtimeAnalytics'
import { formatDistance } from 'date-fns'
import ErrorBoundary from './ErrorBoundary'

interface RealtimeAnalyticsDashboardProps {
  widgetId?: string
  className?: string
}

const RealtimeAnalyticsDashboard: React.FC<RealtimeAnalyticsDashboardProps> = React.memo(({
  widgetId,
  className = ''
}) => {
  const { metrics, liveSessions, isConnected, error, refresh } = useRealtimeAnalytics(widgetId)

  // Memoize event icon and color functions
  const getEventIcon = useCallback((eventType: string) => {
    switch (eventType) {
      case 'view': return <Eye className="w-4 h-4" />
      case 'interaction': return <MousePointer className="w-4 h-4" />
      case 'conversion': return <ShoppingCart className="w-4 h-4" />
      case 'error': return <Bug className="w-4 h-4" />
      case 'performance': return <Zap className="w-4 h-4" />
      default: return <Activity className="w-4 h-4" />
    }
  }, [])

  const getEventColor = useCallback((eventType: string) => {
    switch (eventType) {
      case 'view': return 'bg-blue-100 text-blue-800'
      case 'interaction': return 'bg-green-100 text-green-800'
      case 'conversion': return 'bg-purple-100 text-purple-800'
      case 'error': return 'bg-red-100 text-red-800'
      case 'performance': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }, [])

  // Memoize session duration formatter
  const formatSessionDuration = useCallback((minutes: number) => {
    if (minutes < 1) return '< 1min'
    if (minutes < 60) return `${Math.round(minutes)}min`
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return `${hours}h ${mins}min`
  }, [])

  // Memoize expensive computations
  const memoizedMetrics = useMemo(() => {
    if (!metrics) return null

    return {
      ...metrics,
      topEvents: metrics.top_events.slice(0, 5), // Limit to 5 for display
      performanceSummary: {
        ...metrics.performance_summary,
        errorRateColor: metrics.performance_summary.error_rate > 5
          ? 'text-red-600'
          : metrics.performance_summary.error_rate > 1
            ? 'text-yellow-600'
            : 'text-green-600'
      }
    }
  }, [metrics])

  const memoizedLiveSessions = useMemo(() => {
    return liveSessions.map(session => ({
      ...session,
      formattedLastActivity: formatDistance(new Date(session.last_activity), new Date(), { addSuffix: true }),
      browser: session.user_agent ? session.user_agent.split(' ')[0] : 'Unknown'
    }))
  }, [liveSessions])

  if (error) {
    return (
      <Alert className={`border-red-200 ${className}`}>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Failed to load real-time analytics: {error}
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="ml-2"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <ErrorBoundary>
      <div className={`space-y-6 ${className}`}>
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              }`}
            />
            <span className="text-sm text-gray-600">
              {isConnected ? 'Real-time connected' : 'Connection lost'}
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            className="flex items-center space-x-1"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </Button>
        </div>

        {/* Key Metrics */}
        {memoizedMetrics && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {memoizedMetrics.active_sessions}
                    </p>
                    <p className="text-sm text-gray-600">Active Sessions</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Activity className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {memoizedMetrics.events_per_minute.toFixed(1)}
                    </p>
                    <p className="text-sm text-gray-600">Events/min</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">
                      {memoizedMetrics.conversion_rate}%
                    </p>
                    <p className="text-sm text-gray-600">Conversion Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  <Clock className="w-5 h-5 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatSessionDuration(memoizedMetrics.average_session_duration)}
                    </p>
                    <p className="text-sm text-gray-600">Avg Session</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top Events */}
          {memoizedMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Activity className="w-5 h-5" />
                  <span>Top Events (Last Hour)</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {memoizedMetrics.topEvents.length > 0 ? (
                  memoizedMetrics.topEvents.map((event, index) => (
                    <div key={event.event_type} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Badge className={getEventColor(event.event_type)}>
                          {getEventIcon(event.event_type)}
                          <span className="ml-1 capitalize">{event.event_type}</span>
                        </Badge>
                        <span className="font-medium">{event.count}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {event.last_occurred && formatDistance(
                          new Date(event.last_occurred),
                          new Date(),
                          { addSuffix: true }
                        )}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No events in the last hour</p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Performance Summary */}
          {memoizedMetrics && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Zap className="w-5 h-5" />
                  <span>Performance Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Load Time</span>
                  <span className="font-medium">
                    {memoizedMetrics.performance_summary.avg_load_time}ms
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Avg Render Time</span>
                  <span className="font-medium">
                    {memoizedMetrics.performance_summary.avg_render_time}ms
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Error Rate</span>
                  <span className={`font-medium ${memoizedMetrics.performanceSummary.errorRateColor}`}>
                    {memoizedMetrics.performance_summary.error_rate}%
                  </span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live Sessions */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Live Sessions</span>
                <Badge variant="secondary">{memoizedLiveSessions.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {memoizedLiveSessions.length > 0 ? (
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {memoizedLiveSessions.map((session) => (
                    <div
                      key={session.session_id}
                      className="p-3 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={getEventColor(session.last_event_type)}>
                          {getEventIcon(session.last_event_type)}
                          <span className="ml-1 capitalize">{session.last_event_type}</span>
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {session.formattedLastActivity}
                        </span>
                      </div>
                      <div className="text-sm space-y-1">
                        <div className="truncate">
                          <span className="text-gray-600">Page: </span>
                          <span className="font-medium">{session.page_url || 'Unknown'}</span>
                        </div>
                        <div className="truncate">
                          <span className="text-gray-600">Browser: </span>
                          <span className="text-gray-800">{session.browser}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-8">No active sessions</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </ErrorBoundary>
  )
})

export default RealtimeAnalyticsDashboard