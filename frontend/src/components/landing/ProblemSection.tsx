import { Card, CardContent } from "@/components/ui/card";
import { Clock, FileQuestion, AlertTriangle } from "lucide-react";
import CountUpNumber from "./CountUpNumber";

const problems = [
  {
    icon: Clock,
    title: "Feedback Review Doesn't Scale",
    description:
      "Teams spend hours reviewing messages, recordings, and reports to understand user issues. As feedback volume grows, important insights get delayed or missed.",
    stat: { value: 20, suffix: "+", isNumber: true },
    statLabel: "hours/week reviewing raw feedback",
  },
  {
    icon: FileQuestion,
    title: "Context Gets Lost in Translation",
    description:
      "When users explain issues through text or summaries, critical visual and behavioral context is missing. Teams often guess what actually happened.",
    stat: { value: 3, suffix: "x", isNumber: true },
    statLabel: "back-and-forth per ticket",
  },
  {
    icon: AlertTriangle,
    title: "Insights Arrive Too Late",
    description:
      "The gap between customer feedback and real understanding delays action. By the time teams grasp what users experienced, customers have already escalated or churned.",
    stat: { value: 5, suffix: " days", isNumber: true },
    statLabel: "Days to turn feedback into action",
  },
];

const ProblemSection = () => {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Subtle background */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-destructive/[0.02] to-background" />
      </div>
      
      <div className="container w-full py-12">
        <div className="mx-auto mb-16 max-w-2xl text-center">
          <span className="mb-4 inline-block text-sm font-semibold uppercase tracking-wider text-destructive animate-fade-in">
            The Problem
          </span>
          <h2 className="mb-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl animate-fade-in-up opacity-0 stagger-1">
            Understanding Customer Feedback Is Slowing Teams Down
          </h2>
          <p className="text-lg text-muted-foreground animate-fade-in-up opacity-0 stagger-2">
            Teams spend too much time translating raw customer feedback instead of solving customer problems.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {problems.map((problem, index) => (
            <Card 
              key={index} 
              className={`group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm card-hover animate-fade-in-up opacity-0 stagger-${index + 1}`}
            >
              {/* Hover gradient */}
              <div className="absolute inset-0 bg-gradient-to-br from-destructive/5 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              
              <CardContent className="relative pt-8 pb-6">
                {/* Icon with shake animation on hover */}
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 transition-all duration-300 group-hover:scale-110 group-hover:animate-shake">
                  <problem.icon className="h-7 w-7 text-destructive" />
                </div>
                
                {/* Content */}
                <h3 className="mb-3 text-xl font-semibold text-card-foreground">
                  {problem.title}
                </h3>
                <p className="mb-6 text-muted-foreground leading-relaxed">
                  {problem.description}
                </p>
                
                {/* Stat with count-up animation */}
                <div className="flex items-baseline gap-2 pt-4 border-t border-border/50">
                  <span className="text-2xl font-bold text-destructive">
                    <CountUpNumber 
                      end={problem.stat.value} 
                      suffix={problem.stat.suffix}
                      duration={1800}
                      delay={index * 150}
                    />
                  </span>
                  <span className="text-sm text-muted-foreground">{problem.statLabel}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
