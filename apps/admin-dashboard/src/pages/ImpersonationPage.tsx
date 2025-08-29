import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Shield, 
  Play, 
  Clock, 
  Users, 
  Building, 
  Search,
  AlertTriangle,
  Activity,
  BarChart3,
  FileText,
  Plus
} from 'lucide-react';

// Components
import { ImpersonationCard } from '@/components/impersonation/ImpersonationCard';
import { StartImpersonationDialog } from '@/components/impersonation/StartImpersonationDialog';
import { AuditLogViewer } from '@/components/impersonation/AuditLogViewer';
import { ImpersonationAnalytics } from '@/components/impersonation/ImpersonationAnalytics';

// Data
import { 
  mockImpersonationSessions,
  mockImpersonationAuditLogs,
  mockImpersonationAnalytics,
  mockImpersonationSettings
} from '@/data/mockImpersonationData';
import { TenantImpersonationRequest, ImpersonationSession } from '@/types/impersonation';
import { useToast } from '@/hooks/use-toast';

export default function ImpersonationPage() {
  const [sessions, setSessions] = useState(mockImpersonationSessions);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [auditLogs] = useState(mockImpersonationAuditLogs);
  const [analytics] = useState(mockImpersonationAnalytics);
  const { toast } = useToast();

  const handleStartImpersonation = (request: TenantImpersonationRequest) => {
    const newSession: ImpersonationSession = {
      id: `session-${Date.now()}`,
      impersonatorId: 'current-user',
      impersonatorName: 'Current User',
      impersonatorRole: 'SUPPORT',
      targetTenantId: request.tenantId,
      targetTenantName: 'Selected Tenant',
      reason: request.reason,
      ticketNumber: request.ticketNumber,
      startedAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + request.duration * 60 * 1000).toISOString(),
      status: 'active',
      permissions: [],
      restrictions: [],
      metadata: {
        ipAddress: '192.168.1.100',
        userAgent: navigator.userAgent,
        location: 'Current Location'
      }
    };

    setSessions(prev => [newSession, ...prev]);
  };

  const handleEndSession = (sessionId: string) => {
    setSessions(prev => prev.map(session => 
      session.id === sessionId 
        ? { ...session, status: 'terminated' as const, endedAt: new Date().toISOString() }
        : session
    ));
  };

  const handleViewDetails = (sessionId: string) => {
    toast({
      title: "Session Details",
      description: `Opening detailed view for session ${sessionId}`,
    });
  };

  const handleExportAuditLog = () => {
    toast({
      title: "Export Started",
      description: "Audit log export will be ready in a few moments.",
    });
  };

  const handleViewAuditDetails = (logId: string) => {
    toast({
      title: "Audit Details",
      description: `Opening detailed view for audit log ${logId}`,
    });
  };

  const filteredSessions = sessions.filter(session => {
    const matchesSearch = session.targetTenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.impersonatorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         session.reason.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || session.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const activeSessions = sessions.filter(s => s.status === 'active');
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const expiredSessions = sessions.filter(s => s.status === 'expired');

  return (
    <div className="flex-1 space-y-8 p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Impersonation Tool
          </h1>
          <p className="text-muted-foreground">
            Secure tenant access for troubleshooting and support
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <Badge className="bg-success/10 text-success border-success/20">
            {activeSessions.length} Active
          </Badge>
          <StartImpersonationDialog onStart={handleStartImpersonation}>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Start Session
            </Button>
          </StartImpersonationDialog>
        </div>
      </div>

      {/* Security Warning */}
      <Card className="border-warning/20 bg-warning/5 dark:border-warning/20 dark:bg-warning/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-warning">
            <AlertTriangle className="h-4 w-4" />
            Security Guidelines
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-warning">
            <ul className="space-y-1">
              <li>• Only use for legitimate support purposes</li>
              <li>• Sessions are automatically logged and audited</li>
              <li>• All actions are tracked and can be reviewed</li>
            </ul>
            <ul className="space-y-1">
              <li>• Maximum session duration: {mockImpersonationSettings.maxSessionDuration} minutes</li>
              <li>• Notify tenant owners when accessing sensitive data</li>
              <li>• Follow company security policies at all times</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Activity className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{activeSessions.length}</div>
            <p className="text-xs text-muted-foreground">Currently running</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{completedSessions.length}</div>
            <p className="text-xs text-muted-foreground">Successfully completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expired</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{expiredSessions.length}</div>
            <p className="text-xs text-muted-foreground">Timed out</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
            <p className="text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="sessions" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="sessions" className="gap-2">
            <Users className="h-4 w-4" />
            Sessions
          </TabsTrigger>
          <TabsTrigger value="audit" className="gap-2">
            <FileText className="h-4 w-4" />
            Audit Log
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sessions" className="space-y-6">
          {/* Session Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search sessions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Sessions Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredSessions.map((session) => (
              <ImpersonationCard
                key={session.id}
                session={session}
                onEnd={handleEndSession}
                onViewDetails={handleViewDetails}
              />
            ))}
          </div>

          {filteredSessions.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No sessions found matching your criteria</p>
                <StartImpersonationDialog onStart={handleStartImpersonation}>
                  <Button variant="outline">
                    <Plus className="h-4 w-4 mr-2" />
                    Start New Session
                  </Button>
                </StartImpersonationDialog>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit">
          <AuditLogViewer 
            logs={auditLogs}
            onExport={handleExportAuditLog}
            onViewDetails={handleViewAuditDetails}
          />
        </TabsContent>

        <TabsContent value="analytics">
          <ImpersonationAnalytics analytics={analytics} />
        </TabsContent>
      </Tabs>
    </div>
  );
}