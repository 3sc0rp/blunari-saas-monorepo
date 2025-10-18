import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  Users,
  Clock,
  Building,
  TrendingUp,
  Shield,
  Activity,
  AlertTriangle,
} from "lucide-react";
import type { ImpersonationAnalytics } from "@/types/impersonation";

interface ImpersonationAnalyticsProps {
  analytics: ImpersonationAnalytics;
}

export function ImpersonationAnalytics({
  analytics,
}: ImpersonationAnalyticsProps) {
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
  };

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sessions
            </CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.totalSessions}</div>
            <p className="text-xs text-muted-foreground">All time sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {analytics.activeSessions}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analytics.sessionsToday}</div>
            <p className="text-xs text-muted-foreground">
              Sessions started today
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatDuration(analytics.averageSessionDuration)}
            </div>
            <p className="text-xs text-muted-foreground">Per session</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Impersonators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Impersonators
            </CardTitle>
            <CardDescription>
              Staff members with most impersonation sessions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topImpersonators.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {user.sessionCount} sessions
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={
                      (user.sessionCount /
                        analytics.topImpersonators[0]?.sessionCount) *
                      100
                    }
                    className="w-20"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Target Tenants */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Most Accessed Tenants
            </CardTitle>
            <CardDescription>
              Tenants requiring most support access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {analytics.topTargetTenants.map((tenant, index) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{tenant.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {tenant.sessionCount} sessions
                      </div>
                    </div>
                  </div>
                  <Progress
                    value={
                      (tenant.sessionCount /
                        analytics.topTargetTenants[0]?.sessionCount) *
                      100
                    }
                    className="w-20"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Common Reasons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Most Common Reasons
          </CardTitle>
          <CardDescription>
            Primary reasons for impersonation sessions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analytics.mostCommonReasons.map((reason, index) => (
              <div
                key={reason.reason}
                className="flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="font-medium">{reason.reason}</div>
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={
                      (reason.count / analytics.mostCommonReasons[0]?.count) *
                      100
                    }
                    className="w-32"
                  />
                  <Badge
                    variant="secondary"
                    className="min-w-[3rem] justify-center"
                  >
                    {reason.count}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Weekly Trends */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Weekly Activity
          </CardTitle>
          <CardDescription>
            Session activity for the current week
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="text-3xl font-bold mb-2">
              {analytics.sessionsThisWeek}
            </div>
            <div className="text-sm text-muted-foreground mb-4">
              Sessions this week
            </div>

            <div className="flex justify-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Active: {analytics.activeSessions}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Today: {analytics.sessionsToday}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full"></div>
                <span>Total: {analytics.totalSessions}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
