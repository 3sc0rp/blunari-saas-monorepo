import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  Clock, 
  Shield, 
  User, 
  Building, 
  Play, 
  Square, 
  AlertTriangle,
  ExternalLink,
  Eye,
  Settings
} from 'lucide-react';
import { ImpersonationSession } from '@/types/impersonation';
import { useToast } from '@/hooks/use-toast';

interface ImpersonationCardProps {
  session: ImpersonationSession;
  onEnd?: (sessionId: string) => void;
  onViewDetails?: (sessionId: string) => void;
}

export function ImpersonationCard({ session, onEnd, onViewDetails }: ImpersonationCardProps) {
  const [isEnding, setIsEnding] = useState(false);
  const { toast } = useToast();

  const handleEndSession = async () => {
    setIsEnding(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
      onEnd?.(session.id);
      toast({
        title: "Session Ended",
        description: "Impersonation session has been terminated successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to end session.",
        variant: "destructive"
      });
    } finally {
      setIsEnding(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'terminated': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'ADMIN': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'SUPPORT': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400';
    }
  };

  const formatDuration = () => {
    const start = new Date(session.startedAt);
    const end = session.endedAt ? new Date(session.endedAt) : new Date();
    const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
    return `${duration}m`;
  };

  const getTimeRemaining = () => {
    if (session.status !== 'active') return null;
    const now = new Date();
    const expires = new Date(session.expiresAt);
    const remaining = Math.floor((expires.getTime() - now.getTime()) / (1000 * 60));
    return remaining > 0 ? `${remaining}m remaining` : 'Expired';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg flex items-center gap-2">
              <Building className="h-5 w-5" />
              {session.targetTenantName}
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              <User className="h-4 w-4" />
              {session.impersonatorName}
              <Badge className={getRoleColor(session.impersonatorRole)}>
                {session.impersonatorRole}
              </Badge>
            </CardDescription>
          </div>
          <Badge className={getStatusColor(session.status)}>
            {session.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Session Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>Duration: {formatDuration()}</span>
          </div>
          {session.status === 'active' && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              <span className="text-orange-600">{getTimeRemaining()}</span>
            </div>
          )}
        </div>

        {/* Reason */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-sm font-medium mb-1">Reason:</p>
          <p className="text-sm text-muted-foreground">{session.reason}</p>
          {session.ticketNumber && (
            <p className="text-xs text-muted-foreground mt-1">
              Ticket: {session.ticketNumber}
            </p>
          )}
        </div>

        {/* Permission Summary */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span>Permissions:</span>
          </div>
          <div className="flex gap-1">
            <Badge variant="outline" className="text-xs">
              {session.permissions.filter(p => p.allowed).length} allowed
            </Badge>
            <Badge variant="destructive" className="text-xs">
              {session.permissions.filter(p => !p.allowed).length} restricted
            </Badge>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails?.(session.id)}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Details
          </Button>
          
          {session.status === 'active' && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEndSession}
              disabled={isEnding}
              className="flex-1"
            >
              <Square className="h-4 w-4 mr-2" />
              {isEnding ? 'Ending...' : 'End Session'}
            </Button>
          )}
          
          {session.status === 'active' && (
            <Button
              size="sm"
              className="flex-1"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Access Tenant
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}