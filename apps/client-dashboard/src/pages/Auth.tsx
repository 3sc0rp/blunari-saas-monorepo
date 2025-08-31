import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { useTenantBranding } from '@/contexts/TenantBrandingContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, Github, Chrome } from 'lucide-react';

const authSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const resetSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

const codeVerifySchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  code: z.string().length(6, 'Security code must be 6 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string().min(6, 'Password must be at least 6 characters'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type AuthFormData = z.infer<typeof authSchema>;
type ResetFormData = z.infer<typeof resetSchema>;
type CodeVerifyFormData = z.infer<typeof codeVerifySchema>;

const Auth: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('signin');
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const { signIn, user } = useAuth();
  const { logoUrl, restaurantName } = useTenantBranding();
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    mode: 'onSubmit',
  });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
    reset: resetForm,
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    mode: 'onSubmit',
  });

  const {
    register: registerCode,
    handleSubmit: handleCodeSubmit,
    formState: { errors: codeErrors },
    reset: resetCodeForm,
    setValue: setCodeValue,
  } = useForm<CodeVerifyFormData>({
    resolver: zodResolver(codeVerifySchema),
    mode: 'onSubmit',
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const onSubmit = async (data: AuthFormData) => {
    setLoading(true);
    setAuthError(null);
    
    try {
      const { error } = await signIn(data.email, data.password);
      
      if (error) {
        setAuthError('Invalid email or password. Please check your credentials and try again.');
        toast({
          title: 'Sign in failed',
          description: 'Invalid email or password. Please try again.',
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Welcome back!',
          description: 'You have successfully signed in.',
        });
        navigate('/dashboard');
      }
    } catch (error) {
      setAuthError('Something went wrong. Please try again.');
      toast({
        title: 'Error',
        description: 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormData) => {
    setResetLoading(true);
    
    try {
      const response = await fetch('https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/send-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: data.email }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to send security code';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          // If JSON parsing fails, use the raw text or default message
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Security code sent',
          description: 'Check the edge function logs for your 6-digit security code.',
        });
        
        setResetEmail(data.email);
        setCodeValue('email', data.email);
        setShowCodeForm(true);
        resetForm();
      } else {
        throw new Error(result.error || 'Failed to send security code');
      }
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const onResendCode = async () => {
    setResetLoading(true);
    
    try {
      const response = await fetch('https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/send-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: resetEmail }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to resend security code';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Security code resent',
          description: 'Check the edge function logs for your new 6-digit security code.',
        });
      } else {
        throw new Error(result.error || 'Failed to resend security code');
      }
    } catch (error: any) {
      console.error('Resend code error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Something went wrong. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setResetLoading(false);
    }
  };

  const onCodeSubmit = async (data: CodeVerifyFormData) => {
    setCodeLoading(true);
    
    try {
      // Send both code and new password to reset password
      const response = await fetch('https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/send-password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          code: data.code,
          newPassword: data.password,
        }),
      });

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Failed to reset password';
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();

      if (result.success) {
        toast({
          title: 'Password reset successful',
          description: 'Your password has been updated. You can now sign in.',
        });
        
        setShowCodeForm(false);
        setShowPasswordForm(false);
        resetCodeForm();
        setActiveTab('signin');
      } else {
        throw new Error(result.error || 'Failed to reset password');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Invalid security code or failed to reset password. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setCodeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-surface via-surface-2 to-surface-3 dark:from-surface dark:via-surface-2 dark:to-surface-3 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <img 
            src={logoUrl} 
            alt={`${restaurantName} Logo`} 
            className="h-16 mx-auto mb-4 rounded-lg"
            onError={(e) => {
              e.currentTarget.src = '/placeholder.svg';
            }}
          />
          <h1 className="text-h2 font-bold text-text">{restaurantName}</h1>
          <p className="text-text-muted">Manage your restaurant operations</p>
        </div>

        <Card className="shadow-elev-2 bg-surface border-surface-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-surface-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="reset">Reset Password</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin" className="space-y-5">
              <CardHeader>
                <CardTitle className="text-center text-text">Welcome Back</CardTitle>
                <CardDescription className="text-center text-text-muted">
                  Sign in to your restaurant dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Social Login Buttons */}
                <div className="space-y-3">
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 bg-surface-2 border-surface-3 hover:bg-surface-3 transition-colors"
                    disabled
                  >
                    <Github className="mr-2 h-4 w-4" />
                    Continue with GitHub
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-11 bg-surface-2 border-surface-3 hover:bg-surface-3 transition-colors"
                    disabled
                  >
                    <Chrome className="mr-2 h-4 w-4" />
                    Continue with Google
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-surface-3" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-surface px-2 text-text-muted">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {authError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive">{authError}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-text">Email address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      {...register('email')}
                      className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand ${errors.email ? 'border-destructive animate-shake' : ''}`}
                      aria-invalid={errors.email ? 'true' : 'false'}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                    />
                    {errors.email && (
                      <p id="email-error" className="text-sm text-destructive" role="alert">
                        {errors.email.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-text">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Enter your password"
                        {...register('password')}
                        className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand pr-10 ${errors.password ? 'border-destructive animate-shake' : ''}`}
                        aria-invalid={errors.password ? 'true' : 'false'}
                        aria-describedby={errors.password ? 'password-error' : undefined}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-text-muted" />
                        ) : (
                          <Eye className="h-4 w-4 text-text-muted" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p id="password-error" className="text-sm text-destructive" role="alert">
                        {errors.password.message}
                      </p>
                    )}
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full h-11 bg-brand hover:bg-brand/90 text-brand-foreground" 
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                  
                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setActiveTab('reset');
                        setAuthError(null);
                      }}
                      className="text-sm text-text-muted hover:text-text"
                    >
                      Forgot your password?
                    </Button>
                  </div>
                  
                  <p className="text-sm text-text-muted text-center">
                    Account created by restaurant admin? Check your email for login credentials.
                  </p>
                </form>
              </CardContent>
            </TabsContent>
            
            <TabsContent value="reset" className="space-y-5">
              <CardHeader>
                <CardTitle className="text-center text-text">Reset Password</CardTitle>
                <CardDescription className="text-center text-text-muted">
                  {!showCodeForm ? 'Enter your email to receive a security code' : 
                   'Enter the security code and your new password'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {!showCodeForm ? (
                  <form onSubmit={handleResetSubmit(onResetSubmit)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-text">Email address</Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your email address"
                        {...registerReset('email')}
                        className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand ${resetErrors.email ? 'border-destructive animate-shake' : ''}`}
                        aria-invalid={resetErrors.email ? 'true' : 'false'}
                        aria-describedby={resetErrors.email ? 'reset-email-error' : undefined}
                      />
                      {resetErrors.email && (
                        <p id="reset-email-error" className="text-sm text-destructive" role="alert">
                          {resetErrors.email.message}
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-brand hover:bg-brand/90 text-brand-foreground" 
                      disabled={resetLoading}
                    >
                      {resetLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        'Send Code'
                      )}
                    </Button>
                    
                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setActiveTab('signin')}
                        className="text-sm text-text-muted hover:text-text"
                      >
                        Back to sign in
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={handleCodeSubmit(onCodeSubmit)} className="space-y-5">
                    <div className="space-y-2">
                      <Label htmlFor="code-email" className="text-text">Email address</Label>
                      <Input
                        id="code-email"
                        type="email"
                        value={resetEmail || ''}
                        disabled
                        className="h-11 bg-surface-3 border-surface-3 text-text-muted"
                        aria-label="Email address (readonly)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="security-code" className="text-text">Security Code</Label>
                      <Input
                        id="security-code"
                        type="text"
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        {...registerCode('code')}
                        className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand ${codeErrors.code ? 'border-destructive animate-shake' : ''}`}
                        aria-invalid={codeErrors.code ? 'true' : 'false'}
                        aria-describedby={codeErrors.code ? 'code-error' : undefined}
                      />
                      {codeErrors.code && (
                        <p id="code-error" className="text-sm text-destructive" role="alert">
                          {codeErrors.code.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-text">New Password</Label>
                      <Input
                        id="new-password"
                        type="password"
                        placeholder="Enter new password"
                        {...registerCode('password')}
                        className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand ${codeErrors.password ? 'border-destructive animate-shake' : ''}`}
                        aria-invalid={codeErrors.password ? 'true' : 'false'}
                        aria-describedby={codeErrors.password ? 'password-new-error' : undefined}
                      />
                      {codeErrors.password && (
                        <p id="password-new-error" className="text-sm text-destructive" role="alert">
                          {codeErrors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-text">Confirm Password</Label>
                      <Input
                        id="confirm-password"
                        type="password"
                        placeholder="Confirm new password"
                        {...registerCode('confirmPassword')}
                        className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand ${codeErrors.confirmPassword ? 'border-destructive animate-shake' : ''}`}
                        aria-invalid={codeErrors.confirmPassword ? 'true' : 'false'}
                        aria-describedby={codeErrors.confirmPassword ? 'confirm-password-error' : undefined}
                      />
                      {codeErrors.confirmPassword && (
                        <p id="confirm-password-error" className="text-sm text-destructive" role="alert">
                          {codeErrors.confirmPassword.message}
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full h-11 bg-brand hover:bg-brand/90 text-brand-foreground" 
                      disabled={codeLoading}
                    >
                      {codeLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Resetting Password...
                        </>
                      ) : (
                        'Reset Password'
                      )}
                    </Button>
                    
                    <div className="text-center space-y-2">
                      <Button
                        type="button"
                        variant="link"
                        onClick={onResendCode}
                        disabled={resetLoading}
                        className="text-sm text-brand hover:text-brand/80 disabled:opacity-50"
                      >
                        {resetLoading ? 'Sending...' : "Didn't receive the code? Resend"}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setShowCodeForm(false)}
                        className="block text-sm text-text-muted hover:text-text"
                      >
                        Back to email entry
                      </Button>
                      <br />
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => {
                          setShowCodeForm(false);
                          setActiveTab('signin');
                        }}
                        className="text-sm text-text-muted hover:text-text"
                      >
                        Back to sign in
                      </Button>
                    </div>
                  </form>
                )}
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;