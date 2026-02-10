import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRight } from "lucide-react";
import ortraceLogo from "@/assets/ortrace_logo.png";

const Onboarding = () => {
  const navigate = useNavigate();
  const { user, completeOnboarding } = useAuth();
  const { toast } = useToast();

  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [companyName, setCompanyName] = useState(user?.company_name || "");

  const redirectTo = "/overview";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      await completeOnboarding(name.trim(), companyName.trim() || undefined);
      toast({
        title: "Welcome!",
        description: "Your profile has been set up.",
      });
      navigate(redirectTo);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to complete onboarding.";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <img src={ortraceLogo} alt="Ortrace" className="h-10 dark:invert" />
          <p className="mt-2 text-sm text-muted-foreground">
            Let's get you set up
          </p>
        </div>

        <Card className="border-border/50 shadow-xl">
          <CardHeader>
            <CardTitle>Complete Your Profile</CardTitle>
            <CardDescription>
              Tell us a bit about yourself so we can personalize your experience.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Your Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company (optional)</Label>
                <Input
                  id="company"
                  type="text"
                  placeholder="Acme Corp"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
