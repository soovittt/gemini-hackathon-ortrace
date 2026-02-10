import { Card, CardContent } from "@/components/ui/card";
import { Zap, Target, TicketCheck, TrendingUp } from "lucide-react";
import CountUpNumber from "./CountUpNumber";

const outcomes = [
  {
    icon: Zap,
    metric: { value: 90, suffix: "%", isNumber: true },
    label: "Less Manual Work",
    description: "Eliminate hours spent reviewing feedback, messages, and notes. AI automatically extracts and organizes what matters.",
    color: "text-chart-1",
    bgColor: "bg-chart-1/10",
  },
  {
    icon: Target,
    metric: { value: 100, suffix: "%", isNumber: true },
    label: "Complete Context",
    description: "AI captures every detail customers share and nothing gets lost for your team to act on.",
    color: "text-chart-2",
    bgColor: "bg-chart-2/10",
  },
  {
    icon: TicketCheck,
    metric: { value: null, text: "Instant", isNumber: false },
    label: "Report Creation",
    description: "Raw input becomes clear summaries and next steps ready for your product, engineering, or research workflows.",
    color: "text-chart-3",
    bgColor: "bg-chart-3/10",
  },
  {
    icon: TrendingUp,
    metric: { value: 5, suffix: "x", isNumber: true },
    label: "Faster Resolution",
    description: "Teams act while feedback is still fresh, reducing delays, back-and-forth, and missed signals.",
    color: "text-chart-5",
    bgColor: "bg-chart-5/10",
  },
];

const OutcomesSection = () => {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background to-accent/10" />
      </div>
      
      <div className="container w-full py-12">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-primary animate-fade-in">
            Results
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl animate-fade-in-up opacity-0 stagger-1">
            Turn Raw User Input Into Action
          </h2>
          <p className="text-lg text-muted-foreground animate-fade-in-up opacity-0 stagger-2">
            Let AI handle the translation, your team focuses on customers
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {outcomes.map((outcome, index) => (
            <Card 
              key={index} 
              className={`group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm card-hover animate-fade-in-up opacity-0 stagger-${index + 1}`}
            >
              {/* Subtle gradient on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${outcome.bgColor} to-transparent opacity-0 transition-opacity group-hover:opacity-50`} />
              
              <CardContent className="relative pt-8 pb-6 text-center">
                {/* Icon with pulse animation */}
                <div className={`mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl ${outcome.bgColor} transition-all duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                  <outcome.icon className={`h-7 w-7 ${outcome.color} transition-transform duration-300`} />
                </div>
                
                {/* Metric with count-up animation */}
                <div className={`mb-2 text-5xl font-bold ${outcome.color} transition-transform group-hover:scale-105`}>
                  {outcome.metric.isNumber ? (
                    <CountUpNumber 
                      end={outcome.metric.value!} 
                      suffix={outcome.metric.suffix}
                      duration={2000}
                      delay={index * 200}
                    />
                  ) : (
                    <span className="inline-block animate-pulse-subtle">{outcome.metric.text}</span>
                  )}
                </div>
                
                {/* Label */}
                <div className="mb-3 text-lg font-semibold text-card-foreground">
                  {outcome.label}
                </div>
                
                {/* Description */}
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {outcome.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default OutcomesSection;
