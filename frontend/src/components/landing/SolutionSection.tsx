import { ClipboardList, Video, FileText, ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const steps = [
  {
    icon: ClipboardList,
    step: "01",
    title: "Customers Report Easily",
    description:
      "Customers submit feedback, bug reports, or feature requests through a simple interface. AI guides them to provide the right details upfront.",
    highlight: "Frictionless reporting",
  },
  {
    icon: Video,
    step: "02",
    title: "AI Analyzes & Structures",
    description:
      "AI analyzes video and audio feedback to identify key moments, patterns, and intent. It structures raw input into clear, meaningful insights without manual review.",
    highlight: "Automated processing",
  },
  {
    icon: FileText,
    step: "03",
    title: "Insights Ready for Teams",
    description:
      "Teams receive structured outputs tailored to their needs, product insights, research summaries, bug tickets complete with context and supporting evidence.",
    highlight: "Direct to backlog",
  },
];

const SolutionSection = () => {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Stagger the reveal of each step
            steps.forEach((_, index) => {
              setTimeout(() => {
                setVisibleSteps((prev) => 
                  prev.includes(index) ? prev : [...prev, index]
                );
              }, index * 300);
            });
          }
        });
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section ref={sectionRef} className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-accent/20 to-background" />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-[600px] w-[600px] rounded-full bg-primary/5 blur-3xl animate-pulse-slow" />
      </div>
      
      <div className="container w-full py-12">
        <div className="mx-auto mb-20 max-w-2xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-primary animate-fade-in">
            How It Works
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl animate-fade-in-up opacity-0 stagger-1">
            From Customer Voice to Actionable Insight
          </h2>
          <p className="text-lg text-muted-foreground animate-fade-in-up opacity-0 stagger-2">
            Turn rich user feedback into structured understanding teams can act on fast.
          </p>
        </div>

        <div className="relative">
          {/* Connection line - animated */}
          <div className="absolute left-0 right-0 top-[88px] hidden h-px md:block overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-transparent via-primary/50 to-transparent transition-all duration-1000"
              style={{
                width: visibleSteps.length === 3 ? '100%' : `${(visibleSteps.length / 3) * 100}%`,
                opacity: visibleSteps.length > 0 ? 1 : 0,
              }}
            />
          </div>

          <div className="grid gap-8 md:grid-cols-3 md:gap-12">
            {steps.map((step, index) => (
              <div 
                key={index} 
                className={`group relative transition-all duration-700 ${
                  visibleSteps.includes(index) 
                    ? 'opacity-100 translate-y-0' 
                    : 'opacity-0 translate-y-8'
                }`}
              >
                {/* Step card */}
                <div className="relative text-center">
                  {/* Step number with glow and spin effect */}
                  <div className="relative mx-auto mb-8">
                    <div className={`absolute inset-0 mx-auto h-20 w-20 rounded-full bg-primary/20 blur-xl transition-all duration-500 ${
                      visibleSteps.includes(index) ? 'animate-pulse-slow scale-110' : ''
                    } group-hover:bg-primary/30 group-hover:blur-2xl`} />
                    <div className={`relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-primary/20 bg-background text-2xl font-bold text-primary transition-all duration-500 ${
                      visibleSteps.includes(index) ? 'scale-100 rotate-0' : 'scale-75 -rotate-12'
                    } group-hover:border-primary/40 group-hover:scale-105 group-hover:rotate-3`}>
                      {step.step}
                    </div>
                  </div>

                  {/* Icon with bounce effect */}
                  <div className={`mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 transition-all duration-500 ${
                    visibleSteps.includes(index) ? 'scale-100' : 'scale-0'
                  } group-hover:bg-primary/20 group-hover:scale-110 group-hover:-rotate-6`}>
                    <step.icon className={`h-7 w-7 text-primary transition-all duration-300 ${
                      visibleSteps.includes(index) ? 'animate-bounce-subtle' : ''
                    }`} />
                  </div>

                  {/* Content with slide effect */}
                  <h3 className={`mb-3 text-xl font-semibold text-foreground transition-all duration-500 delay-100 ${
                    visibleSteps.includes(index) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4'
                  }`}>
                    {step.title}
                  </h3>
                  <p className={`mx-auto mb-4 max-w-xs text-muted-foreground leading-relaxed transition-all duration-500 delay-200 ${
                    visibleSteps.includes(index) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
                  }`}>
                    {step.description}
                  </p>
                  
                  {/* Highlight badge with pop effect */}
                  <span className={`inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-all duration-300 delay-300 ${
                    visibleSteps.includes(index) ? 'opacity-100 scale-100' : 'opacity-0 scale-0'
                  } group-hover:bg-primary/20 group-hover:scale-105`}>
                    {step.highlight}
                  </span>
                </div>

                {/* Arrow connector - animated */}
                {index < steps.length - 1 && (
                  <div className={`absolute -right-6 top-[88px] hidden text-primary/50 md:block transition-all duration-500 ${
                    visibleSteps.includes(index + 1) ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'
                  }`}>
                    <ArrowRight className="h-5 w-5 animate-bounce-horizontal" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default SolutionSection;
