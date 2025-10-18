import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, XCircle, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/logger';

interface InvitationData {
  email: string;
  role: string;
  expires_at: string;
  invited_by: string;
}

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link - missing token');
      setLoading(false);
      return;
    }

    validateInvitation();
  }, [token]);

  const validateInvitation = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: queryError } = await supabase
        .from('employee_invitations')
        .select('email, role, expires_at, invited_by, accepted_at')
        .eq('invitation_token', token)
        .maybeSingle();

      if (queryError) {
        logger.error("Query error validating invitation", {
          component: "AcceptInvitation",
          error: queryError,
        });
        setError('Failed to validate invitation');
        return;
      }

      if (!data) {
        setError('Invitation not found or invalid');
        return;
      }

      if (data.accepted_at) {
        setError('This invitation has already been accepted');
        return;
      }

      if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired');
        return;
      }

      setInvitation(data as InvitationData);
      setShowPasswordForm(true);
    } catch (err) {
      logger.error("Error validating invitation", {
        component: "AcceptInvitation",
        error: err,
      });
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setAccepting(true);
    try {
      const { data, error: acceptError } = await supabase.functions.invoke(
        'accept-staff-invitation',
        {
          body: {
            token,
            password,
          },
        }
      );

      if (acceptError) {
        logger.error("Function error accepting invitation", {
          component: "AcceptInvitation",
          error: acceptError,
        });
        throw new Error(acceptError.message || 'Failed to accept invitation');
      }

      if (data?.error) {
        throw new Error(data.message || data.error);
      }

      if (data?.success) {
        toast.success('Invitation accepted successfully!');

        // Sign in the user automatically
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: invitation!.email,
          password,
        });

        if (signInError) {
          logger.error("Sign in error after accepting invitation", {
            component: "AcceptInvitation",
            error: signInError,
          });
          // Still redirect to login - they can sign in manually
          toast.info('Please sign in with your new credentials');
          navigate('/auth?email=' + encodeURIComponent(invitation!.email));
          return;
        }

        // Redirect to dashboard
        navigate('/dashboard');
      } else {
        throw new Error('Unexpected response from server');
      }
    } catch (err: any) {
      logger.error("Accept error", {
        component: "AcceptInvitation",
        error: err,
      });
      toast.error(err.message || 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
            <p className="mt-4 text-muted-foreground">Validating invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex justify-center mb-4">
              <XCircle className="w-12 h-12 text-destructive" />
            </div>
            <CardTitle className="text-center">Invalid Invitation</CardTitle>
            <CardDescription className="text-center">{error}</CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate('/auth')} variant="outline">
              Go to Sign In
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Mail className="w-8 h-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-center text-2xl">Accept Invitation</CardTitle>
          <CardDescription className="text-center">
            Join the Blunari team as {invitation?.role}
          </CardDescription>
        </CardHeader>

        {showPasswordForm && invitation && (
          <form onSubmit={handleAccept}>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="w-4 h-4" />
                <AlertDescription>
                  You're invited to join as <strong>{invitation.role}</strong>
                  <br />
                  <span className="text-xs text-muted-foreground">
                    Email: {invitation.email}
                  </span>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="password">Create Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="At least 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={8}
                    disabled={accepting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="pl-10"
                    required
                    minLength={8}
                    disabled={accepting}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                By accepting this invitation, you agree to our Terms of Service and Privacy Policy.
              </p>
            </CardContent>

            <CardFooter className="flex flex-col space-y-2">
              <Button
                type="submit"
                className="w-full"
                disabled={accepting || !password || password !== confirmPassword}
              >
                {accepting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Accept & Join Team
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => navigate('/auth')}
                disabled={accepting}
              >
                Cancel
              </Button>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}

