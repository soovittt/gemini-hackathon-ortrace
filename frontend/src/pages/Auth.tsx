import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, Mail, Lock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { getGoogleOAuthStartUrl } from "@/lib/api";
import { getOAuthCallbackUrl } from "@/lib/domain";
import ortraceLogo from "@/assets/ortrace_logo.png";

const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, register, isAuthenticated, user } = useAuth();
  const { toast } = useToast();

  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const redirectTo = searchParams.get("redirect") || "/overview";

  // Show error from OAuth redirect (e.g. /auth?error=exchange_failed from backend)
  useEffect(() => {
    const errorParam = searchParams.get("error");
    if (errorParam) {
      const message =
        errorParam === "access_denied"
          ? "Sign in was cancelled."
          : errorParam === "invalid_request"
            ? "Invalid sign-in request. Please try again."
            : errorParam === "exchange_failed"
              ? "Sign in failed. Could not complete sign-in with the provider."
              : `Sign in failed. ${errorParam}`;
      toast({
        title: "Sign in failed",
        description: message,
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      // If customer needs onboarding, go to onboarding
      if (!user.onboarding_completed) {
        navigate('/onboarding');
      } else {
        navigate(redirectTo);
      }
    }
  }, [isAuthenticated, user, navigate, redirectTo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isLogin && password !== confirmPassword) {
      toast({
        title: "Passwords don't match",
        description: "Please make sure your passwords match.",
        variant: "destructive",
      });
      return;
    }

    if (!isLogin && password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      if (isLogin) {
        await login(email, password);
        toast({
          title: "Welcome back!",
          description: "You've successfully logged in.",
        });
      } else {
        await register(email, password, name || undefined, 'internal');
        toast({
          title: "Account created!",
          description: "Your account has been created successfully.",
        });
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : (isLogin ? "Invalid email or password." : "Failed to create account.");
      toast({
        title: isLogin ? "Sign in failed" : "Registration failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding/Illustration */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-gradient-to-br from-primary/10 via-accent to-background">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute left-1/4 top-1/4 h-64 w-64 rounded-full bg-primary/20 blur-3xl animate-float" />
          <div className="absolute right-1/4 bottom-1/4 h-80 w-80 rounded-full bg-primary/10 blur-3xl animate-float stagger-2" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-accent/50 blur-3xl animate-float stagger-3" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20">
          <Link to="/" className="mb-12">
            <img 
              src={ortraceLogo} 
              alt="Ortrace" 
              className="h-10 w-auto dark:invert"
            />
          </Link>
          
          <h1 className="text-3xl xl:text-4xl font-bold text-foreground mb-6 leading-tight">
            Transform User Feedback Into
            <span className="gradient-text block mt-2">Actionable Insight</span>
          </h1>
          
          <p className="text-lg text-muted-foreground mb-8 max-w-md">
            Stop manually reviewing customer communications. Let AI automatically 
            convert feedback, bugs, and feature requests into actionable tickets.
          </p>
          
          <div className="flex flex-col gap-4">
            {[
              "Capture real user behavior with video + voice",
              "Automatically summarize, cluster, and extract key signals",
              "Export insights to tools like GitHub, Jira, or internal docs"
            ].map((feature, index) => (
              <div key={index} className="flex items-center gap-3 text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-primary" />
                <span>{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right side - Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8 text-center">
            <Link to="/">
              <img 
                src={ortraceLogo} 
                alt="Ortrace" 
                className="h-8 w-auto mx-auto mb-4 dark:invert"
              />
            </Link>
          </div>

          <Card className="border-border/50 shadow-xl bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-bold">
                {isLogin ? "Welcome back" : "Create an account"}
              </CardTitle>
              <CardDescription>
                {isLogin 
                  ? "Sign in to access your dashboard" 
                  : "Get started with automated feedback management"}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* Google Sign-in: redirect to backend start URL (no Google credentials in frontend) */}
              <Button
                variant="outline"
                className="w-full gap-3 h-12 text-base hover:bg-accent transition-all duration-300"
                asChild
              >
                <a href={getGoogleOAuthStartUrl(getOAuthCallbackUrl().startsWith("http") ? getOAuthCallbackUrl() : undefined)}>
                  <svg viewBox="0 0 24 24" className="h-5 w-5">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </a>
              </Button>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator className="w-full" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">
                    Or continue with email
                  </span>
                </div>
              </div>

              {/* Email/Password Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <div className="relative">
                      <Input
                        id="name"
                        type="text"
                        placeholder="John Doe"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="h-12"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10 h-12"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10 h-12"
                      required
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {!isLogin && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 h-12"
                        required
                        disabled={isLoading}
                      />
                    </div>
                  </div>
                )}

                {isLogin && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      className="text-sm text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 text-base gap-2 group shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/20"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  ) : (
                    <>
                      {isLogin ? "Sign in" : "Create account"}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </form>

              {/* Toggle between login/signup */}
              <p className="text-center text-sm text-muted-foreground">
                {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    // Clear form when switching
                    setEmail("");
                    setPassword("");
                    setConfirmPassword("");
                    setName("");
                  }}
                  className="text-primary font-medium hover:underline"
                >
                  {isLogin ? "Sign up" : "Sign in"}
                </button>
              </p>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <Link to="/terms" className="underline hover:text-foreground">Terms of Service</Link>
            {" "}and{" "}
            <Link to="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
