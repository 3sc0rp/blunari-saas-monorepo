import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { 
  Mail, 
  Clock, 
  CheckCircle, 
  XCircle, 
  Loader2,
  Copy,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  invitation_token: string;
}

export function InvitationsList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInvitations = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('employee_invitations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setInvitations(data || []);
    } catch (error: any) {
      console.error('[InvitationsList] Error fetching invitations:', error);
      toast.error('Failed to load invitations');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvitations();
  }, []);

  const copyInvitationLink = (token: string) => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/accept-invitation?token=${token}`;
    
    navigator.clipboard.writeText(link).then(() => {
      toast.success('Invitation link copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy link');
    });
  };

  const getStatusBadge = (invitation: Invitation) => {
    if (invitation.accepted_at) {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="w-3 h-3 mr-1" />
          Accepted
        </Badge>
      );
    }

    const isExpired = new Date(invitation.expires_at) < new Date();
    if (isExpired) {
      return (
        <Badge variant="destructive">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const getRoleBadgeVariant = (role: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'destructive';
      case 'ADMIN':
        return 'default';
      case 'SUPPORT':
      case 'OPS':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Invitations</CardTitle>
          <CardDescription>Manage staff invitations and their status</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="ml-2 text-muted-foreground">Loading invitations...</span>
        </CardContent>
      </Card>
    );
  }

  const pendingInvitations = invitations.filter(
    inv => !inv.accepted_at && new Date(inv.expires_at) > new Date()
  );
  const expiredInvitations = invitations.filter(
    inv => !inv.accepted_at && new Date(inv.expires_at) <= new Date()
  );
  const acceptedInvitations = invitations.filter(inv => inv.accepted_at);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Staff Invitations</CardTitle>
          <CardDescription>
            {pendingInvitations.length} pending, {acceptedInvitations.length} accepted, {expiredInvitations.length} expired
          </CardDescription>
        </div>
        <Button onClick={fetchInvitations} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {invitations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Mail className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No invitations found</p>
            <p className="text-sm">Send your first invitation to get started</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitations.map((invitation) => {
                  const isExpired = new Date(invitation.expires_at) < new Date();
                  const isPending = !invitation.accepted_at && !isExpired;

                  return (
                    <TableRow key={invitation.id}>
                      <TableCell className="font-medium">
                        {invitation.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(invitation.role)}>
                          {invitation.role}
                        </Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(invitation)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(invitation.created_at), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {invitation.accepted_at ? (
                          <span className="text-green-600">
                            {formatDistanceToNow(new Date(invitation.accepted_at), {
                              addSuffix: true,
                            })}
                          </span>
                        ) : (
                          <span className={isExpired ? 'text-destructive' : ''}>
                            {formatDistanceToNow(new Date(invitation.expires_at), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {isPending && (
                          <Button
                            onClick={() => copyInvitationLink(invitation.invitation_token)}
                            variant="ghost"
                            size="sm"
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

