import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { appUrl } from "@/lib/domain";

const features = [
  "No credit card required",
  "Set up in 5 minutes",
  "Export to Jira, GitHub, and more",
];

const CTASection = () => {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-primary/5 to-background" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-primary/10 blur-3xl" />
      </div>
      
      <div className="container w-full py-12">
        <div className="relative mx-auto max-w-4xl">
          {/* Main CTA Card */}
          <div className="relative overflow-hidden rounded-3xl border border-primary/20 bg-card/80 backdrop-blur-xl p-8 md:p-12 lg:p-16 animate-scale-in">
            {/* Decorative elements */}
            <div className="absolute -top-20 -right-20 h-40 w-40 rounded-full bg-primary/20 blur-3xl" />
            <div className="absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
            
            <div className="relative text-center">
              {/* Badge */}
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
                <span className="font-medium">Start for free today</span>
              </div>
              
              {/* Headline */}
              <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                Ready to Automate Your
                <br />
                <span className="gradient-text">User Feedback to Insights Workflow?</span>
              </h2>
              
              {/* Description */}
              <p className="mx-auto mb-8 max-w-xl text-lg text-muted-foreground">
                Join product teams who've replaced manual ticket creation with 
                AI-powered automation. Your adoption pod will thank you.
              </p>

              {/* Features list */}
              <div className="mb-10 flex flex-wrap items-center justify-center gap-x-6 gap-y-3">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button size="lg" asChild>
                <a href={appUrl("/auth")}>Get started</a>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
