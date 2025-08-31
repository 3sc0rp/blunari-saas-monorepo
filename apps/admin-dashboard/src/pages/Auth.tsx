import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Eye, 
  EyeOff, 
  Mail, 
  Lock, 
  AlertTriangle,
  ArrowRight,
  User,
  CheckCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  
  const { signIn, signUp, user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // Form state for sign in
  const [signInForm, setSignInForm] = useState({
    email: "",
    password: ""
  });

  // Form state for sign up
  const [signUpForm, setSignUpForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (user) {
      navigate('/admin/dashboard');
    }
  }, [user, navigate]);

  // Password strength calculation
  useEffect(() => {
    const calculateStrength = (password: string) => {
      let strength = 0;
      if (password.length >= 8) strength += 25;
      if (/[A-Z]/.test(password)) strength += 25;
      if (/[0-9]/.test(password)) strength += 25;
      if (/[^A-Za-z0-9]/.test(password)) strength += 25;
      return strength;
    };
    
    setPasswordStrength(calculateStrength(authMode === 'signin' ? signInForm.password : signUpForm.password));
  }, [signInForm.password, signUpForm.password, authMode]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await signIn(signInForm.email, signInForm.password);

    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError("Invalid email or password. Please check your credentials and try again.");
      } else if (error.message.includes('Email not confirmed')) {
        setError("Please check your email and click the confirmation link before signing in.");
      } else {
        setError(error.message);
      }
    } else {
      toast({
        title: "Welcome back!",
        description: "Successfully signed in to your admin dashboard.",
      });
      navigate('/admin/dashboard');
    }

    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (signUpForm.password !== signUpForm.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (signUpForm.password.length < 8) {
      setError("Password must be at least 8 characters long");
      setLoading(false);
      return;
    }

    const { error } = await signUp(
      signUpForm.email, 
      signUpForm.password, 
      signUpForm.firstName, 
      signUpForm.lastName
    );

    if (error) {
      if (error.message.includes('User already registered')) {
        setError("An account with this email already exists. Please sign in instead.");
      } else {
        setError(error.message);
      }
    } else {
      toast({
        title: "Account created successfully!",
        description: "Please check your email to verify your account.",
      });
      setAuthMode('signin');
    }

    setLoading(false);
  };


  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5" />
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-gradient-primary rounded-full opacity-10 blur-3xl" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-gradient-secondary rounded-full opacity-10 blur-3xl" />
      
      <div className="w-full max-w-md relative z-10">
        <Card className="shadow-premium border-border/50 bg-background/80 backdrop-blur-xl animate-scale-in-center">
          <CardHeader className="text-center pb-6">
            <div className="flex items-center justify-center gap-3 mb-6 animate-fade-in-down">
              <img 
                src="/logo_svg.svg" 
                alt="Blunari Logo"
                className="w-12 h-12 rounded-xl"
              />
              <span className="text-2xl font-heading font-bold text-foreground">
                Blunari Admin
              </span>
            </div>
            
            <Tabs value={authMode} onValueChange={(value) => setAuthMode(value as 'signin' | 'signup')}>
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <div className="space-y-2 mb-6">
                <CardTitle className="text-xl font-heading font-semibold text-foreground">
                  {authMode === 'signin' ? 'Admin Login' : 'Create Admin Account'}
                </CardTitle>
                <CardDescription className="text-muted-foreground">
                  {authMode === 'signin' 
                    ? 'Access the admin dashboard' 
                    : 'Register for admin access'
                  }
                </CardDescription>
              </div>
            </Tabs>
          </CardHeader>
              
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive" className="animate-scale-in">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Tabs value={authMode}>
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email" className="text-sm font-medium">
                        Email Address
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          id="signin-email"
                          type="email"
                          placeholder="admin@blunari.com"
                          value={signInForm.email}
                          onChange={(e) => setSignInForm({...signInForm, email: e.target.value})}
                          onFocus={() => setFocusedField('signin-email')}
                          onBlur={() => setFocusedField(null)}
                          className={cn(
                            "pl-10 pr-4 py-3 border-2 transition-all duration-300",
                            focusedField === 'signin-email' 
                              ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" 
                              : "border-slate-200 dark:border-slate-700"
                          )}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signin-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          id="signin-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={signInForm.password}
                          onChange={(e) => setSignInForm({...signInForm, password: e.target.value})}
                          onFocus={() => setFocusedField('signin-password')}
                          onBlur={() => setFocusedField(null)}
                          className={cn(
                            "pl-10 pr-12 py-3 border-2 transition-all duration-300",
                            focusedField === 'signin-password' 
                              ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" 
                              : "border-slate-200 dark:border-slate-700"
                          )}
                          required
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
                        >
                          {showPassword ? 
                            <EyeOff className="w-4 h-4 text-slate-400" /> : 
                            <Eye className="w-4 h-4 text-slate-400" />
                          }
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="premium"
                    size="lg"
                    className="w-full" 
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></div>
                        Signing In...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        Access Dashboard
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-firstname" className="text-sm font-medium">
                          First Name
                        </Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                          <Input
                            id="signup-firstname"
                            type="text"
                            placeholder="John"
                            value={signUpForm.firstName}
                            onChange={(e) => setSignUpForm({...signUpForm, firstName: e.target.value})}
                            onFocus={() => setFocusedField('signup-firstname')}
                            onBlur={() => setFocusedField(null)}
                            className={cn(
                              "pl-10 pr-4 py-3 border-2 transition-all duration-300",
                              focusedField === 'signup-firstname' 
                                ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" 
                                : "border-slate-200 dark:border-slate-700"
                            )}
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signup-lastname" className="text-sm font-medium">
                          Last Name
                        </Label>
                        <div className="relative group">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                          <Input
                            id="signup-lastname"
                            type="text"
                            placeholder="Doe"
                            value={signUpForm.lastName}
                            onChange={(e) => setSignUpForm({...signUpForm, lastName: e.target.value})}
                            onFocus={() => setFocusedField('signup-lastname')}
                            onBlur={() => setFocusedField(null)}
                            className={cn(
                              "pl-10 pr-4 py-3 border-2 transition-all duration-300",
                              focusedField === 'signup-lastname' 
                                ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" 
                                : "border-slate-200 dark:border-slate-700"
                            )}
                            required
                            disabled={loading}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email" className="text-sm font-medium">
                        Email Address
                      </Label>
                      <div className="relative group">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          id="signup-email"
                          type="email"
                          placeholder="admin@company.com"
                          value={signUpForm.email}
                          onChange={(e) => setSignUpForm({...signUpForm, email: e.target.value})}
                          onFocus={() => setFocusedField('signup-email')}
                          onBlur={() => setFocusedField(null)}
                          className={cn(
                            "pl-10 pr-4 py-3 border-2 transition-all duration-300",
                            focusedField === 'signup-email' 
                              ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" 
                              : "border-slate-200 dark:border-slate-700"
                          )}
                          required
                          disabled={loading}
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="signup-password" className="text-sm font-medium">
                        Password
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          id="signup-password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password"
                          value={signUpForm.password}
                          onChange={(e) => setSignUpForm({...signUpForm, password: e.target.value})}
                          onFocus={() => setFocusedField('signup-password')}
                          onBlur={() => setFocusedField(null)}
                          className={cn(
                            "pl-10 pr-12 py-3 border-2 transition-all duration-300",
                            focusedField === 'signup-password' 
                              ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" 
                              : "border-slate-200 dark:border-slate-700"
                          )}
                          required
                          disabled={loading}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                          disabled={loading}
                        >
                          {showPassword ? 
                            <EyeOff className="w-4 h-4 text-slate-400" /> : 
                            <Eye className="w-4 h-4 text-slate-400" />
                          }
                        </Button>
                      </div>
                      
                      {/* Password Strength Indicator */}
                      {signUpForm.password && (
                        <div className="space-y-1 animate-fade-in">
                          <div className="flex justify-between text-xs">
                            <span className="text-slate-500">Password Strength</span>
                            <span className={cn(
                              "font-medium",
                              passwordStrength < 50 ? "text-red-500" : 
                              passwordStrength < 75 ? "text-yellow-500" : "text-green-500"
                            )}>
                              {passwordStrength < 50 ? "Weak" : 
                               passwordStrength < 75 ? "Good" : "Strong"}
                            </span>
                          </div>
                          <Progress 
                            value={passwordStrength} 
                            className="h-1.5"
                          />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-confirm-password" className="text-sm font-medium">
                        Confirm Password
                      </Label>
                      <div className="relative group">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                        <Input
                          id="signup-confirm-password"
                          type="password"
                          placeholder="Confirm your password"
                          value={signUpForm.confirmPassword}
                          onChange={(e) => setSignUpForm({...signUpForm, confirmPassword: e.target.value})}
                          onFocus={() => setFocusedField('signup-confirm-password')}
                          onBlur={() => setFocusedField(null)}
                          className={cn(
                            "pl-10 pr-4 py-3 border-2 transition-all duration-300",
                            focusedField === 'signup-confirm-password' 
                              ? "border-blue-500 ring-4 ring-blue-500/10 shadow-lg" 
                              : "border-slate-200 dark:border-slate-700",
                            signUpForm.confirmPassword && signUpForm.password !== signUpForm.confirmPassword
                              ? "border-red-500" : ""
                          )}
                          required
                          disabled={loading}
                        />
                        {signUpForm.confirmPassword && signUpForm.password === signUpForm.confirmPassword && (
                          <CheckCircle className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-green-500" />
                        )}
                      </div>
                      {signUpForm.confirmPassword && signUpForm.password !== signUpForm.confirmPassword && (
                        <p className="text-xs text-red-500">Passwords do not match</p>
                      )}
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    variant="premium"
                    size="lg"
                    className="w-full" 
                    disabled={loading || signUpForm.password !== signUpForm.confirmPassword}
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin"></div>
                        Creating Account...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        Create Admin Account
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;