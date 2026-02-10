import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 -z-10">
        {/* Main gradient */}
        <div className="absolute inset-0 bg-gradient-to-b from-accent/30 via-background to-background" />
        
        {/* Floating orbs */}
        <div className="absolute left-1/4 top-20 h-72 w-72 rounded-full bg-primary/10 blur-3xl animate-float" />
        <div className="absolute right-1/4 top-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl animate-float stagger-2" />
        <div className="absolute left-1/3 bottom-20 h-64 w-64 rounded-full bg-accent/40 blur-3xl animate-float stagger-3" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage: `linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
                             linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>
      
      <div className="container relative w-full">
        <div className="mx-auto max-w-4xl text-center py-12">
          {/* Badge */}
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-2 text-sm text-primary animate-fade-in">
            <span className="font-medium">AI-Powered Customer Intelligence</span>
            <span className="h-1 w-1 rounded-full bg-primary" />
            <span className="text-muted-foreground">Replace Manual Workflows</span>
          </div>

          {/* Headline */}
          <h1 className="mb-6 text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl animate-fade-in-up opacity-0 stagger-1">
            <span className="text-foreground">Turn User Feedback Into</span>
            <br />
            <span className="gradient-text">Clear Product Insight</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto mb-12 max-w-2xl text-lg text-muted-foreground md:text-xl animate-fade-in-up opacity-0 stagger-2">
            Capture user feedback with screen recording and audio, then let AI structure, summarize, and surface what matters for your product, engineering, and research teams.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in-up opacity-0 stagger-3">
            <Button
              size="lg"
              asChild
              className="group gap-2 px-8 py-6 text-base shadow-lg transition-all duration-300 hover:shadow-xl hover:shadow-primary/20 glow-hover"
            >
              <Link to="/auth">
                Get Started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              asChild
              className="group gap-2 px-8 py-6 text-base backdrop-blur-sm transition-all duration-300 hover:bg-accent"
            >
              <Link to="/dummy">
                <Play className="h-4 w-4 fill-current" />
                Try the Widget Demo
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
