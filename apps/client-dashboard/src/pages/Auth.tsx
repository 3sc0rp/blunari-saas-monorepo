import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useTenantBranding } from "@/contexts/TenantBrandingContext";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Loader2, Github, Chrome, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Function to validate single-use password setup links
const validatePasswordSetupLink = async (linkToken: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('validate-password-setup-link', {
      body: {
        linkToken,
        action: 'validate' // Just validate, don't consume yet
      }
    });

    if (error) {
      console.error("Link validation API error:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Link validation failed:", error);
    throw error;
  }
};

// Function to consume (mark as used) a password setup link
const consumePasswordSetupLink = async (linkToken: string) => {
  try {
    const { data, error } = await supabase.functions.invoke('validate-password-setup-link', {
      body: {
        linkToken,
        action: 'consume' // Mark as used
      }
    });

    if (error) {
      console.error("Link consumption API error:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Link consumption failed:", error);
    throw error;
  }
};

const authSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const resetSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const passwordSetupSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const codeVerifySchema = z
  .object({
    email: z.string().email("Please enter a valid email address"),
    code: z.string().length(6, "Security code must be 6 digits"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z
      .string()
      .min(6, "Password must be at least 6 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type AuthFormData = z.infer<typeof authSchema>;
type ResetFormData = z.infer<typeof resetSchema>;
type CodeVerifyFormData = z.infer<typeof codeVerifySchema>;
type PasswordSetupFormData = z.infer<typeof passwordSetupSchema>;

const Auth: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [codeLoading, setCodeLoading] = useState(false);
  const [passwordSetupLoading, setPasswordSetupLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");
  const [showCodeForm, setShowCodeForm] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showPasswordSetup, setShowPasswordSetup] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [recoveryToken, setRecoveryToken] = useState<string | null>(null);
  const { signIn, user } = useAuth();
  const { logoUrl, restaurantName } = useTenantBranding();
  // Use Blunari branding for login page with fallbacks to tenant branding
  const brandLogo = "/logo.png"; // Always use Blunari logo on login
  const brandName = "Blunari"; // Always use Blunari name on login
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname || "/command-center";
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<AuthFormData>({
    resolver: zodResolver(authSchema),
    mode: "onSubmit",
  });

  const {
    register: registerReset,
    handleSubmit: handleResetSubmit,
    formState: { errors: resetErrors },
    reset: resetForm,
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    mode: "onSubmit",
  });

  const {
    register: registerCode,
    handleSubmit: handleCodeSubmit,
    formState: { errors: codeErrors },
    reset: resetCodeForm,
    setValue: setCodeValue,
  } = useForm<CodeVerifyFormData>({
    resolver: zodResolver(codeVerifySchema),
    mode: "onSubmit",
  });

  const {
    register: registerPasswordSetup,
    handleSubmit: handlePasswordSetupSubmit,
    formState: { errors: passwordSetupErrors },
    reset: resetPasswordSetupForm,
  } = useForm<PasswordSetupFormData>({
    resolver: zodResolver(passwordSetupSchema),
    mode: "onSubmit",
  });

  // Check for password setup tokens in URL hash
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;
    
    if (import.meta.env.DEV)    // Check for linkToken in search params first (single-use security)
    const searchParams = new URLSearchParams(search);
    const linkToken = searchParams.get('linkToken');
    
    if (linkToken) {
      if (import.meta.env.DEV)      // Validate the link token with our security function
      validatePasswordSetupLink(linkToken)
        .then((result) => {
          if (result.valid) {
            if (import.meta.env.DEV)            setShowPasswordSetup(true);
            setActiveTab('password-setup');
            setRecoveryToken(`link_token=${linkToken}`);
            
            // Clear the URL parameters for security
            window.history.replaceState(null, '', window.location.pathname);
          } else {
            console.error("Invalid link token:", result);
            toast({
              title: "Invalid Link",
              description: result.message || "This password setup link is invalid or has expired.",
              variant: "destructive",
            });
          }
        })
        .catch((error) => {
          console.error("Link validation error:", error);
          toast({
            title: "Validation Error", 
            description: "Failed to validate password setup link. Please contact support.",
            variant: "destructive",
          });
        });
      return;
    }
    
    // Check for tokens in URL hash (primary method)
    if (hash.length > 1) {
      const urlParams = new URLSearchParams(hash.substring(1));
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      const type = urlParams.get('type');
      
      if (import.meta.env.DEV)      if (accessToken && (type === 'recovery' || type === 'invite')) {
        if (import.meta.env.DEV)        const tokenData = refreshToken ? 
          `access_token=${accessToken}&refresh_token=${refreshToken}&type=${type}` : 
          accessToken;
        
        setRecoveryToken(tokenData);
        setShowPasswordSetup(true);
        setActiveTab('password-setup');
        
        // Clear the hash from URL for security
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        return;
      }
    }
    
    // Also check for password setup indicators in search params as fallback
    if (search.includes('passwordSetup=true') || search.includes('type=recovery') || search.includes('type=invite')) {
      if (import.meta.env.DEV)      setShowPasswordSetup(true);
      setActiveTab('password-setup');
      // Store a placeholder token since we'll need the user to be authenticated already
      setRecoveryToken('authenticated_user_password_setup');
    }
  }, []);

  // Additional effect to check if user was authenticated via password setup link
  useEffect(() => {
    // If user becomes authenticated and we have detected password setup tokens,
    // force them to go through password setup even if they're already logged in
    if (user && !showPasswordSetup) {
      const hash = window.location.hash;
      const search = window.location.search;
      
      // Check if this page load was from a password setup link
      if (hash.includes('type=recovery') || hash.includes('type=invite') || 
          search.includes('passwordSetup=true')) {
        if (import.meta.env.DEV)        setShowPasswordSetup(true);
        setActiveTab('password-setup');
        setRecoveryToken('authenticated_user_password_setup');
        
        // Clear URL parameters
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }
  }, [user, showPasswordSetup]);

  // Redirect if already authenticated, but not during password setup
  useEffect(() => {
    // Only redirect if user is authenticated AND we're not in password setup mode AND no password setup token
    if (user && !showPasswordSetup && !recoveryToken) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from, showPasswordSetup, recoveryToken]);

  const onSubmit = async (data: AuthFormData) => {
    setLoading(true);
    setAuthError(null);

    try {
      const { error } = await signIn(data.email, data.password);

      if (error) {
        setAuthError(
          "Invalid email or password. Please check your credentials and try again.",
        );
        toast({
          title: "Sign in failed",
          description: "Invalid email or password. Please try again.",
          variant: "destructive",
        });
      } else {
  toast({
          title: "Welcome back!",
          description: "You have successfully signed in.",
        });
  navigate(from, { replace: true });
      }
    } catch (error) {
      setAuthError("Something went wrong. Please try again.");
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const onResetSubmit = async (data: ResetFormData) => {
    setResetLoading(true);

    try {
      const response = await fetch(
        "https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/send-password-reset",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: data.email }),
        },
      );

      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to send security code";

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
          title: "Security code sent",
          description:
            "Check the edge function logs for your 6-digit security code.",
        });

        setResetEmail(data.email);
        setCodeValue("email", data.email);
        setShowCodeForm(true);
        resetForm();
      } else {
        throw new Error(result.error || "Failed to send security code");
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      console.error("Reset password error:", errorObj);
      toast({
        title: "Error",
        description:
          errorObj.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const onResendCode = async () => {
    setResetLoading(true);

    try {
      const response = await fetch(
        "https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/send-password-reset",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ email: resetEmail }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = "Failed to resend security code";

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
          title: "Security code resent",
          description:
            "Check the edge function logs for your new 6-digit security code.",
        });
      } else {
        throw new Error(result.error || "Failed to resend security code");
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      console.error("Resend code error:", errorObj);
      toast({
        title: "Error",
        description:
          errorObj.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setResetLoading(false);
    }
  };

  const onCodeSubmit = async (data: CodeVerifyFormData) => {
    setCodeLoading(true);

    try {
      if (import.meta.env.DEV)      // Validate all required fields
      if (!data.email) {
        throw new Error("Email is required");
      }
      if (!data.code || data.code.length !== 6) {
        throw new Error("Please enter a valid 6-digit security code");
      }
      if (!data.password || data.password.length < 6) {
        throw new Error("Password must be at least 6 characters");
      }
      if (data.password !== data.confirmPassword) {
        throw new Error("Passwords don't match");
      }

      // Send both code and new password to reset password
      const response = await fetch(
        "https://kbfbbkcaxhzlnbqxwgoz.supabase.co/functions/v1/send-password-reset",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: data.email,
            code: data.code,
            newPassword: data.password,
          }),
        },
      );

      if (import.meta.env.DEV)      // Check if response is ok before parsing JSON
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Reset password error response:", errorText);
        let errorMessage = "Failed to reset password";

        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
          console.error("Parsed error:", errorJson);
        } catch {
          errorMessage = errorText || errorMessage;
        }

        throw new Error(errorMessage);
      }

      const result = await response.json();
      if (import.meta.env.DEV)      if (result.success) {
        toast({
          title: "Password reset successful",
          description: "Your password has been updated. You can now sign in.",
        });

        // Reset form and return to signin
        setShowCodeForm(false);
        setShowPasswordForm(false);
        resetCodeForm();
        setResetEmail("");
        setActiveTab("signin");
      } else {
        throw new Error(result.error || "Failed to reset password");
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      console.error("Password reset error:", errorObj);
      toast({
        title: "Error",
        description:
          errorObj.message ||
          "Invalid security code or failed to reset password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setCodeLoading(false);
    }
  };

  const onPasswordSetupSubmit = async (data: PasswordSetupFormData) => {
    if (!recoveryToken) {
      toast({
        title: "Error",
        description: "Invalid password setup link. Please request a new one.",
        variant: "destructive",
      });
      return;
    }

    setPasswordSetupLoading(true);

    try {
      // Check if this is a single-use link token
      if (recoveryToken.startsWith('link_token=')) {
        const linkToken = recoveryToken.split('=')[1];
        if (import.meta.env.DEV)        // Consume the link token to mark it as used (security measure)
        try {
          const consumeResult = await consumePasswordSetupLink(linkToken);
          if (!consumeResult.valid) {
            throw new Error(consumeResult.message || "Link token could not be consumed");
          }
           catch (consumeError) {
          console.error("Failed to consume link token:", consumeError);
          toast({
            title: "Security Error",
            description: "This password setup link could not be validated. Please request a new one.",
            variant: "destructive",
          });
          return;
        }
        
        // User should already be authenticated if they got this far, just update password
        if (!user) {
          toast({
            title: "Authentication Required",
            description: "Please authenticate first before setting your password.",
            variant: "destructive",
          });
          return;
        }
        
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (updateError) {
          throw updateError;
        }

        toast({
          title: "Password set successfully",
          description: "Your password has been set. You are now logged in with secure access.",
        });

        setShowPasswordSetup(false);
        resetPasswordSetupForm();
        setRecoveryToken(null);
        
        navigate(from, { replace: true });
        return;
      }
      
      // Check if this is a simple authenticated user password setup (fallback case)
      if (recoveryToken === 'authenticated_user_password_setup') {
        if (import.meta.env.DEV)        // User is already authenticated, just update their password
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (updateError) {
          throw updateError;
        }

        toast({
          title: "Password set successfully",
          description: "Your password has been set. You are now logged in.",
        });

        setShowPasswordSetup(false);
        resetPasswordSetupForm();
        setRecoveryToken(null);
        
        navigate(from, { replace: true });
        return;
      }

      // Extract the URL parameters from the recovery token 
      // The recovery token is actually the full URL hash content
      const urlParams = new URLSearchParams(recoveryToken.includes('?') ? recoveryToken.split('?')[1] : recoveryToken);
      const actualToken = urlParams.get('access_token') || urlParams.get('token') || recoveryToken;
      const refreshToken = urlParams.get('refresh_token');
      const tokenType = urlParams.get('type') || 'recovery';
      
      if (import.meta.env.DEV)      // If user is already authenticated from the token, just update password directly
      if (user) {
        if (import.meta.env.DEV)        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (updateError) {
          throw updateError;
        }

        toast({
          title: "Password set successfully",
          description: "Your password has been set. You are now logged in.",
        });

        setShowPasswordSetup(false);
        resetPasswordSetupForm();
        setRecoveryToken(null);
        
        navigate(from, { replace: true });
        return;
      }

      // For invite tokens, use verifyOtp with 'invite' type
      // For recovery tokens, use verifyOtp with 'recovery' type
      const { data: verifyData, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: actualToken,
        type: tokenType as 'invite' | 'recovery'
      });

      if (verifyError) {
        console.error("OTP verification failed, trying alternative approach:", verifyError);
        
        // Alternative approach: try to use the token directly for session
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: actualToken,
          refresh_token: refreshToken || actualToken
        });

        if (sessionError) {
          throw new Error("Invalid or expired password setup link. Please request a new one.");
        }

        // Now update password with active session
        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (updateError) {
          throw updateError;
        }

        if (updateData.user) {
          if (import.meta.env.DEV)          toast({
            title: "Password set successfully",
            description: "Your password has been set. You are now logged in.",
          });

          setShowPasswordSetup(false);
          resetPasswordSetupForm();
          setRecoveryToken(null);
          
          navigate(from, { replace: true });
        }
      } else if (verifyData.user) {
        // OTP verification successful, now update password
        if (import.meta.env.DEV)        const { data: updateData, error: updateError } = await supabase.auth.updateUser({
          password: data.password,
        });

        if (updateError) {
          throw updateError;
        }

        toast({
          title: "Password set successfully",
          description: "Your password has been set. You are now logged in.",
        });

        setShowPasswordSetup(false);
        resetPasswordSetupForm();
        setRecoveryToken(null);
        
        navigate(from, { replace: true });
      }
    } catch (error: unknown) {
      const errorObj = error as Error;
      console.error("Password setup error:", errorObj);
      toast({
        title: "Error",
        description:
          errorObj.message || "Failed to set password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPasswordSetupLoading(false);
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
            src={brandLogo}
            alt={`${brandName} Logo`}
            className="h-16 mx-auto mb-4 rounded-lg"
            onError={(e) => {
              e.currentTarget.src = "/placeholder.svg";
            }}
          />
          <h1 className="text-h2 font-bold text-text">{brandName}</h1>
          <p className="text-text-muted">Manage your restaurant operations</p>
        </div>

        <Card className="shadow-elev-2 bg-surface border-surface-2">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            {!showPasswordSetup ? (
              <>
                <TabsList className="grid w-full grid-cols-2 bg-surface-2">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="reset">Reset Password</TabsTrigger>
                </TabsList>
              </>
            ) : (
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-text">Set Your Password</h2>
                <p className="text-text-muted">Create a secure password for your account</p>
              </div>
            )}

            <TabsContent value="signin" className="space-y-5">
              <CardHeader>
                <CardTitle className="text-center text-text">
                  Welcome Back
                </CardTitle>
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
                    <span className="bg-surface px-2 text-text-muted">
                      Or continue with email
                    </span>
                  </div>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                  {authError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                      <p className="text-sm text-destructive">{authError}</p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-text">
                      Email address
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email address"
                      {...register("email")}
                      className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand ${errors.email ? "border-destructive animate-shake" : ""}`}
                      aria-invalid={errors.email ? "true" : "false"}
                      aria-describedby={
                        errors.email ? "email-error" : undefined
                      }
                    />
                    {errors.email && (
                      <p
                        id="email-error"
                        className="text-sm text-destructive"
                        role="alert"
                      >
                        {errors.email.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-text">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        {...register("password")}
                        className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand pr-10 ${errors.password ? "border-destructive animate-shake" : ""}`}
                        aria-invalid={errors.password ? "true" : "false"}
                        aria-describedby={
                          errors.password ? "password-error" : undefined
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={
                          showPassword ? "Hide password" : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-text-muted" />
                        ) : (
                          <Eye className="h-4 w-4 text-text-muted" />
                        )}
                      </Button>
                    </div>
                    {errors.password && (
                      <p
                        id="password-error"
                        className="text-sm text-destructive"
                        role="alert"
                      >
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
                      "Sign In"
                    )}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="link"
                      onClick={() => {
                        setActiveTab("reset");
                        setAuthError(null);
                      }}
                      className="text-sm text-text-muted hover:text-text"
                    >
                      Forgot your password?
                    </Button>
                  </div>

                  <p className="text-sm text-text-muted text-center">
                    Account created by restaurant admin? Check your email for
                    login credentials.
                  </p>
                </form>
              </CardContent>
            </TabsContent>

            <TabsContent value="reset" className="space-y-5">
              <CardHeader>
                <CardTitle className="text-center text-text">
                  Reset Password
                </CardTitle>
                <CardDescription className="text-center text-text-muted">
                  {!showCodeForm
                    ? "Enter your email to receive a security code"
                    : "Enter the security code and your new password"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {!showCodeForm ? (
                  <form
                    onSubmit={handleResetSubmit(onResetSubmit)}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <Label htmlFor="reset-email" className="text-text">
                        Email address
                      </Label>
                      <Input
                        id="reset-email"
                        type="email"
                        placeholder="Enter your email address"
                        {...registerReset("email")}
                        className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand ${resetErrors.email ? "border-destructive animate-shake" : ""}`}
                        aria-invalid={resetErrors.email ? "true" : "false"}
                        aria-describedby={
                          resetErrors.email ? "reset-email-error" : undefined
                        }
                      />
                      {resetErrors.email && (
                        <p
                          id="reset-email-error"
                          className="text-sm text-destructive"
                          role="alert"
                        >
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
                        "Send Code"
                      )}
                    </Button>

                    <div className="text-center">
                      <Button
                        type="button"
                        variant="link"
                        onClick={() => setActiveTab("signin")}
                        className="text-sm text-text-muted hover:text-text"
                      >
                        Back to sign in
                      </Button>
                    </div>
                  </form>
                ) : (
                  <form
                    onSubmit={handleCodeSubmit(onCodeSubmit)}
                    className="space-y-5"
                  >
                    {/* Hidden email field to ensure it's included in form submission */}
                    <input
                      type="hidden"
                      {...registerCode("email")}
                      value={resetEmail || ""}
                    />
                    
                    <div className="space-y-2">
                      <Label htmlFor="code-email" className="text-text">
                        Email address
                      </Label>
                      <Input
                        id="code-email"
                        type="email"
                        value={resetEmail || ""}
                        disabled
                        className="h-11 bg-surface-3 border-surface-3 text-text-muted"
                        aria-label="Email address (readonly)"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="security-code" className="text-text">
                        Security Code
                      </Label>
                      <Input
                        id="security-code"
                        type="text"
                        placeholder="Enter 6-digit code"
                        maxLength={6}
                        {...registerCode("code")}
                        className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand ${codeErrors.code ? "border-destructive animate-shake" : ""}`}
                        aria-invalid={codeErrors.code ? "true" : "false"}
                        aria-describedby={
                          codeErrors.code ? "code-error" : undefined
                        }
                      />
                      {codeErrors.code && (
                        <p
                          id="code-error"
                          className="text-sm text-destructive"
                          role="alert"
                        >
                          {codeErrors.code.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="new-password" className="text-text">
                        New Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="new-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter new password (min 6 characters)"
                          {...registerCode("password")}
                          className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand pr-10 ${codeErrors.password ? "border-destructive animate-shake" : ""}`}
                          aria-invalid={codeErrors.password ? "true" : "false"}
                          aria-describedby={
                            codeErrors.password ? "password-new-error" : undefined
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-text-muted" />
                          ) : (
                            <Eye className="h-4 w-4 text-text-muted" />
                          )}
                        </Button>
                      </div>
                      {codeErrors.password && (
                        <p
                          id="password-new-error"
                          className="text-sm text-destructive"
                          role="alert"
                        >
                          {codeErrors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirm-password" className="text-text">
                        Confirm Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="confirm-password"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Confirm new password"
                          {...registerCode("confirmPassword")}
                          className={`h-11 bg-surface-2 border-surface-3 focus:border-brand focus:ring-brand pr-10 ${codeErrors.confirmPassword ? "border-destructive animate-shake" : ""}`}
                          aria-invalid={
                            codeErrors.confirmPassword ? "true" : "false"
                          }
                          aria-describedby={
                            codeErrors.confirmPassword
                              ? "confirm-password-error"
                              : undefined
                          }
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-text-muted" />
                          ) : (
                            <Eye className="h-4 w-4 text-text-muted" />
                          )}
                        </Button>
                      </div>
                      {codeErrors.confirmPassword && (
                        <p
                          id="confirm-password-error"
                          className="text-sm text-destructive"
                          role="alert"
                        >
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
                        "Reset Password"
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
                        {resetLoading
                          ? "Sending..."
                          : "Didn't receive the code? Resend"}
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
                          setActiveTab("signin");
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

            <TabsContent value="password-setup" className="space-y-5">
              <CardContent className="space-y-5">
                <form onSubmit={handlePasswordSetupSubmit(onPasswordSetupSubmit)} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-text">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
                        className="pr-10 bg-surface-2 border-surface-3 text-text placeholder:text-text-muted h-11"
                        {...registerPasswordSetup("password")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-text-muted" />
                        ) : (
                          <Eye className="h-4 w-4 text-text-muted" />
                        )}
                      </Button>
                    </div>
                    {passwordSetupErrors.password && (
                      <p className="text-sm text-red-500">
                        {passwordSetupErrors.password.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-text">
                      Confirm Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        className="pr-10 bg-surface-2 border-surface-3 text-text placeholder:text-text-muted h-11"
                        {...registerPasswordSetup("confirmPassword")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4 text-text-muted" />
                        ) : (
                          <Eye className="h-4 w-4 text-text-muted" />
                        )}
                      </Button>
                    </div>
                    {passwordSetupErrors.confirmPassword && (
                      <p className="text-sm text-red-500">
                        {passwordSetupErrors.confirmPassword.message}
                      </p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={passwordSetupLoading}
                  >
                    {passwordSetupLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Setting Password...
                      </>
                    ) : (
                      "Set Password"
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
        </Card>
      </motion.div>
    </div>
  );
};

export default Auth;



