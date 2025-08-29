import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { UserSession, ActivityLog } from '@/types/profile';
import { 
  Monitor, 
  Smartphone, 
  Tablet, 
  MapPin, 
  Clock, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Eye,
  Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatDistanceToNow } from 'date-fns';

interface SessionsTabProps {
  sessions: UserSession[];
  activityLogs: ActivityLog[];
  onTerminateSession: (sessionId: string) => void;
}

export function SessionsTab({ sessions, activityLogs, onTerminateSession }: SessionsTabProps) {
  const [terminatingSession, setTerminatingSession] = useState<string | null>(null);
  const { toast } = useToast();

  const handleTerminateSession = async (sessionId: string) => {
    setTerminatingSession(sessionId);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      onTerminateSession(sessionId);
      toast({
        title: "Session Terminated",
        description: "The session has been successfully terminated.",
      });
    } catch (error) {
      toast({
        title: "Termination Failed",
        description: "Failed to terminate the session.",
        variant: "destructive"
      });
    } finally {
      setTerminatingSession(null);
    }
  };

  const getDeviceIcon = (deviceType: string) => {
    switch (deviceType) {
      case 'desktop':
        return <Monitor className="h-5 w-5" />;
      case 'mobile':
        return <Smartphone className="h-5 w-5" />;
      case 'tablet':
        return <Tablet className="h-5 w-5" />;
      default:
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getActivityIcon = (actionType: ActivityLog['actionType']) => {
    switch (actionType) {
      case 'authentication':
        return <Shield className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4 text-orange-500" />;
      case 'profile':
        return <Eye className="h-4 w-4 text-blue-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getActivityColor = (success: boolean, actionType: string) => {
    if (!success) return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
    switch (actionType) {
      case 'authentication':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'security':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'profile':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const activeSessions = sessions.filter(s => s.isActive);
  const recentActivity = activityLogs.slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Current Sessions */}
      <Card>
        <CardHeader>
          <CardTitle>Active Sessions</CardTitle>
          <CardDescription>
            Manage your active login sessions across different devices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activeSessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="text-muted-foreground">
                    {getDeviceIcon(session.deviceInfo.device.toLowerCase())}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{session.deviceInfo.device}</h4>
                      {session.isCurrent && (
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                          Current Session
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {session.deviceInfo.browser} • {session.deviceInfo.os}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {session.location.city}, {session.location.region}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last active {formatDistanceToNow(new Date(session.lastActiveAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      IP: {session.location.ip}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!session.isCurrent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTerminateSession(session.id)}
                      disabled={terminatingSession === session.id}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {terminatingSession === session.id ? 'Terminating...' : 'Terminate'}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {activeSessions.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No active sessions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>Security Tip:</strong> If you see any unfamiliar sessions or locations, 
          terminate them immediately and change your password. You can also enable two-factor 
          authentication for additional security.
        </AlertDescription>
      </Alert>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Activity History</CardTitle>
          <CardDescription>
            Your recent account activity and login history
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="mt-1">
                  {activity.success ? (
                    getActivityIcon(activity.actionType)
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{activity.description}</p>
                    <Badge className={getActivityColor(activity.success, activity.actionType)}>
                      {activity.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        IP: {activity.ipAddress}
                      </span>
                    </div>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div>
                        {activity.metadata.location && (
                          <span>Location: {activity.metadata.location}</span>
                        )}
                        {activity.metadata.method && (
                          <span> • Method: {activity.metadata.method}</span>
                        )}
                        {activity.metadata.deviceTrusted !== undefined && (
                          <span> • Device: {activity.metadata.deviceTrusted ? 'Trusted' : 'Untrusted'}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {recentActivity.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No recent activity found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Session Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Session Statistics</CardTitle>
          <CardDescription>
            Overview of your session activity and security metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{activeSessions.length}</div>
              <p className="text-sm text-muted-foreground">Active Sessions</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {recentActivity.filter(a => a.actionType === 'authentication' && a.success).length}
              </div>
              <p className="text-sm text-muted-foreground">Successful Logins</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-red-600">
                {recentActivity.filter(a => a.actionType === 'authentication' && !a.success).length}
              </div>
              <p className="text-sm text-muted-foreground">Failed Attempts</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {new Set(recentActivity.map(a => a.ipAddress)).size}
              </div>
              <p className="text-sm text-muted-foreground">Unique IPs</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}